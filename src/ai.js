// ===== Computer opponent: fast board, simple AI, MCTS =====
const GoAI = (() => {
  function makeNbr(n) {
    const nb = [];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n, a = [];
      if (r > 0) a.push(i - n); if (r < n - 1) a.push(i + n);
      if (c > 0) a.push(i - 1); if (c < n - 1) a.push(i + 1);
      nb.push(a);
    }
    return nb;
  }
  function makeDiag(n) {
    const d = [];
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n, a = [];
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
      }
      d.push(a);
    }
    return d;
  }
  const cache = {};
  function geo(n) { return cache[n] || (cache[n] = { nb: makeNbr(n), dg: makeDiag(n) }); }

  class Board {
    constructor(n, cells, ko) {
      this.n = n; this.N = n * n; const G = geo(n); this.nb = G.nb; this.dg = G.dg;
      this.c = cells ? Int8Array.from(cells) : new Int8Array(n * n);
      this.ko = ko == null ? -1 : ko;
      this.mark = new Int32Array(n * n); this.stamp = 0; this.stack = new Int32Array(n * n);
    }
    clone() { const b = new Board(this.n, this.c, this.ko); return b; }
    // number of liberties of group at i, stops counting at `limit`
    libs(i, limit) {
      const col = this.c[i], m = this.mark, st = this.stack; const s = ++this.stamp;
      let sp = 0, cnt = 0; st[sp++] = i; m[i] = s;
      while (sp) {
        const p = st[--sp];
        for (const q of this.nb[p]) {
          if (m[q] === s) continue;
          const v = this.c[q];
          if (v === 0) { m[q] = s; if (++cnt >= limit) return cnt; }
          else if (v === col) { m[q] = s; st[sp++] = q; }
        }
      }
      return cnt;
    }
    // the single liberty of a group in atari (or -1)
    lastLib(i) {
      const col = this.c[i], m = this.mark, st = this.stack; const s = ++this.stamp;
      let sp = 0; st[sp++] = i; m[i] = s;
      while (sp) {
        const p = st[--sp];
        for (const q of this.nb[p]) {
          if (m[q] === s) continue;
          const v = this.c[q];
          if (v === 0) return q;
          if (v === col) { m[q] = s; st[sp++] = q; }
        }
      }
      return -1;
    }
    removeGroup(i) {
      const col = this.c[i]; let cnt = 0; const st = [i]; this.c[i] = 0;
      while (st.length) { const p = st.pop(); cnt++; for (const q of this.nb[p]) if (this.c[q] === col) { this.c[q] = 0; st.push(q); } }
      return cnt;
    }
    legal(i, col) {
      if (this.c[i] !== 0 || i === this.ko) return false;
      const opp = 3 - col;
      for (const q of this.nb[i]) {
        const v = this.c[q];
        if (v === 0) return true;
        if (v === opp && this.libs(q, 2) === 1) return true;
        if (v === col && this.libs(q, 2) >= 2) return true;
      }
      return false;
    }
    // play assuming legal; returns stones captured
    play(i, col) {
      const opp = 3 - col; this.c[i] = col; let cap = 0, capAt = -1;
      for (const q of this.nb[i]) if (this.c[q] === opp && this.libs(q, 1) === 0) { const k = this.removeGroup(q); cap += k; capAt = q; }
      this.ko = -1;
      if (cap === 1) {
        let lone = true; for (const q of this.nb[i]) if (this.c[q] === col) lone = false;
        if (lone && this.libs(i, 2) === 1) this.ko = capAt;
      }
      return cap;
    }
    // point i is an eye-like point for col (do not fill in playouts)
    isEye(i, col) {
      if (this.c[i] !== 0) return false;
      for (const q of this.nb[i]) if (this.c[q] !== col) return false;
      const d = this.dg[i]; let bad = 0;
      for (const q of d) if (this.c[q] === 3 - col) bad++;
      const edge = d.length < 4;
      return edge ? bad === 0 : bad <= 1;
    }
    areaScore() { // returns black - white (no komi), plus owner array
      let b = 0, w = 0; const own = new Int8Array(this.N);
      for (let i = 0; i < this.N; i++) {
        const v = this.c[i];
        if (v) { own[i] = v; if (v === 1) b++; else w++; continue; }
        let sb = false, sw = false;
        for (const q of this.nb[i]) { if (this.c[q] === 1) sb = true; else if (this.c[q] === 2) sw = true; }
        if (sb && !sw) { b++; own[i] = 1; } else if (sw && !sb) { w++; own[i] = 2; }
      }
      return { diff: b - w, own };
    }
  }

  // ---------- random playout ----------
  function playout(b, toMove, maxMoves) {
    const N = b.N, empties = new Int32Array(N); let passes = 0, moves = 0;
    while (passes < 2 && moves < maxMoves) {
      let ne = 0; for (let i = 0; i < N; i++) if (b.c[i] === 0) empties[ne++] = i;
      let played = false;
      while (ne > 0) {
        const k = (Math.random() * ne) | 0, m = empties[k];
        empties[k] = empties[--ne];
        if (b.isEye(m, toMove) || !b.legal(m, toMove)) continue;
        b.play(m, toMove); played = true; break;
      }
      passes = played ? 0 : passes + 1; if (!played) b.ko = -1;
      toMove = 3 - toMove; moves++;
    }
    return b.areaScore();
  }

  // ---------- MCTS (UCT) ----------
  function candidates(b, col) {
    const out = [];
    for (let i = 0; i < b.N; i++) if (b.c[i] === 0 && !b.isEye(i, col) && b.legal(i, col)) out.push(i);
    return out;
  }
  class Node {
    constructor(move, parent, toMove, p) { this.move = move; this.parent = parent; this.toMove = toMove; this.kids = null; this.untried = null; this.w = 0; this.v = 0; this.p = p || 0; }
  }
  // prior knowledge: avoid the edge early, like captures and saving stones in atari
  function prior(b, m, col) {
    const n = b.n, r = Math.floor(m / n), c = m % n, line = Math.min(r, c, n - 1 - r, n - 1 - c);
    let stones = 0; for (let i = 0; i < b.N; i++) if (b.c[i]) stones++;
    let p = 0;
    if (line === 0) p -= stones < n * 4 ? 0.5 : 0.15;
    else if (line === 1 && stones < n * 2) p -= 0.15;
    else if (line >= 2 && stones < n) p += 0.1;
    for (const q of b.nb[m]) {
      const v = b.c[q]; if (!v) continue;
      if (b.libs(q, 2) === 1) p += v === col ? 0.35 : 0.5;
    }
    const t = b.clone(); t.play(m, col); if (t.libs(m, 2) === 1) p -= 0.4;
    return p;
  }
  // options: {timeMs, komi, onDone(result)}; runs in slices so the page stays responsive
  function think(cells, n, ko, toMove, opts) {
    const komi = opts.komi == null ? 7 : opts.komi;
    const root = new Node(-1, null, toMove);
    const rootB = new Board(n, cells, ko);
    root.untried = candidates(rootB, toMove).map(m => [m, prior(rootB, m, toMove) + Math.random() * 0.01]).sort((a, b) => a[1] - b[1]).map(x => x[0]); root.kids = [];
    const ownSum = new Float32Array(n * n); let sims = 0, blackWins = 0;
    const deadline = Date.now() + (opts.timeMs || 1500);
    const maxMoves = n * n * 3;
    function one() {
      const b = rootB.clone(); let node = root;
      // selection
      while (node.untried && node.untried.length === 0 && node.kids.length) {
        let best = null, bv = -1; const lg = Math.log(node.v + 1);
        for (const k of node.kids) {
          const u = k.w / k.v + 0.7 * Math.sqrt(lg / k.v) + k.p / (k.v + 1);
          if (u > bv) { bv = u; best = k; }
        }
        node = best; if (node.move >= 0) b.play(node.move, 3 - node.toMove); else b.ko = -1;
      }
      // expansion
      if (node.untried && node.untried.length) {
        const m = node.untried.pop();
        if (b.legal(m, node.toMove)) {
          const pr = prior(b, m, node.toMove);
          b.play(m, node.toMove);
          const child = new Node(m, node, 3 - node.toMove, pr);
          child.untried = candidates(b, child.toMove).sort(() => Math.random() - .5); child.kids = [];
          node.kids.push(child); node = child;
        }
      } else if (node.untried == null) {
        node.untried = candidates(b, node.toMove); node.kids = [];
      }
      // simulation
      const res = playout(b, node.toMove, maxMoves);
      const bWin = res.diff - komi > 0 ? 1 : 0;
      sims++; blackWins += bWin;
      for (let i = 0; i < res.own.length; i++) ownSum[i] += res.own[i] === 1 ? 1 : res.own[i] === 2 ? -1 : 0;
      // backprop: a node's w counts wins for the player who moved into it
      while (node) {
        node.v++;
        const mover = 3 - node.toMove;
        node.w += mover === 1 ? bWin : 1 - bWin;
        node = node.parent;
      }
    }
    function finish() {
      let best = null;
      for (const k of root.kids) if (!best || k.v > best.v) best = k;
      const own = Array.from(ownSum, x => sims ? x / sims : 0);
      const winRate = best ? best.w / best.v : (toMove === 1 ? blackWins / Math.max(1, sims) : 1 - blackWins / Math.max(1, sims));
      let est = 0; for (const o of own) est += o; // black minus white, points
      opts.onDone({ move: best ? best.move : -1, winRate, sims, own, blackLead: est - komi, kids: root.kids.map(k => ({ move: k.move, v: k.v, rate: k.w / k.v })) });
    }
    if (root.untried.length === 0) { finish(); return; }
    (function slice() {
      const end = Date.now() + 30;
      while (Date.now() < end) one();
      if (Date.now() < deadline && sims < (opts.maxSims || 60000)) setTimeout(slice, 0); else finish();
    })();
  }

  // ---------- simple rule-based AI ----------
  function simpleMove(cells, n, ko, col) {
    const b = new Board(n, cells, ko), opp = 3 - col;
    const legal = []; for (let i = 0; i < b.N; i++) if (b.legal(i, col) && !b.isEye(i, col)) legal.push(i);
    if (!legal.length) return -1;
    const sizeOf = i => { let s = 0; const seen = new Set([i]), st = [i]; while (st.length) { const p = st.pop(); s++; for (const q of b.nb[p]) if (!seen.has(q) && b.c[q] === b.c[i]) { seen.add(q); st.push(q); } } return s; };
    // 1) capture the biggest opponent group in atari
    let best = -1, bestSize = 0;
    for (let i = 0; i < b.N; i++) if (b.c[i] === opp && b.libs(i, 2) === 1) {
      const l = b.lastLib(i), s = sizeOf(i);
      if (l >= 0 && b.legal(l, col) && s > bestSize) { best = l; bestSize = s; }
    }
    if (best >= 0 && Math.random() < 0.9) return best;
    // 2) save own group in atari by extending, if that gives 2+ liberties
    for (let i = 0; i < b.N; i++) if (b.c[i] === col && b.libs(i, 2) === 1) {
      const l = b.lastLib(i);
      if (l >= 0 && b.legal(l, col)) { const t = b.clone(); t.play(l, col); if (t.libs(l, 3) >= 2 && Math.random() < 0.85) return l; }
    }
    // 3) atari opponent groups with two liberties sometimes
    const ataris = [];
    for (const m of legal) {
      for (const q of b.nb[m]) if (b.c[q] === opp && b.libs(q, 3) === 2) { const t = b.clone(); t.play(m, col); if (t.libs(m, 3) >= 2) ataris.push(m); break; }
    }
    if (ataris.length && Math.random() < 0.4) return ataris[(Math.random() * ataris.length) | 0];
    // 4) otherwise a safe move near stones (avoid self-atari and the first line early)
    const safe = legal.filter(m => { const t = b.clone(); t.play(m, col); return t.libs(m, 3) >= 2; });
    const pool = safe.length ? safe : legal;
    const stones = cells.reduce((a, v) => a + (v ? 1 : 0), 0);
    const weighted = [];
    for (const m of pool) {
      const r = Math.floor(m / n), c = m % n, line = Math.min(r, c, n - 1 - r, n - 1 - c);
      let w = line === 0 ? 0.2 : line === 1 ? 1 : 2;
      if (stones < 6 && line === 2) w = 4;
      for (const q of b.nb[m]) if (b.c[q]) w += 1;
      weighted.push([m, w]);
    }
    let tot = weighted.reduce((a, x) => a + x[1], 0), r = Math.random() * tot;
    for (const [m, w] of weighted) { r -= w; if (r <= 0) return m; }
    return pool[0];
  }

  return { Board, think, simpleMove };
})();
if (typeof module !== 'undefined') module.exports = GoAI;
