const { Schema, model } = require('mongoose');

const surahSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, index: true, min: 1, max: 114 },
    nameArabic: String,
    nameEnglish: String,
    nameTranslation: String, // e.g. "The Opening"
    revelationPlace: { type: String, enum: ['makkah', 'madinah'] },
    ayahCount: Number,
    bismillahPre: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = model('Surah', surahSchema);
