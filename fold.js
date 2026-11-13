/*!
 * 소담소담 종이학 접기 3D (웹판)
 * SodamSodam/Shared/FoldAnimation.swift + FoldingCraneView.swift + PaperMaterials.swift 를 three.js로 옮긴 것.
 *
 * 페이지에 이 순서로 넣어 주세요 (three.js 는 r149 고정 — 클래식 스크립트 build/three.min.js 가 있는 마지막 무경고 버전):
 *
 *   <script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>
 *   <script src="js/fold.js"></script>
 *
 * 데이터: assets/fold/fold_mesh.json + assets/fold/fold_frames.bin (fold.js 위치 기준 ../assets/fold/ 에서 읽음, opts.base 로 바꿀 수 있음)
 *
 * 사용:
 *   var fold = DamdamFold.mount(document.querySelector('#crane'), { paper: '#A9CBEA' });
 *   fold.setPaper('#F2C4C8', '분홍');   // 겉면 색을 바꾸고 처음부터 다시 접기 ('은빛'/'황금'은 금속 재질)
 *   fold.refold();                      // 같은 종이로 처음부터 다시 접기
 *   fold.destroy();
 *
 * opts: {
 *   paper: '#EFEEEA',      겉면 색 (hex 문자열 또는 숫자)
 *   paperName: '흰색',     '은빛'·'황금'(또는 'silver'·'gold')이면 금속 재질
 *   base: '…/assets/fold/',
 *   duration: 6.0,         펼친 종이 → 완성 학까지 걸리는 초 (처음 0.45초 펼친 종이로 멈춤은 별도)
 *   distance: 2.5,         카메라 거리 (앱은 2.61 = 440pt 영역 기준, 작을수록 크게 보이지만 2.4 아래면 접는 도중 모서리가 잘림)
 *   sway: true,            완성 뒤 천천히 좌우로 흔들림
 *   reducedMotion: 'auto', 'auto'면 '동작 줄이기' 설정일 때 접기 없이 완성 학만 보여줌
 *   onFinish: function(){} 다 접었을 때
 * }
 */
