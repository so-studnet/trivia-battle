http://localhost:8080/api/create にアクセスでバックエンドで部屋を作り、jsonで部屋のコードを返す。
例 {"code":"7080"}

http://localhost:8080/api/join?code=7080 で部屋に参加する。jsonで、その部屋内でプレイヤーを識別するプレイヤーIDを返す。
例 {"message":"Joined room 7080", "playerId": 1}
