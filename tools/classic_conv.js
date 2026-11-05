// Converts public SGF sources into the app's compact classic-problem bank.
// Pure and deterministic: runs the same in Node and in a browser.
function classicConvert(src) {
  const A = 'abcdefghijklmnopqrstuvwxyz';
  function parseSGF(t) { // returns list of root nodes {props, kids}
    let i = 0; const roots = [];
    function val() { let s = ''; i++; while (i < t.length && t[i] !== ']') { if (t[i] === '\\') i++; s += t[i++]; } i++; return s; }
    function node() {
      const props = {}; i++;
      while (i < t.length) {
        while (/\s/.test(t[i])) i++;
        const m = /^[A-Z]+/.exec(t.slice(i, i + 4)); if (!m) break;
        const k = m[0]; i += k.length; props[k] = [];
        while (true) { while (/\s/.test(t[i])) i++; if (t[i] !== '[') break; props[k].push(val()); }
      }
      return { props, kids: [] };
    }
    function seq() { // at '('
      i++; let first = null, cur = null;
      while (i < t.length) {
        while (/\s/.test(t[i])) i++;
        if (t[i] === ';') { const n = node(); if (cur) cur.kids.push(n); else first = n; cur = n; }
        else if (t[i] === '(') { const s = seq(); if (s) cur.kids.push(s); }
        else if (t[i] === ')') { i++; break; }
        else i++;
      }
      return first;
    }
    while (i < t.length) { if (t[i] === '(') { const r = seq(); if (r) roots.push(r); } else i++; }
    return roots;
  }
  const pt = s => (s && s.length === 2 && s !== 'tt') ? [A.indexOf(s[1]), A.indexOf(s[0])] : null; // [row, col]
  const isCorrect = c => /^\s*(also\s+)?correct\b/i.test(c || '');
  const notes = [], noteIx = {};
  const noteOf = c => { // keep explanatory comments; plain "Correct" carries no extra information
    c = (c || '').trim(); if (!c || /gogameguru\.com/.test(c) || /^(also\s+)?correct\.?$/i.test(c)) return -1;
    if (!(c in noteIx)) { noteIx[c] = notes.length; notes.push(c); } return noteIx[c];
  };
  const labelsOf = p => (p.LB || []).map(v => { const [q, l] = v.split(':'); return pt(q) && l && /^[A-Z]$/.test(l.trim()) ? [pt(q), l.trim()] : null; }).filter(Boolean);
  // build move tree; returns null for unusable trees
  function tree(n, swap) {
    let bad = false;
    function walk(nd) {
      const p = nd.props; let col = p.B ? 1 : p.W ? 2 : 0; const raw = p.B ? p.B[0] : p.W ? p.W[0] : null;
      const m = pt(raw); if (!col) { bad = true; return null; }
      if (!m) return null; // a pass: drop this variation
      if (swap) col = 3 - col;
      const ok = isCorrect(p.C && p.C[0]) && (!nd.kids.length || col === 1);
      const note = noteOf(p.C && p.C[0]), lb = labelsOf(p);
      if (ok) return { col, m, ok, kids: [], note, lb }; // marked correct: the problem ends here
      const kids = nd.kids.map(walk).filter(Boolean);
      return { col, m, ok: false, kids, note, lb };
    }
    const kids = n.kids.map(walk).filter(Boolean);
    return bad ? null : kids;
  }
  function build(root, kids, swap, meta) {
    const p = root.props, stones = [];
    for (const [k, c] of [['AB', 1], ['AW', 2]]) for (const s of (p[k] || [])) { const q = pt(s); if (q) stones.push([q[0], q[1], swap ? 3 - c : c]); }
    const pts = stones.map(s => [s[0], s[1]]);
    (function each(ks) { for (const k of ks) { pts.push(k.m); (k.lb || []).forEach(l => pts.push(l[0])); each(k.kids); } })(kids);
    let r0 = 19, r1 = -1, c0 = 19, c1 = -1;
    for (const [r, c] of pts) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    const span = (a, b) => { // margin, snap to near edges
      a = a <= 3 ? 0 : a - 1; b = b >= 15 ? 18 : b + 1; return [a, b];
    };
    [r0, r1] = span(r0, r1); [c0, c1] = span(c0, c1);
    const k = Math.max(r1 - r0, c1 - c0) + 1;
    const fit = (a, b) => { const need = k - (b - a + 1); if (!need) return a; return (a <= 18 - b) ? Math.max(0, a - need) : Math.min(18, b + need) - k + 1; };
    const R = fit(r0, r1), C = fit(c0, c1);
    const enc = ([r, c]) => A[c - C] + A[r - R];
    // tree string: move = 2 letters, '!' marks a correct end; several replies are wrapped in ( )
    // optional '#<note>;' and '@<label letter><point>...;' after a move
    const node = n => enc(n.m) + (n.ok ? '!' : '') + (n.note >= 0 ? '#' + n.note + ';' : '') + (n.lb && n.lb.length ? '@' + n.lb.map(([q, l]) => l + enc(q)).join('') + ';' : '') + list(n.kids);
    const list = ks => ks.length === 1 ? node(ks[0]) : ks.map(k => '(' + node(k) + ')').join('');
    const st = v => stones.filter(s => s[2] === v).map(([r, c]) => enc([r, c])).join('');
    return Object.assign(meta, { n: k, at: [R, C], b: st(1), w: st(2), t: list(kids) });
  }
  const res = [];
  // Go Game Guru weekly problems (full trees)
  for (const f of src.ggg) {
    const lv = { easy: 1, intermediate: 2, hard: 3 }[f.level]; if (!lv) continue;
    const root = parseSGF(f.text)[0]; if (!root) continue;
    const kids = tree(root, false); if (!kids || !kids.length) continue;
    if (kids.some(k => k.col !== 1)) continue;
    const hasOk = ks => ks.some(k => k.ok || hasOk(k.kids)); if (!hasOk(kids)) continue;
    res.push(build(root, kids, false, { id: 'ggg-' + f.level[0] + f.no, src: 'ggg', no: f.no, set: f.level, lv }));
  }
  // Guanzi Pu (main line only; white moves first in the source, colours swapped so black plays)
  const keep = {};
  src.gzpMap.trim().split('\n').slice(1).forEach(l => { const [s, b, k] = l.split(',').map(Number); if (s === k) keep[s] = b; });
  let gno = 0;
  for (const text of src.gzp) for (const root of parseSGF(text)) {
    gno++; const book = keep[gno]; if (!book) continue;
    const line = tree(root, true); if (!line || !line.length || line[0].col !== 1) continue;
    let nd = line[0], ok = true, len = 1; while (nd.kids.length) { if (nd.kids[0].col === nd.col) ok = false; nd = nd.kids[0]; len++; }
    if (!ok) continue; nd.ok = true;
    res.push(build(root, line, true, { id: 'gzp-' + book, src: 'gzp', no: book, lv: len <= 3 ? 1 : len <= 7 ? 2 : 3 }));
  }
  return { problems: res, notes };
}
function classicFile(res, notesZh) { // accepts the convert() result or the problem list; notesZh = translated notes
  res = res.problems || res;
  return '// Notes: Chinese translations (by this project) of the Go Game Guru solution comments, CC BY-NC-SA 4.0.\nconst CLASSIC_NOTES = ' + JSON.stringify(notesZh || []) + ';\n' + '// ===== Classic problems: Go Game Guru Weekly Go Problems (CC BY-NC-SA 4.0, cropped and converted) and Guanzi Pu (public domain; SGF by Flygo via u-go.net, numbering by tasuki/tsumego). Generated by tools/classic_conv.js =====\nconst CLASSIC_RAW = ' + JSON.stringify(res) + ';\n';
}
if (typeof module !== 'undefined') module.exports = { classicConvert, classicFile };
