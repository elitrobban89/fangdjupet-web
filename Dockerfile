# Fångdjupet web – bygger spelet från grupprepot och webbservern härifrån, allt med javac.

FROM eclipse-temurin:27-jdk AS build

# Vilken gren av grupprepot som byggs.
# Byt till main när #16, #18 och #20 är mergade (grenen tas bort vid merge).
ARG GAME_REPO=ithsjava26/grupp8-fangdjupet
ARG GAME_REF=feature/rumskarta

ADD https://codeload.github.com/${GAME_REPO}/tar.gz/refs/heads/${GAME_REF} /tmp/game.tar.gz
RUN mkdir -p /src/game \
 && tar xzf /tmp/game.tar.gz --strip-components=1 -C /src/game \
 && javac --release 27 -encoding UTF-8 -d /out/game $(find /src/game/src/main/java -name '*.java')

COPY src /src/web
RUN javac --release 27 -encoding UTF-8 -d /out/web $(find /src/web/main/java -name '*.java') \
 && cp -r /src/web/main/resources/. /out/web/


FROM eclipse-temurin:27-jre

WORKDIR /app
COPY --from=build /out/game /app/game
COPY --from=build /out/web  /app/web

ENV GAME_CLASSPATH=/app/game \
    DATA_DIR=/tmp/fangdjupet-web \
    LANG=C.UTF-8

# Spelen körs inte som root
RUN useradd --system --create-home spel
USER spel

EXPOSE 10000
CMD ["java", "-XX:+UseSerialGC", "-Xmx64m", "-XX:TieredStopAtLevel=1", \
     "-cp", "/app/web", "se.elitrobban.fangdjupet.WebServer"]
