export const TRIVIA_POOL = [
  {
    id: 1,
    text: "ゾウは体の構造上、ジャンプすることができない。",
    isTrue: true,
    explanation:
      "ゾウは骨格や筋肉の構造上、4本の脚すべてを同時に地面から離すことができず、ジャンプができないと言われています。着地の衝撃に耐える骨格になっていないためです。",
  },
  {
    id: 2,
    text: "富士山は日本で一番高い山ではない。",
    isTrue: false,
    explanation:
      "富士山は標高3,776mで、日本で最も高い山です。2位の北岳（3,193m）と比べても600m以上高く、圧倒的な高さを誇ります。",
  },
  {
    id: 3,
    text: "ハチミツは何年経っても腐らない。",
    isTrue: true,
    explanation:
      "ハチミツは水分量が少なく強い酸性であるため、微生物が繁殖しにくい性質があります。古代エジプトの遺跡から発見されたハチミツが、今でも食べられる状態だった例もあります。",
  },
  {
    id: 4,
    text: "金魚の記憶力はわずか3秒しかない。",
    isTrue: false,
    explanation:
      "これは俗説で、実際の研究では金魚は数か月単位で物事を覚えられることが分かっています。エサの時間や特定の合図を覚えるなど、意外と記憶力は高いのです。",
  },
  {
    id: 5,
    text: "月は少しずつ地球から離れていっている。",
    isTrue: true,
    explanation:
      "月と地球の間の潮汐作用の影響で、月は1年に約3.8cmずつ地球から遠ざかっています。将来的には月食や日食の見え方も変化していくと考えられています。",
  },
  {
    id: 6,
    text: "タコの心臓は1つしかない。",
    isTrue: false,
    explanation:
      "タコには心臓が3つあります。全身に血液を送るための1つと、エラに血液を送るための2つが独立して働いています。",
  },
  {
    id: 7,
    text: "コアラは1日のほとんどを眠って過ごす。",
    isTrue: true,
    explanation:
      "コアラの主食であるユーカリの葉は栄養価が低く消化にも時間がかかるため、エネルギーを温存する必要があり、1日に18〜20時間ほど眠って過ごします。",
  },
  {
    id: 8,
    text: "南極には雪がほとんど降らない。",
    isTrue: true,
    explanation:
      "南極は非常に乾燥しており「南極大陸は世界最大の砂漠」と呼ばれることもあります。降水量（降雪量）は極めて少なく、乾いた寒冷な気候になっています。",
  },
  {
    id: 9,
    text: "サメの骨格は人間と同じように硬い骨でできている。",
    isTrue: false,
    explanation:
      "サメの骨格は硬骨ではなく、軽くて柔軟な軟骨でできています。これにより体を軽く保ち、水中でしなやかに動くことができます。",
  },
  {
    id: 10,
    text: "人間の体の中で一番硬い部分は骨である。",
    isTrue: false,
    explanation:
      "人体で最も硬い組織は骨ではなく歯のエナメル質です。エナメル質は骨よりもはるかに硬く、食べ物を噛み砕く力に耐えられるようになっています。",
  },
  {
    id: 11,
    text: "ライオンの群れでは主にメスが狩りを行う。",
    isTrue: true,
    explanation:
      "ライオンの群れ（プライド）では、体が軽く連携した狩りが得意なメスが中心となって獲物を追い詰めます。オスは縄張りの防衛などを主に担当します。",
  },
  {
    id: 12,
    text: "虹の色数は世界共通で7色と決まっている。",
    isTrue: false,
    explanation:
      "虹は本来連続的な色のグラデーションで、色の区切り方は文化によって異なります。日本や多くの国では7色とされますが、6色や5色など別の数え方をする国や地域も存在します。",
  },
];

export class GameEngine {
  constructor(targetScore = 3) {
    this.targetScore = targetScore;
    this._listeners = [];
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
    this.state = {
      phase: "SELECT",
      scores: { A: 0, B: 0 },
      targetScore: this.targetScore,
      questioner: "A",
      guesser: "B",
      turnCards: [],
      selectedCard: null,
      guess: null,
      lastTurnResult: null,
      history: [],
      usedIds: new Set(),
      winner: null,
    };
    this._drawTurnCards();
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

  selectCard(cardId) {
    if (this.state.phase !== "SELECT") return;
    const card = this.state.turnCards.find((c) => c.id === cardId);
    if (!card) return;
    this.state.usedIds.add(card.id);
    this.state.selectedCard = card;
    this.state.phase = "GUESS";
    this._notify();
  }

  submitGuess(guessIsTrue) {
    if (this.state.phase !== "GUESS") return;
    const card = this.state.selectedCard;
    const correct = guessIsTrue === card.isTrue;
    const scorer = correct ? this.state.guesser : this.state.questioner;
    this.state.scores[scorer] += 1;
    this.state.guess = guessIsTrue;

    const turnRecord = {
      text: card.text,
      isTrue: card.isTrue,
      explanation: card.explanation,
      guess: guessIsTrue,
      correct,
      scorer,
      questioner: this.state.questioner,
      guesser: this.state.guesser,
    };
    this.state.history.push(turnRecord);
    this.state.lastTurnResult = turnRecord;
    this.state.phase = "TURN_RESULT";
    this._notify();
  }

  proceedNextTurn() {
    if (this.state.phase !== "TURN_RESULT") return;

    if (
      this.state.scores.A >= this.state.targetScore ||
      this.state.scores.B >= this.state.targetScore
    ) {
      this.state.winner =
        this.state.scores.A > this.state.scores.B ? "A" : "B";
      this.state.phase = "GAME_OVER";
      this._notify();
      return;
    }

    const prevQuestioner = this.state.questioner;
    this.state.questioner = this.state.guesser;
    this.state.guesser = prevQuestioner;

    this.state.selectedCard = null;
    this.state.guess = null;
    this.state.lastTurnResult = null;
    this._drawTurnCards();
    this.state.phase = "SELECT";
    this._notify();
  }

  restart() {
    this._resetState();
    this._notify();
  }
}

export class NetworkClient {
  constructor(engine) {
    this.engine = engine;
  }

  on(event, callback) {
    this.engine.on(event, callback);
  }

  getState() {
    return this.engine.getState();
  }

  send(action, payload) {
    switch (action) {
      case "SELECT_CARD":
        this.engine.selectCard(payload.cardId);
        break;
      case "SUBMIT_GUESS":
        this.engine.submitGuess(payload.guess);
        break;
      case "NEXT_TURN":
        this.engine.proceedNextTurn();
        break;
      case "RESTART":
        this.engine.restart();
        break;
      default:
        console.warn("unknown action:", action);
    }
  }
}
