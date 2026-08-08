import { initGame } from "./ui.js";
import {
  createRoomApi,
  joinRoomApi,
  checkRoomJoinApi,
  readyRoomApi,
  startRoomApi,
  saveRoomSettingsApi,
} from "./api.js";

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
  firstPlayerMode: "random", // "A" | "B" | "random"
  targetScore: 3,
  resolvedFirstPlayer: null, // "A" | "B"(ゲーム開始時にサーバーが確定)
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

  const data = await joinRoomApi(code, name);

  if(roomState.role !== "host") {
    roomState.role = "guest";
  }
  roomState.code = code;
  roomState.selfName = name;
  roomState.selfId = data.playerId;
  roomState.selfReady = false;

  showScreen("screen-room");
  renderRoom();
  updateSettingsSummary();

  startRoomCheck();
}

function startRoomCheck() {

  roomCheckTimer = setInterval(async () => {

    const data = await checkRoomJoinApi(roomState.code, roomState.selfId);

    if (data.opponentJoined) {

      roomState.opponentJoined = true;
      roomState.opponentName = data.opponentName;
      roomState.opponentReady = data.opponentReady;
      roomState.gameStarted = data.gameStarted;
      roomState.firstPlayerMode = data.firstPlayerMode || roomState.firstPlayerMode;
      roomState.targetScore = data.targetScore || roomState.targetScore;
      roomState.resolvedFirstPlayer = data.resolvedFirstPlayer || null;

      renderRoom();
      updateSettingsSummary();

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

function getHostName() {
  return (
    (roomState.role === "host" ? roomState.selfName : roomState.opponentName) ||
    "ホスト"
  );
}

function getGuestName() {
  return (
    (roomState.role === "guest" ? roomState.selfName : roomState.opponentName) ||
    "ゲスト"
  );
}

function renderRoom() {
  document.getElementById("room-code-value").textContent =
    roomState.code || "------";

  const hostName = getHostName();
  const guestName = getGuestName();
  updateFirstPlayerLabels();

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

// ---------- 対戦設定 ----------

const settingsModal = document.getElementById("settings-modal");
const settingsReadonlyNote = document.getElementById("settings-readonly-note");
const settingsSummary = document.getElementById("settings-summary");
const roundCountInput = document.getElementById("input-round-count");
const btnSaveSettings = document.getElementById("btn-save-settings");

function firstPlayerLabel(mode) {
  if (mode === "A") return `${getHostName()}さん`;
  if (mode === "B") return `${getGuestName()}さん`;
  return "ランダム";
}

function updateFirstPlayerLabels() {
  document.getElementById("first-player-label-a").textContent = getHostName();
  document.getElementById("first-player-label-b").textContent = getGuestName();
}

function updateSettingsSummary() {
  settingsSummary.textContent = `先攻: ${firstPlayerLabel(
    roomState.firstPlayerMode
  )} ・ ラウンド数: ${roomState.targetScore}`;
}

document.getElementById("btn-open-settings").addEventListener("click", () => {
  const isHost = roomState.role === "host";

  updateFirstPlayerLabels();
  document.querySelectorAll('input[name="first-player"]').forEach((radio) => {
    radio.checked = radio.value === roomState.firstPlayerMode;
    radio.disabled = !isHost;
  });
  roundCountInput.value = roomState.targetScore;
  roundCountInput.disabled = !isHost;

  settingsReadonlyNote.classList.toggle("hidden", isHost);
  btnSaveSettings.classList.toggle("hidden", !isHost);

  settingsModal.classList.remove("hidden");
});

document.getElementById("btn-close-settings").addEventListener("click", () => {
  settingsModal.classList.add("hidden");
});

btnSaveSettings.addEventListener("click", async () => {
  if (roomState.role !== "host") return;

  const selected = document.querySelector('input[name="first-player"]:checked');
  const firstPlayer = selected ? selected.value : "random";

  let targetScore = parseInt(roundCountInput.value, 10);
  if (!Number.isFinite(targetScore)) targetScore = 3;
  targetScore = Math.min(10, Math.max(1, targetScore));

  const data = await saveRoomSettingsApi(roomState.code, firstPlayer, targetScore);

  roomState.firstPlayerMode = data.firstPlayerMode || firstPlayer;
  roomState.targetScore = data.targetScore || targetScore;
  updateSettingsSummary();

  settingsModal.classList.add("hidden");
});

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
  initGame({
    code: roomState.code,
    selfId: roomState.selfId,
    role: roomState.role,
    selfName: roomState.selfName,
    opponentName: roomState.opponentName,
    targetScore: roomState.targetScore,
    firstPlayer: roomState.resolvedFirstPlayer || "A",
  });
}