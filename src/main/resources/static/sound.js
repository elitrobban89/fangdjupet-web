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
    lecture: { scale: "insen", root: 57, bpm: 100, lead: "triangle",
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
    win:  { scale: "yo", root: 67, bpm: 180, lead: "square", melody: "0 2 4 5 7 _ _ _", bass: "-5 _ _ _ -3 _ _ _" },
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
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
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
        tone(s.lead, f, at, dur, v, musicBus, { vibrato: dur > sd * 2 ? 6 : 0, depth: 12 });
        if (s.lead === "square") tone("square", f * 2, at + sd * 0.5, sd * 0.5, v * 0.18, musicBus);   // eko en oktav upp
      }
      voice = f;
    }
    const b = bas[i % bas.length];
    if (b !== "_" && b !== ".") {
      const f = freq(pitch(s, +b)), dur = len(bas) * sd * 0.9;
      if (s.sticky) tone("sawtooth", f, at, dur, 0.2, musicBus, { lowpass: 900, lowpassTo: 160, q: 9 });   // squelch
      else tone("triangle", f, at, dur, 0.28, musicBus);
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
      tone("sine", 38, t, 0.5, 0.9, sfxBus, { from: 110, glide: 0.12 });
      noise(t, 0.35, 0.6, crusher, { type: "lowpass", f: 700 });
    },
    alert(t) { tone("square", freq(81), t, 0.08, 0.12, sfxBus); tone("square", freq(74), t + 0.09, 0.12, 0.12, sfxBus); },
    // StädHäxan skrattar: ha-ha-ha som sjunker, i en sur sågtand
    laugh(t) { [0, 1, 2, 3].forEach(i => tone("sawtooth", 520 - i * 70, t + i * 0.13, 0.11, 0.18, crusher, { from: 620 - i * 70, glide: 0.1, vibrato: 30, depth: 80 })); },
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
    locked(t) { for (let i = 0; i < 3; i++) noise(t + i * 0.09, 0.06, 0.35, crusher, { f: 1200, q: 6 }); tone("sine", 90, t + 0.3, 0.12, 0.3, sfxBus); },
    talk(t) { [0, 4, 2, 5].forEach((d, i) => tone("square", freq(69 + d), t + i * 0.07, 0.05, 0.08, sfxBus, { lowpass: 2500 })); },
    bag(t) { noise(t, 0.25, 0.25, sfxBus, { f: 1500, to: 5000, q: 4 }); tone("square", 400, t, 0.25, 0.04, sfxBus, { from: 200, glide: 0.25 }); },
    drop(t) { tone("sine", 80, t, 0.18, 0.4, sfxBus, { from: 260, glide: 0.12 }); },
    bye(t) { [12, 7, 0].forEach((d, i) => tone("triangle", freq(72 + d), t + i * 0.16, 0.2, 0.14, sfxBus)); }
  };

  function sfx(name) {
    if (!ctx || !on || !SFX[name]) return;
    SFX[name](ctx.currentTime + 0.01);
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
