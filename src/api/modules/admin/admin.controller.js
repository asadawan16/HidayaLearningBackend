const asyncHandler = require('../../../utils/asyncHandler');
const service = require('./admin.service');

const updateAyah = asyncHandler(async (req, res) => {
  const data = await service.updateAyah(Number(req.params.surah), Number(req.params.number), req.body);
  res.json({ success: true, data });
});

const updateWord = asyncHandler(async (req, res) => {
  const data = await service.updateWord(
    Number(req.params.surah),
    Number(req.params.ayah),
    Number(req.params.position),
    req.body,
  );
  res.json({ success: true, data });
});

const updateQaidaLesson = asyncHandler(async (req, res) => {
  const data = await service.updateQaidaLesson(req.params.slug, req.body);
  res.json({ success: true, data });
});

const createDua = asyncHandler(async (req, res) => {
  const data = await service.createDua(req.body);
  res.status(201).json({ success: true, data });
});

const updateDua = asyncHandler(async (req, res) => {
  const data = await service.updateDua(req.params.id, req.body);
  res.json({ success: true, data });
});

const deleteDua = asyncHandler(async (req, res) => {
  const data = await service.deleteDua(req.params.id);
  res.json({ success: true, ...data });
});

module.exports = { updateAyah, updateWord, updateQaidaLesson, createDua, updateDua, deleteDua };
