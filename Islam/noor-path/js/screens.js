import { h, tutor, setSay, ICON, starsHTML, confetti, toast, stopAll, refLabel, esc, shuffle } from './ui.js';
import * as store from './store.js';
import * as audio from './audio.js';
import { SECTIONS, UNITS, unitById, questionsFor, questionFor, reviewQuestion, listenQuestion } from './lessons.js';
import { runSteps } from './player.js';
import { analyse, features, joinsForward } from './arabic.js';
import { LINES } from './lines.js';

const FEATURE_UNIT = { pieces: 'j5', sukun: 's2', shadda: 's3', long: 's4', tanween: 's5', quiet: 's6', wasl: 's6' };
const READ_ORDER = [...Array.from({ length: 37 }, (_, i) => 114 - i), 1];
export const go = hash => { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; };

// ---------------- helpers ----------------
export const nextUnit = () => UNITS.find(u => !store.isGold(u.id)) || UNITS[UNITS.length - 1];
const learned = () => UNITS.filter(u => store.stars(u.id) > 0).map(u => u.id);

function lessonSteps(unit) {
  const st = store.state();
  const qs = questionsFor([unit.id], 6).map(q => ({ type: 'q', q }));
  return [...unit.story(), ...qs, { type: 'read', c: st.reading.c, v: st.reading.v }];
}
export function startLesson(view, id) {
  const unit = unitById(id);
  runSteps(view, {
    title: unit.title, steps: lessonSteps(unit), labels: ['Watch', 'Practise', 'Read'],
    onFinish: r => { store.recordUnitScore(id, r.right, r.total); store.markDone('lesson'); advanceReading(1); },
    onExit: () => go('#lessons')
  });
}
async function advanceReading(n) {
  const st = store.state(); const idx = await audio.getIndex();
  for (let k = 0; k < n; k++) {
    const r = st.reading;
    if (r.v < idx.surahs[r.c - 1].n) r.v++;
    else { const i = READ_ORDER.indexOf(r.c); r.c = READ_ORDER[(i + 1) % READ_ORDER.length]; r.v = 1; }
  }
  store.save();
}

// Reading block: up to 3 ayahs, with a 1-question warm-up for any foundation not yet secure.
async function readingSteps() {
  const st = store.state(); const idx = await audio.getIndex();
  const out = []; let { c, v } = st.reading; const need = new Set();
  for (let k = 0; k < 3; k++) {
    const s = await audio.getSurah(c);
    s.v[v - 1].w.forEach(w => features(w.t).forEach(f => FEATURE_UNIT[f] && need.add(FEATURE_UNIT[f])));
    out.push({ type: 'read', c, v });
    if (v < idx.surahs[c - 1].n) v++; else break;
  }
  const warm = [...need].filter(u => !store.isGold(u)).slice(0, 3).map(u => questionFor(u)).filter(Boolean).map(q => ({ type: 'q', q }));
  return { steps: [...warm, ...out], count: out.length };
}

