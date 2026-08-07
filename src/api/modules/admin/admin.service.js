const ApiError = require('../../../utils/ApiError');
const pick = require('../../../utils/pick');
const cache = require('../../../services/cache.service');
const { Ayah, Word, QaidaLesson, QaidaPage, Dua } = require('../../../models');

// Every edit bumps the item's contentVersion and evicts the relevant cache prefix,
// so the public API and clients pick up the correction immediately.

async function updateAyah(surah, number, patch) {
  const ayah = await Ayah.findOneAndUpdate(
    { surah, number },
    {
      $set: pick(patch, ['textUthmani', 'textIndopak', 'translations', 'audioUrl', 'sajda']),
      $inc: { contentVersion: 1 },
    },
    { new: true },
  );
  if (!ayah) throw ApiError.notFound('Ayah not found');
  cache.clearPrefix('quran:');
  return ayah;
}

async function updateWord(surah, ayah, position, patch) {
  const word = await Word.findOneAndUpdate(
    { surah, ayah, position },
    { $set: pick(patch, ['textUthmani', 'textIndopak', 'translation', 'transliteration', 'override', 'audioUrl']) },
    { new: true },
  );
  if (!word) throw ApiError.notFound('Word not found');
  cache.clearPrefix('quran:');
  return word;
}

async function updateQaidaLesson(slug, patch) {
  const lesson = await QaidaLesson.findOneAndUpdate(
    { slug },
    {
      $set: pick(patch, ['title', 'subtitle', 'hint', 'complete', 'order', 'sourcePages']),
      $inc: { contentVersion: 1 },
    },
    { new: true },
  );
  if (!lesson) throw ApiError.notFound('Lesson not found');

  // Optionally replace the lesson's pages in one shot.
  if (Array.isArray(patch.pages)) {
    await QaidaPage.deleteMany({ lesson: lesson._id });
    await QaidaPage.insertMany(
      patch.pages.map((p, i) => ({
        lesson: lesson._id,
        order: p.order ?? i,
        heading: p.heading ?? null,
        columns: p.columns ?? 5,
        cells: (p.cells || []).map((c, ci) => ({ order: c.order ?? ci, text: c.text, overrides: c.overrides })),
      })),
    );
  }

  cache.clearPrefix('qaida:');
  return lesson;
}

async function updateDua(id, patch) {
  const dua = await Dua.findByIdAndUpdate(
    id,
    {
      $set: pick(patch, ['category', 'order', 'title', 'arabic', 'transliteration', 'translation', 'reference', 'audioUrl']),
      $inc: { contentVersion: 1 },
    },
    { new: true },
  );
  if (!dua) throw ApiError.notFound('Dua not found');
  cache.clearPrefix('dua:');
  return dua;
}

async function createDua(payload) {
  const dua = await Dua.create(payload);
  cache.clearPrefix('dua:');
  return dua;
}

async function deleteDua(id) {
  const dua = await Dua.findByIdAndDelete(id);
  if (!dua) throw ApiError.notFound('Dua not found');
  cache.clearPrefix('dua:');
  return { success: true };
}

module.exports = {
  updateAyah,
  updateWord,
  updateQaidaLesson,
  updateDua,
  createDua,
  deleteDua,
};
