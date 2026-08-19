// Import the full Quran (word-by-word) from the free, open Quran.com API v4.
//
//   Requires network access at runtime (run once locally or on the server).
//   Idempotent: upserts Surah by number, Ayah by (surah, number), and Word by
//   (surah, ayah, position). Safe to re-run; re-running refreshes text/translation.
//
// Sources (Quran.com API v4, no key required):
//   - GET /chapters?language=en                          → surah metadata
//   - GET /verses/by_chapter/{n}?words=true&...          → ayahs + words
//
// Notes:
//   * We store Uthmani script as the source of truth. Word translation &
//     transliteration come from the same API. Per-ayah/per-word audio URLs are
//     left null here — wire your preferred reciter/CDN in a follow-up pass.
//   * A small delay between chapters keeps us well within rate limits.
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { Surah, Ayah, Word } = require('../models');

const API = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = Number(process.env.QURAN_TRANSLATION_ID || 20); // 20 = Saheeh International (en)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function importChapters() {
  const { chapters } = await getJSON(`${API}/chapters?language=en`);
  for (const c of chapters) {
    await Surah.findOneAndUpdate(
      { number: c.id },
      {
        $set: {
          number: c.id,
          nameArabic: c.name_arabic,
          nameEnglish: c.name_simple,
          nameTranslation: c.translated_name?.name,
          revelationPlace: c.revelation_place,
          ayahCount: c.verses_count,
          bismillahPre: c.bismillah_pre,
        },
      },
      { upsert: true },
    );
  }
  console.log(`Chapters: ${chapters.length}`);
  return chapters;
}

async function importChapterVerses(chapter) {
  const n = chapter.id;
  let page = 1;
  let totalVerses = 0;

  for (;;) {
    // text_indopak is imported alongside text_uthmani so the reader can switch
    // spelling without a second round trip. They are genuinely different
    // strings, not a rendering of one another: Uthmani writes ذَٰلِكَ with a zabar
    // stacked under the khari zabar, IndoPak writes ذٰلِكَ with the khari zabar
    // alone. See lib/arabic/script.js on the frontend.
    const url =
      `${API}/verses/by_chapter/${n}` +
      `?words=true&fields=text_uthmani,text_indopak,juz_number,hizb_number,page_number,ruku_number,sajdah_number` +
      `&word_fields=text_uthmani,text_indopak,transliteration,translation` +
      `&translations=${TRANSLATION_ID}&per_page=50&page=${page}`;
    const data = await getJSON(url);
    const verses = data.verses || [];

    for (const v of verses) {
      const ayahNumber = Number(String(v.verse_key).split(':')[1]);

      await Ayah.findOneAndUpdate(
        { surah: n, number: ayahNumber },
        {
          $set: {
            surah: n,
            number: ayahNumber,
            numberGlobal: v.id,
            juz: v.juz_number,
            hizb: v.hizb_number,
            page: v.page_number,
            ruku: v.ruku_number,
            textUthmani: v.text_uthmani,
            textIndopak: v.text_indopak || undefined,
            sajda: Boolean(v.sajdah_number),
            translations: (v.translations || []).map((t) => ({
              lang: 'en',
              source: String(t.resource_id),
              // Drop footnote markers (<sup>…</sup>) entirely, then any other tags.
              text: String(t.text)
                .replace(/<sup[^>]*>.*?<\/sup>/gis, '')
                .replace(/<[^>]*>/g, '')
                .trim(),
            })),
          },
          $inc: { contentVersion: 1 },
        },
        { upsert: true },
      );

      // Words (skip the trailing "end of ayah" marker word when present)
      const words = (v.words || []).filter((w) => w.char_type_name === 'word');
      for (const w of words) {
        await Word.findOneAndUpdate(
          { surah: n, ayah: ayahNumber, position: w.position },
          {
            $set: {
              surah: n,
              ayah: ayahNumber,
              position: w.position,
              textUthmani: w.text_uthmani || w.text,
              textIndopak: w.text_indopak || undefined,
              transliteration: w.transliteration?.text || undefined,
              translation: w.translation?.text || undefined,
            },
          },
          { upsert: true },
        );
      }
    }

    totalVerses += verses.length;
    const { next_page: nextPage } = data.pagination || {};
    if (!nextPage) break;
    page = nextPage;
    await sleep(150);
  }

  console.log(`Surah ${String(n).padStart(3)}: ${totalVerses} ayahs`);
}

async function run() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch not available — use Node 18+.');
    process.exit(1);
  }

  await connectDatabase();
  const chapters = await importChapters();

  for (const c of chapters) {
    await importChapterVerses(c);
    await sleep(200);
  }

  console.log('Quran import complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
