public class Room {
    final String  code;
    int playerCount = 0;

    protected Room(String code){
        this.code = code;
    }

    protected synchronized int join(){
        if(playerCount == 0){
            playerCount++;
            int player1Id = 1;
            return player1Id;
        }else if(playerCount == 1){
            playerCount++;
            int player2Id = 2;
            return player2Id;
        }else{
            return -1;
        }
    }
}