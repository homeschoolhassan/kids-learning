// Quran data loading and Sheikh Husary audio.
// Murattal chapter audio has word timings, so single words can be played in his voice.
// The teaching recitation (Al-Muallim, slow with repetition) is played per ayah.
const cache = new Map();
let index = null;
export async function getIndex() {
  if (!index) index = await (await fetch('data/index.json')).json();
  return index;
}
export async function getSurah(c) {
  if (!cache.has(c)) cache.set(c, fetch(`data/s/${String(c).padStart(3, '0')}.json`).then(r => r.json()));
  return cache.get(c);
}
let wordbank = null;
export async function getWordbank() {
  if (!wordbank) wordbank = await (await fetch('data/wordbank.json')).json();
  return wordbank;
}

const el = new Audio();
el.preload = 'auto';
let stopAt = null, onTick = null, endCb = null, raf = 0, token = 0;
function loop() {
  if (stopAt != null && el.currentTime * 1000 >= stopAt) { finish(); return; }
  onTick && onTick(el.currentTime * 1000);
  raf = requestAnimationFrame(loop);
}
function finish() {
  cancelAnimationFrame(raf); el.pause();
  const cb = endCb; stopAt = null; onTick = null; endCb = null;
  cb && cb();
}
el.addEventListener('ended', finish);
export function stop() { token++; if (endCb || !el.paused) finish(); }
export const playing = () => !el.paused;

async function playRange(src, from, to, tick) {
  stop();
  const my = ++token;
  if (el.src !== src) { el.src = src; }
  const ok = await new Promise(r => {
    if (el.readyState >= 1) return r(true);
    const t = setTimeout(() => r(false), 6000);
    el.addEventListener('loadedmetadata', () => { clearTimeout(t); r(true); }, { once: true });
    el.addEventListener('error', () => { clearTimeout(t); r(false); }, { once: true });
  });
  if (my !== token || !ok) return;
  el.currentTime = from / 1000;
  stopAt = to; onTick = tick;
  return new Promise(res => {
    endCb = res;
    el.play().then(() => { raf = requestAnimationFrame(loop); }).catch(() => finish());
  });
}

// Play one word in Husary's voice. ref = [surah, ayah, wordPosition(1-based)]
export async function playWord(ref) {
  const s = await getSurah(ref[0]);
  const v = s.v[ref[1] - 1]; if (!v) return;
  const seg = v.sg.find(x => x[0] === ref[2]);
  if (!seg) return playRange(s.audio, v.a[0], v.a[1]);
  return playRange(s.audio, seg[1], seg[2] + 120);
}

// Play a full ayah (murattal) with a callback(wordPos) as each word is recited.
export async function playAyah(c, n, onWord) {
  const s = await getSurah(c);
  const v = s.v[n - 1];
  let cur = 0;
  return playRange(s.audio, v.a[0], v.a[1], t => {
    const seg = v.sg.find(x => t >= x[1] && t < x[2]);
    const w = seg ? seg[0] : 0;
    if (w !== cur) { cur = w; onWord && onWord(w); }
  }).then(() => onWord && onWord(0));
}

// Teaching recitation (slow, ayah by ayah).
export function playTeacher(c, n) {
  const src = `https://everyayah.com/data/Husary_Muallim_128kbps/${String(c).padStart(3, '0')}${String(n).padStart(3, '0')}.mp3`;
  stop();
  const my = ++token;
  el.src = src;
  return new Promise(res => {
    endCb = res;
    el.play().then(() => { if (my === token) raf = requestAnimationFrame(loop); }).catch(() => finish());
  });
}
