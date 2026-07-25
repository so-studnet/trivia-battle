http://localhost:8080/api/create バックエンドで部屋を作り、jsonで部屋のコードを返す。
例 {"code":"7080"}

http://localhost:8080/api/join?code=7080 で部屋に参加する。jsonで、その部屋内でプレイヤーを識別するプレイヤーIDを返す。
例 {"message":"Joined room 7080", "playerId": 1}

http://localhost:8080/api/triviapool jsonで雑学のデータを返す。
例 [
  {
    "id": 1,
    "text": "ゾウは体の構造上、ジャンプすることができない。",
    "isTrue": true,
    "explanation": "ゾウは骨格や筋肉の構造上、4本の脚すべてを同時に地面から離すことができず、ジャンプができないと言われています。着地の衝撃に耐える骨格になっていないためです。"
  },
  {
    "id": 2,
    "text": "富士山は日本で一番高い山ではない。",
    "isTrue": false,
    "explanation": "富士山は標高3,776mで、日本で最も高い山です。2位の北岳（3,193m）と比べても600m以上高く、圧倒的な高さを誇ります。"
  }
]

