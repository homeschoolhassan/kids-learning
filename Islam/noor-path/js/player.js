// Runs a sequence of steps: story, slide, question (pick / tap), read.
import { analyse } from './arabic.js';
import { h, tutor, setSay, wordSpans, slideCard, ICON, pick, confetti, starsHTML, wait, stopAll, refLabel } from './ui.js';
import * as audio from './audio.js';
import * as store from './store.js';
import { readAyahView } from './reader.js';

const GOOD = ['good1', 'good2', 'good3', 'good4'];

export function runSteps(view, { title, steps, labels, onFinish, onExit }) {
  let i = 0, right = 0, total = 0; const per = {};
  view.innerHTML = '';
  document.body.classList.add('focus');
  const root = h(`<div class="player">
    <div class="navrow"><button class="btn icon exit" aria-label="Close">${ICON.close}</button><div style="flex:1"><div class="progress"></div>${labels ? `<div class="steps-lbl">${labels.map(l => `<span>${l}</span>`).join('')}</div>` : ''}</div></div>
    <div class="tut"></div><div class="stage"></div>
    <div class="feedback"></div>
    <div class="navrow"><button class="btn icon prev" aria-label="Back">${ICON.back}</button><button class="btn big primary nxt">Next ${ICON.next}</button></div>
  </div>`);
  view.append(root);
  const T = tutor('hello'); root.querySelector('.tut').append(T);
  const stage = root.querySelector('.stage'), fb = root.querySelector('.feedback');
  const nxt = root.querySelector('.nxt'), prev = root.querySelector('.prev');
  root.querySelector('.exit').onclick = () => { stopAll(); onExit && onExit(); };
  prev.onclick = () => { if (i > 0) { i--; show(); } };
  nxt.onclick = () => { if (nxt.dataset.lock) return; i++; i < steps.length ? show() : finish(); };

  function bar() {
    root.querySelector('.progress').innerHTML = steps.map((_, k) => `<span class="${k < i ? 'd' : k === i ? 'n' : ''}"></span>`).join('');
  }
  function lock(on) { if (on) { nxt.dataset.lock = 1; nxt.style.opacity = .4; } else { delete nxt.dataset.lock; nxt.style.opacity = 1; } }

  function show() {
    stopAll(); bar(); fb.textContent = ''; fb.className = 'feedback'; stage.innerHTML = ''; lock(false);
    prev.style.visibility = i ? 'visible' : 'hidden';
    const s = steps[i];
    if (s.type === 'story') { setSay(T, s.say); stage.append(h(`<div style="width:100%;display:flex;flex-direction:column;gap:12px;align-items:center">${s.show}</div>`)); }
    else if (s.type === 'slide') { setSay(T, s.say || 'j1_f'); stage.append(slideCard(s.word, s.ref, { auto: true })); }
    else if (s.type === 'q') question(s.q);
    else if (s.type === 'read') { setSay(T, 'read_intro'); stage.append(readAyahView(s.c, s.v, { onSaid: id => setSay(T, id) })); }
  }

  function question(q) {
    lock(true);
    window.__q = q; // used by automated checks
    setSay(T, q.say);
    let first = true, solved = false;
    const done = async (ok, el) => {
      if (solved) return;
      if (first) { total++; if (ok) right++; const p = (per[q.unit] ||= { right: 0, total: 0 }); p.total++; if (ok) p.right++; store.answer(ok, q.word, q.unit, q.ref); first = false; }
      if (ok) {
        solved = true;
        fb.textContent = '✓'; fb.className = 'feedback good';
        setSay(T, pick(GOOD));
        lock(false);
        if (q.ref) { await wait(300); await Promise.race([audio.playWord(q.ref), wait(4000)]); }
        await wait(500); if (steps[i] && steps[i].q === q) nxt.click();
      } else {
        fb.className = 'feedback try';
        setSay(T, q.why);
      }
    };
    if (q.kind === 'pick') {
      const wrap = h(`<div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:14px">${q.show || ''}${q.autoplay ? `<button class="btn big again">${ICON.spk} Listen</button>` : ''}<div class="opts" ${q.rtl ? 'dir="rtl"' : ''}></div></div>`);
      const opts = wrap.querySelector('.opts');
      q.options.forEach(o => {
        const b = h(`<button class="opt">${o.html}</button>`);
        b.onclick = () => { if (solved) return; b.classList.add(o.ok ? 'ok' : 'no'); if (!o.ok) setTimeout(() => b.classList.remove('no'), 900); done(o.ok, b); };
        opts.append(b);
      });
      if (q.autoplay) { const a = wrap.querySelector('.again'); a.onclick = () => audio.playWord(q.autoplay); setTimeout(() => audio.playWord(q.autoplay), 600); }
      stage.append(wrap);
    } else if (q.kind === 'tap') {
      const us = analyse(q.word);
      const card = h(`<div class="wordcard" style="width:100%;max-width:560px"><div class="ar ar-xl">${wordSpans(q.word, 'tapable')}</div><div class="ref">${q.ref ? refLabel(q.ref) : ''}</div></div>`);
      card.querySelectorAll('.u').forEach(sp => sp.onclick = () => {
        if (solved) return;
        const u = us[+sp.dataset.i];
        const ok = q.target(u, us);
        sp.classList.add(ok ? 'right' : 'wrong');
        if (!ok) setTimeout(() => sp.classList.remove('wrong'), 900);
        done(ok, sp);
      });
      const strip = h(`<div dir="rtl" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px">${us.map(u => `<button class="opt ar" data-i="${u.i}" style="min-width:58px;min-height:70px;font-size:38px;line-height:1.4;padding:0 8px">${u.s}</button>`).join('')}</div>`);
      strip.querySelectorAll('.opt').forEach(b => b.onclick = () => {
        if (solved) return;
        const u = us[+b.dataset.i]; const ok = q.target(u, us);
        b.classList.add(ok ? 'ok' : 'no'); card.querySelector(`.u[data-i="${u.i}"]`).classList.add(ok ? 'right' : 'wrong');
        if (!ok) setTimeout(() => { b.classList.remove('no'); card.querySelector(`.u[data-i="${u.i}"]`).classList.remove('wrong'); }, 900);
        done(ok, b);
      });
      stage.append(card);
      stage.append(h(`<div class="small muted center">Tap the letter in the word, or below</div>`));
      stage.append(strip);
    }
  }

  function finish() {
    stopAll();
    const pct = total ? right / total : 1;
    onFinish && onFinish({ right, total, per });
    stage.innerHTML = '';
    bar();
    root.querySelector('.progress').innerHTML = steps.map(() => '<span class="d"></span>').join('');
    if (pct >= .8) confetti();
    setSay(T, pct >= .8 ? 'lesson_done' : 'lesson_done_low');
    stage.append(h(`<div class="center"><div style="font-size:64px">${pct >= .8 ? '🌙' : '🌱'}</div><h2>${title}</h2>${total ? `<p class="muted">${right} of ${total} right the first time</p>` : ''}</div>`));
    prev.style.visibility = 'hidden';
    nxt.innerHTML = 'Done';
    nxt.onclick = () => onExit && onExit();
  }
  show();
}
