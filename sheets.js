/* 앱마다: 화면(기울인 폰 여러 대) · 그래픽 요소(번호 붙은 목록) · 소담소담 종이 고르기 · 푸르담 도감
   + 글이 한 줄씩 생겨나는 효과 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mobile = () => innerWidth <= 760;
  const NAME = { dodam: "도담도담", sodam: "소담소담", puru: "푸르담" };
  const no = i => String(i + 1).padStart(2, "0");
  const cell = (i, art, nm, en) => `<div class="cell"><span class="no">${no(i)}</span><div class="art">${art}</div><span class="nm">${nm}</span>${en ? `<span class="en">${en}</span>` : ""}</div>`;

  /* ---------- 화면: 폰 여러 대를 부채처럼 ---------- */
  const SHOTS = { dodam: ["d", 6], sodam: ["s", 4], puru: ["p", 5] };
  const FAN = {   // [x%, y%, 기울기]
    6: [[11, 52, -9], [27, 60, -4], [43, 46, 1], [59, 56, 10], [75, 50, -5], [90, 47, 8]],
    5: [[14, 50, -8], [32, 58, -3], [50, 46, 1], [68, 55, 11], [86, 49, 7]],
    4: [[18, 51, -7], [39, 58, -2], [61, 46, 8], [82, 53, 4]],
  };
  $$(".sheet").forEach(sh => {
    const app = sh.dataset.app, [k, n] = SHOTS[app], fan = $(".fan", sh), phones = [];
    for (let i = 1; i <= n; i++) {
      const f = document.createElement("figure");
      f.className = "phone";
      f.innerHTML = `<div class="ph-screen"><img src="shots-${k}f${i}.jpg" alt="${NAME[app]} 화면 ${i}"></div>`;
      f.style.setProperty("--mr", FAN[n][i - 1][2] * 0.4 + "deg");
      fan.appendChild(f); phones.push(f);
    }
    if (mobile()) return;
    const P = i => { const [x, y, r] = FAN[n][i]; return { x: fan.clientWidth * x / 100, y: fan.clientHeight * y / 100, r }; };
    gsap.set(phones, { xPercent: -50, yPercent: -50 });
    gsap.fromTo(phones,
      { x: () => fan.clientWidth / 2, y: () => fan.clientHeight * 0.66, rotation: 0, scale: 0.86 },
      { x: i => P(i).x, y: i => P(i).y, rotation: i => P(i).r, scale: 1, ease: "power2.out", stagger: 0.05,
        scrollTrigger: { trigger: fan, start: "top 88%", end: "center 52%", scrub: 0.8, invalidateOnRefresh: true } });
  });

  /* ---------- 도담도담: 도시락 모양 · 반찬 ---------- */
  const BENTO = [   // 앱의 BentoShapeView와 같은 비율
    ["정사각", "Square", 447.25, 420.14, w => w * 0.214, "#D9DADB", "#939597"],
    ["캡슐", "Capsule", 611.75, 291.24, (w, h) => h / 2, "#E6D8C6", "#B69C78"],
    ["타원", "Oval", 611.75, 396.42, w => w * 0.324, "#FFF4C9", "#CEBB84"],
    ["직사각", "Rectangle", 611.75, 396.42, w => w * 0.136, "#CFDAB2", "#9EB58D"],
    ["원", "Circle", 1, 1, null, "#C4D6E0", "#8B9CA9"],
    ["삼각", "Triangle", 507, 439, "tri", "#BCB8D2", "#858598"],
  ];
  const bentoSVG = ([, , bw, bh, r, fill, stroke]) => {
    const W = 200, H = W * bh / bw, sw = W * 0.028, pad = sw;
    let shape;
    if (r === "tri") shape = `<svg viewBox="0 0 682.16 682.16" preserveAspectRatio="none" width="${W}" height="${H}" style="overflow:visible"><path d="M229.96,153.48 l-142.54,246.89 c-49.39,85.54 12.35,192.47 111.12,192.47 h285.08 c98.78,0 160.51,-106.93 111.12,-192.47 l-142.54,-246.89 c-49.39,-85.54 -172.86,-85.54 -222.25,0 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke"/></svg>`;
    else if (!r) shape = `<svg viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" width="${W}" height="${H}"><ellipse cx="${W / 2}" cy="${H / 2}" rx="${W / 2}" ry="${H / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`;
    else { const rx = r(W, H); shape = `<svg viewBox="${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/></svg>`; }
    return shape;
  };
  const BANCHAN = [["onigiri", "삼각김밥"], ["egg_roll", "계란말이"], ["fried_egg", "계란후라이"], ["broccoli", "브로콜리"], ["octopus_sausage", "문어소시지"], ["ebi_fry", "새우튀김"],
    ["tomato", "토마토"], ["inari", "유부초밥"], ["mushroom", "버섯"], ["corn", "옥수수"], ["mandu", "튀긴만두"], ["salmon_gimbap", "연어김밥"]];
  const fill = (kind, html, n) => $$(`.gfx[data-kind=${kind}]`).forEach(g => { g.style.setProperty("--n", n); g.innerHTML = html; });
  fill("bento", BENTO.map((b, i) => cell(i, bentoSVG(b), b[0] + " 도시락", b[1])).join(""), 6);
  // 반찬: 앱 상점의 60가지 전부 (선물로만 받는 반찬은 뺌)
  const CAT_KO = { rice: "밥", side: "반찬", snack: "간식", fruit: "과일" };
  fetch("banchan.json").then(r => r.json()).then(list => {
    fill("banchan", list.map((b, i) => cell(i, `<img src="stickers-${b.f.replace("/", "-")}" alt="" loading="lazy">`, b.name, CAT_KO[b.cat] || "")).join(""), 6);
    ScrollTrigger.refresh();
  });

  /* ---------- 소담소담: 종이 고르기 → 그 종이로 다시 접기 ---------- */
  const PAPERS = [["white", "흰색", "#EFEEEA"], ["lightgray", "연회색", "#D9D9D9"], ["gray", "회색", "#9E9E9E"], ["black", "검정", "#2B2B2B"],
    ["sky", "하늘", "#A9CBEA"], ["blue", "파랑", "#4F74B8"], ["lavender", "연보라", "#C7B8E4"], ["purple", "보라", "#7B5EA7"],
    ["mint", "민트", "#9FD6C6"], ["green", "연두", "#B7D38C"], ["yellow", "노랑", "#F3D46B"], ["orange", "주황", "#EE9A5A"],
    ["pink", "분홍", "#F2C4C8"], ["red", "빨강", "#C8453A"], ["brown", "갈색", "#8A6A52"], ["hanji", "한지", "#EFE8DA"]];
  const STICKER = { white: 1, gray: 1, black: 1, sky: 1, blue: 1, lavender: 1, purple: 1, mint: 1, green: 1, yellow: 1, orange: 1, pink: 1, red: 1, brown: 1 };
  const papersEl = $("#papers"), stage = $("#foldStage"), fallback = $(".fold-fallback"), paperName = $("#paperName");
  let fold = null;
  if (papersEl) {
    papersEl.innerHTML = PAPERS.map(([id, nm, hex], i) => `<button role="radio" aria-checked="${i === 0}" class="${i === 0 ? "on" : ""}" data-id="${id}" data-hex="${hex}" data-nm="${nm}" style="--c:${hex}"><i></i>${nm}</button>`).join("");
    const tryMount = () => {
      if (fold || !window.DamdamFold || !stage) return;
      try { fold = window.DamdamFold.mount(stage, { paper: PAPERS[0][2], paperName: PAPERS[0][1] }); if (fallback) fallback.remove(); } catch (e) { fold = null; }
    };
    tryMount(); addEventListener("load", tryMount);
    papersEl.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      $$("button", papersEl).forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
      paperName.textContent = b.dataset.nm;
      if (fold) fold.setPaper(b.dataset.hex, b.dataset.nm);
      else if (fallback) {   // 3D가 아직 없을 때: 같은 색 종이학 그림으로
        const id = STICKER[b.dataset.id] ? b.dataset.id : "white";
        gsap.fromTo(fallback, { scale: 0.6, rotation: -20, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(1.8)", onStart: () => { fallback.src = `stickers-crane-${id}_side.png`; } });
      }
      if (window.Sfx) Sfx.play("paper");
    });
  }

  /* ---------- 푸르담: 테라리움 모양 · 식물 · 도감 ---------- */
  const PIX = "pixel-";
  const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const TERRA_SHAPES = [   // 앱의 ContainerShape (10일 크기)
    ["bowl", "구", "Bowl", 102, 102, "mound", [["fern_50", 40], ["violet_18", 66]]],
    ["talldome", "돔", "Dome", 68, 104, "flat", [["monstera_75", 50]]],
    ["square", "정사각", "Square", 98, 98, "hillL", [["echeveria_28", 30], ["red_mushroom_20", 70]]],
    ["wide", "직사각", "Rectangle", 105, 104, "wave", [["tulip_40", 28], ["mossy_stone_26", 64]]],
    ["long", "넓은 직사각", "Wide", 132, 84, "flat", [["lavender_45", 22], ["pebbles_20", 50], ["haworthia_18", 76]]],
    ["tallrect", "기둥", "Column", 68, 104, "mound", [["bamboo_95", 50]]],
  ];
  async function terraImg([shape, , , W, H, terrain, plants]) {
    if (!window.PuruTerra) return "";
    const pc = PuruTerra.pxContainer({ shape, W, H, floor: "soil", terrain });
    const base = await loadImg(pc.url);
    const ims = await Promise.all(plants.map(([id]) => loadImg(PIX + id + ".png")));
    // 용기 1칸 = 2px, 식물 1칸 = 1px (디자인보드와 같게)
    const c = document.createElement("canvas"); c.width = W * 2; c.height = pc.HT * 2;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    g.drawImage(base, 0, 0, W * 2, pc.HT * 2);
    plants.forEach(([, x], i) => {
      const im = ims[i]; if (!im) return;
      const cx = Math.round(x / 100 * (W - 1)), top = pc.tops[Math.min(W - 1, Math.max(0, cx))];
      const bottom = (H - top + 1) * 2;
      g.drawImage(im, Math.round(cx * 2 - im.width / 2), bottom - im.height);
    });
    return c.toDataURL();
  }
  (async () => {
    const urls = await Promise.all(TERRA_SHAPES.map(terraImg));
    fill("terra", TERRA_SHAPES.map((t, i) => cell(i, `<img class="pix" src="${urls[i]}" alt="">`, t[1], t[2])).join(""), 6);
    ScrollTrigger.refresh();
  })();

  fetch("plants.json").then(r => r.json()).then(async plants => {
    const by = Object.fromEntries(plants.map(p => [p.id, p]));
    // 식물: 도감 58가지 전부 (선물 한정 '행운 맛 클로버'는 뺌) · 모두 같은 배율이라 원래 크기 차이가 그대로
    const GRID = plants.map(p => p.id).filter(id => id !== "lucky_clover_30");
    const ims = await Promise.all(GRID.map(id => loadImg(PIX + id + ".png")));
    const SC = 1.35;
    fill("plants", GRID.map((id, i) => {
      const im = ims[i];
      return cell(i, `<img class="pix" src="${PIX + id}.png" alt="" style="width:${im ? Math.round(im.width * SC) : 40}px;height:${im ? Math.round(im.height * SC) : 40}px">`, by[id].name, by[id].cat);
    }).join(""), 6);

    // 도감: 이름을 누르면 그 식물과 설명
    const DG = GRID;
    const RARE = { common: "일반", uncommon: "보통", rare: "희귀", legendary: "전설" };
    const SEASON = { spring: "봄", summer: "여름", autumn: "가을", winter: "겨울", indoor: "실내" };
    const chips = $("#dgChips"), img = $("#dgImg");
    if (!chips) return;
    chips.innerHTML = DG.map((id, i) => `<button data-id="${id}" class="${i === 0 ? "on" : ""}">${by[id].name}</button>`).join("");
    let cur = 0, timer, touched = false;
    const show = i => {
      cur = i; const p = by[DG[i]];
      $$("button", chips).forEach((b, k) => b.classList.toggle("on", k === i));
      img.style.opacity = 0;
      loadImg(PIX + p.id + ".png").then(im => {
        // 모든 식물을 같은 배율로 (가장 큰 95칸 식물이 칸을 채우게) → 작은 풀은 작게
        const box = $(".dg-plant").clientHeight || 360, sc = Math.max(2, Math.floor(box * 0.92 / 95));
        img.src = PIX + p.id + ".png"; if (im) { img.style.width = im.width * sc + "px"; img.style.height = im.height * sc + "px"; }
        img.style.opacity = 1;
      });
      $("#dgName").textContent = p.name;
      $("#dgMeta").textContent = `${p.cat} · ${SEASON[p.season] || ""} · ${RARE[p.rarity] || ""}`;
      $("#dgDesc").textContent = p.desc;
    };
    show(0);
    const auto = () => { clearInterval(timer); timer = setInterval(() => { if (!touched) show((cur + 1) % DG.length); }, 2600); };
    auto();
    chips.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; touched = true; show(DG.indexOf(b.dataset.id)); if (window.Sfx) Sfx.play("soil", 0.6); });
    ScrollTrigger.refresh();
  });

  /* ---------- 글: 읽는 순서대로 한 줄씩 ---------- */
  function split(el) {
    if (el._src == null) el._src = el.innerHTML.trim();
    const parts = el._src.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(p => p.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ")).join("<br>");
    const lines = []; let cur = null, lastTop = null;
    el.childNodes.forEach(nd => {
      if (nd.nodeName === "BR") { cur = null; lastTop = null; return; }
      if (nd.nodeType !== 1) return;
      const t = nd.offsetTop;
      if (!cur || lastTop === null || Math.abs(t - lastTop) > 4) { cur = []; lines.push(cur); lastTop = t; }
      cur.push(nd.textContent);
    });
    el.innerHTML = lines.map(l => `<span class="ln"><span>${l.join(" ")}</span></span>`).join("");
    const lns = $$(".ln", el);
    if (el._shown) lns.forEach(l => l.classList.add("in"));
    return lns;
  }
  const targets = $$("[data-split]");
  const run = () => targets.forEach(el => {
    split(el);
    if (el._st) return;
    el._st = ScrollTrigger.create({
      trigger: el, start: "top 90%", once: true,
      onEnter: () => { el._shown = true; $$(".ln", el).forEach((l, i) => setTimeout(() => l.classList.add("in"), i * 140)); },
    });
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(run);
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => targets.forEach(split), 200); });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
