const { Schema, model } = require('mongoose');

// One word within an ayah. The Arabic text is the source of truth; letters,
// harakat and tajweed roles are derived on the client by the shared arabic engine.
// `override` lets admins correct anything the engine can't infer.
const wordSchema = new Schema(
  {
    surah: { type: Number, required: true, index: true },
    ayah: { type: Number, required: true },
    position: { type: Number, required: true }, // 1-based within the ayah
    textUthmani: { type: String, required: true },
    textIndopak: String,
    translation: String,
    transliteration: String,
    override: {
      translit: String,
      tajweedRole: String,
    },
    audioUrl: String, // per-word recitation (hotlinked from open CDN)
  },
  { timestamps: true },
);

wordSchema.index({ surah: 1, ayah: 1, position: 1 }, { unique: true });

module.exports = model('Word', wordSchema);
