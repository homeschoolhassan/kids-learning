// Every on-screen line has an id. When a human recording exists at voice/<id>.mp3
// (listed in voice/manifest.json) it is played automatically. Until then the line
// is only shown on screen, never read by a robotic voice.
import { LINES } from './lines.js';
let manifest = null;
const v = new Audio();
async function load() {
  if (manifest) return manifest;
  try { manifest = new Set(await (await fetch('voice/manifest.json', { cache: 'no-cache' })).json()); }
  catch { manifest = new Set(); }
  return manifest;
}
load();
export const text = id => LINES[id] || id;
export const hasVoice = id => manifest && manifest.has(id);
export function stopVoice() { v.pause(); }
export async function speak(id) {
  await load();
  if (!manifest.has(id)) return;
  v.pause(); v.src = `voice/${id}.mp3`;
  return new Promise(res => { v.onended = res; v.onerror = res; v.play().catch(res); });
}
// Speak several lines one after another.
export async function speakAll(ids) { for (const id of ids) await speak(id); }
