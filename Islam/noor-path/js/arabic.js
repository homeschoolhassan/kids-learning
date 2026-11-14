// Arabic analysis helpers for Madani (KFGQPC Hafs) text.
// Works on grapheme units: one base letter plus its marks.

export const MARK = /[ً-ٰٟۖ-ࣰۭ-ࣳ]/;
export const SHADDA = 'ّ';
// KFGQPC Hafs encoding: U+06E1 is the Madani sukun; U+0652 draws the small rounded
// zero on a letter that is never read.
export const SUKUN = /\u06E1/;
export const FATHA = 'َ', KASRA = 'ِ', DAMMA = 'ُ';
export const TANWEEN = /[ًٌٍٖٞٗ]/;
// KFGQPC Hafs open (staggered) tanween: U+0657 = an, U+0656 = in, U+065E = un.
export const TANWEEN_FATH = /[\u064B\u0657]/, TANWEEN_KASR = /[\u064D\u0656]/, TANWEEN_DAMM = /[\u064C\u065E]/;
export const DAGGER = 'ٰ';
export const SMALL_WAW = 'ۥ', SMALL_YA = 'ۦ';
export const SILENT_CIRCLE = /[\u06DF\u0652]/;
export const MADDAH = 'ٓ';
export const WASL = 'ٱ';

// Letters that never join to the letter after them (no "hand" on the left).
const NO_FORWARD = new Set('اأإآٱدذرزوؤءة'.split(''));
// Letters that don't join on either side.
const NO_JOIN = new Set(['ء']);
// Small spacing letters behave like marks for joining.
const LIKE_MARK = new Set([SMALL_WAW, SMALL_YA, 'ـ']);

export const LETTER_NAME = {
  'ا':'Alif','أ':'Alif','إ':'Alif','آ':'Alif','ٱ':'Alif','ب':'Baa','ت':'Taa','ث':'Thaa','ج':'Jeem','ح':'Haa','خ':'Khaa',
  'د':'Daal','ذ':'Dhaal','ر':'Raa','ز':'Zay','س':'Seen','ش':'Sheen','ص':'Saad','ض':'Daad','ط':'Taa (heavy)','ظ':'Dhaa',
  'ع':'Ayn','غ':'Ghayn','ف':'Faa','ق':'Qaaf','ك':'Kaaf','ل':'Laam','م':'Meem','ن':'Noon','ه':'Haa (soft)','و':'Waaw',
  'ي':'Yaa','ى':'Yaa','ء':'Hamza','ؤ':'Waaw','ئ':'Yaa','ة':'Taa'
};
// The basic letter a unit is built on (hamza seats map to their seat letter).
export function baseOf(ch) {
  return ({'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ؤ':'و','ئ':'ي','ى':'ي'})[ch] || ch;
}

export function units(word) {
  const out = [];
  for (const ch of word) {
    if (out.length && (MARK.test(ch) || LIKE_MARK.has(ch))) out[out.length - 1].m += ch;
    else out.push({ b: ch, m: '' });
  }
  return out.map(u => ({ ...u, s: u.b + u.m }));
}

export const joinsForward = b => !NO_FORWARD.has(b) && !NO_JOIN.has(b);
export const joinsBack = b => !NO_JOIN.has(b);

// Returns analysed units with position: 'start' | 'middle' | 'end' | 'alone'
export function analyse(word) {
  const us = units(word);
  us.forEach((u, i) => {
    const prev = us[i - 1], next = us[i + 1];
    const fromPrev = !!prev && joinsForward(prev.b) && joinsBack(u.b);
    const toNext = !!next && joinsForward(u.b) && joinsBack(next.b);
    u.pos = fromPrev ? (toNext ? 'middle' : 'end') : (toNext ? 'start' : 'alone');
    u.i = i;
    u.shadda = u.m.includes(SHADDA);
    u.sukun = SUKUN.test(u.m);
    u.tanween = TANWEEN.test(u.m);
    u.fatha = u.m.includes(FATHA); u.kasra = u.m.includes(KASRA); u.damma = u.m.includes(DAMMA);
    u.dagger = u.m.includes(DAGGER);
    u.smallWawYa = u.m.includes(SMALL_WAW) || u.m.includes(SMALL_YA);
    u.silentMark = SILENT_CIRCLE.test(u.m);
    u.maddah = u.m.includes(MADDAH);
    u.wasl = u.b === WASL;
    u.bare = u.m === '';
  });
  // Long-vowel letters (Madani: bare letter after the matching short vowel).
  us.forEach((u, i) => {
    const p = us[i - 1];
    if (!p || !u.bare) return;
    if (u.b === 'ا' && (p.fatha || p.tanween)) { if (p.fatha) u.madd = true; }
    if (u.b === 'و' && p.damma) u.madd = true;
    if (u.b === 'ي' && p.kasra) u.madd = true;
    if (u.b === 'ى' && (p.fatha || p.kasra)) u.madd = true; // dotless Yaa read as a stretch
  });
  // Quiet letters in reading: hamzat al-wasl, letters with the small circle,
  // a bare Laam of "al" followed by a shadda letter (sun letter).
  us.forEach((u, i) => {
    const n = us[i + 1], p = us[i - 1];
    u.quiet = u.silentMark || (u.b === 'ل' && u.bare && p && p.b === WASL && n && n.shadda);
  });
  return us;
}

// How many separate pieces a word is written in.
export function pieces(word) {
  const us = analyse(word);
  const out = [];
  us.forEach(u => {
    if (u.pos === 'start' || u.pos === 'alone') out.push([u]);
    else out[out.length - 1].push(u);
  });
  return out;
}

export function features(word) {
  const us = analyse(word);
  const f = new Set();
  us.forEach(u => {
    if (u.shadda) f.add('shadda');
    if (u.sukun) f.add('sukun');
    if (u.tanween) f.add('tanween');
    if (u.madd || u.dagger || u.smallWawYa) f.add('long');
    if (u.wasl) f.add('wasl');
    if (u.quiet) f.add('quiet');
    if (u.b === 'ل' && us[u.i + 1] && baseOf(us[u.i + 1].b) === 'ا') f.add('laamalif');
  });
  if (pieces(word).length > 1) f.add('pieces');
  return f;
}

export const SHAPE_FORMS = {
  start: b => b + 'ـ', middle: b => 'ـ' + b + 'ـ', end: b => 'ـ' + b, alone: b => b
};
export function shapeOf(b, pos) {
  if (pos === 'middle' && !joinsForward(b)) pos = 'end';
  if (pos === 'start' && !joinsForward(b)) pos = 'alone';
  return SHAPE_FORMS[pos](b);
}
