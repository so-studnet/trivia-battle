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

export class GameEngine {
  constructor(targetScore = 3, roomInfo) {
    this.targetScore = targetScore;
    this.code = roomInfo.code;
    this.selfId = roomInfo.selfId;
    this.myLetter = roomInfo.role === "host" ? "A" : "B";
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
      questioner: "A",
      guesser: "B",
      myLetter: this.myLetter,
      turnCards: [],
      selectedCard: null,
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
  _startRound() {
    this._stopPolling();
    this.state.selectedCard = null;

    if (this._isQuestioner()) {
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

  // 回答者: 本当/ウソを回答し、正誤をAPIへ送信する。
  submitGuess(guessIsTrue) {
    if (this.state.phase !== "GUESS") return;
    const card = this.state.selectedCard;
    const correct = guessIsTrue === card.isTrue;

    this._applyTurnResult({ guess: guessIsTrue, correct, card });
    answerCardApi(this.code, this.selfId, correct);
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

      this._applyTurnResult({ guess, correct, card });
    }, POLL_INTERVAL_MS);
  }

  _applyTurnResult({ guess, correct, card }) {
    const scorer = correct ? this.state.guesser : this.state.questioner;
    this.state.scores[scorer] += 1;

    const turnRecord = {
      text: card.text,
      isTrue: card.isTrue,
      explanation: card.explanation,
      guess,
      correct,
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
      this.state.winner =
        this.state.scores.A > this.state.scores.B ? "A" : "B";
    }

    this.state.phase = "TURN_RESULT";
    this._notify();
  }

  proceedNextTurn() {
    if (this.state.phase !== "TURN_RESULT") return;

    nextRoundApi(this.code);

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
    nextRoundApi(this.code);
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
