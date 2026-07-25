# API一覧

ベースURL

```
http://localhost:8080/api
```

| API | Method | 説明 | 主なパラメータ | レスポンス |
|------|--------|------|----------------|------------|
| `/create` | POST | 部屋を作成する | - | `code`（部屋コード） |
| `/join` | POST | 部屋に参加する | `code` | `playerId`（プレイヤーID） |
| `/triviapool` | GET | 雑学データ一覧を取得する | - | 雑学データ(JSON) |
| `/selectcard` | POST | 選択したカードを登録する | `code`, `playerId`, `cardId` | - |
| `/getcardselection` | GET | 相手が選択したカードを取得する | `code`, `playerId` | `cardId` |
| `/answercard` | POST | 正誤を登録する | `code`, `playerId`, `isCorrect` | - |
| `/getcardanswer` | GET | 相手の正誤を取得する | `code`, `playerId` | `isCorrect` |
| `/next` | POST | 次のラウンドへ進み、選択情報をリセットする | `code` | - |

---

## リクエスト例

| API | Example |
|------|---------|
| 部屋作成 | `POST /create` |
| 部屋参加 | `POST /join?code=7080` |
| 雑学取得 | `GET /triviapool` |
| カード選択 | `POST /selectcard?code=7080&playerId=1&cardId=1` |
| カード取得 | `GET /getcardselection?code=7080&playerId=1` |
| 正誤回答 | `POST /answercard?code=7080&playerId=2&isCorrect=true` |
| 回答取得 | `GET /getcardanswer?code=7080&playerId=2` |
| 次ラウンド | `POST /next?code=7080` |
