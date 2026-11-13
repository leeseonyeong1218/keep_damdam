/* 담담 소리: 배경음(칼림바, Pixabay) + 효과음(브라우저에서 직접 만듦, 파일 없음)
   브라우저는 사람이 한 번 누르기 전에는 소리를 못 내게 막아서, 첫 클릭·탭·키 입력 때 켜짐 */
(() => {
  const KEY = "damdam.sound";
  let ctx = null, master = null, sfxBus = null, bgmGain = null, bgmSrc = null, bgmBuf = null, noiseBuf = null;
  let want = true;
  try { want = localStorage.getItem(KEY) !== "off"; } catch (e) {}
  let unlocked = false;
  const BGM = 0.14;   // 배경음 크기 (효과음이 잘 들리게 작게)
  const btn = document.getElementById("soundBtn");

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // 전체 → 리미터(효과음을 키워도 깨지지 않게) → 스피커
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 8; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    limiter.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = want ? 1 : 0; master.connect(limiter);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 2.4; sfxBus.connect(master);       // 효과음 크게
    bgmGain = ctx.createGain(); bgmGain.gain.value = BGM; bgmGain.connect(master);   // 배경음 작게
    // 효과음용 흰 잡음 1초
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    fetch("sound-kalimba.mp3").then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { bgmBuf = buf; startBgm(); }).catch(() => {});
    return ctx;
  }
  function startBgm() {
    if (!bgmBuf || bgmSrc || !unlocked) return;
    bgmSrc = ctx.createBufferSource();
    bgmSrc.buffer = bgmBuf; bgmSrc.loop = true;   // 끊김 없이 반복
    bgmSrc.connect(bgmGain);
    bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(BGM, ctx.currentTime + 2.5);
    bgmSrc.start();
  }
  function unlock() {
    if (!ensure()) return;
    ctx.resume().then(() => { unlocked = true; startBgm(); render(); });
  }
  ["pointerdown", "keydown", "touchend"].forEach(ev => addEventListener(ev, unlock, { passive: true }));

  function render() {
    if (!btn) return;
    const on = want && unlocked;
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on);
    btn.setAttribute("aria-label", on ? "소리 끄기" : "소리 켜기");
  }
  if (btn) btn.addEventListener("pointerdown", e => e.stopPropagation());   // 첫 클릭이 켜자마자 꺼지지 않게
  if (btn) btn.addEventListener("click", e => {
    e.stopPropagation();
    if (!unlocked) { want = true; unlock(); }
    else want = !want;
    try { localStorage.setItem(KEY, want ? "on" : "off"); } catch (er) {}
    if (master) master.gain.setTargetAtTime(want ? 1 : 0, ctx.currentTime, 0.08);
    render();
  });
  render();

  const live = () => ctx && unlocked && want && ctx.state === "running";
  const r = (a, b) => a + Math.random() * (b - a);

  // ---- 효과음 ----
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function noise(t, dur, type, freq, q, peak, dec) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.004, peak, dec);
    s.connect(f).connect(g).connect(sfxBus);
    s.start(t, Math.random() * 0.5, dur);
  }
  function tone(t, f0, f1, peak, dec, type = "sine") {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec);
    const g = ctx.createGain(); env(g, t, 0.003, peak, dec);
    o.connect(g).connect(sfxBus);
    o.start(t); o.stop(t + dec + 0.05);
  }
  /** 효과음이 날 때 배경음을 잠깐 낮춤 */
  function duck(at) {
    const t = Math.max(ctx.currentTime, at || 0), g = bgmGain.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(BGM * 0.45, t, 0.02); g.setTargetAtTime(BGM, t + 0.25, 0.3);
  }
  // 각 소리는 (크기, 시각) — 시각을 주면 그때로 예약 (영상과 정확히 맞추려고)
  const T = at => (at != null && at > ctx.currentTime ? at : ctx.currentTime);
  const S = {
    /** 작은 발소리 */
    step(v = 1, at) { const t = T(at);
      noise(t, 0.09, "lowpass", r(380, 520), 0.8, 0.22 * v, 0.07); tone(t, r(95, 115), 60, 0.12 * v, 0.06);
      noise(t, 0.05, "bandpass", r(900, 1300), 1.4, 0.16 * v, 0.04); duck(t); },
    /** 톡 (반찬·나무 같은) */
    tok(v = 1, at) { const t = T(at), f = r(520, 760);
      tone(t, f, f * 0.55, 0.16 * v, 0.09); noise(t, 0.03, "bandpass", 2400, 1.5, 0.05 * v, 0.02); duck(t); },
    /** 사각 (종이학·종이) */
    paper(v = 1, at) { const t = T(at);
      noise(t, 0.16, "bandpass", r(2600, 3800), 1.2, 0.09 * v, 0.12); noise(t + 0.03, 0.08, "highpass", 5000, 0.7, 0.03 * v, 0.06); duck(t); },
    /** 폭 (흙에 심기) */
    soil(v = 1, at) { const t = T(at);
      noise(t, 0.14, "lowpass", r(280, 380), 0.7, 0.26 * v, 0.11); tone(t, r(180, 220), 110, 0.06 * v, 0.08);
      noise(t, 0.08, "bandpass", r(1100, 1600), 1.1, 0.1 * v, 0.06); duck(t); },
    /** 쿵 (조금 큰 물건) */
    thud(v = 1, at) { const t = T(at);
      noise(t, 0.2, "lowpass", 300, 0.8, 0.3 * v, 0.16); tone(t, 140, 55, 0.2 * v, 0.14);
      noise(t, 0.1, "bandpass", 800, 1, 0.14 * v, 0.08); duck(t); },
    /** 뿅 */
    pop(v = 1, at) { const t = T(at);
      tone(t, 420, 980, 0.13 * v, 0.12, "triangle"); duck(t); },
    /** 포스트잇을 떼어 집기 (스윽) */
    pick(v = 1, at) { const t = T(at);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2;
      f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.16);
      const g = ctx.createGain(); env(g, t, 0.03, 0.14 * v, 0.14);
      s.connect(f).connect(g).connect(sfxBus); s.start(t, Math.random() * 0.5, 0.22); duck(t); },
    /** 포스트잇이 팔락 */
    flutter(v = 1, at) { const t = T(at);
      noise(t, 0.05, "highpass", r(2500, 3500), 0.8, 0.07 * v, 0.04); noise(t + 0.04, 0.04, "highpass", 3000, 0.8, 0.04 * v, 0.03); duck(t); },
    /** 연필로 체크 (틱 · 틱) */
    check(v = 1, at) { const t = T(at);
      noise(t, 0.025, "bandpass", 3200, 3, 0.12 * v, 0.02); noise(t + 0.07, 0.03, "bandpass", 2600, 3, 0.1 * v, 0.025); duck(t); },
    /** 사각사각 쓰기 */
    write(v = 1, at) { const t = T(at);
      for (let k = 0; k < 6; k++) noise(t + k * 0.075, 0.05, "bandpass", r(3000, 4200), 2.5, 0.05 * v, 0.04); duck(t); },
    /** 의자에 털썩 */
    sit(v = 1, at) { const t = T(at);
      noise(t, 0.16, "lowpass", 420, 0.7, 0.22 * v, 0.13); tone(t, 200, 130, 0.08 * v, 0.12, "triangle");
      noise(t + 0.02, 0.06, "bandpass", 1000, 1.2, 0.08 * v, 0.05); duck(t); },
    /** 띵 (작은 종) */
    ting(v = 1, at) { const t = T(at);
      tone(t, 1318, 1310, 0.07 * v, 0.7); tone(t, 1976, 1970, 0.03 * v, 0.45); duck(t); },
  };
  // 너무 많이 겹치지 않게 (같은 순간 최대 몇 개)
  let lastAt = 0, burst = 0;
  S.play = (kind, v, at) => {
    if (!live() || !S[kind]) return;
    if (at == null) {
      const now = performance.now();
      if (now - lastAt < 40) { if (++burst > 3) return; } else burst = 0;
      lastAt = now;
    }
    S[kind](v, at);
  };

  // ---- 영상에 맞춘 소리 (초 단위, 영상 안에 소리는 없음) ----
  // 걸음: 1/30초 단위로 신발이 땅에 닿는 프레임을 찾은 값
  const steps = (ts, v = 1) => ts.map(t => [t, "step", v]);
  const FILM = [
    ...steps([1.95, 2.18, 2.45, 2.78, 3.12, 3.35, 3.62, 4.02]), [4.18, "step", 0.5],       // 걸어 들어와
    [4.8, "sit"],                                                                            // 의자에 앉기
    [7.78, "flutter", 0.8], [7.9, "flutter"], [8.02, "flutter", 0.7], [8.12, "flutter", 0.6],   // 포스트잇이 우수수
    [8.65, "pick"], [9.85, "pick"],                                                          // 손으로 포스트잇 떼기
    [11.62, "paper"], [13.02, "paper"],                                                      // 쓰레기통에
    ...[13.8, 14.0, 14.3, 14.5, 14.8, 15.0, 15.4, 15.7].map(t => [t, "check"]),              // 하나씩 체크하며 떼기
    [16.6, "pick", 0.7],
    ...steps([27.1, 27.27, 27.53, 27.7], 0.6), [27.87, "step", 0.4], [27.95, "sit", 0.6],    // 둘째 날
    ...steps([31.4, 31.57, 31.73, 31.9, 32.23], 0.6), [32.45, "step", 0.4], [32.55, "sit", 0.6],   // 셋째 날로
    ...steps([39.93, 40.13, 40.27, 40.43], 0.6),                                             // 나가기
    [41.9, "tok", 0.9],                                                                      // 파란 도시락통이 책상에 톡
    ...steps([43.87, 44.03, 44.3, 44.53, 44.8, 44.97]), [45.07, "step", 0.5], [45.13, "sit"],   // 책상으로 와서 앉기
    [46.1, "pop", 0.8],                                                                      // 물음표
    [48.75, "pick"],                                                                         // 도시락통 집기
    [50.12, "thud"],                                                                         // 쓰레기통에 쿵
    [52.5, "paper", 0.8], [53.75, "tok", 0.8],                                               // 종이 던지기 · 주먹밥 톡
    [56.0, "ting"],                                                                          // 주먹밥 반짝
    [57.65, "pop"], [58.35, "paper", 0.8],                                                   // 도시락통 · 종이가 쏙
    ...[59.1, 60.85, 62.4, 64.05, 65.4, 66.85].map(t => [t, "pop", 0.7]),                    // 반찬이 뿅 튀어나와
    ...[59.6, 61.35, 62.85, 64.4, 66.1, 67.4].map(t => [t, "tok"]),                          // 톡 떨어짐
    [68.7, "write", 0.9],                                                                    // last one 쓰기
    [69.65, "pick"],                                                                         // 마지막 포스트잇 떼기
    [72.45, "tok", 1.2],                                                                     // 칸에 쏙
    [74.1, "ting"], [74.1, "pop"],                                                           // 도시락 완성
    ...[79.3, 79.75, 80.05, 80.5, 80.8, 81.05, 81.3, 81.55].map((t, i) => [t, "pop", 0.45 + i * 0.05]),   // 책상마다 앱 아이콘이 톡톡
    [82.7, "pop", 0.8],                                                                      // 빈 아이콘 칸
    [83.45, "ting"], [86.7, "ting"], [89.45, "ting"],                                        // 소담소담 · 도담도담 · 푸르담
    [92.7, "pop"], [93.7, "ting"],                                                           // 세 앱 · 담담
  ];
  S.attachFilm = (video, visible) => {
    const AHEAD = 0.12;   // 이만큼 앞서 미리 예약
    let prev = 0;
    const tick = () => {
      const t = video.currentTime;
      if (t < prev - 1) prev = Math.max(0, t - 0.02);    // 한 바퀴 돌아 처음으로
      const until = t + AHEAD;
      if (!video.paused && visible() && live()) {
        for (const [at, kind, v] of FILM) if (at > prev && at <= until) S.play(kind, v, ctx.currentTime + Math.max(0, (at - t) / (video.playbackRate || 1)));
        prev = until;
      } else prev = t;
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
    };
    tick();
  };

  window.Sfx = S;
})();
