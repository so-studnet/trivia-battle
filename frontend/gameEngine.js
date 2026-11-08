import {
  fetchTriviaPool,
  selectCardApi,
  getCardSelectionApi,
  answerCardApi,
  getCardAnswerApi,
  nextRoundApi,
} from "./api.js";

// ゲーム進行(ネットワーク対戦版)。
// 出題者・回答者はそれぞれ自分の操作をAPIへ送信し、相手の操作結果はAPIをポーリングして受け取る。
// 1台の端末を交代して使う想定は無くなったため、自分の手番でない間は「待つ」フェーズを描画する。

export const TRIVIA_POOL = await fetchTriviaPool();

const POLL_INTERVAL_MS = 500;

// 回答者が賭けられる点数(自信度)の範囲。
export const MIN_BET = 1;
export const MAX_BET = 3;

export class GameEngine {
  constructor(targetScore = 3, roomInfo) {
    this.targetScore = targetScore;
    this.code = roomInfo.code;
    this.selfId = roomInfo.selfId;
    this.selfName = roomInfo.selfName;
    this.opponentName = roomInfo.opponentName;
    this.myLetter = roomInfo.role === "host" ? "A" : "B";
    this.firstPlayer = roomInfo.firstPlayer === "B" ? "B" : "A";
    this.names =
      this.myLetter === "A"
        ? { A: this.selfName, B: this.opponentName }
        : { A: this.opponentName, B: this.selfName };
    this._listeners = [];
    this._pollTimer = null;
    this._resetState();
  }

  on(event, callback) {
    this._listeners.push({ event, callback });
  }

  _emit(event, payload) {
    this._listeners
      .filter((l) => l.event === event)
      .forEach((l) => l.callback(payload));
  }

  getState() {
    return this.state;
  }

  _notify() {
    this._emit("update", this.getState());
  }

  _resetState() {
    this._stopPolling();
    this.state = {
      phase: null,
      scores: { A: 0, B: 0 },
      targetScore: this.targetScore,
      questioner: this.firstPlayer,
      guesser: this.firstPlayer === "A" ? "B" : "A",
      myLetter: this.myLetter,
      names: this.names,
      turnCards: [],
      selectedCard: null,
      bet: MIN_BET,
      lastTurnResult: null,
      history: [],
      usedIds: new Set(),
      winner: null,
    };
    this._startRound();
  }

  _isQuestioner() {
    return this.state.questioner === this.myLetter;
  }

  // ラウンド開始。自分が出題者ならカードを引いて選択待ち、回答者なら相手の選択をポーリングする。
  // サーバー側の前ラウンドのカード選択・回答は、出題者側が自分の選択を送る前に
  // ここで一度だけリセットする(双方が個別にリセットを呼ぶと、片方が先に選択した直後に
  // もう片方のリセットでその選択が消えてしまい、お互いが待ち状態のまま詰むため)。
  _startRound() {
    this._stopPolling();
    this.state.selectedCard = null;
    this.state.bet = MIN_BET;

    if (this._isQuestioner()) {
      nextRoundApi(this.code);
      this._drawTurnCards();
      this.state.phase = "SELECT";
      this._notify();
    } else {
      this.state.turnCards = [];
      this.state.phase = "WAIT_SELECT";
      this._notify();
      this._pollCardSelection();
    }
  }

  _drawTurnCards() {
    let pool = TRIVIA_POOL.filter((c) => !this.state.usedIds.has(c.id));
    if (pool.length < 4) {
      this.state.usedIds.clear();
      pool = TRIVIA_POOL.slice();
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.state.turnCards = shuffled.slice(0, 4);
  }

  // 出題者: カードを選択してAPIへ送信し、相手の回答待ちに入る。
  selectCard(cardId) {
    if (this.state.phase !== "SELECT") return;
    const card = this.state.turnCards.find((c) => c.id === cardId);
    if (!card) return;

    this.state.usedIds.add(card.id);
    this.state.selectedCard = card;
    this.state.phase = "WAIT_GUESS";
    this._notify();

    selectCardApi(this.code, this.selfId, card.id);
    this._pollCardAnswer();
  }

  // 回答者: 出題者が選んだカードが届くまでポーリングする。
  _pollCardSelection() {
    this._pollTimer = setInterval(async () => {
      const data = await getCardSelectionApi(this.code, this.selfId);
      if (!data.cardId || data.cardId === "null") return;

      const card = TRIVIA_POOL.find(
        (c) => String(c.id) === String(data.cardId)
      );
      if (!card) return;

      this._stopPolling();
      this.state.usedIds.add(card.id);
      this.state.selectedCard = card;
      this.state.phase = "GUESS";
      this._notify();
    }, POLL_INTERVAL_MS);
  }

  // 回答者: 賭ける点数(自信度)を選ぶ。
  setBet(bet) {
    if (this.state.phase !== "GUESS") return;
    const value = Number(bet);
    if (!Number.isInteger(value) || value < MIN_BET || value > MAX_BET) return;
    this.state.bet = value;
    this._notify();
  }

  // 回答者: 本当/ウソと賭け点数を回答し、正誤をAPIへ送信する。
  submitGuess(guessIsTrue) {
    if (this.state.phase !== "GUESS") return;
    const card = this.state.selectedCard;
    const correct = guessIsTrue === card.isTrue;
    const bet = this.state.bet;

    this._applyTurnResult({ guess: guessIsTrue, correct, card, bet });
    answerCardApi(this.code, this.selfId, correct, bet);
  }

  // 出題者: 相手の回答(正誤)が届くまでポーリングする。
  _pollCardAnswer() {
    this._pollTimer = setInterval(async () => {
      const data = await getCardAnswerApi(this.code, this.selfId);
      if (data.isCorrect !== true && data.isCorrect !== false) return;

      this._stopPolling();

      const card = this.state.selectedCard;
      const correct = data.isCorrect;
      const guess = correct ? card.isTrue : !card.isTrue;
      const bet = Number(data.bet) || MIN_BET;

      this._applyTurnResult({ guess, correct, card, bet });
    }, POLL_INTERVAL_MS);
  }

  // 正解なら回答者に、不正解なら出題者に、賭けた点数が入る。
  _applyTurnResult({ guess, correct, card, bet }) {
    const scorer = correct ? this.state.guesser : this.state.questioner;
    this.state.scores[scorer] += bet;

    const turnRecord = {
      text: card.text,
      isTrue: card.isTrue,
      explanation: card.explanation,
      guess,
      correct,
      bet,
      scorer,
      questioner: this.state.questioner,
      guesser: this.state.guesser,
    };
    this.state.history.push(turnRecord);
    this.state.lastTurnResult = turnRecord;

    if (
      this.state.scores.A >= this.state.targetScore ||
      this.state.scores.B >= this.state.targetScore
    ) {
      // 得点が入るのは1ターンに1人だけなので、目標に届いたのはこのターンの得点者。
      this.state.winner = scorer;
    }

    this.state.phase = "TURN_RESULT";
    this._notify();
  }

  proceedNextTurn() {
    if (this.state.phase !== "TURN_RESULT") return;

    if (this.state.winner) {
      this.state.phase = "GAME_OVER";
      this._notify();
      return;
    }

    const prevQuestioner = this.state.questioner;
    this.state.questioner = this.state.guesser;
    this.state.guesser = prevQuestioner;
    this.state.lastTurnResult = null;

    this._startRound();
  }

  restart() {
    this._resetState();
    this._notify();
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }
}
