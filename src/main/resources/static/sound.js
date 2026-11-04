// Fångdjupets ljud: retromusik i japansk RPG-stil och fula 8-bitarsljud, allt syntat med Web Audio.
// Inga ljudfiler – varje låt är egna melodier i pentatoniska japanska skalor (yo, in, hirajōshi, iwato, ryūkyū).
// Window.Sound:  unlock()  music(namn)  sfx(namn)  toggle()  on
(() => {
  "use strict";

  // ---------- skalor (halvtoner från grundtonen) ----------
  const SCALES = {
    yo: [0, 2, 5, 7, 9],          // ljus, folkvisa
    ryukyu: [0, 4, 5, 7, 11],     // Okinawa: soligt och lite lojt
    iwato: [0, 1, 5, 6, 10],      // skev och obehaglig: städskrubben
    insen: [0, 1, 5, 7, 10],      // mörk: Lektionssalen och Martin
    hira: [0, 2, 3, 7, 8]         // hirajōshi: strid
  };

  // Låtarna. Varje token är ett åttondelssteg: en skalton (0 = grundtonen, 5 = oktaven över, -5 = oktaven under),
  // "_" håller förra tonen, "." är paus. Trummor: k = bas, s = virvel, h = hihat, p = klibbigt "plopp".
  const SONGS = {
    title: { scale: "yo", root: 62, bpm: 84, lead: "triangle", vol: 0.9,
      melody: "4 _ 3 2 3 _ _ . 2 _ 1 0 1 _ _ . 4 _ 5 6 7 _ 6 4 5 _ 4 3 2 _ _ .",
      bass:   "-5 _ _ _ -5 _ _ _ -7 _ _ _ -7 _ _ _ -6 _ _ _ -6 _ _ _ -5 _ _ _ -3 _ _ _",
      drums:  "....h.......h..." },
    door: { scale: "yo", root: 67, bpm: 132, lead: "square",
      melody: "0 2 4 5 4 _ 2 _ 3 4 3 2 1 _ . . 0 2 4 5 7 _ 5 4 3 _ 2 _ 1 _ 0 _",
      bass:   "-5 . -5 . -3 . -3 . -4 . -4 . -2 . -2 .",
      drums:  "k.h.s.h.k.k.s.h." },
    coffee: { scale: "ryukyu", root: 65, bpm: 96, lead: "triangle", swing: 0.6,
      melody: "4 _ 3 _ 2 3 _ . 1 _ 2 _ 0 _ _ . 2 _ 3 4 5 _ 4 . 3 _ 2 1 2 _ _ .",
      bass:   "-5 _ . -3 -5 _ . -3 -4 _ . -2 -4 _ . -1",
      drums:  "k..h.s.hk..h.s.h" },
    // Städskrubben: klibbig – tonerna glider in i varandra som i såpa, svajar och är lite ostämda, och "plopp" som en mopp i hinken
    sticky: { scale: "iwato", root: 60, bpm: 76, lead: "square", swing: 0.64, sticky: true,
      melody: "0 _ 1 _ _ . 0 . 2 _ 1 _ 0 _ _ . 3 _ 2 _ 1 _ 2 . 1 _ _ _ 0 _ . .",
      bass:   "-5 . -5 -4 . -5 . . -3 . -3 -4 . -5 . .",
      drums:  "k..p..s.k.p..ps." },
    stickyFight: { scale: "iwato", root: 60, bpm: 108, lead: "square", swing: 0.6, sticky: true,
      melody: "0 1 0 _ 2 _ 1 . 3 2 1 _ 0 _ _ . 5 _ 3 2 1 _ 2 1 0 _ -1 _ 0 _ . .",
      bass:   "-5 -5 . -4 -5 . -3 . -5 -5 . -4 -3 . -4 .",
      drums:  "k.ps.kpsk.ps.kss" },
    lecture: { scale: "insen", root: 57, bpm: 100, lead: "triangle", creepy: true,
      melody: "0 _ _ 1 _ _ 2 _ 3 _ 2 _ 1 _ _ . 0 _ _ 1 _ _ 2 _ 4 _ 3 _ 1 _ _ .",
      bass:   "-5 _ _ _ -5 _ _ _ -4 _ _ _ -5 _ _ _",
      drums:  "k.......s.......k.k.....s......." },
    battle: { scale: "hira", root: 64, bpm: 156, lead: "square",
      melody: "5 4 3 2 3 _ 0 _ 1 2 3 _ 2 _ _ . 5 4 3 2 3 _ 5 _ 6 _ 5 4 3 _ _ .",
      bass:   "-5 -5 -5 -5 -3 -3 -3 -3 -4 -4 -4 -4 -2 -2 -1 -1",
      drums:  "k.hsk.hsk.hsk.ss" },
    boss: { scale: "insen", root: 62, bpm: 168, lead: "sawtooth", vol: 0.7,
      melody: "0 1 0 -1 0 _ 3 _ 2 1 2 3 4 _ _ . 5 4 3 4 3 _ 2 _ 1 _ 0 _ -1 _ _ .",
      bass:   "-5 . -5 -5 . -5 -4 . -5 . -5 -5 . -3 -4 .",
      drums:  "k.hsk.hsk.hskkss" },
    // Martins fas 2 (Utterly explained): samma låt, snabbare och en ton högre – som i konsolspelet
    bossFast: { scale: "insen", root: 64, bpm: 228, lead: "sawtooth", vol: 0.75,
      melody: "0 1 0 -1 0 _ 3 _ 2 1 2 3 4 _ _ . 5 4 3 4 3 _ 2 _ 1 _ 0 _ -1 _ _ .",
      bass:   "-5 . -5 -5 . -5 -4 . -5 . -5 -5 . -3 -4 .",
      drums:  "kkhskkhskkhskkss" }
  };
  // Korta slingor som spelas en gång
  const JINGLES = {
    win:  { scale: "yo", root: 67, bpm: 180, lead: "square", vol: 0.45, bassVol: 0.45, melody: "0 2 4 5 7 _ _ _", bass: "-5 _ _ _ -3 _ _ _" },
    final:{ scale: "yo", root: 67, bpm: 150, lead: "square", melody: "0 2 4 5 4 5 7 _ 7 9 10 _ _ _ _ _", bass: "-5 _ -3 _ -4 _ -5 _ -5 _ -5 _ _ _ _ _" },
    lose: { scale: "insen", root: 57, bpm: 90, lead: "sawtooth", melody: "5 4 3 2 1 _ 0 _ _ _ . .", bass: "-5 _ _ _ -6 _ _ _ -10 _ _ _" }
  };

  const parse = s => s.split(/\s+/).filter(Boolean);
  const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const pitch = (song, deg) => {
    const sc = SCALES[song.scale], n = sc.length;
    const o = Math.floor(deg / n);
    return song.root + sc[((deg % n) + n) % n] + 12 * o;
  };

  const MUSIC_VOL = 0.32;
  let ctx = null, master, musicBus, sfxBus, noiseBuf, crusher;
  let on = true;
  try { on = localStorage.getItem("fangdjupet-ljud") !== "av"; } catch {}

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = on ? 0.55 : 0;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // grov distorsion för de fula ljuden
      crusher = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.round(x * 4) / 4; }   // 8-bitarstrappa
      crusher.curve = curve;
      crusher.connect(sfxBus);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  // ---------- byggstenar ----------
  function tone(type, f, t, dur, vol, out, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(o.from || f, t);
    if (o.from) osc.frequency.exponentialRampToValueAtTime(f, t + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = o.vibrato; lg.gain.value = o.depth || 18;
      lfo.connect(lg).connect(osc.detune); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc.connect(g);
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = o.q || 1;
      lp.frequency.setValueAtTime(o.lowpass, t);
      if (o.lowpassTo) lp.frequency.exponentialRampToValueAtTime(o.lowpassTo, t + dur);
      node = node.connect(lp);
    }
    node.connect(out);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(t, dur, vol, out, o = {}) {
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = noiseBuf;
    f.type = o.type || "bandpass"; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  function drum(ch, t, out) {
    if (ch === "k") tone("sine", 45, t, 0.18, 0.9, out, { from: 140, glide: 0.08 });
    else if (ch === "s") { noise(t, 0.12, 0.35, out, { f: 1800, q: 0.7 }); tone("triangle", 180, t, 0.08, 0.25, out); }
    else if (ch === "h") noise(t, 0.035, 0.18, out, { type: "highpass", f: 7000 });
    else if (ch === "p") tone("sine", 160, t, 0.16, 0.5, out, { from: 700, glide: 0.1 });   // "plopp": mopp i hinken
  }

  // ---------- musiken ----------
  let song = null, songName = "", step = 0, nextAt = 0, timer = null, voice = null;
  let once = null;   // jingel som spelas en gång innan låten fortsätter

  function stepDur(s) { return 60 / s.bpm / 2; }

  function playStep(s, i, t) {
    const sd = stepDur(s);
    const swing = s.swing && i % 2 === 1 ? sd * (s.swing - 0.5) * 2 : 0;
    const at = t + swing;
    const mel = s._m || (s._m = parse(s.melody)), bas = s._b || (s._b = parse(s.bass)),
          drm = s.drums ? (s._d || (s._d = [...s.drums])) : null;
    const len = (arr, tok) => { let n = 1; for (let j = i + 1; arr[j % arr.length] === "_" && n < arr.length; j++) n++; return n; };

    const m = mel[i % mel.length];
    if (m !== "_" && m !== ".") {
      const f = freq(pitch(s, +m)), dur = len(mel) * sd * 0.92, v = 0.16 * (s.vol || 1);
      if (s.sticky) {
        // glider från förra tonen, svajar och har en ostämd tvilling: som att trampa i såpa
        const from = voice || f * 0.94;
        tone("square", f, at, dur, v * 0.8, musicBus, { from, glide: sd * 0.9, vibrato: 5.5, depth: 28, lowpass: 2400, lowpassTo: 700, q: 6 });
        tone("square", f, at, dur, v * 0.45, musicBus, { from, glide: sd * 1.2, detune: 22, lowpass: 1800 });
      } else {
        tone(s.lead, f, at, dur, v, musicBus, s.creepy
          ? { vibrato: 3.2, depth: 30, detune: 16 * Math.sin(i * 0.37) }   // Lektionssalen: tonerna håller inte riktigt stämningen
          : { vibrato: dur > sd * 2 ? 6 : 0, depth: 12 });
        if (s.creepy && dur > sd * 2) tone("sine", f * Math.SQRT2, at, dur * 1.5, v * 0.35, musicBus, { attack: dur * 0.9, vibrato: 2.3, depth: 45 });   // en tritonus växer fram bakom
        if (s.lead === "square") tone("square", f * 2, at + sd * 0.5, sd * 0.5, v * 0.18, musicBus);   // eko en oktav upp
      }
      voice = f;
    }
    const b = bas[i % bas.length];
    if (b !== "_" && b !== ".") {
      const f = freq(pitch(s, +b)), dur = len(bas) * sd * 0.9;
      if (s.sticky) tone("sawtooth", f, at, dur, 0.2, musicBus, { lowpass: 900, lowpassTo: 160, q: 9 });   // squelch
      else tone("triangle", f, at, dur, 0.28 * (s.bassVol || 1), musicBus);
    }
    if (drm) drum(drm[i % drm.length], at, musicBus);
  }

  function loopLength(s) {
    const a = parse(s.melody).length, b = parse(s.bass).length, c = s.drums ? s.drums.length : 1;
    const g = (x, y) => y ? g(y, x % y) : x, l = (x, y) => x * y / g(x, y);
    return l(l(a, b), c);
  }

  function tick() {
    if (!ctx || !on) return;
    haunt(songName === "lecture");
    oddNoises();
    while (nextAt < ctx.currentTime + 0.15) {
      if (once) {
        playStep(once.song, once.i, nextAt);
        nextAt += stepDur(once.song);
        if (++once.i >= once.len) { once = null; step = 0; voice = null; }
        continue;
      }
      if (!song) { nextAt = ctx.currentTime + 0.05; return; }
      playStep(song, step, nextAt);
      nextAt += stepDur(song);
      step = (step + 1) % (song._len || (song._len = loopLength(song)));
    }
  }

  function start() {
    if (!timer) timer = setInterval(tick, 25);
    if (ctx && nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
  }

  function music(name) {
    if (name === songName) return;
    songName = name;
    song = name ? SONGS[name] : null;
    step = 0; voice = null;
    if (!ctx) return;
    nextAt = Math.max(nextAt, ctx.currentTime + 0.05);
    start();
  }

  function jingle(name, then) {
    if (!ctx || !on) { if (then !== undefined) music(then); return; }
    const s = JINGLES[name];
    once = { song: s, i: 0, len: parse(s.melody).length };
    songName = then === undefined ? songName : then;
    song = then === undefined ? song : (then ? SONGS[then] : null);
    nextAt = ctx.currentTime + 0.05;
    start();
  }

  // ---------- fula världsljud: räknas fram sampel för sampel ----------
  // En oscillator kan inte gnissla. Ett gångjärn fastnar och släpper hundra gånger i sekunden, och varje
  // släpp är en knäpp som får träet att ringa. Städhäxans stämband är samma sak med en mun som klangrum.
  // Därför byggs de här ljuden av knäppar (pulses) som ringer (ring) och sedan krossas (ugly).
  const seeded = seed => () => {
    seed = seed + 0x6D2B79F5 | 0;
    let x = Math.imul(seed ^ seed >>> 15, 1 | seed);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  const fresh = () => seeded(Math.random() * 2147483647 | 0);   // varje dörr gnisslar lite olika

  // Knäppar: rate(u) ger knäppar per sekund vid u = 0..1, och 0 betyder att gångjärnet sitter fast en stund
  function pulses(n, sr, rate, amp, r, jitter = 0.3) {
    const x = new Float32Array(n);
    for (let p = 0; p < n;) {
      const u = p / n, hz = rate(u);
      if (hz <= 0) { p += sr * 0.02; continue; }
      x[p | 0] = amp(u) * (0.55 + 0.45 * r());
      p += sr / hz * (1 + (r() - 0.5) * jitter);
    }
    return x;
  }

  // Klangrummet: res är [hz, avklingning i sekunder, styrka] för varje resonans
  function ring(x, sr, res) {
    const y = new Float32Array(x.length);
    for (const [hz, decay, gain] of res) {
      const R = Math.exp(-1 / (decay * sr)), a1 = 2 * R * Math.cos(2 * Math.PI * hz / sr), a2 = -R * R, k = gain * (1 - R);
      let y1 = 0, y2 = 0;
      for (let i = 0; i < x.length; i++) { const v = x[i] * k + a1 * y1 + a2 * y2; y2 = y1; y1 = v; y[i] += v; }
    }
    return y;
  }

  function normal(d) {
    let peak = 1e-6;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    for (let i = 0; i < d.length; i++) d[i] /= peak;
    return d;
  }

  // Krossen: förvrängning, få bitar och låg samplingsfrekvens. Det är här ljudet blir fult på riktigt.
  function ugly(d, sr, hz, bits, drive) {
    normal(d);
    const step = Math.max(1, Math.round(sr / hz)), levels = 2 ** (bits - 1), end = Math.min(d.length, sr * 0.01 | 0);
    for (let i = 0; i < d.length; i += step) {
      const v = Math.round(Math.tanh(d[i] * drive) * levels) / levels;
      for (let j = i; j < Math.min(i + step, d.length); j++) d[j] = v;
    }
    for (let i = 0; i < end; i++) d[d.length - 1 - i] *= i / end;   // inget knäpp när ljudet tar slut
    return d;
  }

  function mixIn(d, x, at, gain) {
    normal(x);
    for (let i = 0; i < x.length && at + i < d.length; i++) d[at + i] += x[i] * gain;
  }

  const FOLEY_VOL = 0.4;    // alla världsljud på en gång: de ska skrämmas, inte skrika
  const CROAK_VOL = 0.5;    // kraxandet ligger över resten: StädHäxan ska höras
  function splay(d, t, vol, level = FOLEY_VOL) {
    const b = ctx.createBuffer(1, d.length, ctx.sampleRate), src = ctx.createBufferSource(), g = ctx.createGain();
    b.copyToChannel(d, 0);
    src.buffer = b; g.gain.value = vol * level;
    src.connect(g).connect(sfxBus);
    src.start(t);
    return src;
  }

  // Musiken viker undan så att gnisslet hörs
  function duck(t, dur) {
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(MUSIC_VOL * 0.4, t, 0.03);
    musicBus.gain.setTargetAtTime(MUSIC_VOL, t + dur, 0.25);
  }

  // Varje rum har sin dörr: from/to är knäppar per sekund, res är dörrens virke.
  // Håll dem över ungefär 50: långsammare knäppar hörs en och en, och då hakar gnisslet upp sig.
  const DOORS = {
    skol:    { dur: 1.2, from: 110, to: 190, hz: 11000, bits: 6, res: [[420, 0.03, 1], [1150, 0.02, 0.7], [2300, 0.012, 0.4]] },
    kaffe:   { dur: 0.7, from: 240, to: 420, hz: 14000, bits: 6, res: [[1500, 0.012, 1], [2900, 0.01, 0.7]] },
    skrubb:  { dur: 0.9, from: 70, to: 120, hz: 9000, bits: 5, res: [[320, 0.05, 1], [760, 0.03, 0.6]] },
    lektion: { dur: 1.7, from: 120, to: 62, hz: 8000, bits: 5, res: [[260, 0.06, 1], [610, 0.04, 0.6], [1900, 0.01, 0.25]] },
    entre:   { dur: 2.1, from: 80, to: 230, hz: 10000, bits: 5, res: [[300, 0.05, 1], [980, 0.025, 0.8], [2100, 0.012, 0.5]] }
  };

  // Ett jämnt gnissel som glider från from till to, utan stopp
  function creak(o) {
    const sr = ctx.sampleRate, n = o.dur * sr | 0, r = fresh(), ph = r() * 6;
    const rate = u => (o.from + (o.to - o.from) * u * u * (3 - 2 * u)) * (1 + 0.05 * Math.sin(u * o.dur * 9 + ph));
    const amp = u => Math.sin(Math.PI * u) ** 0.7;
    return ugly(ring(pulses(n, sr, rate, amp, r, 0.04), sr, o.res), sr, o.hz, o.bits, 1.6);
  }

  // En smäll: tung duns, ramen skramlar, och ekot i korridoren
  function bang(dur, low, rattleRes, drive) {
    const sr = ctx.sampleRate, n = dur * sr | 0, r = fresh(), d = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      phase += 2 * Math.PI * (low + 70 * Math.exp(-t * 22)) / sr;
      d[i] = Math.sin(phase) * Math.exp(-t * 9) + (r() * 2 - 1) * Math.exp(-t * 60) * 0.7;
    }
    mixIn(d, ring(pulses(n, sr, u => u < 0.5 ? 34 - 40 * u : 0, u => u < 0.04 ? 0 : (1 - u) ** 2, r, 0.6), sr, rattleRes), 0, 0.5);
    const delay = sr * 0.17 | 0;
    for (let i = delay; i < n; i++) d[i] += d[i - delay] * 0.38;
    return ugly(d, sr, 7000, 5, drive);
  }

  // Ett kraxande: stämband som knappt håller ihop. Varannan puls är svagare, och det är det som rosslar.
  function croakData(dur, from, to, seedR) {
    const sr = ctx.sampleRate, n = dur * sr | 0, r = seedR || fresh(), x = new Float32Array(n), rasp = sr * 0.004 | 0;
    let weak = false;
    for (let p = 0; p < n;) {
      const u = p / n, hz = (from + (to - from) * u) * (1 + 0.18 * Math.sin(u * 40));
      const a = Math.min(1, u * 14) * Math.min(1, (1 - u) * 4) * (weak ? 0.45 : 1);
      for (let j = 0; j < rasp && p + j < n; j++) x[(p | 0) + j] += (r() * 2 - 1) * a * 0.35 * (1 - j / rasp);
      x[p | 0] += a;
      weak = !weak;
      p += sr / hz * (1 + (r() - 0.5) * 0.4);
    }
    return ugly(ring(x, sr, [[720, 0.006, 1], [1240, 0.005, 0.8], [2750, 0.004, 0.5]]), sr, 10000, 5, 3.2);
  }

  // ---------- Lektionssalen: något är fel där inne ----------
  // Ett lysrör som brummar och blinkar, och långt bort krita, en klocka som går fel och viskningar baklänges.
  const HAUNT_RATE = 12000, HAUNT_SECONDS = 28, HAUNT_VOL = 0.5;
  function hauntData() {
    const sr = HAUNT_RATE, n = HAUNT_SECONDS * sr, r = seeded(1338), d = new Float32Array(n);
    let flicker = 1, goal = 1;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      if (i % 600 === 0) goal = i < n - 2 * sr && r() < 0.06 ? 0.15 : 1;
      flicker += (goal - flicker) * 0.02;
      const hum = Math.sin(2 * Math.PI * 100 * t) * 0.5 + Math.sin(2 * Math.PI * 200 * t) * 0.25
        + (Math.sin(2 * Math.PI * 300 * t) > 0 ? 0.12 : -0.12);
      d[i] = hum * flicker * 0.05 + (Math.sin(2 * Math.PI * 41 * t) + Math.sin(2 * Math.PI * 43.75 * t)) * 0.03;
    }
    const chalk = (at, dur) => mixIn(d, ring(pulses(dur * sr | 0, sr, u => 620 + 380 * Math.sin(u * 9),
      u => Math.sin(Math.PI * u), r, 0.2), sr, [[2300, 0.01, 1], [3700, 0.008, 0.7]]), at * sr | 0, 0.3);
    const whisper = (at, dur, syllables) => {
      const x = new Float32Array(dur * sr | 0);
      for (let i = 0; i < x.length; i++) {
        const u = i / x.length;   // stiger och klipps av: så låter tal som spelas baklänges
        x[i] = (r() * 2 - 1) * u ** 2.2 * Math.abs(Math.sin(Math.PI * u * syllables)) ** 0.5;
      }
      mixIn(d, ring(x, sr, [[480, 0.004, 1], [1400, 0.003, 0.8], [2500, 0.003, 0.5]]), at * sr | 0, 0.28);
    };
    const clock = at => {
      const x = new Float32Array(3 * sr);
      [0, 0.4, 0.8, 1.2, 1.95, 2.1].forEach(s => x[s * sr | 0] = 1);   // de två sista kommer fel
      mixIn(d, ring(x, sr, [[1700, 0.006, 1], [900, 0.01, 0.6]]), at * sr | 0, 0.22);
    };
    chalk(3.5, 0.8); whisper(8, 1.8, 7); clock(12); chalk(17, 0.5); whisper(21.5, 2.4, 9);
    return ugly(d, sr, 6000, 6, 1.4);
  }

  let hauntBuf = null, hauntSrc = null, hauntGain = null;
  function haunt(want) {
    if (want === !!hauntSrc) return;
    const t = ctx.currentTime;
    if (want) {
      if (!hauntBuf) {
        hauntBuf = ctx.createBuffer(1, HAUNT_RATE * HAUNT_SECONDS, HAUNT_RATE);
        hauntBuf.copyToChannel(hauntData(), 0);
      }
      hauntSrc = ctx.createBufferSource(); hauntGain = ctx.createGain();
      hauntSrc.buffer = hauntBuf; hauntSrc.loop = true;
      hauntGain.gain.setValueAtTime(0, t);
      hauntGain.gain.setTargetAtTime(HAUNT_VOL, t, 0.8);
      hauntSrc.connect(hauntGain).connect(musicBus);
      hauntSrc.start(t);
    } else {
      hauntGain.gain.setTargetAtTime(0, t, 0.3);
      hauntSrc.stop(t + 1.5);
      hauntSrc = null;
    }
  }

  // Dov träduns. Tonhöjden varierar lite, annars blir samma ljud tjatigt i en lång strid.
  function wood(pitch) {
    const sr = ctx.sampleRate, x = new Float32Array(sr * 0.22 | 0), r = fresh(), p = pitch * (0.92 + r() * 0.16);
    for (let i = 0; i < sr * 0.006; i++) x[i] = (r() * 2 - 1) * (1 - i / (sr * 0.006));
    return ugly(ring(x, sr, [[150 * p, 0.07, 1], [340 * p, 0.04, 0.6], [690 * p, 0.02, 0.25]]), sr, 9000, 6, 2);
  }

  let creaking = null;   // dörren som gnisslar just nu: smäller den igen tystnar gnisslet
  function door(o, t) {
    SFX.steps(t);
    const at = t + 0.42;
    creaking = splay(creak(o), at, 0.5);
    duck(at, o.dur);
    return at + o.dur;
  }

  // ---------- ljudeffekterna: medvetet fula ----------
  const SFX = {
    blip(t) { tone("square", 1320, t, 0.05, 0.12, sfxBus, { from: 880, glide: 0.03 }); },
    // pilbågen: ett skränigt, krossat "PJOOO" med en ostämd tvilling och brus
    shoot(t) {
      tone("sawtooth", 70, t, 0.26, 0.5, crusher, { from: 1400, glide: 0.22 });
      tone("square", 85, t, 0.22, 0.3, crusher, { from: 1530, glide: 0.2 });
      noise(t, 0.1, 0.45, crusher, { f: 3500, to: 600, q: 2 });
    },
    magic(t) {
      tone("triangle", 1800, t, 0.4, 0.22, sfxBus, { from: 300, glide: 0.3, vibrato: 18, depth: 60 });
      [0, 1, 2, 3].forEach(i => tone("square", freq(84 + [0, 4, 7, 12][i]), t + 0.08 * i, 0.08, 0.06, sfxBus));
    },
    slash(t) {
      noise(t, 0.14, 0.55, sfxBus, { f: 2500, to: 400, q: 1.5 });
      tone("square", 50, t, 0.12, 0.3, crusher, { from: 160, glide: 0.1 });
    },
    smart(t) { [0, 2, 4, 7].forEach((d, i) => tone("square", freq(76 + d), t + 0.05 * i, 0.06, 0.08, sfxBus)); },
    whoosh(t) { noise(t, 0.28, 0.3, sfxBus, { f: 3000, to: 250, q: 3 }); },
    hurt(t) {
      tone("square", 60, t, 0.22, 0.45, crusher, { from: 190, glide: 0.18 });
      noise(t, 0.12, 0.35, crusher, { type: "lowpass", f: 1200 });
    },
    gulp(t) { [0, 0.14].forEach(d => tone("sine", 620, t + d, 0.12, 0.35, sfxBus, { from: 260, glide: 0.1 })); },
    pickup(t) { [0, 2, 4, 5].forEach((d, i) => tone("square", freq(pitch(SONGS.door, d) + 12), t + 0.06 * i, 0.07, 0.1, sfxBus)); },
    slam(t) {
      if (creaking) { creaking.stop(t); creaking = null; }
      splay(bang(1.1, 40, [[2400, 0.02, 1], [3700, 0.015, 0.7]], 2.6), t, 0.85);
      duck(t, 0.9);
    },
    // ---- dörrarna: varje rum gnisslar på sitt sätt ----
    doorSkol(t) { door(DOORS.skol, t); },
    doorKaffe(t) { door(DOORS.kaffe, t); },
    doorSkrubb(t) { const end = door(DOORS.skrubb, t); tone("sine", 130, end - 0.1, 0.2, 0.22, sfxBus, { from: 800, glide: 0.12 }); },   // klibbig: släpper med ett "plopp"
    doorLektion(t) { door(DOORS.lektion, t); },
    // Entrédörren är besegrad och glider upp, långsamt och högt. En skruv ramlar ur och studsar.
    doorOpen(t) {
      splay(creak(DOORS.entre), t, 0.6);
      duck(t, DOORS.entre.dur);
      [0, 0.17, 0.29, 0.36].forEach((d, i) => tone("sine", 2900, t + DOORS.entre.dur + d, 0.09, 0.14 / (i + 1), sfxBus));
    },
    // Striden mot Entrédörren: en kort träduns åt varje håll. De hörs varje runda, så de ska vara dova och korta.
    doorHit(t) { splay(wood(1), t, 0.55); },
    doorSlap(t) { splay(wood(0.7), t, 0.7); },
    // DROP TABLE: golvet under Martin mullrar och ger sedan vika
    dropTable(t) {
      const sr = ctx.sampleRate, n = sr * 1.7 | 0, r = fresh();
      const rumble = ring(pulses(n, sr, u => 34 + 30 * u, u => Math.min(1, u * 5) * (1 - u) ** 0.6, r, 0.7), sr,
        [[46, 0.18, 1], [88, 0.1, 0.8], [240, 0.03, 0.4]]);
      splay(ugly(rumble, sr, 5000, 4, 3.4), t, 0.85);
      splay(bang(0.9, 30, [[700, 0.03, 1], [1500, 0.02, 0.6]], 3), t + 1.1, 0.8);
      duck(t, 1.9);
    },
    // Något hemligt är hittat: en egen gåtslinga som går upp i sicksack och landar i ett mystiskt ackord
    secret(t) {
      const at = t + 0.35;
      [0, 7, 3, 10, 5, 12, 8, 15].forEach((d, i) => {
        tone("triangle", freq(67 + d), at + i * 0.11, 0.2, 0.07, sfxBus);
        tone("square", freq(79 + d), at + i * 0.11, 0.07, 0.015, sfxBus, { lowpass: 2600 });
      });
      [15, 19, 22].forEach(d => tone("triangle", freq(67 + d), at + 0.92, 0.9, 0.05, sfxBus, { vibrato: 5, depth: 10 }));
      duck(at, 1.6);
    },
    // ---- StädHäxan: hon kraxar ----
    croak(t) {
      const twice = Math.random() < 0.5;
      splay(croakData(0.34, 125, 82), t + 0.16, 0.55, CROAK_VOL);
      if (twice) splay(croakData(0.24, 112, 78), t + 0.56, 0.45, CROAK_VOL);
    },
    cackle(t) {
      [150, 172, 160, 140, 118].forEach((hz, i) => splay(croakData(0.12, hz, hz * 0.8), t + i * 0.15, 0.5, CROAK_VOL));
      duck(t, 0.8);
    },
    croakDie(t) {
      splay(croakData(1.0, 115, 26), t, 0.6, CROAK_VOL);
      tone("sine", 120, t + 1, 0.2, 0.2, sfxBus, { from: 700, glide: 0.12 });
      duck(t, 1.1);
    },
    alert(t) { tone("square", freq(81), t, 0.08, 0.12, sfxBus); tone("square", freq(74), t + 0.09, 0.12, 0.12, sfxBus); },
    find(t) { [0, 4, 7, 12, 16].forEach((d, i) => tone("triangle", freq(79 + d), t + 0.07 * i, 0.12, 0.12, sfxBus)); },
    // ---- fiendernas slag: varje fiende låter på sitt eget sätt ----
    club(t) { tone("sine", 55, t, 0.25, 0.8, sfxBus, { from: 180, glide: 0.1 }); noise(t, 0.2, 0.5, crusher, { type: "lowpass", f: 400 }); },
    zap(t) {
      tone("sawtooth", 2000, t, 0.2, 0.22, crusher, { from: 200, glide: 0.15, vibrato: 40, depth: 200 });
      tone("square", 2600, t + 0.05, 0.12, 0.06, sfxBus);
    },
    splat(t) { noise(t, 0.25, 0.7, crusher, { type: "lowpass", f: 1500, to: 200, q: 2 }); tone("sine", 90, t, 0.15, 0.5, sfxBus, { from: 300, glide: 0.1 }); },
    hiss(t) { noise(t, 0.45, 0.35, sfxBus, { type: "highpass", f: 4000 }); },
    fizz(t) {
      noise(t, 0.5, 0.3, sfxBus, { f: 5000, to: 1500, q: 6 });
      for (let i = 0; i < 5; i++) tone("sine", 900 + i * 150, t + i * 0.07, 0.05, 0.12, sfxBus, { from: 400, glide: 0.03 });
    },
    blah(t) { [0, 3, -2, 1, 5, -1].forEach((d, i) => tone("square", freq(57 + d), t + i * 0.08, 0.07, 0.12, sfxBus, { vibrato: 9, depth: 40, lowpass: 1200, q: 2 })); },
    // ---- hjältens nya saker ----
    page(t) { noise(t, 0.12, 0.3, sfxBus, { type: "highpass", f: 3000 }); noise(t + 0.1, 0.08, 0.25, sfxBus, { f: 2000 }); },
    slip(t) {
      tone("square", 200, t, 0.55, 0.2, crusher, { from: 900, glide: 0.5, vibrato: 12, depth: 50 });
      tone("sine", 50, t + 0.5, 0.2, 0.6, sfxBus, { from: 150, glide: 0.1 });
    },
    chime(t) { [0, 4, 7, 12, 16].forEach((d, i) => tone("triangle", freq(72 + d), t + 0.06 * i, 0.3, 0.12, sfxBus)); },
    boing(t) { tone("sine", 300, t, 0.4, 0.4, sfxBus, { from: 120, glide: 0.08, vibrato: 14, depth: 300 }); },
    squeak(t) {
      tone("square", 1400, t, 0.1, 0.12, sfxBus, { from: 900, glide: 0.06 });
      tone("square", 1500, t + 0.12, 0.1, 0.1, sfxBus, { from: 950, glide: 0.06 });
    },
    clang(t) {
      tone("square", 1250, t, 0.4, 0.12, sfxBus);
      tone("square", 1873, t, 0.35, 0.08, sfxBus, { detune: 15 });
      noise(t, 0.05, 0.3, sfxBus, { type: "highpass", f: 6000 });
    },
    clank(t) { noise(t, 0.15, 0.5, crusher, { f: 900, q: 4 }); tone("triangle", 330, t, 0.2, 0.2, sfxBus); },
    munch(t) { for (let i = 0; i < 3; i++) noise(t + i * 0.11, 0.07, 0.45, crusher, { type: "lowpass", f: 1500 }); },
    lowhp(t) { tone("square", 988, t, 0.09, 0.1, sfxBus); tone("square", 988, t + 0.16, 0.09, 0.1, sfxBus); },
    // ---- utanför striden: gå, leta, spara, prata (samma som konsolspelets RetroSpeaker) ----
    steps(t) { for (let i = 0; i < 4; i++) { noise(t + i * 0.16, 0.05, 0.4, crusher, { type: "lowpass", f: 700, q: 2 }); tone("sine", 70, t + i * 0.16, 0.06, 0.3, sfxBus, { from: 140, glide: 0.03 }); } },
    rummage(t) { for (let i = 0; i < 6; i++) noise(t + i * 0.07, 0.05, 0.25, sfxBus, { f: 1800 + (i % 3) * 900, q: 3 }); },
    nope(t) {
      tone("square", 220, t, 0.16, 0.14, sfxBus, { lowpass: 1500 });
      tone("square", 165, t + 0.18, 0.3, 0.14, sfxBus, { from: 185, glide: 0.2, lowpass: 1200 });
    },
    save(t) {
      tone("square", 1760, t, 0.05, 0.1, sfxBus); tone("square", 1760, t + 0.08, 0.05, 0.1, sfxBus);
      tone("triangle", freq(84), t + 0.18, 0.25, 0.14, sfxBus);
      noise(t + 0.02, 0.15, 0.08, sfxBus, { type: "highpass", f: 5000 });
    },
    buzz(t) { tone("square", 110, t, 0.22, 0.16, crusher, { detune: 30 }); },
    sparkle(t) { for (let i = 0; i < 7; i++) tone("triangle", freq(84 + (i * 5) % 12 + Math.floor(i / 3) * 12), t + i * 0.05, 0.12, 0.08, sfxBus); },
    fanfare(t) {
      const up = [0, 0, 0, 5], len = [0.1, 0.1, 0.1, 0.45];
      let at = t;
      up.forEach((d, i) => { tone("square", freq(67 + d), at, len[i], 0.12, sfxBus); tone("triangle", freq(55 + d), at, len[i], 0.14, sfxBus); at += len[i] + 0.03; });
    },
    swap(t) { tone("square", 900, t, 0.03, 0.1, sfxBus); tone("square", 1350, t + 0.07, 0.03, 0.1, sfxBus); },
    // handtaget skramlar, och dörren ger sig inte
    locked(t) {
      const sr = ctx.sampleRate, x = new Float32Array(sr * 0.5 | 0), r = fresh();
      [0, 0.07, 0.15, 0.2, 0.31].forEach(s => x[(s + r() * 0.02) * sr | 0] = 0.6 + r() * 0.4);
      splay(ugly(ring(x, sr, [[1900, 0.03, 1], [3300, 0.02, 0.7], [5100, 0.012, 0.4]]), sr, 11000, 5, 3), t, 0.4);
      tone("sine", 90, t + 0.38, 0.12, 0.3, sfxBus);
    },
    talk(t) { [0, 4, 2, 5].forEach((d, i) => tone("square", freq(69 + d), t + i * 0.07, 0.05, 0.08, sfxBus, { lowpass: 2500 })); },
    bag(t) { noise(t, 0.25, 0.25, sfxBus, { f: 1500, to: 5000, q: 4 }); tone("square", 400, t, 0.25, 0.04, sfxBus, { from: 200, glide: 0.25 }); },
    drop(t) { tone("sine", 80, t, 0.18, 0.4, sfxBus, { from: 260, glide: 0.12 }); },
    bye(t) { [12, 7, 0].forEach((d, i) => tone("triangle", freq(72 + d), t + i * 0.16, 0.2, 0.14, sfxBus)); }
  };

  // ---------- fula småljud: något rör sig i skolan ----------
  // Tysta och sällsynta, ett i taget. Bara i rummen: under strid är det musiken och slagen som gäller.
  const ODD_VOL = 0.12;
  const far = (d, t, vol = 1) => splay(d, t, vol, ODD_VOL);
  const hum = (dur, rate, res, hz, bits, drive, jitter) => {
    const sr = ctx.sampleRate, n = dur * sr | 0, r = fresh();
    return ugly(ring(pulses(n, sr, rate, u => Math.sin(Math.PI * u), r, jitter), sr, res), sr, hz, bits, drive);
  };
  const ODD = {
    crow(t) { far(croakData(0.22, 330, 240), t); far(croakData(0.2, 300, 220), t + 0.38, 0.8); },
    farDoor(t) { far(creak({ ...DOORS.kaffe, dur: 0.6 }), t, 0.8); },
    gurgle(t) {
      for (let i = 0; i < 7; i++) {
        tone("sine", 420 + Math.random() * 300, t + i * 0.09 + Math.random() * 0.03, 0.07, 0.05, sfxBus, { from: 160 + Math.random() * 80, glide: 0.05 });
      }
    },
    drip(t) { [0, 0.55, 0.8].forEach(d => tone("sine", 1300, t + d, 0.06, 0.05, sfxBus, { from: 700, glide: 0.03 })); },
    pipe(t) { far(hum(0.55, u => 78 - 26 * u, [[280, 0.02, 1], [640, 0.015, 0.6]], 7000, 5, 2.6, 0.25), t, 0.9); },   // röret rapar
    mop(t) {
      noise(t, 0.3, 0.1, crusher, { type: "lowpass", f: 900, to: 250, q: 3 });
      tone("sine", 140, t + 0.24, 0.14, 0.06, sfxBus, { from: 520, glide: 0.09 });
    },
    bucket(t) {
      const sr = ctx.sampleRate, x = new Float32Array(sr * 0.5 | 0);
      x[0] = 1;
      far(ugly(ring(x, sr, [[640, 0.12, 1], [1510, 0.08, 0.7], [2680, 0.05, 0.4]]), sr, 11000, 6, 1.6), t, 0.8);
    },
    witchFar(t) { far(croakData(0.3, 120, 85), t, 0.7); },
    scrape(t) { far(hum(0.7, u => 150 + 90 * u, [[520, 0.02, 1], [1350, 0.012, 0.6]], 9000, 5, 2, 0.12), t); },   // en stol, men ingen sitter där
    cough(t) {
      [0, 0.24].forEach(d => {
        noise(t + d, 0.13, 0.1, crusher, { f: 900, to: 500, q: 1.2 });
        tone("square", 140, t + d, 0.1, 0.03, sfxBus, { lowpass: 700 });
      });
    },
    marker(t) { far(hum(0.3, u => 700 + 500 * Math.sin(u * 6), [[2100, 0.008, 1], [3300, 0.006, 0.5]], 11000, 5, 1.8, 0.08), t, 0.7); }   // tuschpennan på tavlan
  };
  const ODD_ROOMS = {
    door: ["crow", "farDoor"],
    coffee: ["gurgle", "drip", "pipe"],
    sticky: ["drip", "mop", "bucket", "witchFar"],
    lecture: ["scrape", "cough", "marker"]
  };

  let oddAt = 0, oddRoom = "", oddLast = "";
  function oddNoises() {
    if (songName !== oddRoom) { oddRoom = songName; oddAt = ctx.currentTime + 8 + Math.random() * 8; }
    const pool = ODD_ROOMS[songName];
    if (!pool || ctx.currentTime < oddAt) return;
    const options = pool.filter(name => name !== oddLast);
    oddLast = options[Math.random() * options.length | 0];
    oddAt = ctx.currentTime + 14 + Math.random() * 18;
    ODD[oddLast](ctx.currentTime + 0.02);
  }

  function sfx(name) {
    const play = SFX[name] || ODD[name];
    if (!ctx || !on || !play) return;
    play(ctx.currentTime + 0.01);
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem("fangdjupet-ljud", on ? "på" : "av"); } catch {}
    if (ctx) {
      master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05);
      if (on) { nextAt = ctx.currentTime + 0.05; start(); }
    }
    return on;
  }

  window.Sound = { unlock, music, jingle, sfx, toggle, get on() { return on; } };
})();