// ---------------- Today ----------------
export async function todayScreen(view) {
  const st = store.state();
  view.innerHTML = '';
  if (!st.placement) {
    view.append(tutor('hello_new'));
    const c = h(`<div class="step"><div class="ic" style="background:var(--gold-2)">🧭</div><div class="tx"><b>Start here: what do you know?</b><span class="muted small">About 10 minutes. Skips what she knows already.</span></div><div class="chk"></div></div>`);
    c.onclick = () => placement(view);
    view.append(c);
    const skip = h(`<p class="center small"><a href="#today" class="muted">Skip and start from the beginning</a></p>`);
    skip.querySelector('a').onclick = e => { e.preventDefault(); st.placement = { date: store.today(), skipped: true }; store.save(); todayScreen(view); };
    view.append(skip);
    return;
  }
  const d = store.day();
  const allDone = ['review', 'lesson', 'read', 'quiz'].every(k => d.done[k]);
  view.append(tutor(allDone ? 'today_alldone' : 'hello'));
  const unit = nextUnit();
  const weak = store.dueWeak();
  const idx = await audio.getIndex();
  const rs = st.reading;
  const items = [
    { k: 'review', ic: '🔁', bg: 'var(--blue-2)', t: 'Warm-up', s: weak.length ? `${Math.min(weak.length, 6)} words to practise again` : 'Quick review of what you know', run: () => review(view) },
    { k: 'lesson', ic: '🌙', bg: 'var(--gold-2)', t: `Lesson: ${unit.title}`, s: `${starsHTML(store.stars(unit.id))}`, run: () => go('#lesson/' + unit.id) },
    { k: 'read', ic: '📖', bg: 'var(--green-2)', t: `Read: ${idx.surahs[rs.c - 1].en}, ayah ${rs.v}`, s: 'Listen, read and record', run: () => readNow(view) },
    { k: 'quiz', ic: '⭐', bg: 'var(--brown-2)', t: 'Quick quiz', s: '5 questions', run: () => quiz(view, 'Quick quiz', 'mixed', 5) }
  ];
  const path = h('<div class="path"></div>');
  items.forEach(it => {
    const done = d.done[it.k];
    const el = h(`<div class="step ${done ? 'done' : ''}"><div class="ic" style="background:${it.bg}">${it.ic}</div><div class="tx"><b>${esc(it.t)}</b><span class="muted small">${it.s}</span></div><div class="chk">${done ? '✓' : ''}</div></div>`);
    el.onclick = it.run;
    path.append(el);
  });
  view.append(path);
  const goal = h(`<div class="card" style="margin-top:14px"><div class="row" style="justify-content:space-between"><b>Six-month goal</b><span class="pill pill-mint">${goalPct()}% of foundations gold</span></div><div class="progress" style="margin-top:10px">${UNITS.map(u => `<span class="${store.isGold(u.id) ? 'd' : store.stars(u.id) ? 'n' : ''}"></span>`).join('')}</div><p class="small muted" style="margin:8px 0 0">Today: ${Math.round(d.mins)} min · ${d.right} right answers</p></div>`);
  view.append(goal);
}
const goalPct = () => Math.round(100 * UNITS.filter(u => store.isGold(u.id)).length / UNITS.length);

async function readNow(view) {
  const { steps, count } = await readingSteps();
  runSteps(view, { title: 'Reading', steps, onFinish: () => { store.markDone('read'); advanceReading(count); }, onExit: () => go('#today') });
}
function review(view) {
  const weak = store.dueWeak().slice(0, 6);
  let qs = weak.map(reviewQuestion).filter(Boolean);
  const pool = learned().length ? learned() : [nextUnit().id];
  if (qs.length < 4) qs = qs.concat(questionsFor(shuffle(pool), 4 - qs.length));
  runSteps(view, { title: 'Warm-up', steps: qs.map(q => ({ type: 'q', q })), onFinish: r => { store.markDone('review'); tally(r); }, onExit: () => go('#today') });
}
function tally(r) { Object.entries(r.per || {}).forEach(([u, p]) => { if (u && u !== 'undefined') store.recordUnitScore(u, p.right, p.total); }); }

function placement(view) {
  const qs = UNITS.flatMap(u => questionsFor([u.id], 2));
  const steps = [{ type: 'story', say: 'place_intro', show: '<div style="font-size:80px">🧭</div>' }, ...qs.map(q => ({ type: 'q', q }))];
  runSteps(view, {
    title: 'All done!', steps,
    onFinish: r => {
      const st = store.state();
      st.placement = { date: store.today(), results: r.per };
      Object.entries(r.per).forEach(([u, p]) => { if (p.total >= 2 && p.right === p.total) store.unitRec(u).placed = true; });
      store.save();
    },
    onExit: () => go('#today')
  });
}

