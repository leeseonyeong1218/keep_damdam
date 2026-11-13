/* 푸르담 픽셀 테라리움 용기 (푸르담 디자인보드 v2의 그리는 코드를 그대로 옮김) */
(() => {
const CONT = { 3: [80, 96], 10: [105, 104], 20: [130, 110], 30: [150, 116] };
const BOWL = { 3: [88, 88], 10: [102, 102], 20: [114, 114], 30: [126, 126] };
const TALL = { 3: [56, 96], 10: [68, 104], 20: [80, 110], 30: [92, 116] };
const SHAPE_NAME = { bowl: '구', dome: '돔', talldome: '긴 돔', square: '정사각', wide: '직사각', long: '넓은 직사각', tallrect: '기둥' };
const WIDE2 = { 3: [104, 72], 10: [132, 84], 20: [160, 92], 30: [180, 100] };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function nowSky() { const h = new Date().getHours(); return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'sunset' : 'night'; }
const SKY = { none: null, day: ['#DCEBF3', '#E4F0F6', '#ECF4F8', '#F2F7F9'], dawn: ['#D9D4E6', '#E7D9DF', '#F1E2D6', '#F6EBD9'], sunset: ['#C9A4B8', '#E0A98F', '#EFC18F', '#F4D9B5'], night: ['#2E3550', '#3A4262', '#474F70', '#565E7E'] };
const FLOORS = { soil: ['#6D5A46', '#7D6A55', '#9B8669', '#B39B78'], sand: ['#C9B48C', '#D9C7A3', '#E6D7B8', '#F0E5CC'], moss: ['#587A50', '#6F8F66', '#8AAA80', '#A6C19C'], gravel: ['#8E8A82', '#A8A49C', '#C2BEB6', '#D6D2CA'] };
function hash(x, y) { let h = Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function floorTop(shape, x, W, H) {
  const b = H * 0.14, t = x / (W - 1);
  switch (shape) {
    case 'hillL': return b + Math.max(0, 0.55 - t) * H * 0.22 + Math.sin(t * 7) * 0.8;
    case 'hillR': return b + Math.max(0, t - 0.45) * H * 0.22 + Math.sin(t * 7) * 0.8;
    case 'valley': return b + H * 0.08 - (0.5 - Math.abs(t - 0.5)) * H * 0.12 + Math.sin(t * 6) * 0.8;
    case 'mound': return b + Math.max(0, 1 - Math.abs(t - 0.5) * 3.2) * H * 0.12 + Math.sin(t * 8) * 0.6;
    case 'wave': return b + (Math.sin(t * 6.3 + 1) * 0.5 + 0.5) * H * 0.08;
    default: return b + Math.sin(t * 9) * 0.8;
  }
}
function pxContainer(o) {
  const { shape = 'square', W, H, floor = 'soil', terrain = 'flat', sky = 'none', water = false, thin = false } = o;
  const R = Math.max(3, Math.round(Math.min(W, H) * 0.08)); const CUT = Math.round(H * 0.1);
  const BH = Math.max(3, Math.round(H * 0.035)), PT = 0, HT = H + BH;
  const c = document.createElement('canvas'); c.width = W; c.height = HT; const g = c.getContext('2d');
  const inRound = (x, y, r) => { const cx = Math.min(Math.max(x, r), W - 1 - r), cy = Math.min(Math.max(y, r), H - 1 - r); const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r * r + r * 0.5; };
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    if (shape === 'square' || shape === 'wide' || shape === 'long' || shape === 'tallrect') return y < H - R ? true : inRound(x, y, R);
    if (shape === 'bowl') { if (y < CUT) return false; const cx = (W - 1) / 2, cy = (H - 1) / 2, rx = W / 2, ry = H / 2; const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny > 1) return false;
      const k = CUT + 2 - y; if (k > 0) { const nyc = (CUT - cy) / ry; const hw = rx * Math.sqrt(Math.max(0, 1 - nyc * nyc)); if (x < cx - hw + k || x > cx + hw - k) return false; } return true; }
    if (shape === 'dome' || shape === 'talldome') { const cx = (W - 1) / 2, r = W / 2; if (y < r) { const nx = (x - cx) / r, ny = (y - r) / r; return nx * nx + ny * ny <= 1; } return inRound(x, y, R) || y < H - R; }
  };
  const skyCols = SKY[sky];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) {
    if (skyCols) { const t = (y / (H - 1)) * 3; const i = Math.min(2, Math.floor(t)); const f = t - i; const th = (BAYER[y % 4][x % 4] + 0.5) / 16; g.fillStyle = f > th ? skyCols[i + 1] : skyCols[i]; } else g.fillStyle = '#F8F5EF';
    g.fillRect(x, y, 1, 1);
  }
  const stars = [];
  if (sky === 'night') { const cols = 6, rows = 4, cw = W / cols, ch = (H * 0.55) / rows; let i = 0;
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) { i++; if (hash(i, 5) < 0.25) continue; const x = Math.floor(cx * cw + 2 + hash(i, 7) * (cw - 4)), y = Math.floor(ry * ch + 2 + hash(i, 3) * (ch - 4)); if (!inside(x, y)) continue;
      const bright = hash(i, 9); g.fillStyle = bright < 0.3 ? '#8E97B8' : bright < 0.7 ? '#B5BCD6' : '#E6EAF5'; g.fillRect(x, y, 1, 1);
      if (bright > 0.85 && inside(x - 1, y) && inside(x + 1, y)) { g.fillStyle = 'rgba(230,234,245,.5)'; g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1); g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1); }
      if (bright > 0.6) stars.push([x, y, i]); } }
  const fl = FLOORS[floor]; const tops = []; for (let x = 0; x < W; x++) tops.push(Math.round(floorTop(terrain, x, W, H) * (thin ? 0.6 : 1)));
  for (let x = 0; x < W; x++) for (let y = H - tops[x]; y < H; y++) if (inside(x, y)) {
    const d = y - (H - tops[x]); let col = d === 0 ? fl[3] : d < 2 ? fl[2] : d < tops[x] * 0.6 ? fl[1] : fl[0];
    const r = hash(x, y); if (d > 1 && r < 0.08) col = fl[0]; else if (d > 1 && r > 0.94) col = fl[2];
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  const lv = water ? H - Math.round(H * 0.3) : -1;
  if (water) { // 수면 아래: 깊을수록 조금 더 푸르게(물 틴트), 바닥도 잠긴 듯 틴트, 기포 두 개
    for (let y = lv; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { const fy = H - tops[x]; if (y < fy) { const k = (y - lv) / Math.max(1, fy - lv); g.fillStyle = `rgba(143,186,208,${(0.22 + 0.18 * k).toFixed(2)})`; } else g.fillStyle = 'rgba(70,120,160,.28)'; g.fillRect(x, y, 1, 1); if (y < fy && y - lv >= 2 && y - lv <= 3) { g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, y, 1, 1); } }
    for (let i = 0; i < 2; i++) { const x = Math.floor(W * (0.3 + 0.4 * hash(i, 31))), fy = H - tops[Math.min(W - 1, x)]; const y = fy - 3 - Math.floor(hash(i, 32) * Math.max(1, fy - lv - 6)); if (y > lv + 2 && inside(x, y)) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x, y, 1, 1); } } }
  // 경계까지 거리(맨해튼) 계산
  const dist = new Int16Array(W * H).fill(99);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) dist[y * W + x] = 0;
  for (let k = 1; k <= 6; k++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && dist[y * W + x] === 99) { if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && dist[(y + dy) * W + x + dx] === k - 1)) dist[y * W + x] = k; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { const d = dist[y * W + x];
    if (d === 0) { g.fillStyle = '#6E6760'; g.fillRect(x, y, 1, 1); }
    else if (shape !== 'bowl' && d === 1) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x, y, 1, 1); }
    else if (shape === 'bowl' && d === 2 && !thin) { g.fillStyle = y > H * 0.55 ? 'rgba(110,103,96,.45)' : 'rgba(255,255,255,.7)'; g.fillRect(x, y, 1, 1); } }
  // 직각 모서리의 꼭짓점 픽셀 하나 제거
  [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].forEach(([x, y]) => { if (inside(x, y)) g.clearRect(x, y, 1, 1); });
  // 왼쪽 위 곡선 하이라이트 두 줄
  if (shape === 'bowl' && !thin) for (let y = 0; y < H; y++) for (let x = 0; x < W * 0.5; x++) if (inside(x, y)) { const d = dist[y * W + x]; const ty = y / H;
    if (d === 4 && ty > 0.1 && ty < 0.42) { g.fillStyle = '#FFFFFF'; g.fillRect(x, y, 1, 1); }
    if (d === 6 && ty > 0.16 && ty < 0.3) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(x, y, 1, 1); } }
  // 받침: 몸통 아래 짧은 발
  { const DK = '#6E6760', WH = 'rgba(255,255,255,.85)'; const bw = shape === 'bowl' ? Math.round(W * 0.42) : W - 4; const bx0 = Math.round((W - bw) / 2), bx1 = bx0 + bw - 1;
    for (let y = H; y < H + BH; y++) for (let x = bx0; x <= bx1; x++) { const ex = x === bx0 || x === bx1, ey = y === H + BH - 1; if (ex && ey) continue; g.fillStyle = ex || ey ? DK : '#F1EDE6'; g.fillRect(x, y, 1, 1); if (!ex && !ey && x === bx0 + 1) { g.fillStyle = WH; g.fillRect(x, y, 1, 1); } } }
  const mask = new Uint8Array(W * HT); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && dist[y * W + x] > 0) mask[y * W + x] = 1;
  return { url: c.toDataURL(), tops, stars, lv, mask, PT, BH, HT, floorY: tops.map(tp => H - tp) };
}

  window.PuruTerra = { pxContainer, CONT, BOWL, TALL, WIDE2, SHAPE_NAME, FLOORS };
})();
