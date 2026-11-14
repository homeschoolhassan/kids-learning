// Progress kept in this browser (localStorage) plus recordings in IndexedDB.
const KEY = 'noorpath.v1';
const today = () => new Date().toLocaleDateString('en-CA');
export { today };

const fresh = () => ({
  v: 1, created: today(), name: '',
  placement: null,           // {date, results:{unitId:score}}
  units: {},                 // unitId: {days:[date...], tries, right, placed}
  weak: {},                  // word text: {ref, unit, due, box}
  days: {},                  // date: {right, wrong, mins, done:{lesson,read,quiz,review}}
  reading: { c: 114, v: 1 }, // next ayah to read in the Reading path
  readDone: {},              // "c:v": date first read with recording
  quizzes: [],               // {date, kind, score, total}
  settings: { tajweed: true, slow: false }
});

let S;
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = fresh(); }
export const state = () => S;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
export function reset() { S = fresh(); save(); }
export function importState(obj) { S = Object.assign(fresh(), obj); save(); }

export function day(d = today()) {
  return (S.days[d] ||= { right: 0, wrong: 0, mins: 0, done: {} });
}
export function unitRec(id) { return (S.units[id] ||= { days: [], tries: 0, right: 0 }); }

// A star is earned on a day the child scores 80% or better in a unit.
export function recordUnitScore(id, right, total) {
  const u = unitRec(id);
  u.tries += total; u.right += right;
  if (total && right / total >= 0.8 && !u.days.includes(today())) u.days.push(today());
  save();
}
export const stars = id => {
  const u = S.units[id]; if (!u) return 0;
  return u.placed ? 3 : Math.min(3, u.days.length);
};
export const isGold = id => stars(id) >= 3;
export function totalStars() { return Object.keys(S.units).reduce((a, k) => a + stars(k), 0); }

export function answer(ok, word, unitId, ref) {
  const d = day();
  ok ? d.right++ : d.wrong++;
  if (word) {
    const w = S.weak[word];
    if (!ok) S.weak[word] = { ref, unit: unitId, box: 0, due: today() };
    else if (w) { w.box++; const dt = new Date(); dt.setDate(dt.getDate() + [1, 3, 7][Math.min(w.box - 1, 2)]); w.due = dt.toLocaleDateString('en-CA'); if (w.box >= 3) delete S.weak[word]; }
  }
  save();
}
export function dueWeak() {
  const t = today();
  return Object.entries(S.weak).filter(([, w]) => w.due <= t).map(([t, w]) => ({ t, ...w }));
}
export function markDone(key) { day().done[key] = true; save(); }

// Minutes of use per day (counted while the page is visible).
let last = Date.now();
setInterval(() => {
  if (document.visibilityState === 'visible') { day().mins += (Date.now() - last) / 60000; save(); }
  last = Date.now();
}, 30000);

// ---- recordings (IndexedDB) ----
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('noorpath', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec', { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function addRecording(rec) {
  const d = await db();
  return new Promise(res => { const tx = d.transaction('rec', 'readwrite'); tx.objectStore('rec').add(rec).onsuccess = e => res(e.target.result); });
}
export async function listRecordings() {
  const d = await db();
  return new Promise(res => { const r = d.transaction('rec').objectStore('rec').getAll(); r.onsuccess = () => res(r.result.reverse()); });
}
export async function updateRecording(rec) {
  const d = await db();
  return new Promise(res => { d.transaction('rec', 'readwrite').objectStore('rec').put(rec).onsuccess = res; });
}
export async function deleteRecording(id) {
  const d = await db();
  return new Promise(res => { d.transaction('rec', 'readwrite').objectStore('rec').delete(id).onsuccess = res; });
}
