package se.elitrobban.fangdjupet;

import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static java.nio.charset.StandardCharsets.UTF_8;

// Ett pågående spel: det riktiga Fångdjupet (se.fangdjupet.Main) i en egen process.
// Allt spelet skriver samlas i en buffert som webbläsaren läser ifrån, och det spelaren skriver
// går in i processens System.in – precis som i en terminal.
final class GameSession {
    private static final int MAX_OUTPUT = 1_000_000;   // skydd mot en process som skriver i all oändlighet

    record Chunk(String text, int next, boolean ended) { }

    final String id;
    final String player;
    final Instant started = Instant.now();

    private final Process process;
    private final Writer stdin;
    private final StringBuilder output = new StringBuilder();
    private final Object lock = new Object();
    private volatile Instant lastSeen = Instant.now();
    private boolean ended;   // skyddas av lock

    GameSession(String id, String player, Path workDir, Config config) throws IOException {
        this.id = id;
        this.player = player;
        Files.createDirectories(workDir);   // sparfilen (saves/) och fangdjupet.log hamnar här

        List<String> command = List.of(
                config.javaBin(),
                "-XX:+UseSerialGC", "-Xmx32m", "-Xss512k", "-XX:TieredStopAtLevel=1",   // liten JVM
                "-Dstdout.encoding=UTF-8", "-Dstdin.encoding=UTF-8", "-Dfile.encoding=UTF-8",  // å, ä och ö
                "-Dfangdjupet.ljud=av",   // servern spelar inget ljud: webbläsaren har egen musik (sound.js)
                "-cp", config.gameClasspath(),
                "se.fangdjupet.Main");

        process = new ProcessBuilder(command)
                .directory(workDir.toFile())
                .redirectError(ProcessBuilder.Redirect.INHERIT)   // spelets fel syns i serverloggen
                .start();
        stdin = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), UTF_8));

        Thread.ofVirtual().name("game-" + id).start(this::pumpOutput);
    }

    // Läser allt spelet skriver, tecken för tecken – även prompter utan radbrytning ("Välj ett alternativ: ")
    private void pumpOutput() {
        try (Reader reader = new InputStreamReader(process.getInputStream(), UTF_8)) {
            char[] buffer = new char[4096];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                synchronized (lock) {
                    output.append(buffer, 0, read);
                    lock.notifyAll();
                    if (output.length() > MAX_OUTPUT) {
                        break;
                    }
                }
            }
        } catch (IOException ignored) {
            // processen stängdes
        } finally {
            close();
        }
    }

    // Long polling: väntar tills det finns ny text efter position "from", eller tills tiden går ut
    Chunk read(int from, Duration maxWait) throws InterruptedException {
        touch();
        long deadline = System.nanoTime() + maxWait.toNanos();
        synchronized (lock) {
            while (from >= output.length() && !ended) {
                long left = deadline - System.nanoTime();
                if (left <= 0) {
                    break;
                }
                TimeUnit.NANOSECONDS.timedWait(lock, left);
            }
            int start = Math.clamp(from, 0, output.length());
            return new Chunk(output.substring(start), output.length(), ended);
        }
    }

    // Skickar en rad till spelet, som när man trycker Enter i terminalen
    void send(String line) throws IOException {
        touch();
        synchronized (stdin) {
            stdin.write(line);
            stdin.write('\n');
            stdin.flush();
        }
    }

    void close() {
        process.destroyForcibly();
        synchronized (lock) {
            ended = true;
            lock.notifyAll();
        }
    }

    boolean isEnded() {
        synchronized (lock) {
            return ended;
        }
    }

    Instant lastSeen() {
        return lastSeen;
    }

    private void touch() {
        lastSeen = Instant.now();
    }
}
