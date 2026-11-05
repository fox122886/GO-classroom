const fs = require('fs');
global.Go = null; eval(fs.readFileSync(require('path').join(__dirname, '../src/engine.js'), 'utf8') + ';global.Go=Go;');
const P = require(require('path').join(__dirname, '../tmp/classic_raw.json'));
const A = 'abcdefghijklmnopqrstuvwxyz';
function parseTree(s) { // -> list of nodes {m:[r,c], ok, kids}
  let i = 0;
  function seq() { const n = { m: [A.indexOf(s[i + 1]), A.indexOf(s[i])], ok: false, kids: [], lb: [] }; i += 2; if (s[i] === '!') { n.ok = true; i++; }
    if (s[i] === '#') { const j = s.indexOf(';', i); n.note = +s.slice(i + 1, j); i = j + 1; }
    if (s[i] === '@') { i++; while (s[i] !== ';') { n.lb.push([s[i], A.indexOf(s[i + 2]), A.indexOf(s[i + 1])]); i += 3; } i++; }
    n.kids = list(); return n; }
  function list() { const out = []; if (i >= s.length || s[i] === ')') return out; if (s[i] === '(') { while (s[i] === '(') { i++; out.push(seq()); i++; } return out; } out.push(seq()); return out; }
  return list();
}
let bad = 0; const issues = {};
for (const p of P) {
  const n = p.n, g = new Array(n * n).fill(0), G = new Array(361).fill(0);
  const put = (s, v) => { for (let k = 0; k < s.length; k += 2) { const c = A.indexOf(s[k]), r = A.indexOf(s[k + 1]); g[r * n + c] = v; G[(r + p.at[0]) * 19 + c + p.at[1]] = v; } };
  put(p.b, 1); put(p.w, 2);
  const T = parseTree(p.t); let err = null, oks = 0;
  (function walk(ks, g, G, ko, KO, col, depth) {
    for (const k of ks) {
      if (err) return;
      const i = k.m[0] * n + k.m[1], I = (k.m[0] + p.at[0]) * 19 + k.m[1] + p.at[1];
      const r = Go.play(n, g, i, col, ko), R = Go.play(19, G, I, col, KO);
      if (!R.ok) { err = 'illegal-full ' + R.reason + ' d' + depth; return; }
      if (!r.ok) { err = 'illegal-crop ' + r.reason; return; }
      if (r.captured.length !== R.captured.length) { err = 'capture-mismatch'; return; }
      if (k.ok) { oks++; if (col !== 1 && p.src === 'ggg') issues.whiteEnd = (issues.whiteEnd || 0) + 1; }
      walk(k.kids, r.g, R.g, r.ko, R.ko, 3 - col, depth + 1);
    }
  })(T, g, G, -1, -1, 1, 0);
  if (!oks && !err) err = 'no-correct';
  if (err) { bad++; issues[err] = (issues[err] || 0) + 1; p.bad = err; }
}
console.log('bad', bad, issues);

