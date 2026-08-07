const { Schema, model } = require('mongoose');

// A teaching session. `live` = WebSocket mirror (tutor activity shown to student);
// `screenshare` = no realtime, tutor shares their own screen elsewhere.
const sessionSchema = new Schema(
  {
    host: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    academy: { type: Schema.Types.ObjectId, ref: 'Academy', index: true },
    type: { type: String, enum: ['live', 'screenshare'], default: 'live' },
    code: { type: String, unique: true, index: true }, // short join code in the link
    studentToken: { type: String, index: true }, // opaque token for the student link
    durationMin: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended', 'expired'],
      default: 'active',
      index: true,
    },
    startedAt: Date,
    expiresAt: { type: Date, index: true },
    endedAt: Date,
    // What the tutor is currently teaching, so a reconnecting student resyncs.
    context: { resource: String, ref: String },
  },
  { timestamps: true },
);

module.exports = model('Session', sessionSchema);
