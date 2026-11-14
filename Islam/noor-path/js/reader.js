// Reading an ayah: Husary (murattal with word highlight, or teaching recitation),
// tap a word to slide it letter by letter, and record yourself.
import { h, ICON, slideCard, refLabel, toast, stopAll } from './ui.js';
import * as audio from './audio.js';
import * as store from './store.js';

const TAJ = seg => Array.isArray(seg) ? `<span class="t-${seg[1]}">${seg[0]}</span>` : seg;
export const wordHTML = (w, taj) => taj && w.j ? w.j.map(TAJ).join('') : w.t;

export function openWordSheet(word, ref) {
  stopAll();
  const scrim = h('<div class="scrim"></div>');
  const sh = h(`<div class="sheet"><div class="navrow" style="margin-bottom:6px"><span class="muted small">${ref ? refLabel(ref) : ''}</span><button class="btn icon x" aria-label="Close">${ICON.close}</button></div></div>`);
  const close = () => { stopAll(); scrim.remove(); sh.remove(); };
  scrim.onclick = close; sh.querySelector('.x').onclick = close;
  sh.append(slideCard(word, ref, { auto: true }));
  document.body.append(scrim, sh);
}

// --- recorder ---
let rec = null, chunks = [], stream = null;
async function startRec() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
  rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  chunks = [];
  rec.ondataavailable = e => chunks.push(e.data);
  rec.start();
}
function stopRec() {
  return new Promise(res => {
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); rec = null; };
    rec.stop();
  });
}
export async function recordButton(meta, onSaved) {
  const b = h(`<button class="btn rec">${ICON.mic} Record</button>`);
  let on = false, t0 = 0;
  b.onclick = async () => {
    if (!on) {
      try { stopAll(); await startRec(); } catch { toast('Please allow the microphone to record.'); return; }
      on = true; t0 = Date.now(); b.classList.add('on'); b.innerHTML = `${ICON.stop} Stop`;
    } else {
      on = false; b.classList.remove('on'); b.innerHTML = `${ICON.mic} Record again`;
      const blob = await stopRec();
      const r = { ...meta, date: store.today(), time: Date.now(), secs: Math.round((Date.now() - t0) / 1000), blob, status: 'new' };
      r.id = await store.addRecording(r);
      onSaved && onSaved(r);
    }
  };
  return b;
}

export function readAyahView(c, n, { onSaid } = {}) {
  const el = h(`<div style="width:100%;display:flex;flex-direction:column;gap:12px;align-items:center">
    <div class="wordcard" style="width:100%"><div class="ar ar-l ayah" style="line-height:2.3"></div><div class="ref"></div></div>
    <div class="row c ctl"></div><div class="row c mine"></div></div>`);
  const ay = el.querySelector('.ayah');
  audio.getSurah(c).then(async s => {
    const v = s.v[n - 1];
    const taj = store.state().settings.tajweed;
    ay.innerHTML = v.w.map((w, k) => `<span class="wd" data-k="${k + 1}" style="cursor:pointer;border-radius:10px;padding:0 4px">${wordHTML(w, taj)}</span>`).join(' ') + ` <span style="color:var(--green)">${toArabicNum(n)}</span>`;
    if (!taj) ay.classList.add('notaj');
    el.querySelector('.ref').textContent = refLabel([c, n]);
    ay.querySelectorAll('.wd').forEach(sp => sp.onclick = () => openWordSheet(v.w[sp.dataset.k - 1].t, [c, n, +sp.dataset.k]));
    const ctl = el.querySelector('.ctl');
    const hl = k => ay.querySelectorAll('.wd').forEach(sp => sp.style.background = +sp.dataset.k === k ? 'var(--gold-2)' : '');
    const p = h(`<button class="btn primary">${ICON.play} Husary</button>`); p.onclick = () => audio.playAyah(c, n, hl);
    const t = h(`<button class="btn">${ICON.teacher} Slow teacher</button>`); t.onclick = () => audio.playTeacher(c, n);
    ctl.append(p, t, await recordButton({ c, v: n }, r => {
      store.state().readDone[`${c}:${n}`] ||= store.today(); store.save();
      onSaid && onSaid('read_saved');
      const mine = el.querySelector('.mine'); mine.innerHTML = '';
      const url = URL.createObjectURL(r.blob);
      const me = h(`<button class="btn">${ICON.spk} My reading</button>`); me.onclick = () => { stopAll(); new Audio(url).play(); };
      const hus = h(`<button class="btn">${ICON.spk} Husary</button>`); hus.onclick = () => audio.playAyah(c, n, hl);
      mine.append(me, hus);
    }));
  });
  return el;
}
export const toArabicNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
