// api.js

function createApiUrl(path, params = {}) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

export async function fetchTriviaPool() {
    const response = await fetch("/api/triviapool");
    return await response.json();
}

// ルーム作成
export async function createRoomApi() {
  const response = await fetch("/api/create");
  return await response.json();
}


// ルーム参加
export async function joinRoomApi(code, name) {
  const url = createApiUrl("/api/join", {
    code: code,
    name: name
  });

  const response = await fetch(url);
  return await response.json();
}

export async function readyRoomApi(code, playerId, isReady) {
  const url = createApiUrl("/api/ready", {
    code: code,
    playerId: playerId,
    isReady: isReady
  });

  const response = await fetch(url);
  return await response.json();
}

export async function startRoomApi(code) {
  const url = createApiUrl("/api/start", {
    code: code
  });

  const response = await fetch(url);
  return await response.json();
}

// ルーム相手状況確認
export async function checkRoomJoinApi(code, playerId) {
  const url = createApiUrl("/api/checkopponent", {
    code: code,
    playerId: playerId
  });

  const response = await fetch(url);
  return await response.json();
}


// カード選択
export async function selectCardApi(code, playerId, cardId) {
  const url = createApiUrl("/api/selectcard", {
    code: code,
    playerId: playerId,
    cardId: cardId
  });

  const response = await fetch(url);
  return await response.json();
}


// 相手のカード選択取得
export async function getCardSelectionApi(code, playerId) {
  const url = createApiUrl("/api/getcardselection", {
    code: code,
    playerId: playerId
  });

  const response = await fetch(url);
  return await response.json();
}


// 回答送信
export async function answerCardApi(code, playerId, isCorrect) {
  const url = createApiUrl("/api/answercard", {
    code: code,
    playerId: playerId,
    isCorrect: isCorrect
  });

  const response = await fetch(url);
  return await response.json();
}


// 相手の回答取得
export async function getCardAnswerApi(code, playerId) {
  const url = createApiUrl("/api/getcardanswer", {
    code: code,
    playerId: playerId
  });

  const response = await fetch(url);
  return await response.json();
}


// 次のラウンドへ
export async function nextRoundApi(code) {
  const url = createApiUrl("/api/next", {
    code: code
  });

  const response = await fetch(url);
  return await response.json();
}


// 管理者: 稼働中の全ルーム一覧
export async function fetchAdminRooms() {
  const response = await fetch("/api/admin/rooms");
  return await response.json();
}