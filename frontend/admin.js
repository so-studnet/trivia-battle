import { fetchAdminRooms } from "./api.js";

// 管理者ダッシュボード: 稼働中の全ルーム/プレイヤーをポーリングして一覧表示する。

const POLL_INTERVAL_MS = 2000;

const roomsContainer = document.getElementById("admin-rooms");
const roomCountEl = document.getElementById("admin-room-count");

async function refresh() {
  const rooms = await fetchAdminRooms();
  renderRooms(rooms);
}

function renderRooms(rooms) {
  roomCountEl.textContent = `ルーム数: ${rooms.length}`;

  if (rooms.length === 0) {
    roomsContainer.innerHTML = `<p class="admin-empty">現在稼働中のルームはありません。</p>`;
    return;
  }

  roomsContainer.innerHTML = "";
  rooms.forEach((room) => {
    roomsContainer.appendChild(renderRoomCard(room));
  });
}

function renderRoomCard(room) {
  const card = document.createElement("div");
  card.className = "admin-room-card";

  const statusLabel = room.isGameStarted ? "対戦中" : "待機中";
  const statusClass = room.isGameStarted ? "badge-ready" : "badge-waiting";

  const playersHtml = room.players.length
    ? room.players.map(renderPlayerRow).join("")
    : `<p class="admin-empty">プレイヤー未参加</p>`;

  card.innerHTML = `
    <div class="admin-room-header">
      <span class="admin-room-code">ルーム ${escapeHtml(room.code)}</span>
      <span class="ready-badge ${statusClass}">${statusLabel}</span>
    </div>
    <div class="admin-players">${playersHtml}</div>
  `;

  return card;
}

function renderPlayerRow(player) {
  const roleLabel = player.role === "host" ? "ホスト" : "ゲスト";
  const readyLabel = player.ready ? "準備完了" : "準備中";
  const readyClass = player.ready ? "badge-ready" : "badge-waiting";

  const progress = [
    player.selected ? "カード選択済み" : null,
    player.answered ? "回答済み" : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  return `
    <div class="player-slot">
      <div class="player-avatar">${escapeHtml(roleLabel.slice(0, 1))}</div>
      <div class="player-info">
        <p class="player-name">${escapeHtml(player.name || "-")}<span class="admin-player-id"> (ID: ${escapeHtml(
    player.id
  )})</span></p>
        <p class="player-role">${roleLabel}${progress ? " ・ " + progress : ""}</p>
      </div>
      <span class="ready-badge ${readyClass}">${readyLabel}</span>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("btn-refresh").addEventListener("click", refresh);

refresh();
setInterval(refresh, POLL_INTERVAL_MS);
