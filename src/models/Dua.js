const { Schema, model } = require('mongoose');

const duaSchema = new Schema(
  {
    category: { type: String, index: true }, // e.g. "morning", "before-sleep"
    order: Number,
    title: { en: String, ur: String, ar: String },
    arabic: { type: String, required: true },
    transliteration: String,
    translation: { en: String, ur: String },
    reference: String, // source (Quran ref / hadith)
    audioUrl: String,
    contentVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = model('Dua', duaSchema);
