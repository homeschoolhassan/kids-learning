# Noor Path: read the Quran fluently

A tutor-style web app that takes a child from knowing the letters to reading any page of the Madani Mushaf with tajweed.

## Put it online (git)

This is a plain static site. There is no build step.

1. Copy everything in this folder into your git repository folder.
2. Commit and push.
3. Turn on static hosting for the repository, for example GitHub Pages (Settings, Pages, deploy from the main branch, root folder), Cloudflare Pages or Netlify.
4. Open the site address on her tablet or laptop. Use the same device and browser each time, because progress is saved in the browser. Use **Parents, Save a backup** to move it.

To test it on your own computer, run `python3 -m http.server` inside this folder and open http://localhost:8000. Opening index.html directly from the folder will not work.

## What is inside

| Tab | What it does |
|---|---|
| Today | Hilal, the tutor, sets the daily path: warm-up, lesson, reading, quick quiz (about 20 minutes) |
| Lessons | Stage 1 sections: Letter joining (5 lessons) and Vowels and signs (6 lessons). The later sections are shown as coming next |
| Quiz | Section checkpoints, mixed quiz, listening quiz, ayah challenge |
| Quran | All 604 Madani pages, by surah, juz or page. Tap a word to slide it letter by letter. Tap an ayah number for Husary, the slow teacher recitation, and recording |
| Parents | Progress, her recordings to check (Good or Practise again), settings, backups, voice script |

Each lesson follows the same steps: Watch (picture story), Practise (questions on real Quran words), Read (a real ayah with Husary and recording). A lesson turns gold after scoring 80% or more on 3 different days.

## Sources

- Quran text, word positions and Madani page lines: Quran.com API (KFGQPC Uthmanic Hafs). Tajweed rule colours come from Quran.com's tajweed data, not hand-picked words.
- Font: KFGQPC Uthmanic Hafs (fonts/UthmanicHafs.woff2), with Amiri Quran as a fallback.
- Recitation: Sheikh Mahmoud Khalil Al-Husary. Murattal chapter audio with word timings (download.quranicaudio.com) is used for word-by-word and ayah playback. The slow teaching recitation (Al-Muallim) comes from everyayah.com. Both stream from those sites, so the device needs internet.

## Adding the tutor's human voice later

Every line the tutor says has an id (see js/lines.js, or download the voice script from the Parents tab).

1. Record each line as an mp3 named after its id, for example `voice/hello.mp3`.
2. List the ids you recorded in `voice/manifest.json`, for example `["hello", "j1_a", "j1_b"]`.
3. Push. Recorded lines then play automatically. Lines without a recording are shown on screen only, never read by a robotic voice.

## Data rebuild (only needed if you change the source data)

The `data/` folder was generated from the Quran.com API. `data/wordbank.json` holds the Juz Amma and Al-Fatiha words tagged by skill (sukun, shadda, long vowels, tanween, quiet letters, word pieces and so on).
