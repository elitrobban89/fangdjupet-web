package se.elitrobban.fangdjupet;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static java.nio.charset.StandardCharsets.UTF_8;

/**
 * Webbversionen av Fångdjupet. Kör det riktiga Java-spelet i en egen process per spelare och
 * skickar in- och utdata över HTTP till en terminal i webbläsaren. Bara JDK:n, inga beroenden.
 *
 * <pre>
 * GET  /                                     terminalen (index.html)
 * POST /api/start?player=&lt;uuid&gt;              startar ett spel → {"session": "..."}
 * GET  /api/output?session=..&amp;from=N         ny text efter position N, väntar upp till 25 s
 * POST /api/input?session=..                 brödtexten skickas till spelet som en rad
 * POST /api/stop?session=..                  avslutar spelet
 * GET  /health                               för Render
 * </pre>
 */
public final class WebServer {
    private static final Pattern PLAYER_ID =
            Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");
    private static final int MAX_INPUT = 200;
    private static final Duration LONG_POLL = Duration.ofSeconds(25);
    private static final Duration KEEP_SAVES = Duration.ofDays(1);

    // Sidan och bilderna: sökväg → fil i src/main/resources/static och dess typ
    private static final Map<String, StaticFile> FILES = Map.of(
            "/", new StaticFile("index.html", "text/html; charset=utf-8"),
            "/index.html", new StaticFile("index.html", "text/html; charset=utf-8"),
            "/icon.svg", new StaticFile("icon.svg", "image/svg+xml"),
            "/favicon.svg", new StaticFile("icon.svg", "image/svg+xml"),
            "/card.svg", new StaticFile("card.svg", "image/svg+xml"),
            "/sound.js", new StaticFile("sound.js", "text/javascript; charset=utf-8"));   // musiken och ljuden

    private record StaticFile(String name, String type) { }

    private final Config config;
    private final Map<String, GameSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, byte[]> content = new HashMap<>();

    private WebServer(Config config) throws IOException {
        this.config = config;
        for (StaticFile file : FILES.values()) {
            try (InputStream in = WebServer.class.getResourceAsStream("/static/" + file.name())) {
                if (in == null) {
                    throw new IOException("static/" + file.name() + " saknas på classpath");
                }
                content.put(file.name(), in.readAllBytes());
            }
        }
        content.put("index.html", withSoundVersion(content.get("index.html"), content.get("sound.js")));
    }

    // Sidan cachas inte, men sound.js sparas ett dygn. Därför pekar sidan på filen med en kontrollsumma:
    // ändras ljuden får adressen en ny summa, och alla spelare hämtar den nya filen direkt.
    private static byte[] withSoundVersion(byte[] page, byte[] sound) {
        String version = Integer.toHexString(Arrays.hashCode(sound));
        return new String(page, UTF_8)
                .replace("src=\"/sound.js\"", "src=\"/sound.js?v=" + version + "\"")
                .getBytes(UTF_8);
    }

    public static void main(String[] args) throws IOException {
        Config config = Config.fromEnv();
        new WebServer(config).start();
    }

