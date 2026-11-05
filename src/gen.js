// ===== Automatic problem generator (seeded, verified by the engine) =====
const GoGen = (() => {
  const E = (typeof Go !== 'undefined') ? Go : require('./engine.js');
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const TYPES = {
    libs: { name: '數氣', topic: 'capture' },
    take: { name: '提子', topic: 'capture' },
    atari: { name: '叫吃', topic: 'capture' },
    escape: { name: '逃跑', topic: 'capture' },
    double: { name: '雙叫吃', topic: 'capture' },
    chase: { name: '吃子（征子、枷）', topic: 'tesuji' },
    connect: { name: '補斷點', topic: 'capture' },
    status: { name: '死活判斷（選擇題）', topic: 'life' },
    vital: { name: '做活與殺棋', topic: 'life' },
    count: { name: '數目（選擇題）', topic: 'big' }
  };
  const toRows = (n, g) => { const rows = []; for (let r = 0; r < n; r++) { let s = ''; for (let c = 0; c < n; c++) s += '.XO'[g[r * n + c]]; rows.push(s); } return rows; };
  const rc = (n, i) => [Math.floor(i / n), i % n];
  const shuffle = (R, a) => { for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (R, a) => a[(R() * a.length) | 0];

  function allGroups(n, g) {
    const seen = new Set(), out = [];
    for (let i = 0; i < n * n; i++) if (g[i] && !seen.has(i)) { const gr = E.group(n, g, i); gr.stones.forEach(s => seen.add(s)); out.push(gr); }
    return out;
  }
  const healthy = (n, g, minLibs, except) => allGroups(n, g).every(gr => (except && gr.stones.includes(except)) || gr.libs.size >= minLibs);
  function growGroup(R, n, g, col, size, start) {
    const stones = [start]; g[start] = col;
    while (stones.length < size) {
      const cand = [];
      for (const s of stones) for (const j of E.nb(n, s)) if (g[j] === 0 && !cand.includes(j)) cand.push(j);
      if (!cand.length) break;
      const j = pick(R, cand); g[j] = col; stones.push(j);
    }
    return stones;
  }
  function sprinkle(R, n, g, count, avoid) { // distractor stones away from the action
    for (let k = 0; k < count * 4 && count > 0; k++) {
      const i = (R() * n * n) | 0;
      if (g[i] || avoid.has(i)) continue;
      g[i] = R() < 0.5 ? 1 : 2;
      if (!healthy(n, g, 2)) { g[i] = 0; continue; }
      count--;
    }
  }
  const near = (n, stones, d) => { const s = new Set(); for (const x of stones) { const [r, c] = rc(n, x); for (let i = 0; i < n * n; i++) { const [r2, c2] = rc(n, i); if (Math.abs(r - r2) + Math.abs(c - c2) <= d) s.add(i); } } return s; };

  // ---------- individual generators: return a problem or null ----------
  function genLibs(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const col = R() < 0.6 ? 1 : 2, opp = 3 - col;
    const start = (R() * n * n) | 0;
    const stones = growGroup(R, n, g, col, level === 1 ? 1 + ((R() * 2) | 0) : 2 + ((R() * 3) | 0), start);
    let libs = [...E.group(n, g, start).libs];
    shuffle(R, libs);
    const take = Math.min(libs.length - 1, (R() * (level === 1 ? 2 : 4)) | 0);
    for (let k = 0; k < take; k++) { g[libs[k]] = opp; if (!healthy(n, g, 1)) g[libs[k]] = 0; }
    if (level > 1) sprinkle(R, n, g, 3, near(n, stones, 2));
    if (!healthy(n, g, 1)) return null;
    const gr = E.group(n, g, start), ans = gr.libs.size;
    if (allGroups(n, g).filter(x => x.color === col && x.stones.length === gr.stones.length).length > 1 && level === 1) return null;
    const opts = [...new Set([ans, Math.max(1, ans - 1), ans + 1, ans + 2])].slice(0, 3).sort((a, b) => a - b);
    const marks = {}; marks[rc(n, start).join(',')] = 'tri';
    const libMarks = {}; gr.libs.forEach(i => { libMarks[rc(n, i).join(',')] = 'dot'; });
    const who = col === 1 ? '黑' : '白';
    return { type: 'choice', rows: toRows(n, g), marks, q: `△ 所在的這塊${who}棋有幾口氣？`, options: opts.map(x => x + ' 口'), answer: opts.indexOf(ans),
      hint: `只數上下左右的空點，斜角不算；連在一起的${who}子要一起數。`, explain: `綠點就是這塊棋的氣，一共 ${ans} 口。${take ? '被對方佔掉的點不算氣。' : ''}`, explainMarks: libMarks };
  }
  function genTake(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const start = (R() * n * n) | 0;
    const stones = growGroup(R, n, g, 2, level === 1 ? 1 + ((R() * 2) | 0) : 1 + ((R() * 4) | 0), start);
    const libs = shuffle(R, [...E.group(n, g, start).libs]);
    if (libs.length < 2) return null;
    const keep = libs[0];
    for (const l of libs.slice(1)) g[l] = 1;
    if (level > 1) sprinkle(R, n, g, 4, near(n, stones, 2));
    if (!healthy(n, g, 2, start)) return null;
    if (E.group(n, g, start).libs.size !== 1) return null;
    const r = E.play(n, g, keep, 1, -1); if (!r.ok || r.g[start] !== 0) return null;
    return { type: 'move', rows: toRows(n, g), q: '黑先，找出可以提子的位置。', answers: [rc(n, keep)],
      hint: '先找出只剩一口氣的白棋，再找那最後一口氣。', explain: `這塊白棋只剩這一口氣，黑棋堵住就提掉 ${stones.length} 顆。` };
  }
  function genAtari(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const start = (R() * n * n) | 0;
    const stones = growGroup(R, n, g, 2, level === 1 ? 1 : 1 + ((R() * 3) | 0), start);
    const libs = shuffle(R, [...E.group(n, g, start).libs]);
    if (libs.length < 3) return null;
    for (const l of libs.slice(2)) g[l] = 1;
    if (level > 1) sprinkle(R, n, g, 4, near(n, stones, 2));
    if (!healthy(n, g, 2)) return null;
    const answers = [], traps = [];
    for (const m of E.group(n, g, start).libs) {
      const r = E.play(n, g, m, 1, -1); if (!r.ok) continue;
      const mine = E.group(n, r.g, m).libs.size;
      if (E.group(n, r.g, start).libs.size === 1 && mine >= 2) answers.push(rc(n, m)); else traps.push(rc(n, m));
    }
    if (!answers.length) return null;
    return { type: 'move', rows: toRows(n, g), q: '黑先，請叫吃 △ 這塊白棋。', marks: { [rc(n, start).join(',')]: 'tri' }, answers, trap: traps[0],
      hint: '叫吃就是讓對方只剩一口氣。下完也要看看自己還有幾口氣。', explain: '叫吃之後白棋只剩一口氣，下一手就能提掉。',
      trapNote: '這樣叫吃，自己反而只剩一口氣，會先被白棋提掉。' };
  }
  function genEscape(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const start = (R() * n * n) | 0;
    const stones = growGroup(R, n, g, 1, level === 1 ? 1 : 1 + ((R() * 3) | 0), start);
    const libs = shuffle(R, [...E.group(n, g, start).libs]);
    if (libs.length < 2) return null;
    for (const l of libs.slice(1)) g[l] = 2;
    // sometimes surround further around the escape point to make it harder
    if (level > 1) { const ex = E.nb(n, libs[0]).filter(j => g[j] === 0); shuffle(R, ex); if (ex.length && R() < 0.6) g[ex[0]] = 2; sprinkle(R, n, g, 3, near(n, stones, 2)); }
    if (!healthy(n, g, 1)) return null;
    if (E.group(n, g, start).libs.size !== 1) return null;
    if (allGroups(n, g).some(gr => gr.color === 1 && !gr.stones.includes(start) && gr.libs.size < 2)) return null;
    const answers = [], losing = [];
    for (let m = 0; m < n * n; m++) {
      const r = E.play(n, g, m, 1, -1); if (!r.ok) continue;
      const safe = r.g[start] !== 0 && !E.attackerWins(n, r.g, start, 24, r.ko);
      if (safe) answers.push(rc(n, m)); else if (near(n, stones, 2).has(m)) losing.push(m);
    }
    if (!answers.length || answers.length > 3) return null;
    const extend = libs[0], trapI = answers.some(a => a[0] * n + a[1] === extend) ? null : extend;
    const capEsc = answers.some(([r, c]) => E.play(n, g, r * n + c, 1, -1).captured.length > 0);
    return { type: 'escape', rows: toRows(n, g), target: rc(n, start), q: '黑棋 △ 被叫吃了，請救出它。', marks: { [rc(n, start).join(',')]: 'tri' }, answers, trap: trapI != null ? rc(n, trapI) : null,
      hint: capEsc ? '旁邊有沒有白子自己也只剩一口氣？' : '往外長出去之後，要能有三口以上的氣。', explain: capEsc ? '吃掉叫吃你的白子，黑棋就脫困了。' : '逃出去之後氣夠多，白棋追不到了。',
      trapNote: '這樣逃，白棋還能繼續叫吃，最後把黑棋提掉。' };
  }
  function genDouble(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const P = (R() * n * n) | 0; const nbP = shuffle(R, E.nb(n, P).slice());
    if (nbP.length < 3) return null;
    const A = nbP[0], B = nbP[1];
    g[A] = 2; g[B] = 2;
    for (const W of [A, B]) {
      const others = shuffle(R, E.nb(n, W).filter(j => j !== P && g[j] === 0));
      if (!others.length) return null;
      for (const o of others.slice(1)) g[o] = 1;
    }
    if (level > 1) sprinkle(R, n, g, 4, near(n, [P, A, B], 2));
    if (!healthy(n, g, 2)) return null;
    const answers = [];
    for (let m = 0; m < n * n; m++) {
      const r = E.play(n, g, m, 1, -1); if (!r.ok || r.captured.length) continue;
      if (E.group(n, r.g, m).libs.size < 2) continue;
      const at = allGroups(n, r.g).filter(x => x.color === 2 && x.libs.size === 1);
      if (at.length >= 2 && new Set(at.map(x => [...x.libs][0])).size >= 2) answers.push(rc(n, m));
    }
    if (!answers.length || answers.length > 2) return null;
    return { type: 'move', rows: toRows(n, g), q: '黑先，找出一手同時叫吃兩顆白子的位置。', answers,
      hint: '找兩顆白子共同的那一口氣。', explain: '兩顆白子同時被叫吃，白棋只能救一邊，另一邊一定被提掉。' };
  }
  function genChase(R, level) {
    const n = 9, g = new Array(n * n).fill(0);
    const r0 = 2 + ((R() * 5) | 0), c0 = 2 + ((R() * 5) | 0), start = r0 * n + c0;
    g[start] = 2;
    const libs = shuffle(R, [...E.group(n, g, start).libs]);
    g[libs[0]] = 1; g[libs[1]] = 1;
    const extra = 1 + ((R() * 3) | 0);
    for (let k = 0; k < extra; k++) { const i = (R() * n * n) | 0; if (!g[i]) g[i] = R() < 0.65 ? 1 : 2; }
    if (!healthy(n, g, 2)) return null;
    if (E.group(n, g, start).libs.size !== 2) return null;
    const wins = [];
    for (let m = 0; m < n * n; m++) { const r = E.play(n, g, m, 1, -1); if (r.ok && (r.g[start] === 0 || E.defenderLoses(n, r.g, start, 24, r.ko))) wins.push(m); }
    if (!wins.length || wins.length > 2) return null;
    // white to move first must be able to escape, otherwise there is nothing to solve
    const d = E.bestDefense(n, g, start, -1); if (!d || !d.escaped) return null;
    const lib2 = [...E.group(n, g, start).libs];
    const isNet = !wins.some(w => lib2.includes(w));
    if (level === 1 && isNet) return null;
    const trapM = lib2.find(m => !wins.includes(m));
    return { type: 'capture', rows: toRows(n, g), target: rc(n, start), key: rc(n, wins[0]), trap: trapM != null ? rc(n, trapM) : null,
      q: isNet ? '黑先，吃掉白子 △。直接叫吃好像不行喔。' : '黑先，想辦法吃掉白子 △。', hint: isNet ? '試試不叫吃，在白子逃跑的出口上罩住它（枷）。' : '想好叫吃的方向，把白子往自己的子或邊上趕。',
      explain: isNet ? '用枷罩住，白棋怎麼逃都逃不掉。' : '叫吃方向正確，一路追到把白子提掉。', trapNote: '往這個方向叫吃，白棋逃出去之後氣會變多，追不到。' };
  }
  // ---------- connecting: white threatens to cut and capture ----------
  function blackSafe(n, g, ko) { // after white's move, can black save every group?
    for (const gr of allGroups(n, g)) if (gr.color === 1 && gr.libs.size <= 2 && E.defenderLoses(n, g, gr.stones[0], 16, ko)) return false;
    return true;
  }
  function threats(n, g, ko) { // white moves (next to black) after which a black group dies
    const blk = allGroups(n, g).filter(x => x.color === 1), cand = new Set(), out = [];
    for (const gr of blk) for (const s of gr.stones) for (const j of E.nb(n, s)) if (!g[j]) cand.add(j);
    for (const w of cand) { const r = E.play(n, g, w, 2, ko); if (r.ok && (r.captured.length || !blackSafe(n, r.g, r.ko))) out.push(w); }
    return out;
  }
  const threatens = (n, g, ko) => threats(n, g, ko).length ? 1 : -1;
  function genConnect(R, level) {
    const n = 7, g = new Array(n * n).fill(0);
    const r0 = 1 + ((R() * 4) | 0), c0 = 1 + ((R() * 4) | 0);
    const pats = [[[0, 0], [1, 1]], [[0, 0], [0, 2]], [[0, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 2]]];
    const pat = pick(R, pats);
    const blacks = pat.map(([a, b]) => (r0 + a) * n + c0 + b).filter(i => i < n * n && (i % n) >= c0);
    if (blacks.length !== pat.length || pat.some(([a, b]) => r0 + a >= n || c0 + b >= n)) return null;
    blacks.forEach(i => { g[i] = 1; });
    const ring = [...near(n, blacks, 2)].filter(i => !g[i]); shuffle(R, ring);
    const wN = level === 1 ? 2 + ((R() * 2) | 0) : 3 + ((R() * 3) | 0);
    for (const i of ring.slice(0, wN)) g[i] = 2;
    if (level > 1) sprinkle(R, n, g, 2, near(n, blacks, 2));
    if (!healthy(n, g, 2)) return null;
    const T = threats(n, g, -1); if (!T.length) return null;
    const answers = [], cand = new Set();
    for (const b of blacks) for (const j of near(n, [b], 2)) if (!g[j]) cand.add(j);
    const nBlack = allGroups(n, g).filter(x => x.color === 1).length;
    for (const m of cand) {
      // only "real" connecting moves: on white's cutting point, or joining black groups
      const joins = (() => { const r = E.play(n, g, m, 1, -1); return r.ok && allGroups(n, r.g).filter(x => x.color === 1).length < nBlack; })();
      if (!T.includes(m) && !joins) continue;
      const r = E.play(n, g, m, 1, -1); if (!r.ok || E.group(n, r.g, m).libs.size < 2) continue;
      if (threatens(n, r.g, r.ko) < 0) answers.push(rc(n, m));
    }
    if (!answers.length || answers.length > 2) return null;
    const trap = [...cand].find(m => !answers.some(([a, b]) => a * n + b === m) && E.play(n, g, m, 1, -1).ok);
    return { type: 'move', rows: toRows(n, g), q: '黑先，白棋準備切斷黑棋。請補好最要緊的那一點。', answers, trap: trap != null ? rc(n, trap) : null,
      hint: '先想想：白棋下在哪裡，會讓黑棋被分開、而且有一邊被吃？那裡就是黑棋要先補的地方。', explain: '補好這一點，白棋就切不斷，黑棋所有的子都安全了。',
      trapNote: '這一手沒有補到要害，白棋一切斷，黑棋就有子會被吃。' };
  }
  // ---------- eye shapes: status (choice) and vital point (solve) ----------
  const SHAPE_NAMES = { '0,0|0,1|0,2': '直三', '0,0|0,1|1,1': '彎三', '0,0|0,1|0,2|1,1': '丁四', '0,0|0,1|0,2|1,0|1,1': '刀把五', '0,1|1,0|1,1|1,2|2,1': '梅花五',
    '0,1|1,0|1,1|1,2|2,1|2,2': '葡萄六', '0,0|0,1|0,2|0,3': '直四', '0,0|0,1|0,2|1,2': '曲四', '0,0|0,1|1,0|1,1': '方四', '0,0|0,1|0,2|1,0|1,1|1,2': '板六',
    '0,0|0,1|0,2|0,3|0,4': '直五', '0,0|0,1|0,2|1,0|1,2': '彎五（ㄇ字形）' };
  const T8 = [(r, c) => [r, c], (r, c) => [c, -r], (r, c) => [-r, -c], (r, c) => [-c, r], (r, c) => [r, -c], (r, c) => [-c, -r], (r, c) => [-r, c], (r, c) => [c, r]];
  function shapeName(cells) {
    for (const t of T8) {
      const pts = cells.map(([r, c]) => t(r, c)); const mr = Math.min(...pts.map(p => p[0])), mc = Math.min(...pts.map(p => p[1]));
      const k = pts.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(p => p.join(',')).join('|');
      if (SHAPE_NAMES[k]) return SHAPE_NAMES[k];
    }
    return null;
  }
  function eyePosition(R, level) {
    const n = 9, size = level === 1 ? 3 + ((R() * 2) | 0) : 3 + ((R() * 4) | 0);
    const where = pick(R, level === 1 ? ['corner', 'edge', 'center'] : ['corner', 'edge', 'edge', 'corner']);
    // grow a compact eye space inside a 3x4 box
    const box = { h: 2 + ((R() * 2) | 0), w: 3 + ((R() * 2) | 0) };
    const r0 = where === 'center' ? 3 : n - box.h, c0 = where === 'corner' ? 0 : where === 'edge' ? 2 + ((R() * 2) | 0) : 2 + ((R() * 2) | 0);
    const inBox = i => { const [r, c] = rc(n, i); return r >= r0 && r < r0 + box.h && c >= c0 && c < c0 + box.w; };
    const start = (r0 + ((R() * box.h) | 0)) * n + c0 + ((R() * box.w) | 0); const eye = [start];
    while (eye.length < size) {
      const cand = []; for (const s of eye) for (const j of E.nb(n, s)) if (inBox(j) && !eye.includes(j) && !cand.includes(j)) cand.push(j);
      if (!cand.length) break; eye.push(pick(R, cand));
    }
    if (eye.length < 3) return null;
    const inner = R() < 0.5 ? 1 : 2, outer = 3 - inner, g = new Array(n * n).fill(0);
    const pts = eye.map(i => rc(n, i));
    for (let i = 0; i < n * n; i++) {
      const [r, c] = rc(n, i), d = Math.min(...pts.map(([a, b]) => Math.max(Math.abs(a - r), Math.abs(b - c))));
      if (d === 1) g[i] = inner; else if (d === 2) g[i] = outer;
    }
    const tgt = E.nb(n, eye[0]).map(j => j).find(j => g[j] === inner) ?? eye.flatMap(e => E.nb(n, e)).find(j => g[j] === inner);
    if (tgt == null) return null;
    const grp = E.group(n, g, tgt);
    if (grp.libs.size !== eye.length) return null; // inner group must be one block whose only liberties are the eye
    if (allGroups(n, g).filter(x => x.color === inner).length !== 1) return null;
    if (allGroups(n, g).some(x => x.color === outer && x.libs.size < 2)) return null;
    const all = grp.stones.concat(eye), rs = all.map(i => Math.floor(i / n)), cs = all.map(i => i % n);
    const bx = [Math.min(...rs), Math.min(...cs), Math.max(...rs), Math.max(...cs)];
    const region = []; for (let r = bx[0]; r <= bx[2]; r++) for (let c = bx[1]; c <= bx[3]; c++) region.push(r * n + c);
    const p = { attacker: outer, region, target: tgt, own: -1 };
    const atkFirst = E.localOutcome(n, g, outer, p, -1), defFirst = E.localOutcome(n, g, inner, p, -1);
    return { n, g, eye, inner, outer, tgt, bx, p, where, name: shapeName(pts), status: !atkFirst ? 'alive' : defFirst ? 'dead' : 'unsettled' };
  }
  const WHERE = { corner: '角上', edge: '邊上', center: '中央' };
  function genStatus(R, level) {
    const P = eyePosition(R, level); if (!P) return null;
    const { n, g, inner, eye, status, name } = P;
    if (status === 'unsettled' && R() < 0.35) return null; // keep a balanced mix
    const who = inner === 1 ? '黑' : '白', foe = inner === 1 ? '白' : '黑';
    const opts = ['活棋：不用補也活', '死棋：先下也活不了', '要看誰先下'];
    const ans = { alive: 0, dead: 1, unsettled: 2 }[status];
    const shape = name ? `「${name}」` : `${eye.length} 個空點的眼形`;
    const explain = status === 'alive' ? `${who}棋圍住的是${shape}，${foe}棋先下也破不掉，已經是活棋。` : status === 'dead' ? `${who}棋圍住的是${shape}，就算${who}棋先下也做不出兩個眼。` : `${who}棋圍住的是${shape}。${who}棋先下佔住要點就活，${foe}棋先下點中要點就死。`;
    const first = status === 'dead' ? inner : P.outer;
    const mk = {}; mk[rc(n, P.tgt).join(',')] = 'tri';
    return { type: 'choice', rows: toRows(n, g), marks: mk, q: `△ 這塊${who}棋在${WHERE[P.where]}，它是活棋、死棋，還是要看誰先下？`, options: opts, answer: ans,
      hint: '數一數裡面的空點，想想對方點進要害之後，還能不能分成兩個眼。', explain,
      demo: { box: P.bx, attacker: P.outer, target: rc(n, P.tgt), first } };
  }
  function genVital(R, level) {
    const P = eyePosition(R, level); if (!P || P.status !== 'unsettled') return null;
    const { n, g, inner } = P, goal = inner === 1 ? 'live' : 'kill';
    const good = [];
    for (const m of P.eye) { const r = E.play(n, g, m, 1, -1); if (!r.ok) continue; const v = E.localOutcome(n, r.g, 2, P.p, r.ko); if (goal === 'live' ? !v : v || r.g[P.tgt] === 0) good.push(m); }
    if (!good.length || good.length > 2) return null;
    const trap = P.eye.find(m => !good.includes(m) && E.play(n, g, m, 1, -1).ok);
    const shape = P.name ? `「${P.name}」` : '這個眼形';
    return { type: 'solve', goal, rows: toRows(n, g), target: rc(n, P.tgt), box: P.bx, key: rc(n, good[0]), trap: trap != null ? rc(n, trap) : null,
      q: goal === 'live' ? `黑先，黑棋圍住的是${shape}。請讓黑棋活。` : `黑先，白棋圍住的是${shape}。請殺掉白棋。`,
      hint: '眼形的要害通常是「碰到最多空點」的那一點。', explain: goal === 'live' ? '佔住要害，黑棋就能分成兩個眼。' : '點中要害，白棋就分不出兩個眼。',
      trapNote: goal === 'live' ? '沒佔到要害，白棋點進去之後黑棋只剩一個眼。' : '沒點中要害，白棋補一手就活了。' };
  }
  // ---------- counting territory (choice) ----------
  function genCount(R, level) {
    const n = level === 1 ? 7 : 9, g = new Array(n * n).fill(0);
    const lo = Math.floor(n / 2) - 1, hi = Math.floor(n / 2) + 2;
    const h = [lo + ((R() * (hi - lo)) | 0)];
    for (let c = 1; c < n; c++) h.push(Math.max(lo, Math.min(hi, h[c - 1] + ((R() * 3) | 0) - 1)));
    for (let c = 0; c < n; c++) { g[(h[c] - 1) * n + c] = 1; g[h[c] * n + c] = 2; }
    // a few stones inside one's own area (they are not territory)
    const extra = level === 1 ? (R() * 2) | 0 : 1 + ((R() * 3) | 0);
    for (let k = 0; k < extra * 3 && k < 20; k++) { const c = (R() * n) | 0, top = R() < 0.5; const r = top ? (R() * (h[c] - 1)) | 0 : h[c] + 1 + ((R() * (n - h[c] - 1)) | 0); if (r >= 0 && r < n && !g[r * n + c] && (top ? r < h[c] - 1 : r > h[c])) g[r * n + c] = top ? 1 : 2; }
    const sc = E.score(n, g); let bt = 0, wt = 0; const own = {};
    for (let i = 0; i < n * n; i++) if (!g[i]) { if (sc.own[i] === 1) { bt++; own[rc(n, i).join(',')] = 'dot'; } else if (sc.own[i] === 2) wt++; }
    if (bt + wt !== g.filter(v => !v).length || bt < 3 || wt < 3) return null;
    if (level === 1) {
      const opts = [...new Set([bt, bt + 1, bt - 1, bt + 2].filter(x => x > 0))].slice(0, 3).sort((a, b) => a - b);
      return { type: 'choice', rows: toRows(n, g), q: '對局結束了。黑棋圍了幾目？（只數黑棋圍住的空點）', options: opts.map(x => x + ' 目'), answer: opts.indexOf(bt),
        hint: '棋子本身不算目，只數被黑棋圍住、白棋進不去的空點。', explain: `綠點就是黑棋的地，一共 ${bt} 目。`, explainMarks: own };
    }
    const d = bt - wt; const txt = x => x === 0 ? '一樣多' : x > 0 ? `黑棋多 ${x} 目` : `白棋多 ${-x} 目`;
    const opts = [...new Set([d, d + 2, d - 2, -d].map(txt))].slice(0, 3);
    const idx = Array.from({ length: opts.length }, (_, k) => k); shuffle(R, idx);
    const sh = idx.map(k => opts[k]);
    return { type: 'choice', rows: toRows(n, g), q: '對局結束了（不算貼目）。黑白雙方的地，誰比較多？多幾目？', options: sh, answer: sh.indexOf(txt(d)),
      hint: '分別數出黑棋、白棋圍住的空點，再相減。棋子本身不算目。', explain: `黑棋 ${bt} 目（綠點），白棋 ${wt} 目，所以${txt(d)}。`, explainMarks: own };
  }
  const MAKERS = { libs: genLibs, take: genTake, atari: genAtari, escape: genEscape, double: genDouble, chase: genChase, connect: genConnect, status: genStatus, vital: genVital, count: genCount };
  function make(type, level, seed) {
    const R = rng(seed * 2654435761 + level * 97 + type.length * 131);
    for (let k = 0; k < 400; k++) {
      const p = MAKERS[type](R, level);
      if (p) return Object.assign(p, { id: `g:${type}:${level}:${seed}`, generated: true, genType: type, topic: TYPES[type].topic, level, lessonTitle: TYPES[type].name });
    }
    return null;
  }
  return { TYPES, make, rng, toRows };
})();
if (typeof module !== 'undefined') module.exports = GoGen;
