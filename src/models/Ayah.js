const { Schema, model } = require('mongoose');

const translationSchema = new Schema(
  { lang: String, source: String, text: String },
  { _id: false },
);

const ayahSchema = new Schema(
  {
    surah: { type: Number, required: true, index: true },
    number: { type: Number, required: true }, // ayah number within the surah
    numberGlobal: { type: Number, index: true }, // 1..6236
    juz: Number,
    hizb: Number,
    page: Number,
    ruku: Number,
    textUthmani: { type: String, required: true }, // Arabic string = source of truth
    textIndopak: String,
    sajda: { type: Boolean, default: false },
    translations: [translationSchema],
    audioUrl: String, // per-ayah recitation (hotlinked from open CDN)
    contentVersion: { type: Number, default: 1 }, // bumped on edit → cache-bust
  },
  { timestamps: true },
);

ayahSchema.index({ surah: 1, number: 1 }, { unique: true });

module.exports = model('Ayah', ayahSchema);