// ---------------- Lessons ----------------
export function lessonsScreen(view) {
  view.innerHTML = '';
  view.append(tutor('today_intro'));
  const nu = nextUnit();
  SECTIONS.forEach(sec => {
    view.append(h(`<div class="sec-head"><h2 style="margin:0">${sec.title}</h2><div class="bar"></div>${sec.soon ? '<span class="pill pill-soft">Coming next</span>' : ''}</div>`));
    if (sec.soon) { view.append(h(`<div class="card soon"><div class="ar" style="font-size:34px;text-align:center">${sec.ar}</div></div>`)); return; }
    const g = h('<div class="grid"></div>');
    sec.units.forEach(u => {
      const n = store.stars(u.id);
      const el = h(`<div class="card tap unit ${n >= 3 ? 'gold' : ''}" ${u.id === nu.id ? 'style="border:2px solid var(--green)"' : ''}><div class="ar">${u.ar}</div><b>${u.title}</b>${starsHTML(n)}${u.id === nu.id ? '<span class="pill pill-green" style="align-self:flex-start">Best next step</span>' : ''}</div>`);
      el.onclick = () => go('#lesson/' + u.id);
      g.append(el);
    });
    view.append(g);
  });
}

// ---------------- Quiz ----------------
export function quizScreen(view) {
  view.innerHTML = '';
  view.append(tutor('quiz_intro'));
  const list = [
    { t: 'Checkpoint: Letter joining', s: '10 questions. Score 8 to turn it gold.', run: () => quiz(view, 'Letter joining checkpoint', 'join', 10) },
    { t: 'Checkpoint: Vowels and signs', s: '10 questions. Score 8 to turn it gold.', run: () => quiz(view, 'Vowels and signs checkpoint', 'signs', 10) },
    { t: 'Mixed quiz', s: 'Everything you have learned', run: () => quiz(view, 'Mixed quiz', 'mixed', 10) },
    { t: 'Listening quiz', s: 'Hear Husary, find the word', run: () => quiz(view, 'Listening quiz', 'listen', 8) },
    { t: 'Ayah challenge', s: 'Questions on a real ayah', run: () => ayahChallenge(view) }
  ];
  const p = h('<div class="path"></div>');
  list.forEach((it, k) => { const e = h(`<div class="step"><div class="ic" style="background:${['var(--gold-2)', 'var(--blue-2)', 'var(--green-2)', 'var(--brown-2)', 'var(--red-2)'][k]}">${['🧩', '✏️', '🎯', '👂', '📜'][k]}</div><div class="tx"><b>${it.t}</b><span class="muted small">${it.s}</span></div></div>`); e.onclick = it.run; p.append(e); });
  view.append(p);
  const hist = store.state().quizzes.slice(-5).reverse();
  if (hist.length) view.append(h(`<div class="card" style="margin-top:14px"><b>Recent scores</b>${hist.map(q => `<div class="row" style="justify-content:space-between"><span>${esc(q.title)}</span><span class="pill pill-soft">${q.score}/${q.total}</span></div>`).join('')}</div>`));
}
function quiz(view, title, kind, n) {
  let ids;
  if (kind === 'join' || kind === 'signs') ids = SECTIONS.find(s => s.id === kind).units.map(u => u.id);
  else ids = learned().length ? learned() : UNITS.slice(0, 3).map(u => u.id);
  let qs;
  if (kind === 'listen') qs = Array.from({ length: n }, () => listenQuestion()).filter(Boolean);
  else qs = questionsFor(shuffle(ids), n);
  runSteps(view, {
    title, steps: [{ type: 'story', say: 'quiz_intro', show: '<div style="font-size:72px">⭐</div>' }, ...qs.map(q => ({ type: 'q', q }))],
    onFinish: r => { store.state().quizzes.push({ date: store.today(), title, score: r.right, total: r.total }); tally(r); store.markDone('quiz'); },
    onExit: () => go(kind === 'mixed' && n === 5 ? '#today' : '#quiz')
  });
}