    private void start() throws IOException {
        Files.createDirectories(config.dataDir());

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", config.port()), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());   // long polling blockerar billigt
        server.createContext("/", this::page);
        server.createContext("/health", ex -> send(ex, 200, "text/plain", "ok"));
        server.createContext("/api/start", this::startGame);
        server.createContext("/api/output", this::output);
        server.createContext("/api/input", this::input);
        server.createContext("/api/stop", this::stop);
        server.start();

        ScheduledExecutorService janitor = Executors.newSingleThreadScheduledExecutor();
        janitor.scheduleAtFixedRate(this::closeIdleSessions, 30, 30, TimeUnit.SECONDS);
        janitor.scheduleAtFixedRate(this::deleteOldSaves, 1, 60, TimeUnit.MINUTES);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> sessions.values().forEach(GameSession::close)));

        System.out.printf("Fångdjupet web på port %d · spelet från %s · max %d spel samtidigt%n",
                config.port(), config.gameClasspath(), config.maxSessions());
    }

    // ---- sidan ----

    private void page(HttpExchange ex) throws IOException {
        StaticFile file = FILES.get(ex.getRequestURI().getPath());
        if (file == null) {
            send(ex, 404, "text/plain", "Finns inte");
            return;
        }
        if (file.name().endsWith(".html")) {
            ex.getResponseHeaders().set("Content-Security-Policy",
                    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
                            + "frame-ancestors " + config.frameAncestors());
            ex.getResponseHeaders().set("Referrer-Policy", "no-referrer");
            ex.getResponseHeaders().set("Cache-Control", "no-cache");
        } else {
            ex.getResponseHeaders().set("Cache-Control", "public, max-age=86400");
            ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");   // bilderna får visas på elitrobban.se
        }
        send(ex, 200, file.type(), content.get(file.name()));
    }

    // ---- API ----

    private void startGame(HttpExchange ex) throws IOException {
        if (!requirePost(ex)) {
            return;
        }
        String player = query(ex).getOrDefault("player", "");
        if (!PLAYER_ID.matcher(player).matches()) {
            player = UUID.randomUUID().toString();
        }

        // En spelare har ett spel i taget: ett nytt ersätter det gamla (t.ex. vid omladdning)
        String samePlayer = player;
        sessions.values().stream().filter(s -> s.player.equals(samePlayer)).toList()
                .forEach(s -> remove(s.id));

        synchronized (sessions) {
            if (sessions.size() >= config.maxSessions()) {
                json(ex, 503, "{\"error\":\"full\",\"max\":" + config.maxSessions() + "}");
                return;
            }
            String id = UUID.randomUUID().toString();
            // Sparfilen ligger per spelare, så "Fortsätt sparat äventyr" fungerar nästa gång
            GameSession session = new GameSession(id, player, config.dataDir().resolve(player), config);
            sessions.put(id, session);
            log("start", session);
            json(ex, 200, "{\"session\":\"" + id + "\",\"player\":\"" + player + "\"}");
        }
    }

    private void output(HttpExchange ex) throws IOException {
        Map<String, String> q = query(ex);
        GameSession session = sessions.get(q.getOrDefault("session", ""));
        if (session == null) {
            json(ex, 404, "{\"error\":\"gone\"}");
            return;
        }
        int from;
        try {
            from = Integer.parseInt(q.getOrDefault("from", "0"));
        } catch (NumberFormatException e) {
            from = 0;
        }
        try {
            GameSession.Chunk chunk = session.read(from, LONG_POLL);
            json(ex, 200, "{\"text\":" + quote(chunk.text()) + ",\"next\":" + chunk.next()
                    + ",\"ended\":" + chunk.ended() + "}");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            json(ex, 503, "{\"error\":\"interrupted\"}");
        }
    }

    private void input(HttpExchange ex) throws IOException {
        if (!requirePost(ex)) {
            return;
        }
        GameSession session = sessions.get(query(ex).getOrDefault("session", ""));
        if (session == null || session.isEnded()) {
            json(ex, 404, "{\"error\":\"gone\"}");
            return;
        }
        String line = new String(ex.getRequestBody().readNBytes(MAX_INPUT * 4), UTF_8)
                .replaceAll("\\p{Cntrl}", "");   // inga radbrytningar eller styrtecken – en rad i taget
        if (line.length() > MAX_INPUT) {
            line = line.substring(0, MAX_INPUT);
        }
        try {
            session.send(line);
            json(ex, 200, "{\"ok\":true}");
        } catch (IOException e) {
            json(ex, 410, "{\"error\":\"gone\"}");
        }
    }

    private void stop(HttpExchange ex) throws IOException {
        if (!requirePost(ex)) {
            return;
        }
        remove(query(ex).getOrDefault("session", ""));
        json(ex, 200, "{\"ok\":true}");
    }

    // ---- städning ----

    private void remove(String id) {
        GameSession session = sessions.remove(id);
        if (session != null) {
            session.close();
            log("stop", session);
        }
    }

    // Stänger spel som ingen har rört på länge, som har pågått för länge eller som redan är slut
    private void closeIdleSessions() {
        Instant now = Instant.now();
        for (GameSession s : sessions.values()) {
            boolean idle = s.lastSeen().plus(config.idleTimeout()).isBefore(now);
            boolean tooOld = s.started.plus(config.maxLifetime()).isBefore(now);
            boolean endedAndRead = s.isEnded() && s.lastSeen().plusSeconds(60).isBefore(now);
            if (idle || tooOld || endedAndRead) {
                remove(s.id);
            }
        }
    }

    // Sparfiler som inte rörts på ett dygn tas bort (Renders disk är ändå tillfällig)
    private void deleteOldSaves() {
        Instant limit = Instant.now().minus(KEEP_SAVES);
        try (Stream<Path> players = Files.list(config.dataDir())) {
            for (Path dir : players.toList()) {
                String player = dir.getFileName().toString();
                boolean playing = sessions.values().stream().anyMatch(s -> s.player.equals(player));
                if (!playing && Files.getLastModifiedTime(dir).toInstant().isBefore(limit)) {
                    deleteTree(dir);
                }
            }
        } catch (IOException e) {
            System.err.println("Kunde inte städa sparfiler: " + e.getMessage());
        }
    }

    private static void deleteTree(Path dir) throws IOException {
        try (Stream<Path> paths = Files.walk(dir)) {
            for (Path p : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(p);
            }
        }
    }

    private void log(String what, GameSession s) {
        System.out.printf("%s %s · %d spel igång%n", what, s.id.substring(0, 8), sessions.size());
    }

    // ---- HTTP-hjälp ----

    private static boolean requirePost(HttpExchange ex) throws IOException {
        if ("POST".equals(ex.getRequestMethod())) {
            return true;
        }
        ex.getResponseHeaders().set("Allow", "POST");
        json(ex, 405, "{\"error\":\"method\"}");
        return false;
    }

    private static Map<String, String> query(HttpExchange ex) {
        Map<String, String> params = new HashMap<>();
        String raw = ex.getRequestURI().getRawQuery();
        if (raw == null) {
            return params;
        }
        for (String pair : raw.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                params.put(URLDecoder.decode(pair.substring(0, eq), UTF_8),
                        URLDecoder.decode(pair.substring(eq + 1), UTF_8));
            }
        }
        return params;
    }

    private static void json(HttpExchange ex, int status, String body) throws IOException {
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        send(ex, status, "application/json; charset=utf-8", body);
    }

    private static void send(HttpExchange ex, int status, String type, String body) throws IOException {
        send(ex, status, type, body.getBytes(UTF_8));
    }

    private static void send(HttpExchange ex, int status, String type, byte[] body) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type);
        ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        ex.sendResponseHeaders(status, body.length);
        try (OutputStream out = ex.getResponseBody()) {
            out.write(body);
        }
    }

    // En Java-sträng som JSON-sträng
    static String quote(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 16).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20 || c == '<' || c == '>' || c == '&' || c == 0x2028 || c == 0x2029) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }
}
