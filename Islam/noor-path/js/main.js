import { $, $$, HILAL, stopAll } from './ui.js';
import * as store from './store.js';
import { getWordbank } from './audio.js';
import { setBank } from './lessons.js';
import { todayScreen, lessonsScreen, quizScreen, parentsScreen, startLesson } from './screens.js';
import { quranScreen } from './quran.js';

$('#hilal-top').innerHTML = HILAL;
const view = $('#view');

async function route() {
  stopAll();
  document.body.classList.remove('focus');
  document.querySelectorAll('.sheet,.scrim').forEach(e => e.remove());
  const [tab, arg] = (location.hash.slice(1) || 'today').split('/');
  $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === (tab === 'lesson' ? 'lessons' : tab)));
  $('#star-count').textContent = '★ ' + store.totalStars();
  window.scrollTo(0, 0);
  if (tab === 'lesson' && arg) startLesson(view, arg);
  else if (tab === 'lessons') lessonsScreen(view);
  else if (tab === 'quiz') quizScreen(view);
  else if (tab === 'quran') await quranScreen(view, arg);
  else if (tab === 'parents') await parentsScreen(view);
  else await todayScreen(view);
}
$$('#tabs .tab').forEach(b => b.onclick = () => { const h = '#' + b.dataset.tab; if (location.hash === h) route(); else location.hash = h; });
window.addEventListener('hashchange', route);

(async () => {
  view.innerHTML = '<p class="center muted" style="margin-top:30vh">Loading…</p>';
  setBank(await getWordbank());
  await document.fonts.load('40px Hafs');
  route();
})();
