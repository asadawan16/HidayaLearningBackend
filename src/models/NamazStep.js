const { Schema, model } = require('mongoose');

// One step of the salah, in the order it is performed. A "step" is a physical
// position plus what is recited while in it, because that is how it is taught
// and how a student needs to see it — a position chart with no words is a poster,
// and words with no position is a list of duas.
//
// `pose` names one of the illustrations the frontend draws (see
// components/NamazPose.jsx). It is a key, not an image URL, so the drawing stays
// a theme-aware SVG that recolours with the app rather than a flat asset that
// has to be re-exported for every theme.
const namazStepSchema = new Schema(
  {
    order: { type: Number, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { en: String, ur: String, ar: String },
    pose: { type: String, required: true }, // qiyam | takbir | ruku | qawmah | sujood | jalsa | tashahhud | salam
    arabic: String, // what is recited here (may be empty for a pure movement)
    transliteration: String,
    translation: { en: String, ur: String },
    note: String, // what the body does — the instruction, not the recitation
    repetitions: { type: Number, default: 1 }, // e.g. tasbeeh said 3×
    optional: { type: Boolean, default: false }, // sunnah/mustahab rather than fard
    contentVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = model('NamazStep', namazStepSchema);
