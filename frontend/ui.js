import { GameEngine } from "./gameEngine.js";

// ゲーム画面の制御ロジック(ネットワーク対戦版)。
// ルーム画面(room.js)側で対戦準備が整ったタイミングで initGame(roomInfo) を呼び出して開始する。
// 自分の手番でない間は phase-wait を表示し、相手の操作をAPIポーリングで待つ。

let engine = null;
let initialized = false;

export function initGame(roomInfo) {
  if (initialized) return;
  initialized = true;

  engine = new GameEngine(3, roomInfo);

  engine.on("update", (state) => render(state));
  render(engine.getState());
}

function render(state) {
  if (state.phase === "GAME_OVER") {
    showResultScreen(state);
    return;
  }

  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  updateScoreBoard(state);
  renderPhase(state);
}

function hideAllPhases() {
  document
    .querySelectorAll(".phase")
    .forEach((el) => el.classList.add("hidden"));
}

function renderPhase(state) {
  hideAllPhases();
  const turnIndicator = document.getElementById("turn-indicator");

  switch (state.phase) {
    case "SELECT":
      turnIndicator.textContent = "あなたが出題者です";
      document.getElementById("phase-select").classList.remove("hidden");
      renderCardRow(state.turnCards);
      break;
    case "WAIT_SELECT":
      turnIndicator.textContent = "相手が出題者です";
      showWaitPhase("相手がカードを選んでいます…お待ちください");
      break;
    case "GUESS":
      turnIndicator.textContent = "あなたが回答者です";
      document.getElementById("phase-guess").classList.remove("hidden");
      renderGuessCard(state.selectedCard);
      break;
    case "WAIT_GUESS":
      turnIndicator.textContent = "相手が回答者です";
      showWaitPhase("相手が回答しています…お待ちください");
      break;
    case "TURN_RESULT":
      turnIndicator.textContent = "この問題の結果";
      document.getElementById("phase-turn-result").classList.remove("hidden");
      renderTurnResult(state.lastTurnResult, state);
      break;
  }
}

function showWaitPhase(message) {
  document.getElementById("wait-message").textContent = message;
  document.getElementById("phase-wait").classList.remove("hidden");
}

function renderCardRow(cards) {
  const container = document.getElementById("card-row");
  container.innerHTML = "";

  cards.forEach((card, i) => {
    const el = document.createElement("div");
    el.className = "card row-card";
    el.style.setProperty("--start-x", `${-160 * (i + 1)}px`);
    el.style.setProperty("--delay", `${i * 0.12}s`);
    el.innerHTML = `<div class="card-inner"><p class="card-text">${escapeHtml(
      card.text
    )}</p></div>`;
    el.addEventListener("click", () => openCardModal(card));
    container.appendChild(el);
  });
}

function openCardModal(card) {
  const modal = document.getElementById("card-modal");
  const modalCard = document.getElementById("modal-card");
  modalCard.innerHTML = `<div class="card-inner"><p class="card-text">${escapeHtml(
    card.text
  )}</p></div>`;
  modal.classList.remove("hidden");

  const decideBtn = document.getElementById("btn-decide");
  const cancelBtn = document.getElementById("btn-cancel");

  const cleanup = () => {
    decideBtn.removeEventListener("click", decideHandler);
    cancelBtn.removeEventListener("click", cancelHandler);
  };
  const decideHandler = () => {
    modal.classList.add("hidden");
    cleanup();
    engine.selectCard(card.id);
  };
  const cancelHandler = () => {
    modal.classList.add("hidden");
    cleanup();
  };

  decideBtn.addEventListener("click", decideHandler);
  cancelBtn.addEventListener("click", cancelHandler);
}

function renderGuessCard(card) {
  document.getElementById(
    "guess-card"
  ).innerHTML = `<div class="card-inner"><p class="card-text">${escapeHtml(
    card.text
  )}</p></div>`;
}

document
  .getElementById("btn-true")
  .addEventListener("click", () => engine.submitGuess(true));
document
  .getElementById("btn-false")
  .addEventListener("click", () => engine.submitGuess(false));

function renderTurnResult(result, state) {
  document.getElementById("result-heading").textContent = result.correct
    ? "正解！"
    : "不正解…";
  document.getElementById(
    "result-card"
  ).innerHTML = `<div class="card-inner"><p class="card-text">${escapeHtml(
    result.text
  )}</p></div>`;
  const scorerIsMe = result.scorer === state.myLetter;
  document.getElementById("result-answer").textContent = `答え: ${
    result.isTrue ? "本当" : "ウソ"
  }（${result.guesser}さんの回答: ${
    result.guess ? "本当" : "ウソ"
  } / ${result.scorer}さん${scorerIsMe ? "（あなた）" : ""}に1点）`;
  document.getElementById("result-explanation").textContent =
    result.explanation;
}

document
  .getElementById("btn-next-turn")
  .addEventListener("click", () => engine.proceedNextTurn());

function updateScoreBoard(state) {
  document.getElementById("score-a").textContent = `Aさん${
    state.myLetter === "A" ? "（あなた）" : ""
  }: ${state.scores.A}`;
  document.getElementById("score-b").textContent = `Bさん${
    state.myLetter === "B" ? "（あなた）" : ""
  }: ${state.scores.B}`;
  document.getElementById("target-score").textContent = state.targetScore;
}

function showResultScreen(state) {
  document.getElementById("game-screen").classList.add("hidden");
  const resultScreen = document.getElementById("result-screen");
  resultScreen.classList.remove("hidden");

  const youWon = state.winner === state.myLetter;
  document.getElementById(
    "winner-heading"
  ).textContent = `${state.winner}さんの勝利！${
    youWon ? "（あなたの勝ち）" : "（あなたの負け）"
  }`;
  document.getElementById(
    "final-score"
  ).textContent = `最終スコア　Aさん: ${state.scores.A} － Bさん: ${state.scores.B}`;

  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";
  state.history.forEach((h, i) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <p class="history-turn">第${i + 1}問: ${escapeHtml(h.text)}</p>
      <p class="history-answer">答え: ${
        h.isTrue ? "本当" : "ウソ"
      } ／ 結果: ${h.correct ? "正解" : "不正解"}（${h.scorer}さんに1点）</p>
      <p class="history-explanation">${escapeHtml(h.explanation)}</p>
    `;
    historyList.appendChild(item);
  });
}

document.getElementById("btn-restart").addEventListener("click", () => {
  engine.restart();
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
