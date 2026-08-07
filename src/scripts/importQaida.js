// Seed Qaida lessons + pages.
//
// Content ported from the verified frontend Qaida: lessons 1–6, 8, 10, 12 are
// faithful to the printed book; the drill lessons are generated from the alphabet
// (so they are exact by construction). Lessons 7, 9, 11, 13–16 are real-word pages
// still marked `complete:false`, pending final transcription of the source images.
//
// The Arabic string of each cell is the source of truth; the frontend engine
// derives letters, harakat and tajweed. Idempotent: upserts each lesson by slug
// and rebuilds its page, bumping contentVersion for cache invalidation.
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { QaidaLesson, QaidaPage } = require('../models');

// ---- marks ----
const F = 'َ'; // fatha (zabar)
const I = 'ِ'; // kasra (zeer)
const U = 'ُ'; // damma (pesh)
const AN = 'ً'; // fathatan
const IN = 'ٍ'; // kasratan
const UN = 'ٌ'; // dammatan
const SK = 'ْ'; // sukoon / jazm
const SH = 'ّ'; // shadda / tashdeed

// 29 core letters, in Qaida order
const CORE = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','و','ه','ء','ي'];
const CONS = CORE.filter((l) => l !== 'ا');

const cells = (arr) => arr.map((text, i) => ({ order: i, text }));

// "<letter><mark>" cells across the alphabet (alif excluded — it carries no harakat here)
const marked = (marks, letters = CORE.filter((l) => l !== 'ا')) => {
  const out = [];
  letters.forEach((l) => marks.forEach((m) => out.push(l + m)));
  return cells(out);
};

// Madd o Leen drill: every consonant stretched by ا / و / ی
const maddLeen = (letters = CORE.filter((l) => !'اوی'.includes(l))) => {
  const suf = [F + 'ا', U + 'و' + SK, I + 'ی' + SK];
  const out = [];
  letters.forEach((l) => suf.forEach((s) => out.push(l + s)));
  return cells(out);
};

// Sukoon drill: alif + vowel, then each consonant saakin → اَبْ اِبْ اُبْ …
const sukoonDrill = () => {
  const out = [];
  CONS.forEach((c) => [F, I, U].forEach((v) => out.push('ا' + v + c + SK)));
  return cells(out);
};

// Tashdeed drill: alif + vowel, then each consonant with shadda → اَبَّ اِبَّ اُبَّ …
const tashdeedDrill = () => {
  const out = [];
  CONS.forEach((c) => [F, I, U].forEach((v) => out.push('ا' + v + c + SH + F)));
  return cells(out);
};

