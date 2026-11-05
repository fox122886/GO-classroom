// ===== Go engine (rules + small capture search) =====
const Go = (() => {
  function parse(rows) {
    const n = rows.length, g = new Array(n * n).fill(0);
    rows.forEach((row, r) => {
      for (let c = 0; c < n; c++) {
        const ch = row[c];
        g[r * n + c] = ch === 'X' ? 1 : ch === 'O' ? 2 : 0;
      }
    });
    return { n, g };
  }
  function nb(n, i) {
    const r = Math.floor(i / n), c = i % n, a = [];
    if (r > 0) a.push(i - n);
    if (r < n - 1) a.push(i + n);
    if (c > 0) a.push(i - 1);
    if (c < n - 1) a.push(i + 1);
    return a;
  }
  function group(n, g, i) {
    const col = g[i];
    if (!col) return null;
    const stones = [i], seen = new Set([i]), libs = new Set();
    for (let k = 0; k < stones.length; k++) {
      for (const j of nb(n, stones[k])) {
        if (g[j] === 0) libs.add(j);
        else if (g[j] === col && !seen.has(j)) { seen.add(j); stones.push(j); }
      }
    }
    return { color: col, stones, libs };
  }
  function play(n, g, i, col, ko) {
    if (g[i] !== 0) return { ok: false, reason: 'occupied' };
    if (i === ko) return { ok: false, reason: 'ko' };
    const ng = g.slice();
    ng[i] = col;
    const opp = 3 - col, captured = [];
    for (const j of nb(n, i)) {
      if (ng[j] === opp) {
        const gr = group(n, ng, j);
        if (gr.libs.size === 0) for (const s of gr.stones) { ng[s] = 0; captured.push(s); }
      }
    }
    const me = group(n, ng, i);
    if (me.libs.size === 0) return { ok: false, reason: 'suicide' };
    let newKo = -1;
    if (captured.length === 1 && me.stones.length === 1 && me.libs.size === 1) newKo = captured[0];
    return { ok: true, g: ng, captured, ko: newKo };
  }
  // attacker to move: can the group at t be captured?
  function attackerWins(n, g, t, depth, ko) {
    if (g[t] === 0) return true;
    const gr = group(n, g, t);
    if (gr.libs.size > 2 || depth <= 0) return false;
    for (const m of gr.libs) {
      const r = play(n, g, m, 3 - gr.color, ko);
      if (!r.ok) continue;
      if (r.g[t] === 0) return true;
      if (defenderLoses(n, r.g, t, depth - 1, r.ko)) return true;
    }
    return false;
  }
  function defenderMoves(n, g, t) {
    const gr = group(n, g, t), set = new Set(gr.libs);
    for (const s of gr.stones) for (const j of nb(n, s)) {
      if (g[j] === 3 - gr.color) {
        const ag = group(n, g, j);
        if (ag.libs.size === 1) ag.libs.forEach(x => set.add(x));
      }
    }
    return [...set];
  }
  // defender to move: does the target die anyway?
  function defenderLoses(n, g, t, depth, ko) {
    if (g[t] === 0) return true;
    const gr = group(n, g, t);
    if (gr.libs.size >= 3) return false;
    let any = false;
    for (const m of defenderMoves(n, g, t)) {
      const r = play(n, g, m, gr.color, ko);
      if (!r.ok) continue;
      any = true;
      if (!attackerWins(n, r.g, t, depth, r.ko)) return false;
    }
    if (!any) return attackerWins(n, g, t, depth, -1);
    return true;
  }
  // choose the defender's reply in a capture exercise
  function bestDefense(n, g, t, ko) {
    const gr = group(n, g, t);
    let fallback = null, fallbackLibs = -1;
    for (const m of defenderMoves(n, g, t)) {
      const r = play(n, g, m, gr.color, ko);
      if (!r.ok) continue;
      if (!attackerWins(n, r.g, t, 24, r.ko)) return { move: m, res: r, escaped: true };
      const libs = group(n, r.g, t).libs.size;
      if (libs > fallbackLibs) { fallbackLibs = libs; fallback = { move: m, res: r, escaped: false }; }
    }
    return fallback;
  }
  // ---- local life & death / semeai solver ----
  // Moves are limited to `region`. The attacker wins when `target` is captured;
  // the attacker loses when `own` (optional) is captured or both sides pass.
  function solveLocal(n, g, toMove, attacker, region, target, own, ko, passes, depth, memo) {
    if (g[target] === 0) return true;
    if (own >= 0 && g[own] === 0) return false;
    if (passes >= 2 || depth <= 0) return false;
    const k = g.join('') + toMove + ':' + ko + ':' + passes;
    if (memo.has(k)) return memo.get(k);
    memo.set(k, false);
    const atk = toMove === attacker;
    let result = atk ? false : true;
    const tryNext = (ng, nko, np) => solveLocal(n, ng, 3 - toMove, attacker, region, target, own, nko, np, depth - 1, memo);
    for (const m of region) {
      if (g[m] !== 0) continue;
      const r = play(n, g, m, toMove, ko);
      if (!r.ok) continue;
      const v = tryNext(r.g, r.ko, 0);
      if (atk && v) { result = true; break; }
      if (!atk && !v) { result = false; break; }
    }
    if (atk ? !result : result) {
      const v = tryNext(g, -1, passes + 1);
      if (atk && v) result = true;
      if (!atk && !v) result = false;
    }
    memo.set(k, result);
    return result;
  }
  // after a move by `mover`, does the problem still go the mover's way?
  function localOutcome(n, g, toMove, p, ko) {
    const memo = new Map();
    const atkWins = solveLocal(n, g, toMove, p.attacker, p.region, p.target, p.own, ko, 0, 40, memo);
    return atkWins;
  }
  // best reply for the side to move; returns {move:-1} for pass
  function localReply(n, g, toMove, p, ko) {
    const wantAtk = toMove === p.attacker;
    let fallback = null;
    for (const m of p.region) {
      if (g[m] !== 0) continue;
      const r = play(n, g, m, toMove, ko);
      if (!r.ok) continue;
      const v = localOutcome(n, r.g, 3 - toMove, p, r.ko);
      if (v === wantAtk || (wantAtk && r.g[p.target] === 0)) return { move: m, res: r, good: true };
      if (!fallback || r.captured.length > fallback.res.captured.length) fallback = { move: m, res: r, good: false };
    }
    return fallback || { move: -1, good: false };
  }
  // area score: stones + empty regions touching only one colour. dead = Set of indices removed first.
  function score(n, g, dead) {
    const b = g.slice(); if (dead) dead.forEach(i => { b[i] = 0; });
    const own = new Array(n * n).fill(0); let bs = 0, ws = 0;
    for (let i = 0; i < n * n; i++) { if (b[i] === 1) { bs++; own[i] = 1; } else if (b[i] === 2) { ws++; own[i] = 2; } }
    const seen = new Set();
    for (let i = 0; i < n * n; i++) {
      if (b[i] !== 0 || seen.has(i)) continue;
      const area = [i], touch = new Set(); seen.add(i);
      for (let k = 0; k < area.length; k++) for (const j of nb(n, area[k])) {
        if (b[j] === 0 && !seen.has(j)) { seen.add(j); area.push(j); } else if (b[j]) touch.add(b[j]);
      }
      if (touch.size === 1) { const c = [...touch][0]; area.forEach(a => own[a] = c); if (c === 1) bs += area.length; else ws += area.length; }
    }
    return { black: bs, white: ws, own };
  }
  return { parse, nb, group, play, attackerWins, defenderLoses, bestDefense, solveLocal, localOutcome, localReply, score };
})();
if (typeof module !== 'undefined') module.exports = Go;
