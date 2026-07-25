public class Room {
    final String code;
    int playerCount = 0;
    Game game = new Game();

    protected Room(String code){
        this.code = code;
    }

    protected synchronized String join(){
        if(playerCount == 0){
            playerCount++;
            game.player1Id = makeRandomId();
            return game.player1Id;
        }else if(playerCount == 1){
            playerCount++;
            game.player2Id = makeRandomId();
            return game.player2Id;
        }else{
            return null;
        }
    }

    protected String makeRandomId(){
        String randomId;
        do {
            randomId = String.valueOf((int)(Math.random() * 9000) + 1000);
        } while (randomId.equals(game.player1Id) || randomId.equals(game.player2Id));
        return randomId;
    }
}