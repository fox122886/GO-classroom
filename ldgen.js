// Build-time generator: life & death problems from eye shapes, verified by the solver.
const Go = require('./src/engine.js');
const fs = require('fs');
const N = 9;
const SHAPES = [
  { id: 'zhi3', name: '直三', cells: [[0, 0], [0, 1], [0, 2]], vital: '三個空點的正中間' },
  { id: 'wan3', name: '彎三', cells: [[0, 0], [0, 1], [1, 1]], vital: '同時碰到另外兩點的轉角' },
  { id: 'ding4', name: '丁四', cells: [[0, 0], [0, 1], [0, 2], [1, 1]], vital: '丁字形的中心' },
  { id: 'dao5', name: '刀把五', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]], vital: '碰到最多空點的那一點' },
  { id: 'mei5', name: '梅花五', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], vital: '十字形的正中心' },
  { id: 'hua6', name: '葡萄六', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1], [2, 2]], vital: '碰到最多空點的那一點' },
  { id: 'zhi4', name: '直四', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], settled: 'alive' },
  { id: 'qu4', name: '曲四', cells: [[0, 0], [0, 1], [0, 2], [1, 2]], settled: 'alive' },
  { id: 'fang4', name: '方四', cells: [[0, 0], [0, 1], [1, 0], [1, 1]], settled: 'dead' },
  { id: 'ban6', name: '板六', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], settled: 'alive' }
];
const PLACES = { center: '中央', edge: '邊上', corner: '角上' };
const idx = (r, c) => r * N + c;
function place(shape, where) {
  const h = Math.max(...shape.cells.map(x => x[0])) + 1, w = Math.max(...shape.cells.map(x => x[1])) + 1;
  let r0, c0;
  if (where === 'center') { r0 = Math.floor((N - h) / 2); c0 = Math.floor((N - w) / 2); }
  if (where === 'edge') { r0 = N - h; c0 = Math.floor((N - w) / 2); }
  if (where === 'corner') { r0 = N - h; c0 = 0; }
  return shape.cells.map(([r, c]) => [r + r0, c + c0]);
}
function build(eye, inner) {
  const g = new Array(N * N).fill(0), outer = 3 - inner;
  const dist = (r, c) => Math.min(...eye.map(([a, b]) => Math.max(Math.abs(a - r), Math.abs(b - c))));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const d = dist(r, c);
    if (d === 1) g[idx(r, c)] = inner; else if (d === 2) g[idx(r, c)] = outer;
  }
  return g;
}
const transforms = [
  (r, c) => [r, c], (r, c) => [c, N - 1 - r], (r, c) => [N - 1 - r, N - 1 - c], (r, c) => [N - 1 - c, r],
  (r, c) => [r, N - 1 - c], (r, c) => [N - 1 - c, N - 1 - r], (r, c) => [N - 1 - r, c], (r, c) => [c, r]
];
function apply(g, t) { const o = new Array(N * N).fill(0); for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const [a, b] = t(r, c); o[idx(a, b)] = g[idx(r, c)]; } return o; }
const rows = g => Array.from({ length: N }, (_, r) => g.slice(r * N, r * N + N).map(v => '.XO'[v]).join(''));
function regionOf(g, eyeIdx, innerCol) {
  // the inner group plus its eye space, as a bounding box
  const t = Go.group(N, g, [...Go.nb(N, eyeIdx[0])].find(j => g[j] === innerCol));
  const pts = t.stones.concat(eyeIdx);
  const rs = pts.map(i => Math.floor(i / N)), cs = pts.map(i => i % N);
  const box = [Math.min(...rs), Math.min(...cs), Math.max(...rs), Math.max(...cs)];
  const reg = []; for (let r = box[0]; r <= box[2]; r++) for (let c = box[1]; c <= box[3]; c++) reg.push(idx(r, c));
  return { box, reg, target: t.stones[0] };
}
const out = [], seen = new Set(); let id = 0, rejected = 0;
for (const sh of SHAPES) for (const where of Object.keys(PLACES)) {
  const eye0 = place(sh, where);
  for (const [ti, t] of transforms.entries()) {
    if (where !== 'center' && ti >= 4 && sh.cells.length) { /* mirrored copies still useful for asymmetric shapes */ }
    for (const inner of [1, 2]) {
      const g = apply(build(eye0, inner), t);
      const eye = eye0.map(([r, c]) => t(r, c)).map(([r, c]) => idx(r, c));
      const key = rows(g).join('|') + inner;
      if (seen.has(key)) continue; seen.add(key);
      // sanity: no zero-liberty groups, inner group is one connected block
      let okb = true; for (let i = 0; i < N * N; i++) if (g[i] && Go.group(N, g, i).libs.size === 0) okb = false;
      if (!okb) { rejected++; continue; }
      const R = regionOf(g, eye, inner);
      const innerStones = new Set(Go.group(N, g, R.target).stones);
      let allInner = true; for (let i = 0; i < N * N; i++) if (g[i] === inner && !innerStones.has(i) && R.reg.includes(i)) allInner = false;
      if (!allInner) { rejected++; continue; }
      const p = { attacker: inner === 1 ? 2 : 1, region: R.reg, target: R.target, own: -1 };
      const goal = inner === 1 ? 'live' : 'kill';
      const blackFirst = Go.localOutcome(N, g, 1, p, -1); // attacker wins when black moves first?
      const whiteFirst = Go.localOutcome(N, g, 2, p, -1);
      const T = [Math.floor(R.target / N), R.target % N];
      const placeName = PLACES[where];
      const who = inner === 1 ? '黑' : '白';
      if (sh.settled) {
        // choice question; verify the textbook result
        const alive = inner === 1 ? !whiteFirst : !blackFirst; // the inner side lives even if the opponent moves first
        const dead = inner === 1 ? blackFirst : whiteFirst; // the inner side dies even if it moves first
        const truth = alive ? 'alive' : dead ? 'dead' : 'unsettled';
        if (truth !== sh.settled) { rejected++; continue; }
        const firstSide = alive ? 'opp' : 'self';
        const qq = alive ? `${who}棋內部是「${sh.name}」（${placeName}）。如果讓對方先下，${who}棋會被殺死嗎？` : `${who}棋內部是「${sh.name}」（${placeName}）。如果${who}棋自己先下，能活嗎？`;
        out.push({ id: 'ld-' + (id++), lesson: 'shapes', type: 'choice', rows: rows(g), q: qq,
          options: alive ? ['會被殺死', '殺不死，是活棋'] : ['能活', '活不了，是死棋'], answer: 1,
          hint: alive ? `對方點進去之後，${who}棋還能不能分出兩個眼？` : `${who}棋下在裡面任何一點，剩下的空間能分出兩個眼嗎？`,
          explain: alive ? `「${sh.name}」不管對方怎麼點，${who}棋都能應出兩個眼，已經是活棋。` : `「${sh.name}」是死形，就算${who}棋先下也做不出兩個眼。`,
          demo: { box: R.box, target: T, attacker: p.attacker, first: alive ? p.attacker : 3 - p.attacker }, shape: sh.id, place: where });
        continue;
      }
      // unsettled shapes: whoever moves first decides
      const unsettled = inner === 1 ? (!blackFirst && whiteFirst) : (blackFirst && !whiteFirst);
      if (!unsettled) { rejected++; continue; }
      const keys = [];
      for (const m of R.reg) {
        if (g[m]) continue;
        const r = Go.play(N, g, m, 1, -1); if (!r.ok) continue;
        const a = Go.localOutcome(N, r.g, 2, p, r.ko);
        if (goal === 'live' ? !a : a) keys.push(m);
      }
      if (!keys.length) { rejected++; continue; }
      const trap = eye.find(m => !keys.includes(m) && Go.play(N, g, m, 1, -1).ok);
      out.push({ id: 'ld-' + (id++), lesson: 'shapes', type: 'solve', goal, rows: rows(g), target: T, box: R.box,
        key: [Math.floor(keys[0] / N), keys[0] % N], keysCount: keys.length,
        trap: trap != null ? [Math.floor(trap / N), trap % N] : undefined,
        q: goal === 'live' ? `黑先，黑棋內部是「${sh.name}」（${placeName}）。請讓黑棋活。` : `黑先，白棋內部是「${sh.name}」（${placeName}）。請殺掉白棋。`,
        hint: `「${sh.name}」的要害在${sh.vital}。`,
        explain: goal === 'live' ? `先佔住${sh.vital}，黑棋就能分出兩個眼。` : `點中${sh.vital}，白棋就做不出兩個眼。`,
        trapNote: goal === 'live' ? '沒佔到要害，白棋點進要害後黑棋只剩一個眼。' : '沒點中要害，白棋佔住要害就做出兩個眼。',
        shape: sh.id, place: where });
    }
  }
}
const per = {}; const kept = out.filter(p => { const k = p.shape + ':' + p.place + ':' + (p.goal || p.type); per[k] = (per[k] || 0) + 1; return per[k] <= 3; });
kept.forEach((p, k) => { p.id = 'ld-' + k; }); out.length = 0; out.push(...kept);
const counts = {}; out.forEach(p => { const k = p.shape + ':' + p.place + ':' + p.type; counts[k] = (counts[k] || 0) + 1; });
console.log('generated', out.length, 'rejected', rejected); console.log(counts);
fs.writeFileSync('src/ld_bank.js', '// ===== Generated life & death problems (verified at build time by ldgen.js) =====\nconst LD_PROBLEMS = ' + JSON.stringify(out) + ';\nif (typeof module !== "undefined") module.exports = LD_PROBLEMS;\n');