async function ayahChallenge(view) {
  let c, s, v;
  for (let k = 0; k < 20; k++) {
    c = READ_ORDER[Math.random() * 25 | 0]; s = await audio.getSurah(c);
    v = s.v[Math.random() * s.v.length | 0];
    if (v.w.length >= 5) break;
  }
  const checks = [
    ['q_tap_shadda', 'why_shadda', u => u.shadda, 's3'], ['q_tap_sukun', 'why_sukun', u => u.sukun, 's2'],
    ['q_tap_long', 'why_long', u => u.madd || u.dagger || u.smallWawYa, 's4'], ['q_tap_quiet', 'why_quiet', u => u.quiet, 's6'],
    ['q_tap_nohand', 'why_nohand', u => !joinsForward(u.b) && u.b !== 'ء', 'j1']
  ];
  const qs = [];
  v.w.forEach((w, k) => {
    const us = analyse(w.t);
    checks.forEach(([say, why, target, unit]) => {
      const n = us.filter(target).length;
      if (n && n < us.length) qs.push({ kind: 'tap', say, why, target, unit, word: w.t, ref: [c, v.n, k + 1] });
    });
  });
  const seen = new Set();
  const chosen = shuffle(qs).filter(q => !seen.has(q.word) && seen.add(q.word)).slice(0, 5);
  runSteps(view, {
    title: 'Ayah challenge', steps: [{ type: 'read', c, v: v.n }, ...chosen.map(q => ({ type: 'q', q }))],
    onFinish: r => { store.state().quizzes.push({ date: store.today(), title: 'Ayah challenge', score: r.right, total: r.total }); tally(r); store.save(); },
    onExit: () => go('#quiz')
  });
}

