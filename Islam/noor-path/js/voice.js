// Hilal's voice. Every on-screen line has an id (js/lines.js).
// 1. If a human recording exists at voice/<id>.mp3 (listed in voice/manifest.json), it plays.
// 2. Otherwise the most natural voice installed on the device reads the line.
//    Arabic words inside a line are not read by the English voice (Husary reads Arabic).
import { LINES } from './lines.js';
import { state, save } from './store.js';
let manifest = null;
const v = new Audio();
const synth = window.speechSynthesis;
async function load() {
  if (manifest) return manifest;
  try { manifest = new Set(await (await fetch('voice/manifest.json', { cache: 'no-cache' })).json()); }
  catch { manifest = new Set(); }
  return manifest;
}
load();

// Rank installed voices: human-sounding "Natural"/"Neural"/"Online" voices first.
export function englishVoices() {
  if (!synth) return [];
  const score = x => (/natural|neural|online|premium|enhanced/i.test(x.name) ? 100 : 0)
    + (/aria|jenny|sonia|libby|ava|samantha|serena|karen|google uk english female|google us english/i.test(x.name) ? 30 : 0)
    + (/en-(GB|US|CA|AU)/i.test(x.lang) ? 10 : 0) + (x.localService ? 0 : 5);
  return synth.getVoices().filter(x => /^en/i.test(x.lang)).sort((a, b) => score(b) - score(a));
}
function chosenVoice() {
  const list = englishVoices();
  const want = state().settings.voiceName;
  return list.find(x => x.name === want) || list[0] || null;
}
if (synth) synth.onvoiceschanged = () => {};

export const text = id => LINES[id] || id;
export const hasVoice = id => (manifest && manifest.has(id)) || (!!synth && state().settings.voiceOn !== false);
export function stopVoice() { v.pause(); if (synth) synth.cancel(); }

// Text for the English voice: drop HTML and Arabic script.
function spoken(html) {
  return html.replace(/<span class="ar"[^>]*>.*?<\/span>/g, ' this word ')
    .replace(/<[^>]+>/g, ' ').replace(/[؀-ۿݐ-ݿࢠ-ࣿ]+/g, ' ')
    .replace(/\s+/g, ' ').replace(/ this word \./g, ' this word.').trim();
}
export function sayText(str) {
  if (!synth || state().settings.voiceOn === false) return Promise.resolve();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(spoken(str));
  const voice = chosenVoice(); if (voice) { u.voice = voice; u.lang = voice.lang; }
  u.rate = state().settings.voiceRate || 0.92; u.pitch = 1.05;
  // Some browsers never fire "end", so also finish after the expected speaking time.
  const words = u.text.split(' ').length, guess = 1500 + words * 420 / u.rate;
  return new Promise(res => { u.onend = res; u.onerror = res; synth.speak(u); setTimeout(res, Math.min(20000, guess)); });
}
export async function speak(id, vars = {}) {
  await load();
  stopVoice();
  if (manifest.has(id)) {
    v.src = `voice/${id}.mp3`;
    return new Promise(res => { v.onended = res; v.onerror = res; v.play().catch(res); });
  }
  let t = text(id); for (const k in vars) t = t.replace(`{${k}}`, vars[k]);
  return sayText(t);
}
export async function speakAll(ids) { for (const id of ids) await speak(id); }
export function setVoice(name) { state().settings.voiceName = name; save(); }
