import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

public class Server {

    private static Map<String, Room> rooms = new HashMap<>();
    
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api/create", Server::handleCreate);
        server.createContext("/api/join", Server::handleJoin);
        server.createContext("/", Server::handleStatic);
        server.start();

        System.out.println("Server started: http://localhost:8080/");
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

        if (code == null || !rooms.containsKey(code)) {
            respond(ex, "{\"error\":\"Room not found\"}");
            return;
        }

        Room room = rooms.get(code);
        int playerId = room.join();
        if (playerId == -1) {
            respond(ex, "{\"error\":\"Room is full\"}");
            return;
        }
        respond(ex, "{\"message\":\"Joined room " + code + "\", \"playerId\": " + playerId + "}");
    }




    private static void handleStatic(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        if (path.equals("/")) {
            path = "/index.html";
        }

        Path file = Path.of("." + path);

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