import { GameEngine, NetworkClient } from "./gameEngine.js";

const engine = new GameEngine(3);
const net = new NetworkClient(engine);

let activeViewer = "A";

net.on("update", (state) => render(state));
render(net.getState());

function render(state) {
  if (state.phase === "GAME_OVER") {
    showResultScreen(state);
    return;
  }

  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  updateScoreBoard(state);

  const requiredViewer = requiredViewerFor(state.phase, state);
  if (requiredViewer && requiredViewer !== activeViewer) {
    showPassOverlay(requiredViewer, () => {
      activeViewer = requiredViewer;
      renderPhase(state);
    });
    return;
  }
  renderPhase(state);
}

function requiredViewerFor(phase, state) {
  if (phase === "SELECT") return state.questioner;
  if (phase === "GUESS") return state.guesser;
  return null;
}

function showPassOverlay(nextViewer, onReady) {
  const overlay = document.getElementById("pass-overlay");
  document.getElementById(
    "pass-text"
  ).textContent = `端末を交代してください。次は ${nextViewer}さんの番です。準備ができたらボタンを押してください。`;
  overlay.classList.remove("hidden");

  const btn = document.getElementById("btn-pass-ready");
  const handler = () => {
    overlay.classList.add("hidden");
    btn.removeEventListener("click", handler);
    onReady();
  };
  btn.addEventListener("click", handler);
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
      turnIndicator.textContent = `${state.questioner}さんが出題者です`;
      document.getElementById("phase-select").classList.remove("hidden");
      renderCardRow(state.turnCards);
      break;
    case "GUESS":
      turnIndicator.textContent = `${state.guesser}さんが回答者です`;
      document.getElementById("phase-guess").classList.remove("hidden");
      renderGuessCard(state.selectedCard);
      break;
    case "TURN_RESULT":
      turnIndicator.textContent = "この問題の結果";
      document.getElementById("phase-turn-result").classList.remove("hidden");
      renderTurnResult(state.lastTurnResult);
      break;
  }
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
    net.send("SELECT_CARD", { cardId: card.id });
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
  .addEventListener("click", () => net.send("SUBMIT_GUESS", { guess: true }));
document
  .getElementById("btn-false")
  .addEventListener("click", () =>
    net.send("SUBMIT_GUESS", { guess: false })
  );

function renderTurnResult(result) {
  document.getElementById("result-heading").textContent = result.correct
    ? "正解！"
    : "不正解…";
  document.getElementById(
    "result-card"
  ).innerHTML = `<div class="card-inner"><p class="card-text">${escapeHtml(
    result.text
  )}</p></div>`;
  document.getElementById("result-answer").textContent = `答え: ${
    result.isTrue ? "本当" : "ウソ"
  }（${result.guesser}さんの回答: ${
    result.guess ? "本当" : "ウソ"
  } / ${result.scorer}さんに1点）`;
  document.getElementById("result-explanation").textContent =
    result.explanation;
}

document
  .getElementById("btn-next-turn")
  .addEventListener("click", () => net.send("NEXT_TURN"));

function updateScoreBoard(state) {
  document.getElementById("score-a").textContent = `Aさん: ${state.scores.A}`;
  document.getElementById("score-b").textContent = `Bさん: ${state.scores.B}`;
  document.getElementById("target-score").textContent = state.targetScore;
}

function showResultScreen(state) {
  document.getElementById("game-screen").classList.add("hidden");
  const resultScreen = document.getElementById("result-screen");
  resultScreen.classList.remove("hidden");

  document.getElementById(
    "winner-heading"
  ).textContent = `${state.winner}さんの勝利！`;
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

  activeViewer = "A";
}

document.getElementById("btn-restart").addEventListener("click", () => {
  net.send("RESTART");
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
