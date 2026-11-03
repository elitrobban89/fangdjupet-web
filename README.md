# Fångdjupet – webbversion

Spela [Fångdjupet](https://github.com/ithsjava26/grupp8-fangdjupet) i webbläsaren. Det är **det riktiga Java-spelet**,
oförändrat: en liten webbserver i Java startar `se.fangdjupet.Main` som en egen process för varje spelare och
kopplar processens `System.in` och `System.out` till en terminal på webbsidan.

```
 webbläsaren (index.html)                 WebServer (Java, bara JDK:n)              spelet (egen JVM per spelare)
 ┌──────────────────────┐  POST /api/input  ┌──────────────────────────┐  stdin   ┌───────────────────────────┐
 │ terminal + snabbval  │ ───────────────►  │ GameSession              │ ───────► │ java se.fangdjupet.Main   │
 │                      │ ◄───────────────  │  buffert med utskriften  │ ◄─────── │  (grupp8-fangdjupet)      │
 └──────────────────────┘  GET /api/output  └──────────────────────────┘  stdout  └───────────────────────────┘
                           (long polling)            │                               saves/ + fangdjupet.log
                                                     └── DATA_DIR/<spelar-id>/  ◄────  i spelarens egen mapp
```

- **Inga beroenden** – `com.sun.net.httpserver.HttpServer`, virtuella trådar och `ProcessBuilder` från JDK:n.
- **Spara och fortsätt fungerar**: webbläsaren får ett slumpat spelar-id (i `localStorage`), och spelet körs i en
  mapp per id. Sparningen finns kvar ett dygn, eller tills servern startas om.
- **Snabbval**: menyraderna (`1. Strid mot rummets fiende` …) blir knappar, bra på mobilen.
- **Musik och ljud** (`sound.js`, Web Audio – inga ljudfiler): egna retrolåtar i japansk RPG-stil i pentatoniska skalor, en för varje rum – huvudmenyn (yo), Skoldörren, Kafferummet (ryūkyū), en **klibbig** låt i städskrubben (iwato: tonerna glider in i varandra, svajar och är ostämda, med ett "plopp" som en mopp i hinken) och Lektionssalen (in-skalan). I strid byts låten: stridsmusik, en snabbare klibbig låt mot StädHäxan och egen bossmusik mot Lektor Martin. Jinglar vid vinst, game over och när Fångdjupet är vunnet. Medvetet fula 8-bitarsljud: knapptryck, ett krossat "PJOOO" när pilbågen skjuter, magi, svärdshugg, miss, skada, kaffe (glugg), föremål, dörren som slår igen och StädHäxans skratt. Knappen 🔊 Ljud stänger av (sparas i webbläsaren). Spelet på servern startas med `-Dfangdjupet.ljud=av`.
- **GAME OVER i rött**: spelets ANSI-färgkoder blir färg på sidan.
- **Skydd**: högst `MAX_SESSIONS` spel samtidigt, inaktiva spel stängs efter 10 min och alla efter 60 min,
  en rad är högst 200 tecken utan styrtecken, spelet körs som en vanlig användare (inte root) och sidan får
  bara visas i en iframe på elitrobban.se.

## Filer

| Fil | Vad |
|---|---|
| `src/main/java/se/elitrobban/fangdjupet/WebServer.java` | HTTP-servern: sidan, API:t och städningen |
| `src/main/java/se/elitrobban/fangdjupet/GameSession.java` | Ett spel: processen, utskriftsbufferten och inmatningen |
| `src/main/java/se/elitrobban/fangdjupet/Config.java` | Inställningar från miljövariabler |
| `src/main/resources/static/index.html` | Terminalen i webbläsaren: läser spelets rader och ritar dem med ikoner, hp-staplar, en HUD med en klickbar karta över rummen (spelets `KARTA`-rader) och hjältens hp, menyvalen i terminalen går att klicka på (ingen extra knapprad), svaret skrivs direkt på spelets svarsrad och skickas med Enter (ingen separat inmatningsruta), frågan ("Välj ett alternativ:") i rörlig guldtext med en knuffande pil, skolbyggnaden (`AsciiArt.SCHOOL`) som svag bakgrundsbild bara bakom huvudmenyn, skakning och röd blixt när Entrédörren slår igen och Skoldörren låses på kartan, j/n-knappar direkt på frågeraden ("Ja, ta den" för kaffet och kanelbullen), 😈 när StädHäxan skrattar elakt, gulmarkerade val, menyer som fälls ihop när man valt, attackbilder som sveper in, skakande skärm och röd blixt när hjälten tar skada, konfetti vid vinst. `prefers-reduced-motion` stänger av rörelserna. |
| `src/main/resources/static/sound.js` | Musiken och ljudeffekterna, syntade i webbläsaren |
| `src/main/resources/static/icon.svg` | Ikonen (favicon) |
| `src/main/resources/static/card.svg` | Projektkort 1200×630 ("Mitt projekt") |
| `wordpress/projektkort.html` | Kortet till projektrutnätet på elitrobban.se |
| `wordpress/spelsida.html` | Innehållet på sidan `/fangdjupet-java-cli-spel/` med spelet i en iframe |
| `Dockerfile`, `render.yaml` | Bygget och driften på Render |

## Köra lokalt

Kräver JDK 27 och att grupprepot ligger bredvid och är kompilerat (`mvn compile` i `grupp8-fangdjupet`).

```
javac --release 27 -d target/classes $(find src/main/java -name '*.java')
cp -r src/main/resources/. target/classes/
java -cp target/classes se.elitrobban.fangdjupet.WebServer
```

Öppna <http://localhost:8080>. I IntelliJ: kör `WebServer` (gröna play-knappen). Spelet hämtas från
`../grupp8-fangdjupet/target/classes`, eller från `GAME_CLASSPATH`.

## Lägga upp på Render

1. Lägg det här projektet i ett eget repo på GitHub.
2. På [render.com](https://render.com): **New → Blueprint** och välj repot. `render.yaml` skapar en gratis
   webbtjänst som bygger med `Dockerfile`. (Eller **New → Web Service → Docker** för hand.)
3. Render ger en adress, t.ex. `https://fangdjupet.onrender.com`. Öppna den och tryck **Starta spelet**.

Docker-bygget hämtar spelet direkt från grupprepot, grenen i `ARG GAME_REF` i `Dockerfile`.
**När #16, #18, #20, #21 och #22 är mergade: byt `GAME_REF` till `main`** – grenen `feature/rumskarta`
tas bort vid merge, och då går bygget inte längre. Kör sedan **Manual Deploy → Clear build cache & deploy**
när grupprepot har ändrats.

| Miljövariabel | Standard | Vad |
|---|---|---|
| `PORT` | 8080 (Render sätter 10000) | porten |
| `MAX_SESSIONS` | 5 | spel samtidigt – varje spel är en JVM på ca 40 MB, gratisplanen har 512 MB |
| `IDLE_MINUTES` / `MAX_MINUTES` | 10 / 60 | när ett spel stängs |
| `FRAME_ANCESTORS` | `'self' https://elitrobban.se https://www.elitrobban.se` | sidor som får visa spelet i en iframe |
| `GAME_CLASSPATH` | `../grupp8-fangdjupet/target/classes` | var spelets klasser finns (`/app/game` i Docker) |
| `DATA_DIR` | temp-mappen | sparfiler och loggar per spelare |

**Gratisplanen somnar** efter 15 minuter utan besök. Första besöket väcker den, vilket tar upp till en minut –
sidan säger till och väntar.

## På elitrobban.se

- **Projektkortet**: klistra in `wordpress/projektkort.html` bland de andra `pj-card` i rutnätet. Ikonen är
  inline-SVG, så den syns även när Render-servern sover.
- **Spelsidan**: lägg `wordpress/spelsida.html` i ett *Custom HTML*-block på `/fangdjupet-java-cli-spel/` och byt
  `SPELADRESS` mot Render-adressen.
- **Bilder**: `https://<render-adressen>/icon.svg` och `/card.svg` går att använda direkt, t.ex. som utvald bild.

---
Robert Andersson Kopler · [elitrobban.se](https://elitrobban.se) · spelet är ett grupparbete av grupp 8, ITHS.
