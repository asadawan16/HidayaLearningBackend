const { Schema, model } = require('mongoose');

// One of the six Kalimas. Kept as its own collection rather than a Dua category
// because it is a fixed, ordered, numbered set that people learn as a sequence
// ("the third Kalima"), and it carries fields duas do not: an Urdu name, and the
// meaning/virtue a teacher recites alongside it. Folding it into Dua would mean
// every dua carrying nullable Kalima fields, and the Du'ās page silently growing
// a seventh category that must never be filtered out.
//
// The Arabic string is the source of truth, exactly as everywhere else: the
// frontend derives letters, harakat, transliteration and tajweed from it.
const kalimaSchema = new Schema(
  {
    order: { type: Number, required: true, index: true }, // 1..6
    slug: { type: String, required: true, unique: true, index: true },
    name: { en: String, ur: String, ar: String }, // "First Kalima · Tayyab"
    arabic: { type: String, required: true },
    transliteration: String,
    translation: { en: String, ur: String },
    virtue: String, // the short "why we say this" a teacher adds
    reference: String,
    audioUrl: String,
    contentVersion: { type: Number, default: 1 }, // bumped on edit → cache-bust
  },
  { timestamps: true },
);

module.exports = model('Kalima', kalimaSchema);
