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
// Phones and tablets (especially iPad/iPhone) only allow sound after a tap.
// Unlock the player on the very first tap so later Husary playback is allowed.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlock() {
  document.removeEventListener('pointerdown', unlock, true);
  if (el.src) return;
  el.src = SILENT; el.play().then(() => { if (el.src === SILENT) el.pause(); }).catch(() => {});
}
document.addEventListener('pointerdown', unlock, true);
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
// opts.rate slows Husary down (pitch is kept); opts.onProgress(0..1) reports how far
// through the word he is, so letters can light up in step with his voice.
export async function playWord(ref, opts = {}) {
  const s = await getSurah(ref[0]);
  const v = s.v[ref[1] - 1]; if (!v) return;
  const seg = v.sg.find(x => x[0] === ref[2]);
  const from = seg ? seg[1] : v.a[0], to = seg ? seg[2] + 120 : v.a[1];
  el.defaultPlaybackRate = el.playbackRate = opts.rate || 1;
  el.preservesPitch = true;
  const tick = opts.onProgress ? t => opts.onProgress(Math.min(1, Math.max(0, (t - from) / (to - 120 - from)))) : null;
  await playRange(s.audio, from, to, tick);
  el.defaultPlaybackRate = el.playbackRate = 1;
}

// Play a full ayah (murattal) with a callback(wordPos) as each word is recited.
export async function playAyah(c, n, onWord) {
  el.defaultPlaybackRate = el.playbackRate = 1;
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
