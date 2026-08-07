const { Schema, model } = require('mongoose');

const qaidaLessonSchema = new Schema(
  {
    order: { type: Number, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { en: String, ur: String, tr: String },
    subtitle: String,
    hint: String,
    sourcePages: [Number], // original Qaida scan page numbers this lesson covers
    complete: { type: Boolean, default: false }, // false = still pending transcription
    contentVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = model('QaidaLesson', qaidaLessonSchema);
