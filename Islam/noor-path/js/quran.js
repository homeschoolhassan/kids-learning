// The full Madani Mushaf: 604 pages, line by line, with Husary.
import { h, ICON, tutor, setSay, stopAll, toast } from './ui.js';
import * as audio from './audio.js';
import * as store from './store.js';
import { features } from './arabic.js';
import { isGold, state, save } from './store.js';
import { wordHTML, openWordSheet, recordButton, toArabicNum } from './reader.js';
import { unitById } from './lessons.js';

const FEATURE_UNIT = { pieces: 'j5', sukun: 's2', shadda: 's3', long: 's4', tanween: 's5', quiet: 's6', wasl: 's6' };
const RULE_NAME = { g: 'Ghunnah', ik: 'Ikhfa', iks: 'Ikhfa (Meem)', ig: 'Idgham with ghunnah', iw: 'Idgham', is: 'Idgham (Meem)', iql: 'Iqlab', q: 'Qalqalah', l: 'Sun letters', mo: 'Madd 4 to 5', mp: 'Madd 2 to 5', mn: 'Madd 6' };

export async function quranScreen(view, arg) {
  const idx = await audio.getIndex();
  const st = state();
  st.quran ||= { page: 604 };
  if (arg && +arg >= 1 && +arg <= 604) st.quran.page = +arg;
  view.innerHTML = '';
  const T = tutor('quran_intro'); view.append(T);
  const bar = h(`<div class="qbar">
    <select class="sur" aria-label="Surah">${idx.surahs.map(s => `<option value="${s.c}">${s.c}. ${s.en} (${s.ar})</option>`).join('')}</select>
    <select class="jz" aria-label="Juz"><option value="">Juz</option>${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">Juz ${i + 1}</option>`).join('')}</select>
    <label class="pill pill-soft" style="cursor:pointer"><input type="checkbox" class="taj" ${st.settings.tajweed ? 'checked' : ''}> Tajweed colours</label>
  </div>`);
  view.append(bar);
  const ready = h('<div class="ready" style="margin-bottom:10px"></div>'); view.append(ready);
  const box = h('<div></div>'); view.append(box);
  const foot = h(`<div class="pagefoot"><button class="btn prevp" aria-label="Previous page">${ICON.back} Previous</button><span class="pno"></span><button class="btn nextp" aria-label="Next page">Next ${ICON.next}</button></div>`);
  view.append(foot);
  const ctl = h('<div class="row c" style="margin-top:12px"></div>'); view.append(ctl);

  bar.querySelector('.sur').onchange = e => { const s = idx.surahs[e.target.value - 1]; go(s.pg[0]); };
  bar.querySelector('.jz').onchange = async e => { if (!e.target.value) return; go(await juzPage(+e.target.value, idx)); };
  bar.querySelector('.taj').onchange = e => { st.settings.tajweed = e.target.checked; save(); render(); };
  foot.querySelector('.nextp').onclick = () => go(Math.min(604, st.quran.page + 1));
  foot.querySelector('.prevp').onclick = () => go(Math.max(1, st.quran.page - 1));
  let sx = 0;
  box.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  box.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 70) go(st.quran.page + (dx < 0 ? 1 : -1)); });

  function go(p) { if (p < 1 || p > 604) return; stopAll(); st.quran.page = p; save(); render(); }

  async function render() {
    const p = st.quran.page;
    const page = await buildPage(p, idx);
    foot.querySelector('.pno').textContent = `Page ${p} · Juz ${page.juz}`;
    bar.querySelector('.sur').value = page.firstSurah;
    const taj = st.settings.tajweed;
    const m = h(`<div class="mushaf ${taj ? '' : 'notaj'}"></div>`);
    page.lines.forEach(L => {
      if (L.type === 'head') m.append(h(`<div class="surah-head">سُورَةُ ${idx.surahs[L.c - 1].ar}</div>`));
      else if (L.type === 'bism') m.append(h(`<div class="bism">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>`));
      else {
        const line = h('<div class="mline"></div>');
        L.items.forEach(it => {
          if (it.end) { const e = h(`<span class="end" data-c="${it.c}" data-v="${it.v}">${it.end}</span>`); e.onclick = () => ayahMenu(it.c, it.v); line.append(e); }
          else { const s = h(`<span class="wd" data-key="${it.c}:${it.v}:${it.k}">${wordHTML(it.w, taj)}</span>`); s.onclick = () => openWordSheet(it.w.t, [it.c, it.v, it.k]); line.append(s); }
        });
        m.append(line);
      }
    });
    box.innerHTML = ''; box.append(m);
    fit(m, page.centered);
    readiness(page);
    ctl.innerHTML = '';
    const play = h(`<button class="btn primary">${ICON.play} Listen to this page</button>`);
    play.onclick = () => playFrom(page.ayahs, 0, m);
    ctl.append(play);
  }

  function readiness(page) {
    const need = new Set(), rules = new Set();
    page.ayahs.forEach(([c, v, w]) => w.forEach(x => { features(x.t).forEach(f => FEATURE_UNIT[f] && need.add(FEATURE_UNIT[f])); (x.j || []).forEach(s => Array.isArray(s) && RULE_NAME[s[1]] && rules.add(RULE_NAME[s[1]])); }));
    const missing = [...need].filter(u => !isGold(u));
    ready.innerHTML = '';
    const r = h(`<div class="card" style="padding:10px 14px"></div>`);
    if (!missing.length) r.innerHTML = `<span class="pill pill-green">✓ Ready</span> <span class="small">You've learned the foundations on this page.</span>`;
    else r.innerHTML = `<span class="pill pill-gold">Learn first</span> ${missing.map(u => `<a href="#lesson/${u}" class="pill pill-soft" style="text-decoration:none">${unitById(u).title}</a>`).join(' ')}`;
    if (rules.size) r.innerHTML += `<div class="small muted" style="margin-top:6px">Tajweed on this page: ${[...rules].join(', ')}</div>`;
    ready.append(r);
  }

  function ayahMenu(c, v) {
    stopAll();
    const scrim = h('<div class="scrim"></div>');
    const sh = h(`<div class="sheet"><div class="navrow"><b>${idx.surahs[c - 1].en} ${v}</b><button class="btn icon x" aria-label="Close">${ICON.close}</button></div><div class="row c" style="margin:14px 0"></div><div class="row c mine"></div></div>`);
    const close = () => { stopAll(); scrim.remove(); sh.remove(); };
    scrim.onclick = close; sh.querySelector('.x').onclick = close;
    const row = sh.querySelector('.row');
    const hl = k => box.querySelectorAll('.wd').forEach(s => s.classList.toggle('play', s.dataset.key === `${c}:${v}:${k}`));
    const a = h(`<button class="btn primary">${ICON.play} Husary</button>`); a.onclick = () => audio.playAyah(c, v, hl);
    const t = h(`<button class="btn">${ICON.teacher} Slow teacher</button>`); t.onclick = () => audio.playTeacher(c, v);
    row.append(a, t);
    recordButton({ c, v }, rec => {
      const mine = sh.querySelector('.mine'); mine.innerHTML = '';
      const b = h(`<button class="btn">${ICON.spk} My reading</button>`); b.onclick = () => new Audio(URL.createObjectURL(rec.blob)).play();
      mine.append(b); toast('Saved for your parent to check');
    }).then(b => row.append(b));
    document.body.append(scrim, sh);
  }

  async function playFrom(ayahs, i, m) {
    if (i >= ayahs.length) { m.querySelectorAll('.wd').forEach(s => s.classList.remove('play')); return; }
    const [c, v] = ayahs[i];
    const hl = k => m.querySelectorAll('.wd').forEach(s => s.classList.toggle('play', s.dataset.key === `${c}:${v}:${k}`));
    m.dataset.tok = String(Math.random()); const my = m.dataset.tok;
    await audio.playAyah(c, v, hl);
    if (m.isConnected && m.dataset.tok === my) playFrom(ayahs, i + 1, m);
  }
  render();
}

