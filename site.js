/* 담담 — 시안 A (책상 위) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const W = () => innerWidth, H = () => innerHeight;
  const mobile = () => innerWidth <= 760;
  const ST = "stickers-";
  const rand = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // 같은 배치가 나오게 (새로 고쳐도 담담 장면이 같은 모양)
  const seeded = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  gsap.registerPlugin(ScrollTrigger);
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // 스티커 이미지 (분홍·빨강 계열은 뺌: 무채색 + 앱 대표색 위주)
  // 앱의 상점 반찬 60가지 전부 (선물로만 받는 반찬은 뺌)
  const FOOD = ["b01", "b02", "b03", "b04", "b05", "b06", "b07", "b08", "b09", "b10", "b11", "b12", "b13", "b14", "b15", "b16", "b17", "b18", "b19", "b20", "b21", "b22", "b23", "b24", "b25", "b26", "b27", "b28", "b29", "b30", "b31", "b32", "b33", "b34", "b35", "b36", "b37", "b38", "b39", "b40", "b41", "b42", "b43", "b44", "b45", "b46", "b47", "b48", "b49", "b50", "b51", "b52", "b53", "b54", "b55", "b56", "b57", "b58", "b59", "b60"];
  const CRANES = ["white", "white_side", "gray", "gray_side", "black", "black_side", "sky", "sky_side", "blue", "blue_side", "lavender", "lavender_side"];
  // 푸르담 도감 식물 58가지 전부 (선물 한정 '행운 맛 클로버'는 뺌)
  const PLANTS = ["tulip_40", "violet_18", "dandelion_35", "freesia_40", "hyacinth_26", "lily_of_the_valley_22", "strawberry_22", "white_clover_16", "mugwort_35", "sunflower_90", "hydrangea_50", "lavender_45", "marigold_28", "thistle_45", "sage_35", "lemon_balm_32", "blueberry_40", "raspberry_35", "foxtail_40", "fountain_grass_50", "reeds_85", "acorn_16", "physalis_45", "cotton_55", "red_mushroom_20", "brown_mushroom_18", "lions_mane_22", "pine_tree_95", "camellia_85", "eucalyptus_80", "bamboo_95", "yew_90", "rosemary_45", "mossy_stone_26", "monstera_75", "fern_50", "echeveria_28", "haworthia_18", "astrophytum_16", "sand_dollar_cactus_12", "prickly_pear_50", "columnar_cactus_93", "hoya_55", "ivy_70", "pothos_60", "philodendron_80", "syngonium_55", "rubber_plant_85", "pachira_95", "areca_palm_90", "parlor_palm_55", "lady_palm_85", "staghorn_fern_60", "pteris_50", "maidenhair_fern_45", "tillandsia_30", "xerographica_30", "pebbles_20"];
  const CLOVERS = ["clover1", "clover2", "clover5"];   // 분홍·노랑 클로버는 뺌
  // 실제로 작은 반찬은 크게 나오지 않게 (긴 변 배율)
  const SMALL = { "banchan/b53": 0.45 };   // 블루베리
  const APP_NAME = { dodam: "도담도담", sodam: "소담소담", puru: "푸르담" };

  // 그림을 불러오다 실패하면 (서버가 잠깐 바쁘거나 연결이 끊기면) 조금 뒤 다시 받음 → ? 상자 대신 그림이 나오게
  // 다시 받기는 페이지 전체에서 40번까지만 (너무 많이 요청하면 GitHub 같은 서버가 잠깐 막음)
  let retryBudget = 40;
  const retryURL = (base, n) => base + (base.includes("?") ? "&" : "?") + "r=" + n + "-" + Date.now();
  document.addEventListener("error", e => {
    const im = e.target;
    if (!(im instanceof HTMLImageElement) || !im.getAttribute("src")) return;
    const base = im.src.replace(/[?&]r=\d+-\d+$/, "");
    if (im.dataset.rbase !== base) { im.dataset.rbase = base; im.dataset.rn = "0"; }
    const n = +im.dataset.rn;
    im.classList.add("img-retry");
    if (n >= 3 || retryBudget <= 0) return;
    retryBudget--;
    im.dataset.rn = n + 1;
    setTimeout(() => { if (im.src.replace(/[?&]r=\d+-\d+$/, "") === base) im.src = retryURL(base, n + 1); }, 1500 * (n + 1) * (n + 1));
  }, true);
  document.addEventListener("load", e => { if (e.target instanceof HTMLImageElement) e.target.classList.remove("img-retry"); }, true);

  const cache = {};
  const load = src => cache[src] || (cache[src] = new Promise(res => {
    const im = new Image();
    let tries = 0;
    im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im));
    im.onerror = () => {
      if (++tries <= 3 && retryBudget > 0) { retryBudget--; setTimeout(() => { im.src = ST + src.replace("/", "-") + ".png?r=" + tries + "-" + Date.now(); }, 1500 * tries * tries); return; }
      delete cache[src];   // 끝내 실패하면 다음에 다시 시도할 수 있게
      res(im);
    };
    im.src = ST + src.replace("/", "-") + ".png";
  }));
  const ratio = im => (im.naturalWidth && im.naturalHeight) ? im.naturalWidth / im.naturalHeight : 1;
  /** 긴 변이 s가 되게 */
  const fit = (im, s) => { const r = ratio(im); return r >= 1 ? { w: s, h: s / r } : { w: s * r, h: s }; };

  /* ---------------- 이동 · 가로 메뉴 ---------------- */
  let poured = false;
  let lastAct = Date.now();   // 마지막으로 누가 만진 때 (2분 초기화용)
  const go = sel => {
    lenis.start();
    if (sel === "#hero") { lenis.scrollTo(0, { duration: 1.4 }); return; }
    lenis.scrollTo(sel, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) });
  };
  $$("[data-go]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); go(a.dataset.go); }));
  // 지나가는 구간의 메뉴만 진하게
  const navLinks = $$(".nav a");
  const secActive = new Map();
  const setNav = () => {
    let cur = null;
    for (const a of navLinks) if (secActive.get(a.dataset.sec)) cur = a.dataset.sec;
    navLinks.forEach(a => a.classList.toggle("on", a.dataset.sec === cur));
  };

  /* ---------------- 1. 첫 화면: 영상 반복 → 한 바퀴 끝나면 스티커가 와르르 ---------------- */
  const hero = $("#hero"), film = $("#film"), filmBox = $(".hero-film"), pileEl = $("#pile");
  const tip = $("#tip"), tipImg = $("img", tip);
  const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = Matter;
  let engine, items = [], walls = [], running = false, last = 0, acc = 0, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const filmTarget = () => mobile()
    ? { width: W() - 24, top: "28%" }
    : { width: Math.min(W() * 0.38, 580, H() * 0.66), top: "33%" };

  function pour(fast = false) {
    if (poured) return;
    poured = true;
    lastAct = Date.now();   // 스티커가 쏟아진 때부터 2분을 셈
    // 영상이 끝나면 영상은 사라지고 스티커만 (작게 이어지지 않게)
    gsap.to(filmBox, { opacity: 0, duration: fast ? 0 : 0.8, ease: "power2.out", onComplete: () => { try { film.pause(); } catch (e) {} } });
    buildPile(fast);
    later(() => lenis.start(), fast ? 0 : 1800);
  }

  function heroList() {
    const m = mobile();
    const pick = (arr, n) => shuffle(arr.slice()).slice(0, n);
    return [
      ...pick(FOOD, m ? 13 : 22).map(s => ({ src: "banchan/" + s, app: "dodam", base: 112 })),
      ...pick(CRANES, m ? 8 : 14).map(s => ({ src: "crane/" + s, app: "sodam", base: 168 })),
      ...Array(m ? 1 : 3).fill(0).map(() => ({ src: "star/star_sky", app: "sodam", base: 78 })),
      // 픽셀 식물은 각자 원래 크기대로 (이름 끝 숫자 = 픽셀 높이)
      ...pick(PLANTS, m ? 11 : 18).map(s => ({ src: "plant/" + s, app: "puru", base: 140, px: +s.split("_").pop() })),
      ...pick(CLOVERS, m ? 1 : 2).map(s => ({ src: "clover/" + s, app: "puru", base: 64 })),
    ];
  }
  const icons = () => ["dodam", "sodam", "puru"].map(a => ({ src: "misc/icon_" + a, app: a, base: 118, icon: true }));

  // 영상이 끝나는 순간 바로 쏟아지게, 첫 화면 그림은 미리 불러 둠
  [...FOOD.map(s => "banchan/" + s), ...CRANES.map(s => "crane/" + s), "star/star_sky", ...PLANTS.map(s => "plant/" + s), ...CLOVERS.map(s => "clover/" + s)].forEach(src => load(src));

  function makeWalls() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (walls.length) Composite.remove(engine.world, walls);
    const opt = { isStatic: true, friction: 0.8 };
    walls = [
      Bodies.rectangle(w / 2, h + 60, w * 3, 120, opt),
      Bodies.rectangle(-60, 0, 120, h * 4, opt),
      Bodies.rectangle(w + 60, 0, 120, h * 4, opt),
    ];
    Composite.add(engine.world, walls);
  }

  let pileGen = 0;
  async function buildPile(fast) {
    const gen = ++pileGen;
    const list = shuffle(heroList());   // 첫 화면엔 앱 아이콘 없이 그림만
    // 그림을 다 기다리지 않고, 도착하는 대로 바로 떨어지게 (최대 0.6초만 기다림)
    await Promise.race([Promise.all(list.map(it => load(it.src))), new Promise(r => setTimeout(r, 600))]);
    if (gen !== pileGen) return;   // 그사이 처음으로 돌아감
    engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.15;
    makeWalls();
    // 떨어져 부딪힐 때 소리 (반찬 톡 · 종이학 사각 · 풀 폭)
    const KIND = { dodam: "tok", sodam: "paper", puru: "soil" };
    Matter.Events.on(engine, "collisionStart", ev => {
      if (!window.Sfx) return;
      for (const p of ev.pairs) {
        const b = p.bodyA.isStatic ? p.bodyB : p.bodyA, o = b === p.bodyA ? p.bodyB : p.bodyA;
        const sp = Math.hypot(b.velocity.x - o.velocity.x, b.velocity.y - o.velocity.y);
        if (sp < 2.2 || !b._it) continue;
        Sfx.play(b._it.icon ? "tok" : KIND[b._it.app], Math.min(1, sp / 9) * 0.8);
      }
    });
    const w = hero.clientWidth, h = hero.clientHeight;
    // 크기를 제각각으로 (큰 것 몇 개 · 중간 · 작은 것 여럿) → 진짜 쌓인 더미처럼
    let sum = 0;
    list.forEach(it => {
      const q = Math.random();
      it.side = it.px ? (it.px * 6 + 64) * 0.36
        : SMALL[it.src] ? it.base * SMALL[it.src] * rand(0.85, 1.1)   // 블루베리처럼 원래 작은 건 늘 작게
        : it.base * (q < 0.13 ? rand(1.8, 2.6) : q < 0.45 ? rand(1.0, 1.4) : rand(0.5, 0.88));
      sum += it.side * it.side * 0.72;   // 긴 변 기준 대략의 넓이
    });
    // 화면 아래쪽 절반쯤이 차도록 (그림 상자에 빈 곳이 있어 넉넉히)
    const budget = w * h * (mobile() ? 1.0 : 0.95);
    const k = Math.min(2.4, Math.max(0.5, Math.sqrt(budget / sum)));
    const t0 = performance.now();
    list.forEach((it, i) => {
      items.push(it);
      load(it.src).then(im => {
        if (gen !== pileGen || !im || !im.naturalWidth) return;
        it.im = im; Object.assign(it, fit(im, it.side * k));
        const el = document.createElement("img");
        el.className = "st";
        el.src = im.src; el.alt = APP_NAME[it.app];
        el.draggable = false;
        el.style.width = it.w + "px"; el.style.height = it.h + "px";
        el.style.transform = `translate(-999px,-999px)`;
        el._it = it; it.el = el;
        pileEl.appendChild(el);
        const spawn = () => {
          if (gen !== pileGen) return;
          const b = Bodies.rectangle(rand(w * 0.08, w * 0.92), -it.h - rand(0, 160), it.w * 0.8, it.h * 0.76, {
            chamfer: { radius: Math.min(it.w, it.h) * 0.26 },
            restitution: 0.14, friction: 0.7, frictionStatic: 0.9, frictionAir: 0.012, density: 0.0016,
            angle: rand(-0.7, 0.7), sleepThreshold: 50,
          });
          Body.setVelocity(b, { x: rand(-2, 2), y: rand(1, 4) });
          Body.setAngularVelocity(b, rand(-0.06, 0.06));
          it.body = b; b._it = it;
          Composite.add(engine.world, b);
        };
        const due = (fast ? i * 6 : 120 + i * 34) - (performance.now() - t0);
        later(spawn, Math.max(0, due));
      });
    });
    startLoop();
  }


  let hoverIt = null;
  function placeTip() {
    if (!hoverIt || !hoverIt.body) return;
    const r = hero.getBoundingClientRect(), b = hoverIt.body;
    tip.style.left = r.left + b.position.x + "px";
    tip.style.top = r.top + b.position.y - Math.max(hoverIt.w, hoverIt.h) * 0.42 + "px";
  }
  function frame(t) {
    if (!running) return;
    if (!last) last = t;
    acc += Math.min(50, t - last); last = t;
    while (acc >= 1000 / 60) { Engine.update(engine, 1000 / 60); acc -= 1000 / 60; }
    for (const it of items) {
      const b = it.body; if (!b) continue;
      it.el.style.transform = `translate(${b.position.x - it.w / 2}px,${b.position.y - it.h / 2}px) rotate(${b.angle}rad)`;
    }
    placeTip();
    requestAnimationFrame(frame);
  }
  let heroVisible = true;
  function startLoop() { if (running || !engine || !heroVisible) return; running = true; last = 0; acc = 0; requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; if (heroVisible) startLoop(); else { running = false; hideTip(); } }).observe(hero);

  // 집어서 던지기(마우스) · 누르면 그 앱으로
  let down = null, drag = null;
  const local = e => { const r = hero.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  pileEl.addEventListener("pointerdown", e => {
    const el = e.target.closest(".st"); if (!el || !el._it.body) return;
    const it = el._it;
    down = { it, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    if (e.pointerType === "mouse") {
      e.preventDefault();
      const p = local(e), b = it.body;
      Sleeping.set(b, false);
      drag = Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: 0.16, damping: 0.1, length: 0 });
      Composite.add(engine.world, drag);
      pileEl.classList.add("dragging");
    }
  });
  addEventListener("pointermove", e => {
    if (!down) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
    if (drag) drag.pointA = local(e);
  });
  const release = choose => {
    if (drag) { Composite.remove(engine.world, drag); drag = null; pileEl.classList.remove("dragging"); }
    if (down && choose && !down.moved && performance.now() - down.t < 600) pickApp(down.it);
    down = null;
  };
  addEventListener("pointerup", () => release(true));
  addEventListener("pointercancel", () => release(false));
  // 말풍선: 마우스를 올린 스티커 바로 위에, 그 앱 아이콘(기호만) + 보러 가기
  const hideTip = () => { hoverIt = null; tip.classList.remove("on"); };
  pileEl.addEventListener("pointerover", e => {
    const el = e.target.closest(".st"); if (!el || e.pointerType !== "mouse") return;
    hoverIt = el._it;
    tip.dataset.app = hoverIt.app;
    tipImg.src = `brand-glyph_${hoverIt.app}.svg`;
    placeTip();
    tip.classList.add("on");
  });
  pileEl.addEventListener("pointerout", e => { if (e.target.closest(".st")) hideTip(); });

  function pickApp(it) {
    hideTip();
    Sleeping.set(it.body, false);
    Body.setVelocity(it.body, { x: rand(-1, 1), y: -13 });     // 톡 튀어 오르고
    if (window.Sfx) Sfx.play("pop");
    Body.setAngularVelocity(it.body, rand(-0.25, 0.25));
    setTimeout(() => go("#" + it.app), 260);                    // 그 앱으로
  }

  // 영상은 계속 반복. 처음 한 바퀴가 끝나거나 휠을 내리면 → 쏟아짐
  let lastT = 0;
  film.addEventListener("timeupdate", () => {
    if (!poured && film.currentTime + 0.05 < lastT) pour();   // 한 바퀴 돌아 처음으로 감기면
    lastT = film.currentTime;
  });
  film.addEventListener("error", () => pour());
  if (window.Sfx) Sfx.attachFilm(film, () => heroVisible);
  const playFilm = () => { if (poured) return; const p = film.play(); if (p && p.catch) p.catch(() => {}); };
  // 자동 재생이 막혀도 다시 시도: 불러오면 · 탭/클릭/키 처음 한 번 · 화면으로 돌아오면
  film.muted = true; film.defaultMuted = true; film.setAttribute("muted", "");
  ["loadeddata", "canplay"].forEach(ev => film.addEventListener(ev, () => { if (film.paused) playFilm(); }));
  ["pointerdown", "touchstart", "keydown", "wheel"].forEach(ev => addEventListener(ev, () => { if (film.paused) playFilm(); }, { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && film.paused) playFilm(); });
  // 스티커는 영상이 한 바퀴 다 끝났을 때만 쏟아짐 (스크롤은 언제든 됨)
  if (scrollY > 40) pour(true);
  playFilm();

  // 영상의 흰 배경을 실제로 투명하게 (흰색에 가까울수록 투명) → 종이 위에 그림만
  (function keyFilm() {
    const cv = document.createElement("canvas");
    cv.className = "film-cv";
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, "precision mediump float;varying vec2 uv;uniform sampler2D t;void main(){vec3 c=texture2D(t,uv).rgb;float m=min(c.r,min(c.g,c.b));float a=clamp((.965-m)/.22,0.,1.);gl_FragColor=vec4(max(c-(1.-a),0.),a);}"));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(k => gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR));
    filmBox.appendChild(cv);
    filmBox.classList.add("keyed");
    const draw = () => {
      if (film.readyState >= 2 && heroVisible) {
        if (cv.width !== film.videoWidth) { cv.width = film.videoWidth; cv.height = film.videoHeight; gl.viewport(0, 0, cv.width, cv.height); }
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, film); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } catch (e) {}
      }
      if (film.requestVideoFrameCallback) film.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
    };
    if (film.requestVideoFrameCallback) film.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
    film.addEventListener("seeked", () => requestAnimationFrame(draw), { once: false });
  })();

  // 2분 동안 아무 조작이 없으면 → 처음 화면(영상)으로. 영상이 안 나오는 상태면 몇 번이든 늘 다시 초기화
  // (예전엔 타이머가 한 번만 걸려서, 초기화 → 영상 끝 → 스티커가 쏟아진 뒤엔 다시 영상으로 안 돌아갔음)
  const IDLE_MS = 120000;
  const filmShowing = () => !poured && scrollY < 5 && !film.paused;
  const resetHome = () => {
    pileGen++;
    timers.forEach(clearTimeout); timers = [];
    running = false; hideTip();
    if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
    engine = null; items = []; walls = []; pileEl.innerHTML = "";
    gsap.killTweensOf(filmBox);
    gsap.set(filmBox, { clearProps: "width,top,opacity" });
    lenis.start();
    lenis.scrollTo(0, { immediate: true, force: true });
    poured = false; lastT = 0;
    try { film.currentTime = 0; } catch (e) {}
    playFilm();
    lastAct = Date.now();
  };
  const poke = () => { lastAct = Date.now(); };
  // 클릭 · 휠 · 키 · 터치만 "쓰는 중"으로 셈. 마우스는 실제로 움직였을 때만 (살짝 흔들리거나 떨리는 건 무시)
  ["pointerdown", "wheel", "keydown", "touchstart", "touchmove"].forEach(ev => addEventListener(ev, poke, { passive: true }));
  let pmX = null, pmY = null;
  addEventListener("pointermove", e => {
    if (pmX === null || Math.hypot(e.clientX - pmX, e.clientY - pmY) > 40) { pmX = e.clientX; pmY = e.clientY; if (e.isTrusted) poke(); }
  }, { passive: true });
  setInterval(() => {
    if (Date.now() - lastAct < IDLE_MS) return;
    if (filmShowing()) { lastAct = Date.now(); return; }   // 영상이 나오고 있으면 그대로 둠
    resetHome();
  }, 2000);

  // "스크롤 해주세요": 지금 보이는 화면에 따라 자리를 바꿈
  const cue = $("#scrollCue");
  if (cue) {
    const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45; };
    const atEnd = () => scrollY + innerHeight >= document.documentElement.scrollHeight - innerHeight * 0.35;
    const abP = $("#abP"), aboutStage = $("#aboutStage");
    const pick = () => {
      if (atEnd()) return "end";                                                   // F. 마지막: 더 내리면 처음으로
      if (inView(hero)) return pileEl.querySelector(".st") ? "top" : "bottom";     // B / A
      if (inView(aboutStage)) return "abtext";                                     // C
      for (const el of $$(".scene")) if (inView(el)) return "scene";               // D
      for (const el of $$(".sheet")) if (inView(el)) return "corner";              // E
      return null;                                                                  // 폰트 화면은 숨김
    };
    gsap.ticker.add(() => {
      const pos = pick();
      if (pos === "abtext" && abP) {
        const r = abP.getBoundingClientRect();
        cue.style.setProperty("--abx", r.left + "px");
        cue.style.setProperty("--aby", (r.bottom + 34) + "px");
      }
      if (pos) cue.dataset.pos = pos;
      cue.classList.toggle("on", !!pos);
    });
  }

  // "오늘도 담담하게." 끝까지 내린 뒤 더 내리면 → 처음 화면(영상)으로
  const veil = document.createElement("div");
  veil.className = "loop-veil"; document.body.appendChild(veil);
  let loopPush = 0, looping = false, touchY = null;
  const bottomed = () => scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
  const loopHome = () => {
    if (looping) return; looping = true; loopPush = 0;
    veil.classList.add("on");
    setTimeout(() => { resetHome(); setTimeout(() => { veil.classList.remove("on"); looping = false; }, 120); }, 460);
  };
  const pushDown = d => {
    if (!bottomed()) { loopPush = 0; return; }
    loopPush = Math.max(0, loopPush + d);
    if (loopPush > 700) loopHome();
  };
  addEventListener("wheel", e => pushDown(e.deltaY), { passive: true });
  addEventListener("touchstart", e => { touchY = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchmove", e => { if (touchY === null) return; const y = e.touches[0].clientY; pushDown((touchY - y) * 2); touchY = y; }, { passive: true });
  addEventListener("keydown", e => { if (["ArrowDown", "PageDown", " ", "End"].includes(e.key)) pushDown(260); });

  let rz;
  addEventListener("resize", () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (engine) makeWalls();
    }, 150);
  });

  /* ---------------- 2. 담담: 왼쪽 스티커 격자 · 오른쪽 "흘러가는 ○○을 [  ]에 담아" ---------------- */
  const FOOD_ALL = FOOD.map(s => "banchan/" + s);
  const CRANE_COLORS = ["white", "gray", "black", "sky", "blue", "lavender", "purple", "mint", "green", "yellow", "orange", "pink", "red", "brown", "gold"];
  const CRANE_ALL = [...CRANE_COLORS.map(c => "crane/" + c), ...CRANE_COLORS.map(c => "crane/" + c + "_side"), "star/star", "star/star_pink", "star/star_sky", "star/star_tilt"];
  const PLANT_ALL = PLANTS.map(s => "plant/" + s);
  const PHASES = [
    { word: "순간을", app: null, go: "#dodam", p: "담담은 흘러가는 일상을 눈에 보이게 담는 브랜드예요.<br>할 일을 담는 도담도담, 집중을 담는 소담소담,<br>습관을 담는 푸르담. 세 가지 앱이 있어요." },
    { word: "하루를", app: "dodam", go: "#dodam", p: "도담도담은 하루의 할 일을 도시락에 담아 기록하는 앱이에요.<br>할 일을 마칠 때마다 반찬을 하나씩 골라 도시락 칸에 담아요." },
    { word: "시간을", app: "sodam", go: "#sodam", p: "소담소담은 집중한 시간을 종이학으로 접어 모으는 앱이에요.<br>10분을 집중하면 종이학 한 마리가 유리병에 담겨요." },
    { word: "한 달을", app: "puru", go: "#puru", p: "푸르담은 매일의 루틴을 테라리움으로 키우는 앱이에요.<br>루틴을 지킬 때마다 식물이 하나씩 자라요." },
  ];
  const abGrid = $("#abGrid"), abWord = $("#abWord"), abSlot = $("#abSlot"), abGlyph = $("#abGlyph"), abP = $("#abP"), abGo = $("#abGo");
  const abDots = $$("#abDots li");
  const COLS = 4, PER = 7;
  const cols = [], cells = [];
  for (let c = 0; c < COLS; c++) {
    const col = document.createElement("div"); col.className = "ab-col";
    for (let k = 0; k < PER; k++) {
      const cell = document.createElement("div"); cell.className = "ab-cell";
      const im = document.createElement("img"); im.alt = ""; cell.appendChild(im);
      col.appendChild(cell); cells.push(im);
    }
    abGrid.appendChild(col); cols.push(col);
  }
  // 단계마다 칸을 채울 그림 (늘 같은 배치가 나오게 고정된 순서로 섞음)
  const seededShuffle = (arr, seed) => { const r = seeded(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const N = COLS * PER;
  const sets = [
    (() => { const f = seededShuffle(FOOD_ALL, 1), c = seededShuffle(CRANE_ALL, 2), p = seededShuffle(PLANT_ALL, 3), out = []; for (let i = 0; out.length < N; i++) out.push([f, c, p][i % 3][(i / 3) | 0]); return seededShuffle(out, 4); })(),
    seededShuffle(FOOD_ALL, 11).concat(seededShuffle(FOOD_ALL, 12)).slice(0, N),
    seededShuffle(CRANE_ALL, 21).concat(seededShuffle(CRANE_ALL, 22)).slice(0, N),
    seededShuffle(PLANT_ALL, 31).concat(seededShuffle(PLANT_ALL, 32)).slice(0, N),
  ];
  const rots = sets.map((s, k) => s.map((_, i) => (seeded(k * 100 + i)() - 0.5) * 26));
  sets.forEach(s => s.forEach(src => load(src)));   // 미리 불러 두기
  const cellH = () => cells[0].parentElement.offsetHeight || 140;
  const sizeCells = () => { const h = abGrid.clientHeight || H(); abGrid.style.setProperty("--cell", Math.round(h / (mobile() ? 3.1 : 4.3)) + "px"); };
  sizeCells();
  let phase = -1;
  function setPhase(k, instant) {
    if (k === phase) return;
    phase = k;
    const ph = PHASES[k];
    abDots.forEach((d, i) => d.classList.toggle("on", i === k));
    // 글: 단어 · 아이콘 칸 · 설명
    abWord.classList.add("swap"); abP.classList.add("swap");
    setTimeout(() => {
      abWord.textContent = ph.word; abP.innerHTML = ph.p;
      abWord.classList.remove("swap"); abP.classList.remove("swap");
    }, instant ? 0 : 220);
    abSlot.classList.toggle("full", !!ph.app);
    if (ph.app) { abSlot.dataset.app = ph.app; abGlyph.src = `brand-glyph_${ph.app}.svg`; } else delete abSlot.dataset.app;
    // 그림: 칸마다 차례로 톡 사라졌다 새 그림으로
    const order = seededShuffle(cells.map((_, i) => i), 50 + k);
    order.forEach((i, n) => {
      const im = cells[i], src = sets[k][i], r = rots[k][i];
      const swap = () => {
        im.src = ST + src.replace("/", "-") + ".png"; im.style.setProperty("--r", r + "deg");
        // 픽셀 식물: 가장 큰 식물(95칸)이 칸을 채우는 비율로 모두 같이 → 작은 풀은 작게
        const px = src.startsWith("plant/") ? +src.split("_").pop() : 0;
        if (px) { const ch = cellH(); im.style.height = Math.round(ch * 0.92 * (px * 6 + 64) / (95 * 6 + 64)) + "px"; im.style.maxHeight = "none"; im.style.maxWidth = "none"; }
        else if (SMALL[src]) { const m = Math.round(84 * SMALL[src] * 1.3) + "%"; im.style.height = ""; im.style.maxHeight = m; im.style.maxWidth = m; }   // 블루베리는 작게
        else { im.style.height = ""; im.style.maxHeight = ""; im.style.maxWidth = ""; }
        requestAnimationFrame(() => im.classList.remove("out"));
      };
      if (instant) { swap(); return; }
      setTimeout(() => { im.classList.add("out"); setTimeout(swap, 230); }, n * 14);
    });
    if (!instant && window.Sfx) Sfx.play("pop", 0.5);
  }
  setPhase(0, true);
  // 화살표: 다음 단계로 한 칸 (마지막이면 도담도담으로)
  abGo.addEventListener("click", () => {
    const st = ScrollTrigger.getAll().find(t => t.trigger === $("#about") && t.pin);
    if (!st || phase >= PHASES.length - 1) { go("#dodam"); return; }
    lenis.start();
    lenis.scrollTo(st.start + (st.end - st.start) * (phase + 1.15) / PHASES.length, { duration: 1.2 });
  });
  ScrollTrigger.create({
    trigger: "#about", start: "top top", end: () => "+=" + H() * 3.4, pin: "#aboutStage",
    invalidateOnRefresh: true, onRefreshInit: sizeCells,
    onUpdate: s => {
      setPhase(Math.min(PHASES.length - 1, Math.floor(s.progress * PHASES.length * 0.999)));
      // 세로줄이 엇갈려 천천히 오르내림 (홀수 줄은 위로, 짝수 줄은 아래로)
      const d = cellH() * 1.6 * s.progress;
      cols.forEach((col, i) => { col.style.transform = `translateY(${i % 2 ? d - cellH() * 0.8 : -d}px)`; });
    },
  });

  /* ---------------- 3. 앱: 한 줄로 서 있다가 → 앱의 그릇에 담김 ---------------- */
  // 도담도담: 앱의 '둥근 도시락통'(BentoShape.wideOval, 611.75 × 396.42, 모서리 32.4%)에 진짜 도시락처럼
  // [그림, 통 안 x, y(0~1, 통 기준), 크기(통 너비 대비 긴 변), 기울기]
  const BENTO = [
    ["food/onigiri", .26, .52, .46, -4],           // 큰 주먹밥이 왼쪽 반을
    ["food/inari", .56, .25, .21, -12], ["food/egg_roll", .78, .23, .31, 4],
    ["food/broccoli", .60, .53, .26, -6], ["food/fried_egg", .83, .50, .25, 8], ["food/tomato", .71, .45, .15, 0],
    ["food/mushroom", .52, .80, .16, 10], ["food/ebi_fry", .68, .79, .36, -72], ["food/octopus_sausage", .85, .74, .19, -12],
  ];
  // 소담소담: 보관함의 선으로 그린 유리병에 위에서 떨군 것처럼
  const JAR = ["crane/white", "crane/sky_side", "crane/blue", "crane/lavender_side", "crane/gray", "star/star_sky", "crane/black_side", "crane/sky", "crane/white_side", "star/star_sky", "crane/blue_side", "crane/lavender"];
  // 푸르담: 앱과 같은 픽셀 구 테라리움, 흙 위에 (뒷줄 → 앞줄). x는 % · 식물 1칸 = 용기 반 칸
  const TERRA = [["sunflower_90", 26], ["monstera_75", 42], ["fern_50", 60], ["lavender_45", 75], ["tulip_40", 34], ["echeveria_28", 52], ["red_mushroom_20", 67], ["mossy_stone_26", 80]];
  const PIX = "pixel-";

  // 그릇 크기 (px)
  const VES = {
    dodam: () => { const w = Math.min(Math.max(280, W() * 0.36), 540, (H() * 0.4) / 0.648); return { w, h: w * 396.42 / 611.75 }; },
    sodam: () => { const w = Math.min(Math.max(170, W() * 0.2), 300, (H() * 0.42) / 1.35); return { w, h: w * 1.35 }; },
    puru: () => { const s = Math.max(2, Math.min(4, Math.floor(Math.min(W() * 0.34, H() * 0.46) / 128))); return { w: 126 * s, h: 0, s }; },
  };
  // 유리병 (CraneShelf의 비율: 뚜껑 0.78w · 테두리 0.9w · 몸통 모서리 16%)
  const jarSVG = (w, front) => {
    const h = w * 1.35, sw = 1.6, bodyY = w * 0.2, bodyH = h - bodyY;
    const body = `<rect x="0" y="${bodyY}" width="${w}" height="${bodyH}" rx="${w * 0.16}"`;
    if (!front) return `<svg viewBox="0 0 ${w} ${h}">${body} fill="rgba(255,255,255,.82)"/></svg>`;
    return `<svg viewBox="0 0 ${w} ${h}">${body} fill="none" stroke="#2B2B2B" stroke-width="${sw}"/>
      <rect class="lid" x="${w * 0.11}" y="0" width="${w * 0.78}" height="${w * 0.4}" rx="${w * 0.1}" fill="#fff" stroke="#2B2B2B" stroke-width="${sw}"/>
      <rect x="${w * 0.05}" y="${w * 0.087}" width="${w * 0.9}" height="${w * 0.107}" rx="${w * 0.0535}" fill="#fff" stroke="#2B2B2B" stroke-width="${sw}"/></svg>`;
  };
  const bentoSVG = (w, front) => {
    const h = w * 396.42 / 611.75, rx = w * 0.324, sw = w * 0.028;
    return front
      ? `<svg viewBox="0 0 ${w} ${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="#CEBB84" stroke-width="${sw}"/></svg>`
      : `<svg viewBox="0 0 ${w} ${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="#FFF4C9"/></svg>`;
  };

  // 푸르담 앱의 물 (ContainerRenderer와 같은 식: 수면은 위에서 20%, 깊을수록 옅게)
  function waterLayer(pc, W, H) {
    const c = document.createElement("canvas"); c.width = W; c.height = pc.HT;
    const g = c.getContext("2d"), lv = H - Math.round(H * 0.8);
    for (let y = lv; y < H; y++) for (let x = 0; x < W; x++) {
      if (!pc.mask[y * W + x]) continue;
      const fy = H - pc.tops[x], k = (y - lv) / Math.max(1, H - 1 - lv), fade = (1 - k) * (1 - k);
      if (y < fy) {
        g.fillStyle = `rgba(143,186,208,${(0.04 + 0.34 * fade).toFixed(3)})`; g.fillRect(x, y, 1, 1);
        if (y - lv >= 2 && y - lv <= 3) { g.fillStyle = "rgba(255,255,255,.22)"; g.fillRect(x, y, 1, 1); }
      } else { g.fillStyle = `rgba(70,120,160,${(0.30 * fade).toFixed(3)})`; g.fillRect(x, y, 1, 1); }
    }
    // 수면 한 줄 + 기포
    for (let x = 0; x < W; x++) if (pc.mask[lv * W + x]) { g.fillStyle = "#86B4CA"; g.fillRect(x, lv, 1, 1); }
    [[0.36, 0.55], [0.62, 0.42]].forEach(([fx, fy]) => { g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(Math.round(W * fx), Math.round(lv + (H - lv) * fy), 1, 1); });
    return c.toDataURL();
  }

  // 종이학이 병 몸통에 떨어져 쌓인 모양 (몸통 너비 = 1000)
  function simulateJar(its, aspect) {
    const r = seeded(42), eng = Engine.create({ enableSleeping: false });
    eng.gravity.y = 1;
    const H2 = 1000 * aspect, st = { isStatic: true, friction: 0.9 };
    Composite.add(eng.world, [
      Bodies.rectangle(500, H2 - 30 + 60, 1400, 120, st),
      Bodies.rectangle(30 - 60, 0, 120, H2 * 4, st),
      Bodies.rectangle(970 + 60, 0, 120, H2 * 4, st),
    ]);
    const bodies = [];
    for (let step = 0; step < its.length * 22 + 520; step++) {
      if (step % 22 === 0 && bodies.length < its.length) {
        const it = its[bodies.length], w = it.fw * 1000, h = it.fh * 1000;
        const b = Bodies.rectangle(200 + r() * 600, -260, w * 0.8, h * 0.5, {
          chamfer: { radius: Math.min(w, h) * 0.2 }, friction: 0.6, frictionAir: 0.01, restitution: 0.1, density: 0.002, angle: (r() - 0.5) * 1.2,
        });
        Body.setAngularVelocity(b, (r() - 0.5) * 0.08);
        Composite.add(eng.world, b); bodies.push(b);
      }
      Engine.update(eng, 1000 / 60);
    }
    bodies.forEach((b, k) => { its[k].jar = { x: b.position.x / 1000, y: b.position.y / 1000, r: (b.angle * 180) / Math.PI }; });
  }

  const SPEC = {
    dodam: BENTO.map(([src, x, y, s, r]) => ({ src: ST + src.replace("/", "-") + ".png", fx: x, fy: y, s, r })),
    sodam: JAR.map((src, i) => { const q = seeded(i * 13 + 7)(); return { src: ST + src.replace("/", "-") + ".png", s: src.startsWith("star") ? 0.16 + q * 0.1 : 0.26 + q * 0.3 }; }),
    puru: TERRA.map(([id, x]) => ({ src: PIX + id + ".png", fx: x, pix: true })),
  };

  const bgActive = new Set();
  const setBg = () => {
    const a = [...bgActive].pop();
    document.body.style.setProperty("--bg", a ? `var(--${a})` : "var(--paper)");
  };
  const imgLoad = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  Object.entries(SPEC).forEach(([app, spec], ai) => {
    const sec = $("#" + app), scene = $(".scene", sec), objs = $(".objs", scene);
    const ves = $(".vessel", scene), front = $(".vessel-front", scene), steps = $$(".steps li", scene);
    const its = spec.map((sp, i) => {
      const el = document.createElement("img"); el.alt = ""; el.src = sp.src;
      if (sp.pix) el.className = "pix";
      objs.appendChild(el);
      return { ...sp, el, i, n: spec.length };
    });
    let terra = null;   // 푸르담: { url, tops, W, H, BH }
    let simKey = "";
    const geo = () => {
      const v = VES[app](), w = W(), h = H();
      if (app === "puru" && terra) v.h = terra.HT * v.s;
      // 그릇은 화면 가운데보다 조금 위 (왼쪽 아래에 제목·단계가 있어서)
      const vt = Math.max(150, h * 0.45 - v.h / 2);
      return { w, h, vw: v.w, vh: v.h, s: v.s, vl: (w - v.w) / 2, vt };
    };
    // 그릇 그리기 + 그림 크기
    const build = async () => {
      const g = geo();
      if (app === "dodam") { ves.innerHTML = bentoSVG(g.vw, false) + ves.querySelector(".box-name").outerHTML; front.innerHTML = bentoSVG(g.vw, true); }
      if (app === "sodam") { ves.innerHTML = jarSVG(g.vw, false) + ves.querySelector(".box-name").outerHTML; front.innerHTML = jarSVG(g.vw, true); }
      if (app === "puru" && window.PuruTerra) {
        if (!terra) {
          const pc = PuruTerra.pxContainer({ shape: "bowl", W: 126, H: 126, floor: "gravel", terrain: "hillL" });
          terra = { url: pc.url, tops: pc.tops, W: 126, H: 126, HT: pc.HT, water: waterLayer(pc, 126, 126) };
        }
        const nm = ves.querySelector(".box-name").outerHTML;
        ves.innerHTML = `<img src="${terra.url}" alt="">` + nm;
        front.innerHTML = `<img src="${terra.water}" alt="" style="image-rendering:pixelated">`;
      }
      const G = geo();
      [ves, front].forEach(el => { el.style.width = G.vw + "px"; el.style.height = G.vh + "px"; el.style.bottom = "auto"; el.style.top = G.vt + "px"; });
      await Promise.all(its.map(it => imgLoad(it.src).then(im => {
        if (!im) return;
        if (it.pix) { const k = G.s / 2; it.pw = im.width * k; it.ph = im.height * k; }
        else { const f = fit(im, it.s); it.fw = f.w; it.fh = f.h; it.pw = f.w * G.vw; it.ph = f.h * G.vw; }
        it.el.style.width = it.pw + "px"; it.el.style.height = it.ph + "px";
      })));
      if (app === "sodam") { const key = its.map(i => i.fw).join(); if (key !== simKey) { simulateJar(its, 1.15); simKey = key; } }
    };
    const rowY = g => g.vt - 70;
    const P = (stage, it) => {
      const g = geo(), m = mobile();
      if (stage === 1) {   // 한 줄로
        const per = m ? Math.ceil(it.n / 2) : it.n;
        const row = (it.i / per) | 0, j = it.i % per, n = row ? it.n - per : per;
        const ry = rowY(g) - (m && !row ? 70 : 0);
        const sc = Math.min(1, (g.w * (m ? 0.8 : 0.74) / n) * 0.82 / Math.max(it.pw || 1, it.ph || 1), 96 / Math.max(it.ph || 1, 1));
        return { x: g.w * (m ? 0.08 + 0.84 * (j + 0.5) / n : 0.18 + 0.74 * (j + 0.5) / n), y: ry, rotation: 0, scale: sc };
      }
      if (app === "sodam") {   // 병 몸통 안 (몸통은 위에서 0.2w부터, 높이 1.15w)
        const j = it.jar || { x: 0.5, y: 0.9, r: 0 };
        return { x: g.vl + j.x * g.vw, y: g.vt + g.vw * 0.2 + j.y * g.vw, rotation: j.r, scale: 1 };
      }
      if (app === "puru" && terra) {   // 흙 위에 밑동이 닿게
        const cx = Math.round(it.fx / 100 * (terra.W - 1)), top = terra.tops[Math.min(terra.W - 1, Math.max(0, cx))];
        const floorY = g.vt + (terra.H - top + 1) * g.s;
        return { x: g.vl + (cx + 0.5) * g.s, y: floorY - (it.ph || 0) / 2, rotation: 0, scale: 1 };
      }
      return { x: g.vl + it.fx * g.vw, y: g.vt + it.fy * g.vh, rotation: it.r, scale: 1 };
    };

    gsap.set([ves, front], { xPercent: -50, x: 0 });
    build().then(() => ScrollTrigger.refresh());
    its.forEach(it => gsap.set(it.el, { xPercent: -50, yPercent: -50, ...P(1, it) }));
    const drop0 = 1.5, gap = app === "sodam" ? 0.2 : 0.26;
    const end3 = drop0 + its.length * gap + 0.5;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scene, start: "top top", end: () => "+=" + H() * 3, pin: true, scrub: 0.7,
        invalidateOnRefresh: true,
        onRefreshInit: () => { build(); },
      },
    });
    const hitAt = its.map((it, i) => drop0 + i * gap + (app === "sodam" ? 0.335 : app === "puru" ? 0.2 : 0.15));
    const hitKind = app === "sodam" ? "paper" : app === "puru" ? "soil" : "tok";
    let prevT = 0;
    tl.eventCallback("onUpdate", () => {
      const t = tl.time(), s = t < drop0 - 0.05 ? 0 : t < end3 - 0.1 ? 1 : 2;
      if (window.Sfx && t > prevT) hitAt.forEach(h => { if (h > prevT && h <= t) Sfx.play(hitKind); });
      prevT = t;
      steps.forEach((li, i) => { li.classList.toggle("on", i === s); li.classList.toggle("done", i < s); });
      ves.classList.toggle("named", t >= end3 - 0.1);
    });
    // 처음부터 한 줄로 서 있음 → 그릇이 나타남
    tl.fromTo([ves, front], { opacity: 0, y: 30, x: 0, xPercent: -50 }, { opacity: 1, y: 0, x: 0, xPercent: -50, duration: 0.6, ease: "power2.out" }, 0);
    its.forEach(it => tl.fromTo(it.el, { x: () => P(1, it).x, y: () => P(1, it).y, rotation: 0, scale: () => P(1, it).scale }, { x: () => P(1, it).x, y: () => P(1, it).y, scale: () => P(1, it).scale, duration: 0.01 }, 0));
    // 소담소담: 뚜껑이 열려 있다가 다 담기면 닫힘
    const lidY = () => -geo().vw * 0.28;
    if (app === "sodam") tl.add(() => {}, 0);
    its.forEach((it, i) => {
      const t = drop0 + i * gap;
      if (app === "sodam") {
        tl.to(it.el, { x: () => P(2, it).x, y: () => geo().vt - geo().vw * 0.35, rotation: () => P(2, it).rotation * 0.4, scale: 1, duration: 0.22, ease: "power1.out" }, t);
        tl.to(it.el, { y: () => P(2, it).y, rotation: () => P(2, it).rotation, duration: 0.32, ease: "bounce.out" }, t + 0.22);
      } else if (app === "puru") {
        tl.to(it.el, { x: () => P(2, it).x, rotation: 0, scale: 1, duration: 0.4, ease: "power1.inOut" }, t);
        tl.to(it.el, { y: () => P(2, it).y, duration: 0.4, ease: "back.out(2)" }, t);
      } else {
        tl.to(it.el, { x: () => P(2, it).x, rotation: () => P(2, it).rotation, scale: 1, duration: 0.42, ease: "power1.inOut" }, t);
        tl.to(it.el, { y: () => P(2, it).y, duration: 0.42, ease: "bounce.out" }, t);   // 톡
      }
    });
    tl.to({}, { duration: 0.9 });
    steps[0].classList.add("on");
    if (app === "sodam") {
      const lidOf = () => $(".lid", front);
      // 뚜껑: 처음엔 위로 열려 있음 → 끝에 닫힘 (그릴 때마다 새로 생기므로 매번 찾아서)
      ScrollTrigger.create({
        trigger: scene, start: "top top", end: () => "+=" + H() * 3,
        onUpdate: () => {
          const lid = lidOf(); if (!lid) return;
          const k = Math.min(1, Math.max(0, (tl.time() - (end3 - 0.4)) / 0.4));
          const e = k * k * (3 - 2 * k);
          lid.style.transform = `translate(${(1 - e) * geo().vw * 0.22}px, ${(1 - e) * lidY()}px) rotate(${(1 - e) * 16}deg)`;
        },
        onRefresh: () => { const lid = lidOf(); if (lid && tl.time() < end3 - 0.4) lid.style.transform = `translate(${geo().vw * 0.22}px, ${lidY()}px) rotate(16deg)`; },
      });
    }

    // 섹션 안에 있는 동안 바탕을 앱 대표색으로
    ScrollTrigger.create({
      trigger: sec, start: "top 55%", end: "bottom 45%",
      onToggle: s => { s.isActive ? bgActive.add(app) : bgActive.delete(app); setBg(); },
    });
  });

  /* ---------------- 4. 서체 ---------------- */
  const tText = $("#tText"), tSize = $("#tSize"), tOut = $("#tSizeOut");
  $$(".seg button").forEach(b => b.addEventListener("click", () => {
    $$(".seg button").forEach(x => x.classList.toggle("on", x === b));
    tText.style.fontFamily = `"${b.dataset.face}", var(--kr)`;
  }));
  const setSize = () => { const v = mobile() ? Math.round(tSize.value * 0.6) : +tSize.value; tText.style.fontSize = v + "px"; tOut.textContent = tSize.value; };
  tSize.addEventListener("input", setSize); setSize();

  /* ---------------- 끝 ---------------- */
  gsap.from(".end-apps li", { y: 40, opacity: 0, rotation: i => [-10, 6, -4][i], duration: 0.9, ease: "back.out(1.6)", stagger: 0.1, scrollTrigger: { trigger: ".end", start: "top 80%" } });

  // 메뉴 강조는 고정 장면들을 다 만든 뒤에 (위치 계산 순서)
  navLinks.forEach(a => ScrollTrigger.create({
    trigger: "#" + a.dataset.sec, start: "top 50%", end: "bottom 50%",
    onToggle: s => { secActive.set(a.dataset.sec, s.isActive); setNav(); },
  }));
  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
