import { analyse } from './arabic.js';
import { speak, text, stopVoice } from './voice.js';
import * as audio from './audio.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = a => a[Math.random() * a.length | 0];
export const wait = ms => new Promise(r => setTimeout(r, ms));

export const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></svg>',
  spk: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  teacher: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5"/></svg>',
  slide: '<svg viewBox="0 0 24 24"><path d="M20 12H4M9 7l-5 5 5 5"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/></svg>'
};

// Hilal: a friendly crescent moon guide (no face).
export const HILAL = '<svg viewBox="0 0 40 40"><path d="M25 5a15 15 0 1 0 10 25A12 12 0 1 1 25 5z" fill="#E2B33C"/><path d="M31 9l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#3F7D20"/></svg>';

// Render a Quran word as letter units so letters can be lit one by one while
// the whole word stays correctly joined.
export function wordSpans(word, cls = '') {
  return analyse(word).map(u => `<span class="u ${cls}" data-i="${u.i}">${u.s}</span>`).join('');
}

// Tutor bubble. Lines are ids from lines.js (shown on screen, voiced when a recording exists).
export function tutor(id, extra = '') {
  const el = h(`<div class="tutor"><div class="face">${HILAL}</div><div class="bubble"><button class="spk" aria-label="Hear again">${ICON.spk}</button><span class="say"></span>${extra}</div></div>`);
  setSay(el, id);
  el.querySelector('.spk').onclick = () => talk(el, el.dataset.id);
  return el;
}
export function setSay(el, id, vars = {}) {
  el.dataset.id = id;
  let t = text(id);
  for (const k in vars) t = t.replace(`{${k}}`, vars[k]);
  el.querySelector('.say').innerHTML = t;
  return talk(el, id);
}
async function talk(el, id) {
  el.classList.add('talking');
  await speak(id);
  el.classList.remove('talking');
}

export function toast(msg) {
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  document.body.append(t); setTimeout(() => t.remove(), 2200);
}
export function confetti() {
  const c = h('<div class="confetti"></div>');
  const col = ['#3F7D20', '#E2B33C', '#2E6FD0', '#C8102E', '#8E1BA8'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%'; p.style.background = col[i % col.length];
    p.style.animationDelay = Math.random() * .5 + 's';
    c.append(p);
  }
  document.body.append(c); setTimeout(() => c.remove(), 2400);
}
export function starsHTML(n) {
  return `<span class="stars">${[0, 1, 2].map(i => i < n ? '★' : '<span class="off">★</span>').join('')}</span>`;
}

// The letter-by-letter slide (Sedra style): full word on top, the same word below
// lighting up right to left, pausing on letters that need care.
export function slideCard(word, ref, opts = {}) {
  const us = analyse(word);
  const el = h(`<div class="slide" style="width:100%;max-width:560px">
    <div class="wordcard"><div class="ar ar-l">${word}</div></div>
    <div class="dots-sep">⋮</div>
    <div class="wordcard"><div class="ar ar-xl rev">${wordSpans(word, 'wait')}</div>
      <div class="note" style="min-height:34px"></div>
      ${ref ? `<div class="ref">${refLabel(ref)}</div>` : ''}</div>
    <div class="row c" style="margin-top:10px">
      <button class="btn play">${ICON.play} Play</button>
      <button class="btn step">${ICON.next} Next letter</button>
      ${ref ? `<button class="btn hus">${ICON.spk} Husary</button>` : ''}
    </div></div>`);
  let pos = -1, timer = null;
  const spans = [...el.querySelectorAll('.rev .u')];
  const note = el.querySelector('.note');
  function draw() {
    spans.forEach((s, k) => s.className = 'u ' + (pos >= us.length ? 'now' : k < pos ? 'done' : k === pos ? 'now' : 'wait'));
    note.innerHTML = pos >= 0 && pos < us.length ? unitPills(us[pos]) : '';
  }
  async function step() {
    if (pos >= us.length) return false;
    pos++; draw();
    if (pos >= us.length) { if (ref) await audio.playWord(ref); opts.onDone && opts.onDone(); return false; }
    return true;
  }
  async function play() {
    clearTimeout(timer); audio.stop(); pos = -1; draw();
    const go = async () => {
      const more = await step();
      if (more) timer = setTimeout(go, us[pos] && unitPills(us[pos]) ? 1700 : 1000);
    };
    timer = setTimeout(go, 300);
  }
  el.querySelector('.play').onclick = play;
  el.querySelector('.step').onclick = () => { clearTimeout(timer); step(); };
  const hb = el.querySelector('.hus'); if (hb) hb.onclick = () => audio.playWord(ref);
  el.play = play;
  draw();
  if (opts.auto) setTimeout(play, 500);
  return el;
}
export function unitPills(u) {
  const p = [];
  if (u.quiet || (u.silentMark)) p.push('<span class="pill pill-soft">Quiet: not read</span>');
  else if (u.shadda) p.push('<span class="pill pill-brown">Hold: shadda</span>');
  if (u.sukun) p.push('<span class="pill pill-mint">Stop: sukun</span>');
  if (u.madd || u.dagger || u.smallWawYa) p.push('<span class="pill pill-blue">Stretch 2</span>');
  if (u.tanween) p.push('<span class="pill pill-gold">Add “n”</span>');
  return p.join(' ');
}

let SURAHS = null;
audio.getIndex().then(i => SURAHS = i.surahs);
export function refLabel(ref) {
  const s = SURAHS && SURAHS[ref[0] - 1];
  return `${s ? s.en : 'Surah ' + ref[0]} ${ref[1]}`;
}

export function stopAll() { audio.stop(); stopVoice(); }