(function () {
  'use strict';

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  var DEFAULT_BASE = new URL('./fold-', SCRIPT_SRC).href;

  // 앱과 같은 값들
  var INNER_COLOR = 0xF1F0EC;          // PaperMaterials.innerColor
  var LIFT_OUTER = 0.002, LIFT_INNER = 0.0001;
  var SILVER_BASE = [0.83, 0.85, 0.88], GOLD_BASE = [0.9, 0.7, 0.28];

  var cache = {};
  function loadData(base) {
    if (!cache[base]) {
      cache[base] = Promise.all([
        fetch(base + 'fold_mesh.json').then(function (r) { if (!r.ok) throw new Error('fold_mesh.json ' + r.status); return r.json(); }),
        fetch(base + 'fold_frames.bin').then(function (r) { if (!r.ok) throw new Error('fold_frames.bin ' + r.status); return r.arrayBuffer(); })
      ]).then(function (res) { return prepare(res[0], res[1]); });
      cache[base].catch(function () { delete cache[base]; });
    }
    return cache[base];
  }

  // 메시 데이터를 계산하기 좋은 꼴로 (여러 번 mount 해도 한 번만)
  function prepare(mesh, buf) {
    var F = mesh.frames, V = mesh.verts;
    var q = new Int16Array(buf);
    if (q.length !== F * V * 3) throw new Error('fold_frames.bin size mismatch');
    var lo = mesh.lo, hi = mesh.hi;
    var nT = mesh.tris.length, tris = new Uint32Array(nT * 3);
    for (var i = 0; i < nT; i++) { tris[i * 3] = mesh.tris[i][0]; tris[i * 3 + 1] = mesh.tris[i][1]; tris[i * 3 + 2] = mesh.tris[i][2]; }
    var nC = mesh.creases.length, creases = new Uint32Array(nC * 2), creaseFrom = new Float32Array(nC);
    for (i = 0; i < nC; i++) { creases[i * 2] = mesh.creases[i][0]; creases[i * 2 + 1] = mesh.creases[i][1]; creaseFrom[i] = mesh.creaseFrom[i]; }
    var turn = null;
    for (i = 0; i < mesh.marks.length; i++) if (mesh.marks[i].label.indexOf('사각 기본형') >= 0) { turn = mesh.marks[i].frame; break; }
    if (turn == null) turn = 324 / (mesh.step || 1);
    // 접는 단계 경계 (프레임 번호, 마지막 프레임 포함)
    var bounds = [];
    mesh.marks.map(function (m) { return m.frame; }).sort(function (a, b) { return a - b; }).forEach(function (f) {
      if (f >= 0 && f < F - 1 && (!bounds.length || f > bounds[bounds.length - 1] + 1e-6)) bounds.push(f);
    });
    if (!bounds.length || bounds[0] > 0) bounds.unshift(0);
    bounds.push(F - 1);
    return {
      F: F, V: V, q: q, nT: nT, nC: nC, tris: tris, creases: creases, creaseFrom: creaseFrom,
      lo: lo, sc: [(hi[0] - lo[0]) / 65534, (hi[1] - lo[1]) / 65534, (hi[2] - lo[2]) / 65534],
      rotation: mesh.rotation, turnEnd: turn, bounds: bounds, marks: mesh.marks
    };
  }

  // 단계마다 시간을 나눔: 긴 단계는 조금 빨리(제곱근), 처음 접기·사각 기본형·마지막 날개 펴기는 여유 있게
  function buildTimeline(d) {
    var segs = [], total = 0, b = d.bounds;
    for (var i = 0; i < b.length - 1; i++) {
      var len = b[i + 1] - b[i];
      var w = Math.pow(len, 0.5);
      if (i === 0) w *= 1.35;
      if (i === 8) w *= 1.35;                       // 사각 기본형으로 모으기
      if (i >= b.length - 3) w *= 1.7;              // 날개 접기·펴기
      segs.push({ a: b[i], b: b[i + 1], w: w });
      total += w;
    }
    var acc = 0;
    segs.forEach(function (s) { s.u0 = acc / total; acc += s.w; s.u1 = acc / total; });
    return segs;
  }
  function frameAt(segs, u) {
    // 전체를 부드럽게 시작·마무리 (선형과 사인 곡선 반반)
    u = Math.min(Math.max(u, 0), 1);
    u = 0.45 * u + 0.55 * (0.5 - 0.5 * Math.cos(Math.PI * u));
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (u <= s.u1 || i === segs.length - 1) {
        var k = (u - s.u0) / Math.max(s.u1 - s.u0, 1e-9);
        return s.a + (s.b - s.a) * Math.min(Math.max(k, 0), 1);
      }
    }
    return segs[segs.length - 1].b;
  }

  function parseHex(hex) {
    if (typeof hex === 'number') return hex & 0xFFFFFF;
    var s = String(hex || '').trim().replace(/^#/, '');
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var n = parseInt(s, 16);
    return isNaN(n) ? 0xEFEEEA : n;
  }
  function luma(n) { return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); }
  function metalKind(n, name) {
    var s = String(name || '').toLowerCase();
    if (s === '은빛' || s === 'silver' || (!name && n === 0xC4C8CE)) return 'silver';
    if (s === '황금' || s === 'gold' || (!name && n === 0xD4A646)) return 'gold';
    return null;
  }

  // 금속 종이가 비출 주변 모습 (PaperMaterials.environment 와 같은 구도. 웹에선 앱보다 어둡게 나와서 밝기를 올림)
  function makeEnvironment(THREE, renderer, neutral) {
    var w = 256, h = 128, c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, h, 0, 0); // 아래(0) → 위(1)
    grad.addColorStop(0, 'rgb(96,80,62)');
    grad.addColorStop(0.36, 'rgb(158,136,104)');
    grad.addColorStop(0.5, 'rgb(255,248,232)');
    grad.addColorStop(0.64, 'rgb(146,130,108)');
    grad.addColorStop(1, 'rgb(205,205,211)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    [10, 74, 138, 202].forEach(function (x) { g.fillRect(x, h - 112, 30, 26); });
    g.fillStyle = 'rgb(62,56,50)';
    // 어두운 덩어리는 정면(카메라 쪽, 가로 3/4 지점) 반사를 피해 옆으로 (three.js 의 가로 원점이 SceneKit 과 달라서)
    [114, 242].forEach(function (x) { g.fillRect(x, h - 80, 40, 60); g.fillRect(x - w, h - 80, 40, 60); });
    if (neutral) {
      // 은빛: 따뜻한 주변 색이 은을 누렇게 물들이지 않게 회색으로
      var img = g.getImageData(0, 0, w, h), px = img.data;
      for (var i = 0; i < px.length; i += 4) {
        var y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        px[i] = y * 0.98; px[i + 1] = y * 0.99; px[i + 2] = y;
      }
      g.putImageData(img, 0, 0);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    var pm = new THREE.PMREMGenerator(renderer);
    var env = pm.fromEquirectangular(tex).texture;
    tex.dispose(); pm.dispose();
    return env;
  }

  function mount(container, opts) {
    var THREE = window.THREE;
    if (!THREE) throw new Error('DamdamFold: three.js 를 먼저 불러와 주세요 (three@0.149.0/build/three.min.js)');
    if (!container) throw new Error('DamdamFold: container 가 없어요');
    opts = opts || {};
    var base = opts.base || DEFAULT_BASE;
    if (base.slice(-1) !== '/' && base.slice(-1) !== '-') base += '/';   // 폴더 없이 올린 판: fold-파일이름
    var duration = opts.duration || 6.0;
    var distance = opts.distance || 2.5;
    var swayOn = opts.sway !== false;
    var reduce = opts.reducedMotion === true ||
      (opts.reducedMotion !== false && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    // 색은 sRGB 로 적고 계산은 선형으로 (SceneKit 과 같은 방식)
    THREE.ColorManagement.legacyMode = false;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var canvas = renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
    canvas.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20); // 앱: fieldOfView 30, zNear 0.05
    camera.position.set(0, 0, distance);

    // PaperMaterials.addLights: 주변광 330, 주광 700 (-0.75, 0.45), 보조광 300 (0.5, -2.4). SceneKit 1000 = 1.0
    scene.add(new THREE.AmbientLight(0xffffff, 0.33));
    function dirLight(intensity, pitch, yaw) {
      var l = new THREE.DirectionalLight(0xffffff, intensity);
      // SceneKit 방향광은 노드의 -Z 로 비춤 → 빛이 오는 쪽 = 회전한 +Z
      var from = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(pitch, yaw, 0, 'XYZ'));
      l.position.copy(from);
      scene.add(l); scene.add(l.target);
      return l;
    }
    dirLight(0.7, -0.75, 0.45);
    dirLight(0.3, 0.5, -2.4);

    var pivot = new THREE.Group();      // 완성 뒤 흔들림
    var paperGroup = new THREE.Group(); // 접는 단계별 보기 방향·크기·가운데 맞춤
    pivot.add(paperGroup);
    scene.add(pivot);

    var outerMat = new THREE.MeshLambertMaterial({ color: 0xEFEEEA, side: THREE.FrontSide });
    var innerMat = new THREE.MeshLambertMaterial({ color: INNER_COLOR, side: THREE.FrontSide });
    var metalMat = null, envTex = {};
    var creaseMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.28, depthWrite: false, depthTest: true });

    var data = null, mesh = null, lines = null, segs = null;
    var posArr, nrmArr, lineArr, P, VN, FN;
    var currentColor = parseHex(opts.paper || '#EFEEEA'), currentName = opts.paperName || null;

    function applyPaper() {
      var kind = metalKind(currentColor, currentName);
      if (kind) {
        if (!envTex[kind]) envTex[kind] = makeEnvironment(THREE, renderer, kind === 'silver');
        if (!metalMat) metalMat = new THREE.MeshStandardMaterial({ side: THREE.FrontSide, envMapIntensity: 2.2 });
        metalMat.envMap = envTex[kind];
        metalMat.needsUpdate = true;
        var b = kind === 'gold' ? GOLD_BASE : SILVER_BASE;
        metalMat.color.setRGB(b[0], b[1], b[2]).convertSRGBToLinear();
        metalMat.metalness = kind === 'gold' ? 1.0 : 0.8;
        metalMat.roughness = kind === 'gold' ? 0.25 : 0.3;
        if (mesh) mesh.material[0] = metalMat;
      } else {
        outerMat.color.setHex(currentColor);
        if (mesh) mesh.material[0] = outerMat;
      }
      // 어두운 종이엔 흰 선, 밝은 종이엔 옅은 회색 선
      var dark = luma(currentColor) < 140;
      creaseMat.color.setHex(dark ? 0xffffff : 0x333333);
      creaseMat.opacity = dark ? 0.3 : 0.28;
    }
    applyPaper();

    function build(d) {
      data = d;
      segs = buildTimeline(d);
      var nV = d.nT * 6;
      posArr = new Float32Array(nV * 3);
      nrmArr = new Float32Array(nV * 3);
      lineArr = new Float32Array(d.nC * 4 * 3);
      P = new Float32Array(d.V * 3); VN = new Float32Array(d.V * 3); FN = new Float32Array(d.nT * 3);
      var g = new THREE.BufferGeometry();
      var pa = new THREE.BufferAttribute(posArr, 3).setUsage(THREE.DynamicDrawUsage);
      var na = new THREE.BufferAttribute(nrmArr, 3).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', pa); g.setAttribute('normal', na);
      g.addGroup(0, d.nT * 3, 0);          // 겉면 (색 있는 면)
      g.addGroup(d.nT * 3, d.nT * 3, 1);   // 안쪽 면
      mesh = new THREE.Mesh(g, [outerMat, innerMat]);
      mesh.frustumCulled = false;
      applyPaper();
      var lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(lineArr, 3).setUsage(THREE.DynamicDrawUsage));
      lines = new THREE.LineSegments(lg, creaseMat);
      lines.frustumCulled = false;
      lines.renderOrder = 1;
      paperGroup.add(mesh); paperGroup.add(lines);
    }

    // FoldAnimation 의 보기 방향
    var paperQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.95)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4));
    var craneQ = null, tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4();

    function showFrame(t) {
      var d = data, V = d.V, q = d.q, lo = d.lo, sc = d.sc;
      t = Math.min(Math.max(t, 0), d.F - 1);
      var f0 = Math.floor(t), f1 = Math.min(d.F - 1, f0 + 1), w = t - f0;
      var b0 = f0 * V * 3, b1 = f1 * V * 3, i, j, k;
      for (i = 0; i < V * 3; i++) {
        var a = q[b0 + i], v = a + (q[b1 + i] - a) * w;
        k = i % 3;
        P[i] = (v + 32767) * sc[k] + lo[k];
      }
      // 꼭짓점 법선(면적 가중) + 면 법선
      VN.fill(0);
      var tris = d.tris, nT = d.nT;
      for (k = 0; k < nT; k++) {
        var ia = tris[k * 3] * 3, ib = tris[k * 3 + 1] * 3, ic = tris[k * 3 + 2] * 3;
        var ux = P[ib] - P[ia], uy = P[ib + 1] - P[ia + 1], uz = P[ib + 2] - P[ia + 2];
        var vx = P[ic] - P[ia], vy = P[ic + 1] - P[ia + 1], vz = P[ic + 2] - P[ia + 2];
        var cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
        VN[ia] += cx; VN[ia + 1] += cy; VN[ia + 2] += cz;
        VN[ib] += cx; VN[ib + 1] += cy; VN[ib + 2] += cz;
        VN[ic] += cx; VN[ic + 1] += cy; VN[ic + 2] += cz;
        var len = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (len > 1e-12) { FN[k * 3] = cx / len; FN[k * 3 + 1] = cy / len; FN[k * 3 + 2] = cz / len; }
        else { FN[k * 3] = 0; FN[k * 3 + 1] = 0; FN[k * 3 + 2] = 1; }
      }
      for (i = 0; i < V; i++) {
        j = i * 3;
        var l = Math.sqrt(VN[j] * VN[j] + VN[j + 1] * VN[j + 1] + VN[j + 2] * VN[j + 2]);
        if (l > 1e-12) { VN[j] /= l; VN[j + 1] /= l; VN[j + 2] /= l; } else { VN[j] = VN[j + 1] = VN[j + 2] = 0; }
      }
      // 겉면: 법선 방향으로 +0.002, 안쪽 면: 반대로 0.0001 + 감김 뒤집기
      var o = 0, innerBase = nT * 9;
      for (k = 0; k < nT; k++) {
        var fx = FN[k * 3], fy = FN[k * 3 + 1], fz = FN[k * 3 + 2];
        var A = tris[k * 3] * 3, B = tris[k * 3 + 1] * 3, C = tris[k * 3 + 2] * 3;
        var outer = [A, B, C], inner = [A, C, B];
        for (var s = 0; s < 3; s++) {
          var p = outer[s];
          posArr[o] = P[p] + VN[p] * LIFT_OUTER; posArr[o + 1] = P[p + 1] + VN[p + 1] * LIFT_OUTER; posArr[o + 2] = P[p + 2] + VN[p + 2] * LIFT_OUTER;
          nrmArr[o] = fx; nrmArr[o + 1] = fy; nrmArr[o + 2] = fz;
          var r = innerBase + o; p = inner[s];
          posArr[r] = P[p] - VN[p] * LIFT_INNER; posArr[r + 1] = P[p + 1] - VN[p + 1] * LIFT_INNER; posArr[r + 2] = P[p + 2] - VN[p + 2] * LIFT_INNER;
          nrmArr[r] = -fx; nrmArr[r + 1] = -fy; nrmArr[r + 2] = -fz;
          o += 3;
        }
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.attributes.normal.needsUpdate = true;

      // 접는 선: 이미 접힌 선만, 겉면 바로 위와 안쪽 면 바로 아래에 한 번씩
      var n = 0, cr = d.creases, cf = d.creaseFrom, sides = [LIFT_OUTER * 1.8, -LIFT_INNER - 0.0015];
      for (var si = 0; si < 2; si++) {
        var side = sides[si];
        for (k = 0; k < d.nC; k++) {
          if (cf[k] > t) continue;
          var e0 = cr[k * 2] * 3, e1 = cr[k * 2 + 1] * 3;
          lineArr[n++] = P[e0] + VN[e0] * side; lineArr[n++] = P[e0 + 1] + VN[e0 + 1] * side; lineArr[n++] = P[e0 + 2] + VN[e0 + 2] * side;
          lineArr[n++] = P[e1] + VN[e1] * side; lineArr[n++] = P[e1 + 1] + VN[e1 + 1] * side; lineArr[n++] = P[e1 + 2] + VN[e1 + 2] * side;
        }
      }
      lines.geometry.attributes.position.needsUpdate = true;
      lines.geometry.setDrawRange(0, n / 3);

      // 보기 방향: 사각 기본형까지 펼친 종이 방향 → 종이학 방향, 크기 0.6 → 1, 지금 모양의 상자 가운데를 원점에
      var x = Math.min(Math.max(t / d.turnEnd, 0), 1);
      var ss = x * x * (3 - 2 * x);
      tmpQ.copy(paperQ).slerp(craneQ, ss);
      var scale = 0.6 + 0.4 * ss;
      tmpM.makeRotationFromQuaternion(tmpQ);
      var m = tmpM.elements;
      var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (i = 0; i < V; i++) {
        j = i * 3;
        var px = P[j], py = P[j + 1], pz = P[j + 2];
        var X = m[0] * px + m[4] * py + m[8] * pz, Y = m[1] * px + m[5] * py + m[9] * pz, Z = m[2] * px + m[6] * py + m[10] * pz;
        if (X < minX) minX = X; if (X > maxX) maxX = X;
        if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
        if (Z < minZ) minZ = Z; if (Z > maxZ) maxZ = Z;
      }
      paperGroup.quaternion.copy(tmpQ);
      paperGroup.scale.setScalar(scale);
      paperGroup.position.set(-(minX + maxX) / 2 * scale, -(minY + maxY) / 2 * scale, -(minZ + maxZ) / 2 * scale);
    }

    // ---- 재생 ----
    var HOLD_START = 0.45;   // 펼친 종이로 잠깐
    var elapsed = 0, finished = false, started = false, visible = false, destroyed = false;
    var raf = 0, last = 0, swayAmp = 0, swayT = 0, needsRender = true;

    function frameForElapsed(e) {
      if (reduce) return data.F - 1;
      return frameAt(segs, (e - HOLD_START) / duration);
    }

    function tick(now) {
      raf = 0;
      if (destroyed || !data) return;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (started && !finished) {
        elapsed += dt;
        var t = frameForElapsed(elapsed);
        showFrame(t);
        needsRender = true;
        if (t >= data.F - 1) {
          finished = true;
          if (typeof opts.onFinish === 'function') { try { opts.onFinish(); } catch (err) { console.error(err); } }
        }
      }
      // 완성 뒤 천천히 흔들림 (다시 접을 때는 부드럽게 멈춤)
      if (swayOn && !reduce) {
        var target = finished ? 1 : 0;
        swayAmp += (target - swayAmp) * (1 - Math.exp(-dt / (finished ? 1.1 : 0.35)));
        swayT += dt;
        if (swayAmp > 1e-4 || pivot.rotation.y !== 0) {
          pivot.rotation.set(
            swayAmp * 0.07 * Math.sin(swayT * 2 * Math.PI / 7.3),
            swayAmp * 0.42 * Math.sin(swayT * 2 * Math.PI / 10),
            0
          );
          pivot.position.y = swayAmp * 0.008 * Math.sin(swayT * 2 * Math.PI / 5.1);
          if (swayAmp <= 1e-4) { pivot.rotation.set(0, 0, 0); pivot.position.y = 0; }
          needsRender = true;
        }
      }
      if (needsRender) { renderer.render(scene, camera); needsRender = false; }
      var animating = started && (!finished || (swayOn && !reduce) || swayAmp > 1e-4);
      if (visible && animating) raf = requestAnimationFrame(tick);
    }
    function kick() {
      if (!raf && !destroyed && data && visible) { last = 0; raf = requestAnimationFrame(tick); }
    }
    function renderStatic() { if (data && !destroyed) { renderer.render(scene, camera); } }

    function restart() {
      elapsed = 0; finished = false;
      if (data) { showFrame(reduce ? data.F - 1 : 0); needsRender = true; renderStatic(); }
      if (visible) started = true;
      kick();
    }

    // ---- 크기 ----
    function resize() {
      var w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // 세로가 긴 칸에서는 가로 시야를 30도로 맞춰 종이가 잘리지 않게
      camera.fov = camera.aspect >= 1 ? 30 : 2 * Math.atan(Math.tan(15 * Math.PI / 180) / camera.aspect) * 180 / Math.PI;
      camera.updateProjectionMatrix();
      needsRender = true;
      if (!raf) renderStatic();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    resize();

    // ---- 화면에 보일 때만 ----
    var io = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      visible = e.isIntersecting;
      if (visible) {
        if (!started && data) started = true;
        kick();
      } else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.15 }) : null;
    if (io) io.observe(container); else visible = true;

    var ready = loadData(base).then(function (d) {
      if (destroyed) return;
      var r = d.rotation;
      tmpM.set(r[0][0], r[0][1], r[0][2], 0, r[1][0], r[1][1], r[1][2], 0, r[2][0], r[2][1], r[2][2], 0, 0, 0, 0, 1);
      craneQ = new THREE.Quaternion().setFromRotationMatrix(tmpM);
      build(d);
      showFrame(reduce ? d.F - 1 : 0);
      renderStatic();
      if (visible) { started = true; kick(); }
    }).catch(function (err) { console.error('DamdamFold:', err); throw err; });
    ready.catch(function () {});

    return {
      ready: ready,
      setPaper: function (hex, name) {
        currentColor = parseHex(hex);
        currentName = name || null;
        applyPaper();
        restart();
      },
      refold: restart,
      // 디버그용: 접기를 멈추고 특정 프레임(0…frames-1)을 보여줌
      _seek: function (t) {
        if (!data) return;
        started = true; finished = true; swayAmp = 0; pivot.rotation.set(0, 0, 0); pivot.position.y = 0;
        showFrame(t); renderer.render(scene, camera);
      },
      destroy: function () {
        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        if (mesh) mesh.geometry.dispose();
        if (lines) lines.geometry.dispose();
        [outerMat, innerMat, metalMat, creaseMat].forEach(function (m) { if (m) m.dispose(); });
        Object.keys(envTex).forEach(function (k) { envTex[k].dispose(); });
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  window.DamdamFold = { mount: mount };
})();
