const cache = require('../../../services/cache.service');
const {
  Surah, Ayah, Word, QaidaLesson, QaidaPage, Dua, Kalima, NamazStep,
} = require('../../../models');

// ---- Quran ----
//
// PAYLOAD SHAPE — these three projections are load-bearing, not tidiness.
//
// A surah document set spread straight out of Mongo carries `_id`, `__v`,
// `createdAt`, `updatedAt` and, on every word, a `surah`/`ayah` back-reference
// the response already implies by nesting. On Al-Baqarah that is 935KB of a
// 2.09MB response — 45% of the bytes — for fields the client never reads
// (see quranService.js: normalizeAyah/normalizeWord take a fixed list). The
// cost is paid four times over: Mongo→Node transfer, the LRU cache's resident
// size, JSON.stringify per cache miss, and the client's parse into a
// localStorage entry that is already flirting with the 5MB quota.
//
// So each document is rebuilt into exactly the fields the reader uses. The
// `.select()` calls make Mongo send less in the first place; the mappers make
// sure a field added to a schema later doesn't silently re-enter the payload.
const SURAH_FIELDS = 'number nameArabic nameEnglish nameTranslation revelationPlace ayahCount bismillahPre -_id';
const AYAH_FIELDS = 'surah number numberGlobal textUthmani textIndopak sajda translations audioUrl -_id';
const WORD_FIELDS = 'surah ayah position textUthmani textIndopak translation transliteration override audioUrl -_id';

const pickSurah = (s) => (s ? {
  number: s.number,
  nameArabic: s.nameArabic,
  nameEnglish: s.nameEnglish,
  nameTranslation: s.nameTranslation,
  revelationPlace: s.revelationPlace,
  ayahCount: s.ayahCount,
  bismillahPre: s.bismillahPre,
} : null);

// `surah`/`ayah` are selected above because the grouping below needs them, and
// dropped here because the nesting already says which ayah a word belongs to.
const pickWord = (w) => ({
  position: w.position,
  textUthmani: w.textUthmani,
  textIndopak: w.textIndopak,
  translation: w.translation,
  transliteration: w.transliteration,
  override: w.override,
  audioUrl: w.audioUrl,
});

const pickAyah = (a, words) => ({
  number: a.number,
  numberGlobal: a.numberGlobal,
  textUthmani: a.textUthmani,
  textIndopak: a.textIndopak,
  sajda: a.sajda,
  translations: a.translations,
  audioUrl: a.audioUrl,
  words,
});

const listSurahs = () =>
  cache.wrap('quran:surahs', 0, async () =>
    (await Surah.find().select(SURAH_FIELDS).sort('number').lean()).map(pickSurah));

const getSurah = (number) =>
  cache.wrap(`quran:surah:${number}`, 0, async () => {
    const surah = await Surah.findOne({ number }).select(SURAH_FIELDS).lean();
    if (!surah) return null;

    const [ayahs, words] = await Promise.all([
      Ayah.find({ surah: number }).select(AYAH_FIELDS).sort('number').lean(),
      Word.find({ surah: number }).select(WORD_FIELDS).sort({ ayah: 1, position: 1 }).lean(),
    ]);

    const wordsByAyah = words.reduce((acc, w) => {
      (acc[w.ayah] ||= []).push(pickWord(w));
      return acc;
    }, {});

    return {
      surah: pickSurah(surah),
      ayahs: ayahs.map((a) => pickAyah(a, wordsByAyah[a.number] || [])),
    };
  });

