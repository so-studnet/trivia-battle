import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

public class Server {

    private static Map<String, Room> rooms = new HashMap<>();
    
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api/triviapool", Server::handleTriviaPool);
        server.createContext("/api/create", Server::handleCreate);
        server.createContext("/api/join", Server::handleJoin);
        server.createContext("/api/ready", Server::handleReady);
        server.createContext("/api/start", Server::handleStart);
        server.createContext("/api/checkopponent", Server::handleGetOpponent);
        server.createContext("/api/selectcard", Server::handleSelectCard);
        server.createContext("/api/getcardselection", Server::handleGetCardSelection);
        server.createContext("/api/answercard", Server::handleAnswerCard);
        server.createContext("/api/getcardanswer", Server::handleGetCardAnswer);
        server.createContext("/api/next", Server::handleNext);
        server.createContext("/", Server::handleStatic);
        server.start();

        System.out.println("Server started: http://localhost:8080/");
    }

    private static void handleTriviaPool(HttpExchange ex) throws IOException {
        Path path = Paths.get("backend/TriviaPool.json");
        String json = Files.readString(path, StandardCharsets.UTF_8);
        respond(ex, json);
    }

    private static void handleCreate(HttpExchange ex) throws IOException {
        String code = String.valueOf((int)(Math.random() * 9000) + 1000);
        Room room = new Room(code);
        rooms.put(room.code, room);
        respond(ex, "{\"code\":\"" + room.code + "\"}");
    }

    private static void handleJoin(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String name = params.get("name");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        Room room = rooms.get(code);
        String playerId = room.join(name);
        if (playerId == null) {
            respond(ex, "{\"error\":\"Room is full\"}");
            return;
        }
        respond(ex, "{\"message\":\"Joined room " + code + "\", \"playerId\": \"" + playerId + "\"}");
    }

    private static void handleReady(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");
        String isReadyStr = params.get("isReady");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        if (playerId == null || isReadyStr == null) {
            respond(ex, "{\"error\":\"Missing playerId or isReady\"}");
            return;
        }

        boolean isReady = Boolean.parseBoolean(isReadyStr);
        rooms.get(code).setReady(playerId, isReady);

        respond(ex, "{\"message\":\"Player " + playerId + " ready status set to " + isReady + "\"}");
    }

    private static void handleStart(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        Room room = rooms.get(code);
        if (room.playerCount < 2) {
            respond(ex, "{\"error\":\"Not enough players to start the game\"}");
            return;
        }

        room.game.isGameStarted = true;
        respond(ex, "{\"message\":\"Game started in room " + code + "\"}");
    }

    private static void handleGetOpponent(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        Room room = rooms.get(code);
        String opponentId = room.game.opponentId(playerId);

        if (opponentId == null) {
            respond(ex, "{\"opponentJoined\":false}");
            return;
        }

        int playerCount = room.playerCount;
        String opponentName = room.getPlayerName(opponentId);
        boolean opponentReady = room.isReady(opponentId);
        boolean gameStarted = room.game.isGameStarted;

        if (playerCount >= 2) {
            respond(ex, "{\"opponentJoined\":true, \"opponentName\":\"" + opponentName + "\", \"opponentReady\":" + opponentReady + ", \"gameStarted\":" + gameStarted + "}");
        }
    }

    private static void handleSelectCard(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");
        String cardId = params.get("cardId");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        if (playerId == null || cardId == null) {
            respond(ex, "{\"error\":\"Missing playerId or cardId\"}");
            return;
        }

        rooms.get(code).game.setCardSelection(playerId, cardId);

        respond(ex, "{\"message\":\"Card selected\"}");
    }

    private static void handleGetCardSelection(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        if (playerId == null) {
            respond(ex, "{\"error\":\"Missing playerId\"}");
            return;
        }

        String opponentId = rooms.get(code).game.opponentId(playerId);
        String cardId = rooms.get(code).game.getCardSelection(opponentId);

        respond(ex, "{\"cardId\":\"" + cardId + "\"}");
    }

    private static void handleAnswerCard(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");
        String isCorrectStr = params.get("isCorrect");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        if (playerId == null || isCorrectStr == null) {
            respond(ex, "{\"error\":\"Missing playerId or isCorrect\"}");
            return;
        }

        boolean isCorrect = Boolean.parseBoolean(isCorrectStr);
        rooms.get(code).game.setCardAnswer(playerId, isCorrect);

        respond(ex, "{\"message\":\"Card answer recorded\"}");
    }


    private static void handleGetCardAnswer(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");
        String playerId = params.get("playerId");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        if (playerId == null) {
            respond(ex, "{\"error\":\"Missing playerId\"}");
            return;
        }

        String opponentId = rooms.get(code).game.opponentId(playerId);
        Boolean isCorrect = rooms.get(code).game.getCardAnswer(opponentId);

        respond(ex, "{\"isCorrect\":" + isCorrect + "}");
    }

    private static void handleNext(HttpExchange ex) throws IOException {
        String query = ex.getRequestURI().getQuery();
        Map<String, String> params = parseQuery(query);
        String code = params.get("code");

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        rooms.get(code).game.resetRound();

        respond(ex, "{\"message\":\"Ready for next round\"}");
    }


    private static void handleStatic(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        if (path.equals("/")) {
            path = "/index.html";
        }

        Path file = Path.of("./frontend" + path);

        if (Files.exists(file)) {
            byte[] data = Files.readAllBytes(file);

            String type = path.endsWith(".html") ? "text/html; charset=utf-8"
                : path.endsWith(".js") ? "application/javascript; charset=utf-8"
                : path.endsWith(".css") ? "text/css; charset=utf-8"
                : "text/plain; charset=utf-8";
            ex.getResponseHeaders().set("Content-Type", type);
            ex.sendResponseHeaders(200, data.length);

            try (OutputStream os = ex.getResponseBody()) {
                os.write(data);
            }
        } else {
            String msg = "404 Not Found";
            ex.sendResponseHeaders(404, msg.length());

            try (OutputStream os = ex.getResponseBody()) {
                os.write(msg.getBytes());
            }
        }
    }

    
    private static Map<String, String> parseQuery(String query) {
        Map<String, String> params = new HashMap<>();

        if (query == null) return params;

        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                params.put(kv[0], kv[1]);
            }
        }

        return params;
    }

    private static void respond(HttpExchange ex, String json) throws IOException {
        byte[] data = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(200, data.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(data); }
    }
}