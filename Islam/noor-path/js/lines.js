// Every line the child sees. Each id can be recorded as voice/<id>.mp3 by a human voice.
// Arabic inside a line is shown in the Quran font.
const A = s => `<span class="ar" style="font-size:1.35em;line-height:1">${s}</span>`;
export const LINES = {
  // general
  hello: 'Assalamu alaikum! I am Hilal. Let\'s read the Quran together today.',
  hello_new: 'Assalamu alaikum! I am Hilal, your reading helper. First, let\'s see what you already know.',
  today_intro: 'Here is today\'s path. Tap the first step to begin.',
  today_alldone: 'MashaAllah! You finished today\'s path. Come back tomorrow, or read more Quran.',
  good1: 'Excellent!', good2: 'MashaAllah, well done!', good3: 'Yes, that\'s right!', good4: 'Great reading!',
  try1: 'Not quite. Look again.', try2: 'Almost! Try once more.',
  listen_word: 'Listen to Sheikh Husary read it.',
  lesson_done: 'You finished this lesson! You earned a star.',
  lesson_done_low: 'Good effort! Let\'s practise this again tomorrow to earn your star.',
  next: 'Tap the arrow to keep going.',
  // question prompts
  q_hand: 'Does this letter have a hand to hold the next letter?',
  q_tap_nohand: 'Tap a letter that has no hand.',
  q_shape: 'Which shape is the blue letter?',
  q_dots: 'Which letter is the blue one?',
  q_tricky_laamalif: 'Tap the Laam and Alif holding hands.',
  q_pieces: 'How many pieces is this word written in?',
  q_vowel: 'What sound does the blue letter make?',
  q_tap_sukun: 'Tap the letter with a sukun. We stop on it.',
  q_tap_shadda: 'Tap the letter with a shadda. We hold it.',
  q_tap_long: 'Tap the letter where we stretch the sound.',
  q_tanween: 'What does the blue letter say?',
  q_tap_quiet: 'Tap the letter we do not read.',
  q_listen_pick: 'Listen to Husary. Which word did he read?',
  // why lines (shown after a wrong answer)
  why_hand: 'Alif, Daal, Dhaal, Raa, Zay and Waaw never hold the next letter. All the other letters do.',
  why_nohand: 'Look for Alif, Daal, Dhaal, Raa, Zay or Waaw.',
  why_shape: 'Look at both sides of the blue letter. Is it holding a letter before it? A letter after it?',
  why_dots: 'Count the dots on the blue letter, and check: are they above or below?',
  why_laamalif: 'Laam and Alif join into one special shape that looks like a little cup: ' + A('لا'),
  why_pieces: 'A new piece starts after every letter with no hand. Count the gaps.',
  why_vowel: 'A line above says a. A line below says i. A little waaw above says u.',
  why_sukun: 'The sukun looks like a tiny head on top of the letter: ' + A('لۡ'),
  why_shadda: 'The shadda looks like a small w on top: ' + A('بّ'),
  why_long: 'Look for a bare Alif, Waaw or Yaa after the matching vowel, or a small Alif, Waaw or Yaa.',
  why_tanween: 'Two lines above say an. Two lines below say in. Two little waaws say un.',
  why_quiet: 'A Laam with no mark before a shadda is quiet. A small circle also means: do not read.',
  // j1 hands
  j1_a: 'Arabic is read from right to left. Watch how the letters hold hands.',
  j1_b: 'Most letters have a little green hand on their left side. They use it to hold the next letter.',
  j1_c: 'But six letters have no hand on their left: Alif, Daal, Dhaal, Raa, Zay and Waaw.',
  j1_d: 'Look at ' + A('رَبِّ') + '. Raa has no hand, so the Baa after it has to stand alone.',
  j1_e: 'Now ' + A('بِرَبِّ') + '. The first Baa holds the Raa. But Raa cannot hold the last Baa.',
  j1_f: 'Let\'s read it slowly, letter by letter. Press Play.',
  // j2 shapes
  j2_a: 'A letter changes its shape depending on where it sits in the word. Here is Baa.',
  j2_b: 'At the start it reaches to the left. In the middle it holds both sides. At the end it holds only the letter before. Alone, it holds nothing.',
  j2_c: 'Here is Noon. Same idea: four places, four shapes.',
  j2_d: 'And Meem. Can you see it change?',
  // j3 dots
  j3_a: 'Some letters share the same body. Only the dots tell them apart.',
  j3_b: 'Count the dots, and look where they are: above or below.',
  j3_c: 'Here are more families. Same body, different dots.',
  // j4 tricky
  j4_a: 'Some letters change a lot. Soft Haa has four very different shapes.',
  j4_b: 'Ayn also changes. In the middle it becomes a small closed loop.',
  j4_c: 'When Laam holds Alif, they make one special shape, like a little cup.',
  j4_d: 'Taa Marbuta only comes at the end of a word. It looks like soft Haa with two dots.',
  // j5 pieces
  j5_a: 'When a letter has no hand, the word breaks into pieces. Look at ' + A('ٱلنَّاسِ'),
  j5_b: 'It is still one word. Read the pieces smoothly, one after the other, without stopping.',
  // s1 short vowels
  s1_a: 'Fatha is a small line above the letter. It says a.',
  s1_b: 'Kasra is the same small line below the letter. It says i.',
  s1_c: 'Damma is a little waaw above the letter. It says u.',
  // s2 sukun
  s2_a: 'In this Mushaf the sukun looks like a tiny head on top. It means: stop on this letter, no vowel.',
  s2_b: 'Listen to ' + A('قُلۡ') + '. We stop on the Laam.',
  s2_c: 'Careful! A small round circle is different. It means the letter is not read at all.',
  // s3 shadda
  s3_a: 'Shadda looks like a small w on top. It means we say the letter twice: we hold it, then add its vowel.',
  s3_b: 'Listen to how Husary holds the Baa in ' + A('رَبِّ'),
  // s4 long
  s4_a: 'Some letters stretch the sound for 2 counts. We call it a long vowel.',
  s4_b: 'Alif after fatha stretches aa. Waaw after damma stretches oo. Yaa after kasra stretches ee.',
  s4_c: 'In this Mushaf, a small Alif, small Waaw or small Yaa also means: stretch.',
  // s5 tanween
  s5_a: 'Two vowel marks together are called tanween. Read the vowel, then add an n.',
  s5_b: 'Listen to this word. Hear the n at the end.',
  // s6 quiet
  s6_a: 'Some letters are written but not read. Husary skips them, and so do we.',
  s6_b: 'The joining Alif has a little head on top. If we start with it, we read it. If we join from the word before, it is quiet.',
  s6_c: 'In ' + A('ٱلنَّاسِ') + ' the Laam has no mark and the Noon has a shadda. So the Laam is quiet too.',
  s6_d: 'A small round circle on a letter means: never read it.',
  // reading
  read_intro: 'Now read real Quran. Listen to Husary first, then read it yourself.',
  read_rec: 'Tap the red button and read the ayah. Tap it again when you finish.',
  read_saved: 'Your reading is saved. Listen to yourself, then listen to Husary.',
  read_tapword: 'Tap any word to read it slowly, letter by letter.',
  // placement
  place_intro: 'Let\'s see what you already know. Sheikh Husary will read a word. Tap the word he reads. Just try your best!',
  place_why: 'Listen again, and look carefully at every letter. Try once more.',
  place_done: 'Thank you! I know where to start now.',
  // quiz
  quiz_intro: 'Quiz time! Answer as well as you can.',
  quiz_done: 'Quiz finished! Look at your score.',
  // quran
  quran_intro: 'Tap a word to read it slowly. Tap the ayah number to hear Husary.',
  ready_page: 'You know everything you need for this page. Read it!',
  learn_first: 'This page has something new. Learn it first, or read with Husary.'
};
