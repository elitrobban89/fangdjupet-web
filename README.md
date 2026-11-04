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
- **Musik och ljud** (`sound.js`, Web Audio – inga ljudfiler): egna retrolåtar i japansk RPG-stil i pentatoniska skalor, en för varje rum – huvudmenyn (yo), Skoldörren, Kafferummet (ryūkyū), en **klibbig** låt i städskrubben (iwato: tonerna glider in i varandra, svajar och är ostämda, med ett "plopp" som en mopp i hinken) och Lektionssalen (in-skalan). I strid byts låten: stridsmusik, en snabbare klibbig låt mot StädHäxan och egen bossmusik mot Lektor Martin. Jinglar vid vinst, game over och när Fångdjupet är vunnet. Varje fiende låter på sitt sätt (trollets klubba, trollkarlens zap, tvättsvampen, Svinto, kemikalierna, Martins bla-bla), boken bläddrar och kan slinta, Dela skärm klingar, stressbollen piper och säger boing, vapen klingar och rustning klonkar när man plockar upp, och det piper varnande vid lite hp. Stressbollen trycks ihop på skärmen, en slint gungar till och hp-mätaren pulserar rött när det är lite kvar. Utanför striden: fotsteg, prassel när man letar, buu-buu när man inte hittar något, diskett-bip när man sparar, brrrt vid fel val, glitter för Frida, fanfar när äventyret börjar, klick vid attackbyte, skrammel vid låsta rum, pratbubblor för repliker och tre toner när man avslutar – samma ljud som i konsolspelet.
- **Fula världsljud** (`sound.js`, bara på webben): gnissel, smällar och StädHäxans kraxande räknas fram sampel för sampel, som knäppar som ringer i ett klangrum och sedan krossas till få bitar. Varje rum har sin egen dörr, Entrédörren gnisslar upp när den är besegrad, och DROP TABLE får golvet att mullra. Lektionssalen har ett eget bakgrundsljud med lysrör, krita, en klocka som går fel och viskningar baklänges. Då och då hörs ett tyst småljud som hör till rummet, till exempel en kråka, ett rör som rapar, en mopp eller en stol som skrapar, men aldrig under strid.

**Animationer** (i effektlagret `#fx`, av med "minska rörelse"): pilen flyger över skärmen, magin sprakar, svärdet hugger, Java-symboler stiger ur boken, stressbollen flyger i en båge och studsar, och missar och slintar syns som MISS och en fallande bok. Fiendernas slag smäller (💥, ⚡, såpbubblor, Martins pratbubblor), skadan och helningen dyker upp som stora siffror, helning ger gröna plus, Martin gör entré med ett rött titelkort och skak, varje rum med ett titelkort, och repliker skrivs fram bokstav för bokstav. I striden står hälsan i en fast **stridspanel** under kartan: hjälten till vänster, fienden (eller fienderna) till höger, och mätarna uppdateras på plats i stället för att en ny mätare skrivs ut i loggen för varje slag. Panelen bleknar och försvinner när striden är slut. När Lektor Martin går över i fas 2 (*Utterly explained*) går bossmusiken upp i tempo (`bossFast`, som i konsolspelet). **Tydligare grafik:** större text i spelet, mer kontrast (ljusare text, bilder och svag text), större karta där låsta rum går att läsa, menyrubriken i guld, siffran i varje menyval i fet guld (utan ruta), bilderna i fet stil med ett svagt sken, tjockare hp-mätare med tydliga siffror och en egen ikon för USB-minnet. **Lavalampan** i fas 2 mot Martin: den står med bubblande lava under hans mätare i stridspanelen, lyser upp när den ger honom +3 hp, och spricker och faller när du krossar den (valet *Krossa lavalampan* är gulmarkerat, med en hammare). **USB-minnet** mot Martin (20 % chans att vinna direkt): USB-minnet glider in över skärmen, och lyckas det glitchar hela skärmen, virus flyger upp och det står *VIRUS! DATORN ÄR ÖVERTAGEN*. Blir man påkommen står det PÅKOMMEN! och skärmen skakar. Utanför striden: en gyllene svepning när du byter rum, Entrédörren slår igen med två trädörrar över skärmen, ett förstoringsglas som letar, fynd som poppar upp med strålar och flyger upp mot hörnet, rustningen som dunsar ned med en ring, ånga ur kaffet och kanelbullen, Frida som flyger över skärmen med glitter efter sig, en snurrande diskett när du sparar, K.O.! och damm när en fiende faller, ett rött hjärtslag i kanten så länge du har lite hp, GAME OVER som faller ned bokstav för bokstav i gråskala, fyrverkeri när Fångdjupet är vunnet, FAS 2 när Martin byter till Utterly explained, menyval som glider in ett i taget, och varje rum har sin stämning i bakgrunden: löv vid skoldörren, ånga i kafferummet, bubblor i städskrubben och kod i lektionssalen. Servern kör spelet med `-Dfangdjupet.animation=av`, så konsolens animation inte gör webben långsam. Medvetet fula 8-bitarsljud: knapptryck, ett krossat "PJOOO" när pilbågen skjuter, magi, svärdshugg, miss, skada, kaffe (glugg), föremål, dörren som slår igen och StädHäxans skratt. Knappen 🔊 Ljud stänger av (sparas i webbläsaren). Spelet på servern startas med `-Dfangdjupet.ljud=av`.
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
| `src/main/resources/static/sound.js` | Musiken och ljudeffekterna, syntade i webbläsaren. `WebServer` lägger en kontrollsumma på adressen, så spelarna får nya ljud direkt trots cachen |
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

Docker-bygget hämtar spelet direkt från grupprepot, grenen i `ARG GAME_REF` i `Dockerfile` (`main`).
Kör **Manual Deploy → Clear build cache & deploy** när grupprepot har ändrats.

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
