# API一覧

## ベースURL

```text
http://localhost:8080/api
```

## APIエンドポイント

| API                 | Method | 説明                      | 主なパラメータ                              | レスポンス                                                               |
| ------------------- | ------ | ----------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `/create`           | POST   | 新しい部屋を作成する              | なし                                   | `code`（部屋コード）                                                       |
| `/join`             | POST   | 指定した部屋に参加する             | `code`, `name`                       | `playerId`（プレイヤーID）                                                 |
| `/ready`            | POST   | プレイヤーの準備状態を設定する         | `code`, `playerId`, `isReady`        | メッセージ                                                               |
| `/start`            | POST   | ゲームを開始する                | `code`                               | メッセージ                                                               |
| `/settings`         | POST   | ゲームの設定を変更する             | `code`, `firstPlayer`, `targetScore` | `firstPlayerMode`, `targetScore`                                    |
| `/checkopponent`    | GET    | 対戦相手の参加・準備状態などを確認する     | `code`, `playerId`                   | `opponentJoined`, `opponentName`, `opponentReady`, `gameStarted` など |
| `/triviapool`       | GET    | 雑学データを取得する              | なし                                   | 雑学データ（JSON）                                                         |
| `/selectcard`       | POST   | 選択したカードを登録する            | `code`, `playerId`, `cardId`         | メッセージ                                                               |
| `/getcardselection` | GET    | 対戦相手が選択したカードを取得する       | `code`, `playerId`                   | `cardId`                                                            |
| `/answercard`       | POST   | カードの正誤結果を登録する           | `code`, `playerId`, `isCorrect`      | メッセージ                                                               |
| `/getcardanswer`    | GET    | 対戦相手の正誤結果を取得する          | `code`, `playerId`                   | `isCorrect`                                                         |
| `/next`             | POST   | 次のラウンドへ進み、ラウンド情報をリセットする | `code`                               | メッセージ                                                               |
| `/admin/rooms`      | GET    | 現在の全ルーム情報を取得する          | なし                                   | ルーム情報（JSON）                                                         |

## リクエスト例

| 処理         | リクエスト例                                                          |
| ---------- | --------------------------------------------------------------- |
| 部屋作成       | `POST /api/create`                                              |
| 部屋参加       | `POST /api/join?code=7080&name=Player1`                         |
| 準備状態を設定    | `POST /api/ready?code=7080&playerId=1&isReady=true`             |
| ゲーム開始      | `POST /api/start?code=7080`                                     |
| ゲーム設定      | `POST /api/settings?code=7080&firstPlayer=random&targetScore=3` |
| 対戦相手を確認    | `GET /api/checkopponent?code=7080&playerId=1`                   |
| 雑学データ取得    | `GET /api/triviapool`                                           |
| カード選択      | `POST /api/selectcard?code=7080&playerId=1&cardId=1`            |
| カード選択結果を取得 | `GET /api/getcardselection?code=7080&playerId=1`                |
| 正誤回答を登録    | `POST /api/answercard?code=7080&playerId=2&isCorrect=true`      |
| 正誤結果を取得    | `GET /api/getcardanswer?code=7080&playerId=2`                   |
| 次のラウンドへ進む  | `POST /api/next?code=7080`                                      |
| 全ルーム情報を取得  | `GET /api/admin/rooms`                                          |

## `settings` のパラメータ

### `firstPlayer`

先攻プレイヤーの決定方法を指定します。

* `A`：プレイヤーAが先攻
* `B`：プレイヤーBが先攻
* `random`：ランダムに決定

### `targetScore`

ゲームの目標スコアを指定します。

* 最小値：`1`
* 最大値：`10`
* 未指定または不正な値の場合：`3`

## 主なレスポンス例

### 部屋作成

```json
{
  "code": "7080"
}
```

### 部屋参加

```json
{
  "message": "Joined room 7080",
  "playerId": "1"
}
```

### 対戦相手の確認

```json
{
  "opponentJoined": true,
  "opponentName": "Player2",
  "opponentReady": true,
  "gameStarted": true,
  "firstPlayerMode": "random",
  "targetScore": 3,
  "resolvedFirstPlayer": "A"
}
```

### カード選択結果の取得

```json
{
  "cardId": "1"
}
```

### 正誤結果の取得

```json
{
  "isCorrect": true
}
```
