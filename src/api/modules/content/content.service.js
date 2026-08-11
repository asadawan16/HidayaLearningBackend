const cache = require('../../../services/cache.service');
const { Surah, Ayah, Word, QaidaLesson, QaidaPage, Dua } = require('../../../models');

// ---- Quran ----
const listSurahs = () =>
  cache.wrap('quran:surahs', 0, () => Surah.find().sort('number').lean());

const getSurah = (number) =>
  cache.wrap(`quran:surah:${number}`, 0, async () => {
    const surah = await Surah.findOne({ number }).lean();
    if (!surah) return null;

    const [ayahs, words] = await Promise.all([
      Ayah.find({ surah: number }).sort('number').lean(),
      Word.find({ surah: number }).sort({ ayah: 1, position: 1 }).lean(),
    ]);

    const wordsByAyah = words.reduce((acc, w) => {
      (acc[w.ayah] ||= []).push(w);
      return acc;
    }, {});

    return {
      surah,
      ayahs: ayahs.map((a) => ({ ...a, words: wordsByAyah[a.number] || [] })),
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
      Surah.find().sort('number').lean(),
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
    const ayahs = await Ayah.find({ juz: number }).sort({ surah: 1, number: 1 }).lean();
    if (!ayahs.length) return null;

    // Group into per-surah sections (a juz spans one or more surahs).
    const sections = [];
    for (const a of ayahs) {
      const last = sections[sections.length - 1];
      if (last && last.surahNumber === a.surah) last.ayahs.push(a);
      else sections.push({ surahNumber: a.surah, ayahs: [a] });
    }

    const [surahs, words] = await Promise.all([
      Surah.find({ number: { $in: sections.map((s) => s.surahNumber) } }).lean(),
      Word.find({
        $or: sections.map((s) => ({
          surah: s.surahNumber,
          ayah: { $gte: s.ayahs[0].number, $lte: s.ayahs[s.ayahs.length - 1].number },
        })),
      })
        .sort({ surah: 1, ayah: 1, position: 1 })
        .lean(),
    ]);

    const surahByNumber = new Map(surahs.map((s) => [s.number, s]));
    const wordsByKey = words.reduce((acc, w) => {
      (acc[`${w.surah}:${w.ayah}`] ||= []).push(w);
      return acc;
    }, {});

    return {
      juz: { number, ayahCount: ayahs.length },
      sections: sections.map((s) => ({
        surah: surahByNumber.get(s.surahNumber) || { number: s.surahNumber },
        ayahs: s.ayahs.map((a) => ({ ...a, words: wordsByKey[`${a.surah}:${a.number}`] || [] })),
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
const listDuas = (category) =>
  cache.wrap(`dua:list:${category || 'all'}`, 0, () =>
    Dua.find(category ? { category } : {}).sort({ category: 1, order: 1 }).lean());

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
  invalidate,
};
