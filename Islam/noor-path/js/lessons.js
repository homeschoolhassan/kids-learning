// Stage 1 curriculum: Letter joining + Vowels and signs.
// Almost every practice word is a real Quran word from the word bank (Juz Amma and Al-Fatiha).
import { analyse, pieces, baseOf, joinsForward, shapeOf, LETTER_NAME, TANWEEN_FATH, TANWEEN_KASR } from './arabic.js';
import { shuffle, pick, wordSpans } from './ui.js';

const WAQF = /[ۖ-ۜ۞۩]/;
let BANK = [];
export function setBank(b) { BANK = b.filter(w => !WAQF.test(w.t) && w.len >= 2); }
export const bank = () => BANK;

// Prefer short, familiar words (bank is ordered from An-Nas backwards).
function words(filter, { max = 7, min = 2 } = {}) {
  return BANK.filter(w => w.len <= max && w.len >= min && filter(w));
}
function choose(list, early = 0.7) {
  if (!list.length) return null;
  const cut = Math.max(8, Math.floor(list.length * 0.35));
  return Math.random() < early ? pick(list.slice(0, cut)) : pick(list);
}
export const nfix = t => t.replace(/([\u064B-\u0650])\u0651/g, '\u0651$1');
const byText = t => BANK.find(w => w.t === nfix(t));
export const refOf = t => (byText(t) || {}).r;

const hlWord = (word, i, size = 'ar-xl') => `<div class="wordcard"><div class="ar ${size}">${wordSpans(word).replace(`data-i="${i}"`, `data-i="${i}" style="color:var(--blue)"`)}</div></div>`;
const tile = (ch, hand, extra = '') => `<div class="tile pop ${extra}">${ch}${hand === true ? '<span class="hand"></span>' : hand === false ? '<span class="nohand">✕</span>' : ''}</div>`;
const tiles = list => `<div class="tiles">${list.join('')}</div>`;
const card = (ar, size = 'ar-xl') => `<div class="wordcard"><div class="ar ${size}">${ar}</div></div>`;
const marks = items => `<div class="mark-demo">${items.map(([ar, lbl]) => `<div class="md"><div class="tile" style="width:96px;height:110px;font-size:58px">${ar}</div><div class="pill pill-soft" style="margin-top:8px">${lbl}</div></div>`).join('')}</div>`;

// Find a Quran word where `letter` sits in each position.
function shapeRow(letter) {
  const pos = ['start', 'middle', 'end', 'alone'];
  const lbl = { start: '1. Start', middle: '2. Middle', end: '3. End', alone: '4. Alone' };
  const cells = pos.map(p => {
    const w = BANK.find(w => w.len <= 6 && analyse(w.t).some(u => u.b === letter && u.pos === p));
    let word = '';
    if (w) { const u = analyse(w.t).find(u => u.b === letter && u.pos === p); word = wordSpans(w.t).replace(`data-i="${u.i}"`, `data-i="${u.i}" style="color:var(--blue)"`); }
    return `<div class="shape"><div class="lbl">${lbl[p]}</div><div class="form">${shapeOf(letter, p)}</div><div class="w">${word || '&nbsp;'}</div></div>`;
  });
  return `<div class="shapes">${cells.join('')}</div><div class="center small muted" style="margin-top:6px">Read from right to left ←</div>`;
}