// Build a page: lines 1..15 with words, plus surah headers and bismillah in the gaps.
async function buildPage(p, idx) {
  const cs = idx.pages[p];
  const lines = {}; const ayahs = []; let juz = 0;
  const starts = [];
  for (const c of cs) {
    const s = await audio.getSurah(c);
    for (const v of s.v) {
      const onPage = v.p === p || v.ep === p || v.w.some(w => (w.p || v.p) === p);
      if (!onPage) continue;
      juz = juz || v.jz;
      if (v.n === 1) starts.push(c);
      ayahs.push([c, v.n, v.w]);
      v.w.forEach((w, k) => { if ((w.p || v.p) === p) (lines[w.l] ||= []).push({ c, v: v.n, k: k + 1, w }); });
      if (v.ep === p) (lines[v.e] ||= []).push({ c, v: v.n, end: toArabicNum(v.n) });
    }
  }
  const out = [];
  const used = Object.keys(lines).map(Number).sort((a, b) => a - b);
  const centered = p <= 2;
  const special = {};
  for (const c of starts) {
    const F = Math.min(...used.filter(L => lines[L].some(it => it.c === c)));
    if (idx.surahs[c - 1].bis) { special[F - 2] = { type: 'head', c }; special[F - 1] = { type: 'bism' }; }
    else special[F - 1] = { type: 'head', c };
  }
  const all = [...used, ...Object.keys(special).map(Number)].filter(L => L >= 1);
  const lo = Math.min(...all), hi = centered ? Math.max(...all) : 15;
  for (let L = lo; L <= hi; L++) {
    if (lines[L]) out.push({ type: 'words', items: lines[L] });
    else if (special[L]) out.push(special[L]);
  }
  return { lines: out, ayahs, juz, centered, firstSurah: cs[0] };
}

async function juzPage(j, idx) {
  for (const s of idx.surahs) {
    if (s.jz > j) break;
    const d = await audio.getSurah(s.c);
    const v = d.v.find(v => v.jz === j);
    if (v) return v.p;
  }
  return 1;
}

// Scale the font so the longest line fits the page width.
function fit(m, centered) {
  const lines = [...m.querySelectorAll('.mline')];
  const W = m.clientWidth - 26;
  m.style.fontSize = '30px';
  lines.forEach(l => { l.style.justifyContent = 'flex-start'; l.style.width = 'max-content'; });
  let max = 0;
  lines.forEach(l => { const w = l.getBoundingClientRect().width; l.dataset.nat = w; max = Math.max(max, w); });
  lines.forEach(l => l.style.width = '');
  const fs = Math.min(40, Math.max(13, 30 * W / (max * 1.03 || 1)));
  m.style.fontSize = fs + 'px';
  lines.forEach(l => {
    const w = +l.dataset.nat * fs / 30;
    if (centered || w < W * 0.72) l.classList.add('ctr'); else l.style.justifyContent = 'space-between';
  });
  m.querySelectorAll('.surah-head,.bism').forEach(e => e.style.fontSize = fs + 'px');
}