// ---- Quran by juz (para) ----
// A juz is a contiguous slice of the mushaf, so each (juz, surah) pair is a
// contiguous ayah range — $min/$max give its bounds.
const listJuz = () =>
  cache.wrap('quran:juz', 0, async () => {
    const [rows, surahs] = await Promise.all([
      Ayah.aggregate([
        { $match: { juz: { $gte: 1, $lte: 30 } } },
        { $project: { juz: 1, surah: 1, number: 1 } },
        {
          $group: {
            _id: { juz: '$juz', surah: '$surah' },
            fromAyah: { $min: '$number' },
            toAyah: { $max: '$number' },
            ayahCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.juz': 1, '_id.surah': 1 } },
      ]),
      Surah.find().select(SURAH_FIELDS).sort('number').lean(),
    ]);

    const surahByNumber = new Map(surahs.map((s) => [s.number, s]));
    const byJuz = new Map();

    for (const row of rows) {
      const { juz, surah } = row._id;
      const entry = byJuz.get(juz) || { number: juz, ayahCount: 0, surahs: [] };
      const meta = surahByNumber.get(surah);
      entry.ayahCount += row.ayahCount;
      entry.surahs.push({
        number: surah,
        nameArabic: meta?.nameArabic,
        nameEnglish: meta?.nameEnglish,
        nameTranslation: meta?.nameTranslation,
        fromAyah: row.fromAyah,
        toAyah: row.toAyah,
        ayahCount: row.ayahCount,
      });
      byJuz.set(juz, entry);
    }

    return [...byJuz.values()].sort((a, b) => a.number - b.number);
  });

const getJuz = (number) =>
  cache.wrap(`quran:juz:${number}`, 0, async () => {
    const ayahs = await Ayah.find({ juz: number }).select(AYAH_FIELDS).sort({ surah: 1, number: 1 }).lean();
    if (!ayahs.length) return null;

    // Group into per-surah sections (a juz spans one or more surahs).
    const sections = [];
    for (const a of ayahs) {
      const last = sections[sections.length - 1];
      if (last && last.surahNumber === a.surah) last.ayahs.push(a);
      else sections.push({ surahNumber: a.surah, ayahs: [a] });
    }

    const [surahs, words] = await Promise.all([
      Surah.find({ number: { $in: sections.map((s) => s.surahNumber) } }).select(SURAH_FIELDS).lean(),
      Word.find({
        $or: sections.map((s) => ({
          surah: s.surahNumber,
          ayah: { $gte: s.ayahs[0].number, $lte: s.ayahs[s.ayahs.length - 1].number },
        })),
      })
        .select(WORD_FIELDS)
        .sort({ surah: 1, ayah: 1, position: 1 })
        .lean(),
    ]);

    const surahByNumber = new Map(surahs.map((s) => [s.number, s]));
    const wordsByKey = words.reduce((acc, w) => {
      (acc[`${w.surah}:${w.ayah}`] ||= []).push(pickWord(w));
      return acc;
    }, {});

    return {
      juz: { number, ayahCount: ayahs.length },
      sections: sections.map((s) => ({
        surah: pickSurah(surahByNumber.get(s.surahNumber)) || { number: s.surahNumber },
        ayahs: s.ayahs.map((a) => pickAyah(a, wordsByKey[`${a.surah}:${a.number}`] || [])),
      })),
    };
  });

// ---- Qaida ----
const listQaidaLessons = () =>
  cache.wrap('qaida:lessons', 0, () => QaidaLesson.find().sort('order').lean());

const getQaidaLesson = (slug) =>
  cache.wrap(`qaida:lesson:${slug}`, 0, async () => {
    const lesson = await QaidaLesson.findOne({ slug }).lean();
    if (!lesson) return null;
    const pages = await QaidaPage.find({ lesson: lesson._id }).sort('order').lean();
    return { lesson, pages };
  });

// ---- Duas ----
// `featured: -1` first so a featured du'ā arrives at the head of the list even
// for a client that doesn't know the flag — the page pulls them out by it, but
// the order shouldn't depend on that.
const listDuas = (category) =>
  cache.wrap(`dua:list:${category || 'all'}`, 0, () =>
    Dua.find(category ? { category } : {}).sort({ featured: -1, category: 1, order: 1 }).lean());

// ---- Kalimas ----
const listKalimas = () =>
  cache.wrap('kalima:all', 0, () => Kalima.find().sort('order').lean());

const getKalima = (slug) =>
  cache.wrap(`kalima:one:${slug}`, 0, () => Kalima.findOne({ slug }).lean());

// ---- Namaz ----
const listNamazSteps = () =>
  cache.wrap('namaz:steps', 0, () => NamazStep.find().sort('order').lean());

// Called by the admin module after any content edit to invalidate caches.
const invalidate = (kind) => cache.clearPrefix(`${kind}:`);

module.exports = {
  listSurahs,
  getSurah,
  listJuz,
  getJuz,
  listQaidaLessons,
  getQaidaLesson,
  listDuas,
  listKalimas,
  getKalima,
  listNamazSteps,
  invalidate,
};
