// Apps Script strips "//" comments from served HTML and mistakes "//" inside template literals for a comment.
// Run before deploying: node tools/check_gas_safe.js   (needs: npm i acorn)
const acorn = require('acorn'), fs = require('fs'), path = require('path');
let bad = 0;
for (const f of fs.readdirSync(path.join(__dirname, '../src')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(__dirname, '../src', f), 'utf8');
  for (const t of acorn.tokenizer(src, { ecmaVersion: 2022 })) if (t.type.label === 'template' && t.value.includes('//')) { bad++; console.log(f, src.slice(t.start, t.start + 80)); }
}
console.log(bad ? `${bad} problem(s)` : 'ok'); process.exit(bad ? 1 : 0);