// ---------------- Parents ----------------
export async function parentsScreen(view) {
  const st = store.state();
  view.innerHTML = '<h1>For parents</h1>';
  const days = Object.entries(st.days).sort().slice(-7);
  const mins = days.reduce((a, [, d]) => a + d.mins, 0);
  view.append(h(`<div class="grid">
    <div class="card"><div class="muted small">Gold lessons</div><div style="font-size:28px;font-weight:700">${UNITS.filter(u => store.isGold(u.id)).length} / ${UNITS.length}</div></div>
    <div class="card"><div class="muted small">Minutes, last 7 days</div><div style="font-size:28px;font-weight:700">${Math.round(mins)}</div></div>
    <div class="card"><div class="muted small">Ayahs read and recorded</div><div style="font-size:28px;font-weight:700">${Object.keys(st.readDone).length}</div></div>
    <div class="card"><div class="muted small">Words to practise</div><div style="font-size:28px;font-weight:700">${Object.keys(st.weak).length}</div></div>
  </div>`));
  view.append(h(`<p class="small muted">Aim for about 20 minutes a day. A lesson turns gold after a score of 80% or more on 3 different days, so one lucky day does not count.</p>`));

  // recordings
  view.append(h('<h2>Recordings to check</h2>'));
  view.append(h('<p class="small muted">Listen to her reading, then to Husary. Mark it Good, or Practise again to send that ayah back into her reading path.</p>'));
  const recs = await store.listRecordings();
  const rbox = h('<div class="path"></div>');
  if (!recs.length) rbox.append(h('<div class="card muted">No recordings yet.</div>'));
  const idx = await audio.getIndex();
  recs.slice(0, 40).forEach(r => {
    const el = h(`<div class="card"><div class="row" style="justify-content:space-between"><b>${idx.surahs[r.c - 1].en} ${r.v}</b><span class="pill ${r.status === 'good' ? 'pill-green' : r.status === 'again' ? 'pill-gold' : 'pill-soft'}">${r.status === 'good' ? 'Good' : r.status === 'again' ? 'Practise again' : 'New'}</span></div><div class="small muted">${r.date} · ${r.secs}s</div><div class="row" style="margin-top:8px"></div></div>`);
    const row = el.querySelector('.row:last-child');
    const me = h(`<button class="btn">${ICON.spk} Her reading</button>`); me.onclick = () => { stopAll(); new Audio(URL.createObjectURL(r.blob)).play(); };
    const hu = h(`<button class="btn">${ICON.spk} Husary</button>`); hu.onclick = () => audio.playAyah(r.c, r.v);
    const ok = h('<button class="btn">✓ Good</button>'); ok.onclick = async () => { r.status = 'good'; await store.updateRecording(r); parentsScreen(view); };
    const ag = h('<button class="btn">↺ Practise again</button>'); ag.onclick = async () => { r.status = 'again'; await store.updateRecording(r); st.reading = { c: r.c, v: r.v }; store.save(); toast('This ayah is next in her reading path'); parentsScreen(view); };
    const del = h('<button class="btn">Delete</button>'); del.onclick = async () => { await store.deleteRecording(r.id); parentsScreen(view); };
    row.append(me, hu, ok, ag, del);
    rbox.append(el);
  });
  view.append(rbox);

  // lessons table
  view.append(h('<h2>Lessons</h2>'));
  const tb = h(`<table class="t"><tr><th>Lesson</th><th>Stars</th><th>First-try accuracy</th></tr>${UNITS.map(u => { const r = st.units[u.id]; return `<tr><td>${u.title}</td><td>${starsHTML(store.stars(u.id))}${r && r.placed ? ' <span class="pill pill-soft">placed</span>' : ''}</td><td>${r && r.tries ? Math.round(100 * r.right / r.tries) + '%' : '-'}</td></tr>`; }).join('')}</table>`);
  view.append(tb);
  if (Object.keys(st.weak).length) view.append(h(`<p class="small">Words she is practising: <span class="ar" style="font-size:24px">${Object.keys(st.weak).slice(0, 20).join(' · ')}</span></p>`));

  // settings
  view.append(h('<h2>Settings</h2>'));
  const set = h(`<div class="card path">
    <label class="row"><input type="checkbox" class="taj" ${st.settings.tajweed ? 'checked' : ''}> Show tajweed colours</label>
    <label class="row">Reading path starts at: <select class="rs">${READ_ORDER.map(c => `<option value="${c}" ${st.reading.c === c ? 'selected' : ''}>${idx.surahs[c - 1].en}</option>`).join('')}</select></label>
    <div class="row"><button class="btn exp">Save a backup</button><label class="btn">Restore backup<input type="file" accept=".json" class="imp" hidden></label></div>
    <div class="row"><button class="btn vs">Download voice script</button><span class="small muted">Lines for the tutor's human voice (record each as an mp3 named by its id).</span></div>
    <div class="row"><button class="btn place">Redo the placement check</button><button class="btn rst">Reset all progress</button></div>
  </div>`);
  set.querySelector('.taj').onchange = e => { st.settings.tajweed = e.target.checked; store.save(); };
  set.querySelector('.rs').onchange = e => { st.reading = { c: +e.target.value, v: 1 }; store.save(); toast('Reading path updated'); };
  set.querySelector('.exp').onclick = () => download('noor-path-backup.json', JSON.stringify(st), 'application/json');
  set.querySelector('.imp').onchange = async e => { const f = e.target.files[0]; if (!f) return; store.importState(JSON.parse(await f.text())); toast('Backup restored'); parentsScreen(view); };
  set.querySelector('.vs').onclick = () => download('voice-script.csv', 'id,text\n' + Object.entries(LINES).map(([k, v]) => `${k},"${v.replace(/<[^>]+>/g, '').replace(/"/g, '""')}"`).join('\n'), 'text/csv');
  set.querySelector('.place').onclick = () => { st.placement = null; store.save(); go('#today'); };
  set.querySelector('.rst').onclick = () => { if (confirm('Reset all progress on this device? Recordings stay.')) { store.reset(); go('#today'); } };
  view.append(set);
  view.append(h('<p class="small muted" style="margin-top:16px">Quran text and page layout: Quran.com (KFGQPC Madani Hafs). Recitation: Sheikh Mahmoud Khalil Al-Husary. Progress is saved in this browser on this device; use backups to move it.</p>'));
}
function download(name, data, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click();
}
