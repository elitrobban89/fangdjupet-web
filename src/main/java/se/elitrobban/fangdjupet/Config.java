package se.elitrobban.fangdjupet;

import java.nio.file.Path;
import java.time.Duration;

// Inställningarna läses från miljövariabler, så att samma kod går att köra lokalt och på Render.
record Config(
        int port,
        int maxSessions,
        Duration idleTimeout,
        Duration maxLifetime,
        Path dataDir,
        String gameClasspath,
        String javaBin,
        String frameAncestors) {

    static Config fromEnv() {
        return new Config(
                intEnv("PORT", 8080),                                  // Render sätter PORT själv
                intEnv("MAX_SESSIONS", 5),                             // varje spel är en egen JVM, ca 40 MB
                Duration.ofMinutes(intEnv("IDLE_MINUTES", 10)),        // ingen aktivitet → spelet stängs
                Duration.ofMinutes(intEnv("MAX_MINUTES", 60)),         // längsta tid för ett spel
                Path.of(env("DATA_DIR", System.getProperty("java.io.tmpdir") + "/fangdjupet-web")).toAbsolutePath(),
                Path.of(env("GAME_CLASSPATH", "../grupp8-fangdjupet/target/classes")).toAbsolutePath().toString(),
                findJava(),
                env("FRAME_ANCESTORS", "'self' https://elitrobban.se https://www.elitrobban.se"));
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static int intEnv(String name, int fallback) {
        try {
            return Integer.parseInt(env(name, Integer.toString(fallback)));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // Samma java som kör servern startar spelen
    private static String findJava() {
        boolean windows = System.getProperty("os.name").toLowerCase().contains("win");
        return Path.of(System.getProperty("java.home"), "bin", windows ? "java.exe" : "java").toString();
    }
}
