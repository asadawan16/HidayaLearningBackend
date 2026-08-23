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
//   * The API sits behind Cloudflare, which from some networks is reachable but
//     lossy — connects that take >10s, and sporadic ECONNRESET/ETIMEDOUT. A full
//     run is ~250 requests, so at even a few percent failure rate a no-retry
//     import never finishes. Hence the https keep-alive agent + backoff below
//     (global fetch can't raise undici's 10s connect timeout without a
//     dispatcher, and undici is not a dependency here), and `--resume`, which
//     skips surahs already complete in Mongo so a drop costs only its own surah.
const https = require('https');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { Surah, Ayah, Word } = require('../models');

const API = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = Number(process.env.QURAN_TRANSLATION_ID || 20); // 20 = Saheeh International (en)
const RETRIES = Number(process.env.QURAN_HTTP_RETRIES || 6);
const TIMEOUT_MS = Number(process.env.QURAN_HTTP_TIMEOUT_MS || 45000);
const RESUME = process.argv.includes('--resume');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// findOneAndUpdate quietly discarded `undefined` values; a hand-built `$set` for
// bulkWrite does not, so an absent field would be written as null. Drop them.
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// One pooled, keep-alive socket: reconnecting per request is exactly what this
// network is bad at, and serial requests need no more than one.
const agent = new https.Agent({ keepAlive: true, maxSockets: 1 });

function requestJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'GET', agent, timeout: TIMEOUT_MS, headers: { Accept: 'application/json' } },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const err = new Error(`GET ${url} → ${res.statusCode}`);
            err.statusCode = res.statusCode;
            return reject(err);
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`GET ${url} → malformed JSON (${e.message})`));
          }
        });
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new Error(`GET ${url} → timeout after ${TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.end();
  });
}

async function getJSON(url) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      return await requestJSON(url);
    } catch (err) {
      lastErr = err;
      // 4xx is our bug (bad translation id, bad path) — retrying just wastes time.
      if (err.statusCode >= 400 && err.statusCode < 500) throw err;
      if (attempt === RETRIES) break;
      const wait = Math.min(1000 * 2 ** (attempt - 1), 15000); // 1s,2s,4s,8s,15s…
      console.log(`  retry ${attempt}/${RETRIES - 1} in ${wait}ms — ${err.code || err.message}`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

async function importChapters() {
  const { chapters } = await getJSON(`${API}/chapters?language=en`);
  await Surah.bulkWrite(
    chapters.map((c) => ({
      updateOne: {
        filter: { number: c.id },
        update: {
          $set: clean({
            number: c.id,
            nameArabic: c.name_arabic,
            nameEnglish: c.name_simple,
            nameTranslation: c.translated_name?.name,
            revelationPlace: c.revelation_place,
            ayahCount: c.verses_count,
            bismillahPre: c.bismillah_pre,
          }),
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
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

    // One round trip per collection per page, not one per document. Written
    // one-at-a-time this is ~84,000 sequential round trips for the whole Qur'an
    // (6,236 ayahs + ~77,000 words); over a high-latency link that is measured
    // in hours. Batched it is ~2 round trips per 50 verses. Order doesn't
    // matter within a page, so the writes go unordered and in parallel.
    const ayahOps = [];
    const wordOps = [];

    for (const v of verses) {
      const ayahNumber = Number(String(v.verse_key).split(':')[1]);

      ayahOps.push({
        updateOne: {
          filter: { surah: n, number: ayahNumber },
          update: {
            $set: clean({
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
            }),
            $inc: { contentVersion: 1 },
          },
          upsert: true,
        },
      });

      // Words (skip the trailing "end of ayah" marker word when present)
      const words = (v.words || []).filter((w) => w.char_type_name === 'word');
      for (const w of words) {
        wordOps.push({
          updateOne: {
            filter: { surah: n, ayah: ayahNumber, position: w.position },
            update: {
              $set: clean({
                surah: n,
                ayah: ayahNumber,
                position: w.position,
                textUthmani: w.text_uthmani || w.text,
                textIndopak: w.text_indopak || undefined,
                transliteration: w.transliteration?.text || undefined,
                translation: w.translation?.text || undefined,
              }),
            },
            upsert: true,
          },
        });
      }
    }

    await Promise.all([
      ayahOps.length ? Ayah.bulkWrite(ayahOps, { ordered: false }) : null,
      wordOps.length ? Word.bulkWrite(wordOps, { ordered: false }) : null,
    ]);

    totalVerses += verses.length;
    const { next_page: nextPage } = data.pagination || {};
    if (!nextPage) break;
    page = nextPage;
    await sleep(150);
  }

  console.log(`Surah ${String(n).padStart(3)}: ${totalVerses} ayahs`);
}

// A surah counts as done when Mongo already holds every one of its ayahs *and*
// each has the IndoPak text — so a `--resume` after the textIndopak field was
// added still backfills rather than declaring the old rows complete.
//
// Surveyed in ONE aggregation rather than two counts per surah: 228 sequential
// round trips is a slow way to discover there is nothing to do.
async function surveyExisting() {
  const rows = await Ayah.aggregate([
    {
      $group: {
        _id: '$surah',
        total: { $sum: 1 },
        withIndopak: {
          $sum: { $cond: [{ $in: [{ $type: '$textIndopak' }, ['missing', 'null']] }, 0, { $cond: [{ $eq: ['$textIndopak', ''] }, 0, 1] }] },
        },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

const isComplete = (chapter, survey) => {
  const row = survey.get(chapter.id);
  return Boolean(row) && row.total >= chapter.verses_count && row.withIndopak >= chapter.verses_count;
};

async function run() {
  await connectDatabase();
  const chapters = await importChapters();

  const survey = RESUME ? await surveyExisting() : new Map();
  if (RESUME) {
    const done = chapters.filter((c) => isComplete(c, survey)).length;
    console.log(`Resume: ${done}/${chapters.length} surahs already complete — importing the rest.`);
  }

  const failed = [];
  for (const c of chapters) {
    if (RESUME && isComplete(c, survey)) continue;
    try {
      await importChapterVerses(c);
    } catch (err) {
      // Keep going: one unreachable surah shouldn't cost the other 113.
      console.error(`Surah ${String(c.id).padStart(3)}: FAILED — ${err.code || err.message}`);
      failed.push(c.id);
    }
    await sleep(200);
  }

  if (failed.length) {
    console.error(`\nIncomplete. ${failed.length} surah(s) failed: ${failed.join(', ')}`);
    console.error('Re-run `npm run import:quran -- --resume` to retry only what is missing.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Quran import complete.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
