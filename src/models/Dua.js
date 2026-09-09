const { Schema, model } = require('mongoose');

const duaSchema = new Schema(
  {
    category: { type: String, index: true }, // e.g. "morning", "before-sleep"
    order: Number,
    title: { en: String, ur: String, ar: String },
    // NOT required. Almost every du'ā here is an Arabic string the frontend
    // derives everything from, but not all of them: the du'ā a child is taught
    // to say around their Qur'an lesson is passed down in Urdu and English, and
    // inventing an Arabic original for it would be putting words in the
    // supplication. A du'ā must carry Arabic OR a translation — that pair is
    // enforced in admin.validation.js, where a request can be rejected with a
    // message, rather than here.
    arabic: String,
    transliteration: String,
    translation: { en: String, ur: String },
    // Lifts a du'ā out of its category and onto the top of the Du'ās page.
    // Category order can't express "first": the page groups by category and a
    // group has to be one of the filter chips, so a du'ā that belongs above all
    // of them has to be marked, not sorted.
    featured: { type: Boolean, default: false, index: true },
    reference: String, // source (Quran ref / hadith)
    audioUrl: String,
    contentVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = model('Dua', duaSchema);
