const { Schema, model } = require('mongoose');

// A cell holds one Arabic string (letter / joined form / word) — the source of
// truth. Cells are embedded because they are always read with their page.
const cellSchema = new Schema(
  {
    order: Number,
    text: { type: String, required: true },
    overrides: Schema.Types.Mixed, // optional per-cell engine corrections
  },
  { _id: false },
);

const qaidaPageSchema = new Schema(
  {
    lesson: { type: Schema.Types.ObjectId, ref: 'QaidaLesson', required: true, index: true },
    order: { type: Number, default: 0 },
    heading: String,
    columns: { type: Number, default: 5 },
    cells: [cellSchema],
  },
  { timestamps: true },
);

module.exports = model('QaidaPage', qaidaPageSchema);