const DOT_GROUPS = [['ب', 'ت', 'ث', 'ن', 'ي'], ['ج', 'ح', 'خ'], ['د', 'ذ'], ['ر', 'ز'], ['س', 'ش'], ['ص', 'ض'], ['ط', 'ظ'], ['ع', 'غ'], ['ف', 'ق']];
const groupOf = b => DOT_GROUPS.find(g => g.includes(b));
const NOHAND = ['ا', 'د', 'ذ', 'ر', 'ز', 'و'];
const HANDS = ['ب', 'ت', 'ج', 'ح', 'س', 'ص', 'ط', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي'];

// ---------- question generators ----------
const G = {
  hand() {
    const yes = Math.random() < 0.5;
    const ch = pick(yes ? HANDS : NOHAND);
    return { kind: 'pick', say: 'q_hand', show: tiles([tile(ch, null, 'blue')]), why: 'why_hand', key: ch,
      options: [{ html: '✋ Yes, it has a hand', ok: yes }, { html: '✕ No hand', ok: !yes }] };
  },
  tapNoHand() {
    const w = choose(words(w => analyse(w.t).some(u => !joinsForward(u.b) && u.b !== 'ء' && u.i < w.len - 1)));
    if (!w) return null;
    return { kind: 'tap', say: 'q_tap_nohand', word: w.t, ref: w.r, why: 'why_nohand', target: u => !joinsForward(u.b) && u.b !== 'ء' };
  },
  shape(letters) {
    const w = choose(words(w => analyse(w.t).some(u => (letters ? letters.includes(u.b) : joinsForward(u.b) && u.b.match(/[ب-ي]/)) )));
    if (!w) return null;
    const us = analyse(w.t).filter(u => letters ? letters.includes(u.b) : joinsForward(u.b) && u.b.match(/[ب-ي]/));
    const u = pick(us);
    const forms = ['start', 'middle', 'end', 'alone'];
    return { kind: 'pick', say: 'q_shape', show: hlWord(w.t, u.i), word: w.t, ref: w.r, why: 'why_shape',
      options: forms.map(p => ({ html: `<span class="ar" style="font-size:44px">${shapeOf(u.b, p)}</span>`, ok: p === u.pos })), rtl: true };
  },
  dots() {
    const w = choose(words(w => analyse(w.t).some(u => groupOf(u.b))));
    if (!w) return null;
    const u = pick(analyse(w.t).filter(u => groupOf(u.b)));
    const g = groupOf(u.b).slice(0, 4);
    if (!g.includes(u.b)) g[3] = u.b;
    return { kind: 'pick', say: 'q_dots', show: hlWord(w.t, u.i), word: w.t, ref: w.r, why: 'why_dots', rtl: true,
      options: shuffle(g).map(b => ({ html: `<span class="ar" style="font-size:44px">${b}</span><span class="small muted">${LETTER_NAME[b]}</span>`, ok: b === u.b })) };
  },
  laamalif() {
    const w = choose(words(w => w.f.includes('laamalif')));
    if (!w) return null;
    return { kind: 'tap', say: 'q_tricky_laamalif', word: w.t, ref: w.r, why: 'why_laamalif',
      target: (u, us) => (u.b === 'ل' && us[u.i + 1] && baseOf(us[u.i + 1].b) === 'ا') || (baseOf(u.b) === 'ا' && us[u.i - 1] && us[u.i - 1].b === 'ل') };
  },
  pieces() {
    const n = pick([1, 2, 2, 3, 3, 4]);
    const w = choose(words(w => pieces(w.t).length === n, { max: 8 }));
    if (!w) return null;
    return { kind: 'pick', say: 'q_pieces', show: card(w.t), word: w.t, ref: w.r, why: 'why_pieces',
      options: [1, 2, 3, 4].map(k => ({ html: String(k), ok: k === n })) };
  },
  vowel() {
    const w = choose(words(w => analyse(w.t).some(single)));
    if (!w) return null;
    const u = pick(analyse(w.t).filter(single));
    const s = u.fatha ? 'a' : u.kasra ? 'i' : 'u';
    return { kind: 'pick', say: 'q_vowel', show: hlWord(w.t, u.i), word: w.t, ref: w.r, why: 'why_vowel',
      options: [['a', 'َ'], ['i', 'ِ'], ['u', 'ُ']].map(([k, m]) => ({ html: `<span class="ar" style="font-size:40px">ـ${m}</span> ${k}`, ok: k === s })) };
  },
  tapSukun() { return tapQ('q_tap_sukun', 'why_sukun', u => u.sukun); },
  tapShadda() { return tapQ('q_tap_shadda', 'why_shadda', u => u.shadda); },
  tapLong() { return tapQ('q_tap_long', 'why_long', u => u.madd || u.dagger || u.smallWawYa); },
  tanween() {
    const w = choose(words(w => w.f.includes('tanween')));
    if (!w) return null;
    const u = analyse(w.t).find(u => u.tanween);
    const s = TANWEEN_FATH.test(u.m) ? 'an' : TANWEEN_KASR.test(u.m) ? 'in' : 'un';
    return { kind: 'pick', say: 'q_tanween', show: hlWord(w.t, u.i), word: w.t, ref: w.r, why: 'why_tanween',
      options: [['an', 'ً'], ['in', 'ٍ'], ['un', 'ٌ']].map(([k, m]) => ({ html: `<span class="ar" style="font-size:40px">ـ${m}</span> ${k}`, ok: k === s })) };
  },
  tapQuiet() { return tapQ('q_tap_quiet', 'why_quiet', u => u.quiet); },
  listen(filter) {
    const pool = words(filter || (() => true), { max: 6 });
    const w = choose(pool); if (!w) return null;
    const others = shuffle(pool.filter(x => x.t !== w.t)).slice(0, 2);
    return { kind: 'pick', say: 'q_listen_pick', autoplay: w.r, word: w.t, ref: w.r, why: 'listen_word', rtl: true,
      options: shuffle([w, ...others]).map(x => ({ html: `<span class="ar" style="font-size:36px">${x.t}</span>`, ok: x.t === w.t })) };
  }
};
function single(u) { return !u.shadda && !u.tanween && !u.wasl && [u.fatha, u.kasra, u.damma].filter(Boolean).length === 1 && u.m.length <= 2; }
function tapQ(say, why, target) {
  const w = choose(words(w => { const us = analyse(w.t); const n = us.filter(target).length; return n >= 1 && n < us.length; }));
  if (!w) return null;
  return { kind: 'tap', say, why, word: w.t, ref: w.r, target };
}

// ---------- units ----------
const story = (say, show) => ({ type: 'story', say, show });
const slide = t => ({ type: 'slide', word: nfix(t), ref: refOf(t) });

export const SECTIONS = [
  { id: 'join', title: 'Letter joining', ar: 'بِرَبِّ', color: '#8E6CC9', ready: true, units: [
    { id: 'j1', title: 'Letters hold hands', ar: 'بِرَبِّ', gens: ['hand', 'tapNoHand', 'tapNoHand'],
      story: () => [
        story('j1_a', card('بِرَبِّ')),
        story('j1_b', tiles([tile('ب', true), tile('ل', true), tile('م', true)])),
        story('j1_c', tiles(NOHAND.map(c => tile(c, false)))),
        story('j1_d', tiles([tile('ر', false), tile('ب', null, 'blue')]) + card('رَبِّ', 'ar-l')),
        story('j1_e', tiles([tile('بـ', true), tile('ر', false), tile('ب', null, 'blue')]) + card('بِرَبِّ', 'ar-l')),
        slide('بِرَبِّ')] },
    { id: 'j2', title: 'One letter, four shapes', ar: 'بـ ـبـ ـب', gens: ['shape'],
      story: () => [story('j2_a', shapeRow('ب')), story('j2_b', shapeRow('ب')), story('j2_c', shapeRow('ن')), story('j2_d', shapeRow('م')), slide('خَلَقَ')] },
    { id: 'j3', title: 'Same body, different dots', ar: 'بـ تـ ثـ', gens: ['dots'],
      story: () => [
        story('j3_a', tiles(['بـ', 'تـ', 'ثـ', 'نـ', 'يـ'].map(c => tile(c)))),
        story('j3_b', tiles(['ج', 'ح', 'خ'].map(c => tile(c)))),
        story('j3_c', tiles(['س', 'ش'].map(c => tile(c))) + '<div style="height:10px"></div>' + tiles(['ص', 'ض', 'ط', 'ظ'].map(c => tile(c)))),
        slide('ٱلۡخَنَّاسِ')] },
    { id: 'j4', title: 'Tricky shapes', ar: 'هـ ـهـ ـه', gens: [['shape', ['ه', 'ع', 'غ', 'ك']], 'laamalif'],
      story: () => [story('j4_a', shapeRow('ه')), story('j4_b', shapeRow('ع')), story('j4_c', card('لا') + (laWord() ? card(laWord(), 'ar-l') : '')), story('j4_d', card('ة') + card('ٱلۡقَارِعَةُ', 'ar-l'))] },
    { id: 'j5', title: 'Words in pieces', ar: 'ٱلنَّاسِ', gens: ['pieces'],
      story: () => [story('j5_a', piecesView('ٱلنَّاسِ')), story('j5_b', card('ٱلنَّاسِ')), slide('ٱلنَّاسِ')] }
  ] },
  { id: 'signs', title: 'Vowels and signs', ar: 'قُلۡ', color: '#2E6FD0', ready: true, units: [
    { id: 's1', title: 'Short vowels', ar: 'بَ بِ بُ', gens: ['vowel'],
      story: () => [story('s1_a', marks([['بَ', 'a']])), story('s1_b', marks([['بِ', 'i'], ['بَ', 'a']])), story('s1_c', marks([['بُ', 'u'], ['بِ', 'i'], ['بَ', 'a']])), slide('خَلَقَ')] },
    { id: 's2', title: 'Sukun: stop', ar: 'قُلۡ', gens: ['tapSukun'],
      story: () => [story('s2_a', marks([['لۡ', 'stop']])), story('s2_b', card('قُلۡ')), slide('قُلۡ'), story('s2_c', marks([['لۡ', 'stop'], ['اْ', 'not read']]))] },
    { id: 's3', title: 'Shadda: hold', ar: 'رَبِّ', gens: ['tapShadda'],
      story: () => [story('s3_a', marks([['بّ', 'hold']])), slide('بِرَبِّ')] },
    { id: 's4', title: 'Long vowels: stretch', ar: 'ٱلنَّاسِ', gens: ['tapLong', 'tapLong', 'listen'],
      story: () => [story('s4_a', card('ٱلنَّاسِ')), story('s4_b', marks([['بَا', 'aa'], ['بُو', 'oo'], ['بِي', 'ee']])), story('s4_c', marks([['بَٰ', 'aa'], ['هُۥ', 'oo'], ['هِۦ', 'ee']]) + card('إِلَٰهِ', 'ar-l')), slide('أَعُوذُ'), slide('إِلَٰهِ')] },
    { id: 's5', title: 'Tanween: add n', ar: 'أَحَدٌ', gens: ['tanween'],
      story: () => [story('s5_a', marks([['بٌ', 'un'], ['بٍ', 'in'], ['بً', 'an']])), story('s5_b', card('أَحَدٌ')), slide('أَحَدٌ')] },
    { id: 's6', title: 'Quiet letters', ar: 'ٱلنَّاسِ', gens: ['tapQuiet'],
      story: () => [story('s6_a', card('ٱلنَّاسِ')), story('s6_b', card('بِرَبِّ <span style="color:var(--blue)">ٱ</span>لنَّاسِ', 'ar-l')), story('s6_c', card(quietLaam())), slide('ٱلنَّاسِ'), story('s6_d', card(circleWord() || 'قَالُواْ'))] }
  ] },
  { id: 'marks', title: 'Mushaf marks', ar: 'ٱلۡ', soon: true, units: [] },
  { id: 'sun', title: 'Sun and moon letters', ar: 'ٱلشَّمۡسِ', soon: true, units: [] },
  { id: 'noon', title: 'Noon and Meem rules', ar: 'مِن شَرِّ', soon: true, units: [] },
  { id: 'qalq', title: 'Qalqalah: the bounce', ar: 'ٱلۡفَلَقِ', soon: true, units: [] },
  { id: 'heavy', title: 'Heavy and light', ar: 'رَبِّ', soon: true, units: [] },
  { id: 'madd', title: 'Madd: stretching', ar: 'جَآءَ', soon: true, units: [] }
];
export const UNITS = SECTIONS.flatMap(s => s.units.map(u => ({ ...u, sec: s.id })));
export const unitById = id => UNITS.find(u => u.id === id);

function laWord() { const w = BANK.find(w => w.f.includes('laamalif') && w.len <= 5); return w && w.t; }
function quietLaam() {
  return wordSpans('ٱلنَّاسِ').replace('data-i="1"', 'data-i="1" style="color:var(--blue)"');
}
function circleWord() { const w = BANK.find(w => analyse(w.t).some(u => u.silentMark) && w.len <= 6); return w && w.t; }
function piecesView(t) {
  const ps = pieces(t).map(p => p.map(u => u.s).join(''));
  return `<div class="wordcard"><div class="ar ar-xl" style="display:flex;gap:26px;justify-content:center">${ps.map((p, i) => `<span class="pop" style="animation-delay:${i * .25}s;color:${i % 2 ? 'var(--blue)' : 'var(--ink)'}">${p}</span>`).join('')}</div><div class="ref">${ps.length} pieces, one word</div></div>`;
}

// Make one question for a unit.
export function questionFor(unitId) {
  const u = unitById(unitId);
  for (let k = 0; k < 6; k++) {
    let g = pick(u.gens), arg;
    if (Array.isArray(g)) [g, arg] = g;
    const q = G[g](arg);
    if (q) { q.unit = unitId; return q; }
  }
  return null;
}
export function questionsFor(unitIds, n) {
  const out = []; let guard = 0;
  while (out.length < n && guard++ < n * 6) {
    const q = questionFor(unitIds[out.length % unitIds.length]);
    if (q && !out.some(x => x.word && x.word === q.word && x.say === q.say)) out.push(q);
  }
  return out;
}
// A quiz question built from a word the child got wrong before.
export function reviewQuestion(item) {
  for (let k = 0; k < 8; k++) { const q = questionFor(item.unit); if (q && q.word === item.t) return q; }
  return questionFor(item.unit);
}

export function listenQuestion() { return G.listen(); }
