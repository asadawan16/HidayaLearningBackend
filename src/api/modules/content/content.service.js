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
  listQaidaLessons,
  getQaidaLesson,
  listDuas,
  invalidate,
};
