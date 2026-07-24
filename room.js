import { initGame } from "./ui.js";

// ルーム画面: タイトル選択 → 対戦ルーム待機 → ゲーム開始

const roomState = {
  role: null, // "host" | "guest"
  code: null,
  selfName: "",
  selfReady: false,
  opponentName: null,
  opponentJoined: false,
  opponentReady: false,
};

let opponentTimer = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("hidden", el.id !== id);
  });
}

// ---------- タイトル画面 ----------

const nameInput = document.getElementById("input-player-name");
const roomCodeInput = document.getElementById("input-room-code");
const titleError = document.getElementById("title-error");

document.getElementById("btn-create-room").addEventListener("click", () => {
  const name = (nameInput.value || "").trim() || "プレイヤー1";
  createRoom(name);
});

document.getElementById("btn-join-room").addEventListener("click", () => {
  const name = (nameInput.value || "").trim() || "プレイヤー1";
  const code = (roomCodeInput.value || "").trim().toUpperCase();
  if (!code) {
    showTitleError("ルームコードを入力してください。");
    return;
  }
  joinRoom(name, code);
});

function showTitleError(message) {
  titleError.textContent = message;
  titleError.classList.remove("hidden");
}

function clearTitleError() {
  titleError.classList.add("hidden");
  titleError.textContent = "";
}

// ---------- ルーム作成 / 参加 ----------

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(name) {
  clearTitleError();
  clearOpponentTimer();

  roomState.role = "host";
  roomState.code = generateRoomCode();
  roomState.selfName = name;
  roomState.selfReady = false;
  roomState.opponentName = null;
  roomState.opponentJoined = false;
  roomState.opponentReady = false;

  showScreen("screen-room");
  renderRoom();

  opponentTimer = setTimeout(() => {
    simulateOpponentJoin();
  }, 6000);
}

function joinRoom(name, code) {
  clearTitleError();
  clearOpponentTimer();

  roomState.role = "guest";
  roomState.code = code;
  roomState.selfName = name;
  roomState.selfReady = false;
  roomState.opponentName = "ホストプレイヤー";
  roomState.opponentJoined = true;
  roomState.opponentReady = false;

  showScreen("screen-room");
  renderRoom();
}

function clearOpponentTimer() {
  if (opponentTimer) {
    clearTimeout(opponentTimer);
    opponentTimer = null;
  }
}

// ---------- ルーム内アクション ----------

document.getElementById("btn-leave-room").addEventListener("click", () => {
  clearOpponentTimer();
  showScreen("screen-title");
});

document.getElementById("btn-copy-code").addEventListener("click", () => {
  const btn = document.getElementById("btn-copy-code");
  const code = roomState.code || "";
  const done = () => {
    const original = btn.textContent;
    btn.textContent = "コピーしました";
    setTimeout(() => {
      btn.textContent = original;
    }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(done).catch(done);
  } else {
    done();
  }
});

document.getElementById("btn-toggle-ready").addEventListener("click", () => {
  roomState.selfReady = !roomState.selfReady;
  renderRoom();
});

document.getElementById("btn-start-game").addEventListener("click", () => {
  if (roomState.role !== "host") return;
  if (!(roomState.selfReady && roomState.opponentReady)) return;
  startGame();
});

document
  .getElementById("btn-demo-opponent")
  .addEventListener("click", () => {
    clearOpponentTimer();
    if (roomState.role === "host") {
      if (!roomState.opponentJoined) {
        simulateOpponentJoin();
      } else if (!roomState.opponentReady) {
        simulateOpponentReadyAndStart();
      }
    } else {
      simulateOpponentReadyAndStart();
    }
  });

// ---------- 相手プレイヤーのダミー動作 ----------

function simulateOpponentJoin() {
  if (roomState.opponentJoined) return;
  const demoNames = ["ゲストプレイヤー", "たろう", "はなこ", "ゲスト参加者"];
  roomState.opponentName =
    demoNames[Math.floor(Math.random() * demoNames.length)];
  roomState.opponentJoined = true;
  roomState.opponentReady = false;
  renderRoom();
}

function simulateOpponentReadyAndStart() {
  if (roomState.role === "host") {
    if (!roomState.opponentJoined) return;
    roomState.opponentReady = true;
    renderRoom();
    return;
  }

  roomState.opponentReady = true;
  renderRoom();
  setTimeout(() => {
    startGame();
  }, 900);
}

// ---------- 描画 ----------

function renderRoom() {
  document.getElementById("room-code-value").textContent =
    roomState.code || "------";

  const hostName =
    roomState.role === "host" ? roomState.selfName : roomState.opponentName;
  const guestName =
    roomState.role === "guest" ? roomState.selfName : roomState.opponentName;
  const hostReady =
    roomState.role === "host" ? roomState.selfReady : roomState.opponentReady;
  const guestReady =
    roomState.role === "guest"
      ? roomState.selfReady
      : roomState.opponentReady;
  const guestJoined =
    roomState.role === "guest" ? true : roomState.opponentJoined;

  document.getElementById("slot-host-name").textContent =
    (hostName || "-") + (roomState.role === "host" ? "（あなた）" : "");
  document.getElementById("slot-guest-name").textContent = guestJoined
    ? (guestName || "-") + (roomState.role === "guest" ? "（あなた）" : "")
    : "未参加";

  setReadyBadge("slot-host-ready", true, hostReady);
  setReadyBadge("slot-guest-ready", guestJoined, guestReady);

  document
    .getElementById("slot-guest")
    .classList.toggle("is-empty", !guestJoined);

  const statusText = document.getElementById("room-status-text");
  const spinner = document.getElementById("room-spinner");
  const bothReady = hostReady && guestReady;

  if (!guestJoined) {
    statusText.textContent = "相手の参加を待っています…";
    spinner.classList.remove("hidden");
  } else if (!bothReady) {
    statusText.textContent = "両者の準備完了を待っています…";
    spinner.classList.remove("hidden");
  } else if (roomState.role === "host") {
    statusText.textContent = "準備が整いました。対戦を開始できます！";
    spinner.classList.add("hidden");
  } else {
    statusText.textContent = "準備完了です。ホストの開始を待っています…";
    spinner.classList.remove("hidden");
  }

  const readyBtn = document.getElementById("btn-toggle-ready");
  readyBtn.textContent = roomState.selfReady
    ? "準備完了を取り消す"
    : "準備完了にする";

  const startBtn = document.getElementById("btn-start-game");
  startBtn.classList.toggle(
    "hidden",
    !(roomState.role === "host" && bothReady)
  );

  const demoBtn = document.getElementById("btn-demo-opponent");
  if (roomState.role === "host") {
    demoBtn.classList.toggle(
      "hidden",
      roomState.opponentJoined && roomState.opponentReady
    );
    demoBtn.textContent = !roomState.opponentJoined
      ? "［動作確認用］相手を参加させる"
      : "［動作確認用］相手を準備完了にする";
  } else {
    demoBtn.classList.toggle("hidden", roomState.opponentReady);
    demoBtn.textContent = "［動作確認用］ホストを準備完了・開始させる";
  }
}

function setReadyBadge(elId, joined, ready) {
  const el = document.getElementById(elId);
  el.classList.remove("badge-ready", "badge-waiting", "badge-empty");
  if (!joined) {
    el.textContent = "未参加";
    el.classList.add("badge-empty");
  } else if (ready) {
    el.textContent = "準備完了";
    el.classList.add("badge-ready");
  } else {
    el.textContent = "準備中";
    el.classList.add("badge-waiting");
  }
}

function startGame() {
  clearOpponentTimer();
  showScreen("screen-game");
  initGame();
}