const ApiError = require('../../../utils/ApiError');
const pick = require('../../../utils/pick');
const cache = require('../../../services/cache.service');
const { Ayah, Word, QaidaLesson, QaidaPage, Dua, Kalima, NamazStep } = require('../../../models');

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

// ---- Kalimas ----
// Same shape as the Dua CRUD above (create/patch/delete, bump contentVersion,
// evict the prefix) — the client asked to be able to *add* Kalimas, not just
// correct the six, so this is full CRUD rather than edit-only.
const KALIMA_FIELDS = [
  'order', 'slug', 'name', 'arabic', 'transliteration', 'translation', 'virtue', 'reference', 'audioUrl',
];

async function createKalima(payload) {
  const kalima = await Kalima.create(payload);
  cache.clearPrefix('kalima:');
  return kalima;
}

async function updateKalima(id, patch) {
  const kalima = await Kalima.findByIdAndUpdate(
    id,
    { $set: pick(patch, KALIMA_FIELDS), $inc: { contentVersion: 1 } },
    { new: true },
  );
  if (!kalima) throw ApiError.notFound('Kalima not found');
  cache.clearPrefix('kalima:');
  return kalima;
}

async function deleteKalima(id) {
  const kalima = await Kalima.findByIdAndDelete(id);
  if (!kalima) throw ApiError.notFound('Kalima not found');
  cache.clearPrefix('kalima:');
  return { success: true };
}

// ---- Namaz steps ----
const NAMAZ_FIELDS = [
  'order', 'slug', 'name', 'pose', 'arabic', 'transliteration', 'translation', 'note',
  'repetitions', 'optional',
];

async function createNamazStep(payload) {
  const step = await NamazStep.create(payload);
  cache.clearPrefix('namaz:');
  return step;
}

async function updateNamazStep(id, patch) {
  const step = await NamazStep.findByIdAndUpdate(
    id,
    { $set: pick(patch, NAMAZ_FIELDS), $inc: { contentVersion: 1 } },
    { new: true },
  );
  if (!step) throw ApiError.notFound('Namaz step not found');
  cache.clearPrefix('namaz:');
  return step;
}

async function deleteNamazStep(id) {
  const step = await NamazStep.findByIdAndDelete(id);
  if (!step) throw ApiError.notFound('Namaz step not found');
  cache.clearPrefix('namaz:');
  return { success: true };
}

module.exports = {
  updateAyah,
  updateWord,
  updateQaidaLesson,
  updateDua,
  createDua,
  deleteDua,
  createKalima,
  updateKalima,
  deleteKalima,
  createNamazStep,
  updateNamazStep,
  deleteNamazStep,
};
