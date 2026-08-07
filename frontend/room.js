import { initGame } from "./ui.js";
import { createRoomApi, joinRoomApi, checkRoomJoinApi, readyRoomApi, startRoomApi } from "./api.js";

// ルーム画面: タイトル選択 → 対戦ルーム待機 → ゲーム開始

const roomState = {
  role: null, // "host" | "guest"
  code: null,
  selfName: "",
  selfId: "",
  selfReady: false,
  opponentName: null,
  opponentJoined: false,
  opponentReady: false,
};

let roomCheckTimer = null;

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

async function createRoom(name) {
  clearTitleError();

  const data = await createRoomApi();

  roomState.role = "host";
  roomState.code = data.code;

  joinRoom(name, roomState.code);

}

async function joinRoom(name, code) {
  clearTitleError();

  const data = await joinRoomApi(code);

  if(roomState.role !== "host") {
    roomState.role = "guest";
  }
  roomState.code = code;
  roomState.selfName = name;
  roomState.selfId = data.playerId;
  roomState.selfReady = false;

  showScreen("screen-room");
  renderRoom();

  startRoomCheck();
}

function startRoomCheck() {

  roomCheckTimer = setInterval(async () => {

    const data = await checkRoomJoinApi(roomState.code, roomState.selfId);

    if (data.opponentJoined) {

      roomState.opponentJoined = true;
      roomState.opponentName = "領収書食べ放題";
      roomState.opponentReady = data.opponentReady;
      roomState.gameStarted = data.gameStarted;

      renderRoom();

      if (roomState.gameStarted) {
        stopRoomCheck();
        startGame();
      }
    }


  }, 100);
}

function stopRoomCheck() {

  if (roomCheckTimer) {
    clearInterval(roomCheckTimer);
    roomCheckTimer = null;
  }

}

// ---------- ルーム内アクション ----------

document.getElementById("btn-leave-room").addEventListener("click", () => {
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
  readyRoomApi(roomState.code, roomState.selfId, roomState.selfReady);
  renderRoom();
});

document.getElementById("btn-start-game").addEventListener("click", () => {
  if (roomState.role !== "host") return;
  if (!(roomState.selfReady && roomState.opponentReady)) return;
  startRoomApi(roomState.code);
});


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
  showScreen("screen-game");
  initGame();
}