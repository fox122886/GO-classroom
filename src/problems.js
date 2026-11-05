// ===== Problem bank: lesson exercises, extra problems and mirrored variants =====
const BANK_TOPICS = [
  { id: 'capture', name: '吃子', lessons: ['liberty', 'capture', 'escape', 'double', 'cutconnect'] },
  { id: 'ko', name: '禁著點與劫', lessons: ['ko'] },
  { id: 'tesuji', name: '手筋', lessons: ['ladder', 'snapback'] },
  { id: 'life', name: '死活', lessons: ['eyes', 'falseeye', 'shapes'] },
  { id: 'semeai', name: '對殺', lessons: ['semeai'] },
  { id: 'big', name: '布局、大小與形勢', lessons: ['opening', 'judge', 'strongweak', 'bigsmall'] }
];
const LEVEL_OF = { '入門': 1, '基礎': 2, '進階': 3, '實戰': 3 };

// extra problems that only live in the bank
const EXTRA_PROBLEMS = [
  { lesson: 'capture', type: 'move', q: '黑先，提掉三顆白子。', rows: ['.........', '.........', '..XXX....', '.XOOOX...', '..X.X....', '.........', '.........', '.........', '.........'],
    answers: [[4, 3]], hint: '三顆白子連成一串，最後一口氣在下方。', explain: '一串白子共用氣，堵住最後一口就一起提掉。' },
  { lesson: 'escape', type: 'move', q: '黑子只剩兩口氣，往哪邊長比較安全？', rows: ['.......', '.......', '.......', '..OXO..', '..O.O..', '...O...', '.......'],
    answers: [[2, 3]], hint: '往下長之後數數看剩幾口氣。', explain: '往上長出去有 3 口氣；往下長會被白子包住，只剩一口氣。' },
  { lesson: 'shapes', type: 'solve', goal: 'kill', q: '黑先，白棋是「直三」。請殺掉它。', rows: ['.......', '.......', '.......', 'XXXXXXX', 'OOOOOOO', 'OO...OO', 'OOOOOOO'],
    target: [4, 0], box: [4, 0, 6, 6], key: [5, 3], hint: '直三的要害在中間。', explain: '黑點中間，白棋只剩一個眼。', trap: [5, 2], trapNote: '點在旁邊，白棋下中間就做出兩個眼。' },
  { lesson: 'shapes', type: 'solve', goal: 'kill', q: '黑先，白棋是「彎三」。請殺掉它。', rows: ['.......', '.......', '.......', 'XXXXXXX', 'OOOOOOO', 'OO..OOO', 'OOO.OOO'],
    target: [4, 0], box: [4, 0, 6, 6], key: [5, 3], hint: '找同時碰到另外兩個空點的轉角。', explain: '點中轉角，白棋就做不出兩個眼。' },
  { lesson: 'shapes', type: 'solve', goal: 'live', q: '黑先，黑棋內部是「刀把五」。請讓黑棋活。', rows: ['.......', '.......', '.......', 'OOOOOOO', 'XXXXXXX', 'XX...XX', 'XX..XXX'],
    target: [4, 0], box: [4, 0, 6, 6], key: [5, 3], hint: '自己先佔要害。', explain: '黑先佔要害，就能分出兩個眼。' },
  { lesson: 'shapes', type: 'solve', goal: 'live', q: '黑先，黑棋內部是「梅花五」。請讓黑棋活。', rows: ['.......', '.......', 'OOOOOOO', 'XXXXXXX', 'XXX.XXX', 'XX...XX', 'XXX.XXX'],
    target: [3, 0], box: [3, 0, 6, 6], key: [5, 3], hint: '十字形的中心。', explain: '佔住中心，四個角都變成獨立的眼。' }
];

function buildBank() {
  const all = [];
  const add = (e, lessonId, id) => {
    if (e.type === 'free') return;
    const topic = BANK_TOPICS.find(t => t.lessons.includes(lessonId));
    if (!topic) return;
    const lesson = LESSONS.find(l => l.id === lessonId);
    all.push(Object.assign({}, e, { id, lesson: lessonId, topic: topic.id, level: LEVEL_OF[lesson.level] || 2, lessonTitle: lesson.title }));
  };
  LESSONS.forEach(l => l.exercises.forEach((e, k) => add(e, l.id, l.id + '-' + k)));
  EXTRA_PROBLEMS.forEach((e, k) => add(e, e.lesson, 'x-' + k));
  // mirrored copies of board puzzles (left and right swapped)
  const base = all.slice();
  for (const e of base) {
    if (!e.rows || !['move', 'solve', 'capture'].includes(e.type)) continue;
    const m = mirrorExercise(e);
    m.id = e.id + '-m';
    all.push(m);
  }
  if (typeof LD_PROBLEMS !== 'undefined') for (const e of LD_PROBLEMS) all.push(Object.assign({}, e, { topic: 'life', level: e.place === 'corner' ? 3 : 2, lessonTitle: '死活題庫' }));
  return all;
}
function mirrorExercise(e) {
  const n = e.rows.length, mc = ([r, c]) => [r, n - 1 - c];
  const swapText = s => s == null ? s : s.replace(/左右/g, '\u0001').replace(/左/g, '\u0002').replace(/右/g, '左').replace(/\u0002/g, '右').replace(/\u0001/g, '左右');
  const m = Object.assign({}, e);
  m.rows = e.rows.map(r => r.split('').reverse().join(''));
  ['answers', 'alt'].forEach(k => { if (e[k]) m[k] = e[k].map(mc); });
  ['target', 'own', 'key', 'trap'].forEach(k => { if (e[k]) m[k] = mc(e[k]); });
  if (e.box) m.box = [e.box[0], n - 1 - e.box[3], e.box[2], n - 1 - e.box[1]];
  if (e.marks) { m.marks = {}; for (const k in e.marks) { const [r, c] = k.split(',').map(Number); m.marks[r + ',' + (n - 1 - c)] = e.marks[k]; } }
  ['q', 'hint', 'explain', 'altMsg', 'trapNote'].forEach(k => { m[k] = swapText(e[k]); });
  m.mirrored = true;
  return m;
}
if (typeof module !== 'undefined') module.exports = { BANK_TOPICS, EXTRA_PROBLEMS, buildBank, mirrorExercise };