const LESSONS = [
  { order: 1, slug: 'huroof-mufradat', title: { en: 'Isolated Letters', ur: 'حروف مفردات', tr: 'Huroof-e-Mufradat' }, subtitle: 'The 29 letters, on their own', sourcePages: [2], columns: 6, hint: 'Tap any letter to hear its name and see it big. This is the foundation.', cells: cells(CORE), complete: true },
  { order: 2, slug: 'huroof-murakkabat', title: { en: 'Joined Letters', ur: 'حروف مرکبات', tr: 'Huroof-e-Murakkabat' }, subtitle: 'How letters connect into words', sourcePages: [3, 4, 5], columns: 5, hint: 'Each shape is made of the letters you already know — tap them apart.', cells: cells(['با','بت','تب','بب','تت','ثب','نب','یب','بی','لب','بل','بلب','کب','کا','بکت','تلث','نبل','بین','یتل','نبن','تین','یتن','ثن','جح','نح','مح','یح','یج','بج','تم','نم','ثم','سب','یس','نس','تس','کل','مل','نل','تنل','ثش','یشج','لا','کلا','بلا']), complete: true },
  { order: 3, slug: 'huroof-muqattaat', title: { en: 'Quranic Disjoined Letters', ur: 'حروف مقطعات', tr: 'Huroof-e-Muqatta’at' }, subtitle: 'The mystery letters that open some Surahs', sourcePages: [6], columns: 4, hint: 'These are read letter-by-letter by their names, not joined.', cells: cells(['الٓمٓ','الٓمٓصٓ','الٓرٰ','الٓمٓرٰ','كٓهٰیٰعٓصٓ','طٰهٰ','طٰسٓمٓ','طٰسٓ','یٰسٓ','صٓ','حٰمٓ','عٓسٓقٓ','قٓ','نٓ']), complete: true },
  { order: 4, slug: 'harakaat', title: { en: 'Harakaat — Zabar, Zeer, Pesh', ur: 'حرکات', tr: 'Harakaat' }, subtitle: 'The three short vowels', sourcePages: [6, 7, 8], columns: 6, hint: 'Zabar = “a”, Zeer = “i”, Pesh = “u”. Tap a letter to see which mark it carries.', cells: marked([F, I, U]), complete: true },
  { order: 5, slug: 'tanween', title: { en: 'Tanween — Double Vowels', ur: 'تنوین', tr: 'Tanween' }, subtitle: 'Two zabars, two zeers, two peshes → an / in / un', sourcePages: [8, 9], columns: 6, hint: 'A doubled mark adds an “n” sound: بً = “ban”, بٍ = “bin”, بٌ = “bun”.', cells: marked([AN, IN, UN]), complete: true },
  { order: 6, slug: 'mashq-harakaat-tanween', title: { en: 'Practice — Words', ur: 'مشق حرکات و تنوین', tr: 'Mashq Harakaat wa Tanween' }, subtitle: 'Reading real 2–3 letter words', sourcePages: [10, 11], columns: 4, hint: 'Blend the sounds smoothly. Tap a whole word to focus, or a single letter to check it.', cells: cells(['اَمَرَ','اَذِنَ','اَخَذَ','اَحَدٌ','اَبَدًا','اَنَا','بَخِلَ','بَرَدَ','جَعَلَ','جَمَعَ','حَسَدَ','حَشَرَ','خَشِیَ','خَلَقَ','خُلِقَ','ذَکَرَ','رَفَعَ','رَقَبَةٌ','سُرُرٌ','سَفَرَةٌ','صُحُفًا','وَسَطَ','طَبَعَ','طَبَقًا','طُوًی','عَبَسَ','عَدَلَ','عَلَقَ','عُمِدَ','عِنَبًا','فَعَلَ','قَتَلَ','قُتِلَ','کَسَبَ','کُتُبٌ','لَهَبٍ','مَسَدٍ','وَقَبَ','وَلَدَ','وَهَبَ']), complete: true },
  { order: 7, slug: 'khari-zabar-zeer-ulta-pesh', title: { en: 'Long Vowels', ur: 'کھڑی زبر، زیر، الٹا پیش', tr: 'Khari Zabar / Zeer / Ulta Pesh' }, subtitle: 'Standing marks = stretch for one alif', sourcePages: [11, 12], columns: 6, hint: 'A standing zabar/zeer or upside-down pesh stretches the sound.', cells: cells(['بٰ','مٰ','لٰ','سٰ','یٰ','دٰ','نٰ','هٰ','حٰ','عٰ','رٰ','غٰ']), complete: false },
  { order: 8, slug: 'madd-o-leen', title: { en: 'Madd & Leen', ur: 'مد و لین', tr: 'Madd o Leen' }, subtitle: 'The stretching letters ا و ی', sourcePages: [12, 13, 14, 15], columns: 6, hint: 'After a matching vowel, ا و ی stretch the sound by one alif — “aa”, “oo”, “ee”.', cells: [...maddLeen(), ...cells(['بَوْ','بَیْ','تَوْ','تَیْ','جَوْ','جَیْ','خَوْ','خَیْ'])], complete: true },
  { order: 9, slug: 'mashq-jaame', title: { en: 'Comprehensive Practice', ur: 'مشق جامع', tr: 'Mashq Jaame’' }, subtitle: 'Madd, leen, hamza & real Quranic words', sourcePages: [15, 16, 17, 18], columns: 4, hint: 'Everything so far, together.', cells: cells(['اٰمَنَ','اَلِفْ','اٰیْن','جَآءَ','جِیْءَ','خَوْفٌ','دُوْدٌ','ذٰلِكَ','شَآءَ','مَلِكِ','قَالَ','كَیْفَ','لَیْسَ','مَآءِ','نَارًا','وَیْلٌ','یَوْمٌ','حَافِظْ','اَعُوْذُ','نَاصِرٌ']), complete: false },
  { order: 10, slug: 'sukoon-jazm', title: { en: 'Sukoon (Jazm)', ur: 'سکون یعنی جزم', tr: 'Sukoon / Jazm' }, subtitle: 'A resting letter with no vowel', sourcePages: [18, 19], columns: 6, hint: 'A jazm letter is “parked” — read the letter before it into it.', cells: sukoonDrill(), complete: true },
  { order: 11, slug: 'mashq-sukoon', title: { en: 'Practice — Sukoon', ur: 'مشق سکون', tr: 'Mashq Sukoon' }, subtitle: 'Jazm words & short Surah phrases', sourcePages: [19, 20, 21, 22, 23], columns: 4, hint: 'Watch the blue qalqala letters bounce.', cells: cells(['اَنْتَ','بَعْدُ','سَعْیٌ','كُنْتُ','لَسْتُ','اَمْرٌ','خَلْقًا','سَبْقًا','عَبْدًا','فَصْلٌ','مِسْكٌ','نَفْسٍ','یَعْلَمُوْنَ','یَنْظُرُوْنَ','اَرْسَلَ','اَكْرَمَ','اَفْلَحَ','اِقْرَاْ']), complete: false },
  { order: 12, slug: 'tashdeed', title: { en: 'Tashdeed (Shadda)', ur: 'تشدید', tr: 'Tashdeed' }, subtitle: 'A doubled, stressed letter', sourcePages: [24], columns: 6, hint: 'Shadda = the letter is said twice, firmly.', cells: tashdeedDrill(), complete: true },
  { order: 13, slug: 'mashq-tashdeed', title: { en: 'Practice — Tashdeed', ur: 'مشق تشدید', tr: 'Mashq Tashdeed' }, subtitle: 'Shadda words & phrases', sourcePages: [25, 26, 27], columns: 4, hint: 'Hold the doubled letter with strength.', cells: cells(['كَذَّبَ','یَظُنُّ','جَنَّةٌ','قُوَّةٍ','ذَرَّةٍ','سَیِّرَتْ','زُوِّجَتْ','تَوَّابًا','مُطَهَّرَةٍ','مُكَرَّمَةٍ','اِیَّاكَ','لِلّٰهِ','تَجَلّٰی','تَزَكّٰی','فَعَّالٌ','مُذَكِّرٌ']), complete: false },
  { order: 14, slug: 'tashdeed-maa-sukoon', title: { en: 'Tashdeed + Sukoon', ur: 'مشق تشدید مع سکون', tr: 'Tashdeed ma’a Sukoon' }, subtitle: 'Shadda meeting a resting letter', sourcePages: [27, 28], columns: 4, hint: 'Two rules at once — steady does it.', cells: cells(['مَرُّوْا','رَبِّیْ','مَتَّتْ','حَقَّتْ','خَفَّتْ','تَبَّتْ','قَدَّمَتْ','وَالصُّبْحِ','وَالشَّمْسِ','بِالصَّبْرِ','اَلْحَقُّ','یُحِبُّوْنَ']), complete: false },
  { order: 15, slug: 'tashdeed-maa-tashdeed', title: { en: 'Tashdeed + Tashdeed', ur: 'تشدید مع تشدید', tr: 'Tashdeed ma’a Tashdeed' }, subtitle: 'More than one shadda in a word', sourcePages: [28, 29], columns: 4, hint: 'Take each doubled letter in turn.', cells: cells(['یُزَكِّیْ','اَلْمُدَّثِّرُ','اَلْمُزَّمِّلُ','عِلِّیِّیْنَ','اِنَّ الَّذِیْنَ','مِمَّا','رَبِّهِمْ','حُبًّا']), complete: false },
  { order: 16, slug: 'tashdeed-baad-madd', title: { en: 'Tashdeed after Madd', ur: 'تشدید بعد حروف مدہ', tr: 'Tashdeed ba’d Huroof-e-Madd' }, subtitle: 'The heaviest stretch — Madd Laazim', sourcePages: [29], columns: 4, hint: 'Stretch the madd fully, then the shadda.', cells: cells(['ضَآلَّ','دَآبَّةٍ','حَآجَّكَ','ٱلضَّآلِّیْنَ','ضَآلُّوْنَ','ٱلصَّآخَّةُ','ٱلطَّآمَّةُ','وَلَا الضَّآلِّیْنَ']), complete: false },
];

async function run() {
  await connectDatabase();

  for (const l of LESSONS) {
    const lesson = await QaidaLesson.findOneAndUpdate(
      { slug: l.slug },
      {
        $set: {
          order: l.order,
          slug: l.slug,
          title: l.title,
          subtitle: l.subtitle,
          hint: l.hint,
          sourcePages: l.sourcePages,
          complete: l.complete,
        },
        $inc: { contentVersion: 1 },
      },
      { upsert: true, new: true },
    );

    await QaidaPage.deleteMany({ lesson: lesson._id });
    await QaidaPage.create({
      lesson: lesson._id,
      order: 0,
      columns: l.columns,
      heading: null,
      cells: l.cells,
    });
  }

  console.log(`Seeded ${LESSONS.length} Qaida lessons`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
