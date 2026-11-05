const fs = require('fs'), path = require('path');
const { classicConvert, classicFile } = require('./classic_conv.js');
const E = process.env.EXT_DIR || path.join(__dirname, '../ext');
const ggg = [];
for (const level of ['easy', 'intermediate', 'hard']) {
  for (let k = 1; k <= 140; k++) { const no = String(k).padStart(2, '0'); const f = `${E}/go-problems/weekly-go-problems/${level}/ggg-${level}-${no}.sgf`; if (fs.existsSync(f)) ggg.push({ level, no: k, text: fs.readFileSync(f, 'utf8') }); else console.error('missing', f); }
}
const gzp = [1, 2, 3].map(k => fs.readFileSync(`${E}/tsumego/books/sources/guanzi-pu/gzp${k}.sgf`, 'utf8'));
const gzpMap = fs.readFileSync(`${E}/tsumego/books/sources/guanzi-pu/source-map.csv`, 'utf8');
const out = classicConvert({ ggg, gzp, gzpMap }), res = out.problems;
console.log('notes', out.notes.length);
fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true }); fs.writeFileSync(path.join(__dirname, '../tmp/classic_raw.json'), JSON.stringify(res));
const zh = JSON.parse(fs.readFileSync(path.join(__dirname, 'classic_notes_zh.json'), 'utf8'));
if (zh.length !== out.notes.length) throw new Error('translation count mismatch: ' + zh.length + ' vs ' + out.notes.length);
fs.writeFileSync(path.join(__dirname, 'classic_notes_en.json'), JSON.stringify(out.notes, null, 0));
fs.writeFileSync(path.join(__dirname, '../src/classic_data.js'), classicFile(res, zh));
const c = {}; res.forEach(p => { const k = p.src + p.lv; c[k] = (c[k] || 0) + 1; });
console.log(res.length, c, JSON.stringify(res).length);
