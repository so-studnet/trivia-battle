public class Room {
    final String code;
    int playerCount = 0;
    boolean readyPlayer1 = false;
    boolean readyPlayer2 = false;
    Game game = new Game();

    protected Room(String code){
        this.code = code;
    }

    protected synchronized String join(String name){
        if(playerCount == 0){
            playerCount++;
            game.player1Id = makeRandomId();
            game.player1Name = name;
            return game.player1Id;
        }else if(playerCount == 1){
            playerCount++;
            game.player2Id = makeRandomId();
            game.player2Name = name;
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

    protected synchronized String getPlayerName(String playerId) {
        if (playerId.equals(game.player1Id)) {
            System.out.println("Player 1 Name: " + game.player1Name);
            return game.player1Name;
        } else if (playerId.equals(game.player2Id)) {
            System.out.println("Player 2 Name: " + game.player2Name);
            return game.player2Name;
        } else {
            return null;
        }
    }

    protected synchronized void setReady(String playerId, boolean isReady) {
        if (playerId.equals(game.player1Id)) {
            readyPlayer1 = isReady;
        } else if (playerId.equals(game.player2Id)) {
            readyPlayer2 = isReady;
        }
    }

    protected synchronized boolean isReady(String playerId) {
        if (playerId.equals(game.player1Id)) {
            return readyPlayer1;
        } else if (playerId.equals(game.player2Id)) {
            return readyPlayer2;
        } else {
            return false;
        }
    }
}