import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

public class Server {
    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/", Server::handleStatic);
        server.start();

        System.out.println("Server started: http://localhost:8080/");
    }

    public static void handleStatic(HttpExchange ex) throws IOException {
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
}