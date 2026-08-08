import java.util.HashMap;
import java.util.Map;

public class Game {
    boolean isGameStarted = false;
    String player1Id;
    String player2Id;
    String player1Name;
    String player2Name;
    private Map<String, String> cardSelection = new HashMap<>();
    private Map<String, Boolean> cardAnswer = new HashMap<>();

    protected synchronized void setCardSelection(String playerId, String cardId) {
        cardSelection.put(playerId, cardId);
    }

    protected synchronized void setCardAnswer(String playerId, boolean isCorrect) {
        cardAnswer.put(playerId, isCorrect);
    }

    protected synchronized String getCardSelection(String playerId) {
        return cardSelection.get(playerId);
    }

    protected synchronized Boolean getCardAnswer(String playerId) {
        return cardAnswer.get(playerId);
    }

    protected synchronized boolean hasSelected(String playerId) {
        return cardSelection.containsKey(playerId);
    }

    protected synchronized boolean hasAnswered(String playerId) {
        return cardAnswer.containsKey(playerId);
    }

    protected synchronized String opponentId(String playerId) {
        if (playerId.equals(player1Id)) {
            return player2Id;
        } else if (playerId.equals(player2Id)) {
            return player1Id;
        } else {
            return null;
        }
    }

    protected synchronized void resetRound() {
        cardSelection.clear();
        cardAnswer.clear();
    }
}
