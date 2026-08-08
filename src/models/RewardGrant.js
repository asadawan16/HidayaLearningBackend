const { Schema, model } = require('mongoose');

// A tutor-granted, time-boxed pass to the solo reward games. The token travels in
// a shareable link; the playground is otherwise never public (avoids game-only
// traffic — see IMPLEMENTATION_PLAN §8). Expiry is enforced on resolve.
const rewardGrantSchema = new Schema(
  {
    token: { type: String, unique: true, index: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session' },
    studentName: String,
    games: [String], // which solo games are unlocked (empty = all)
    durationMin: { type: Number, default: 15 },
    grantedAt: Date,
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true },
);

module.exports = model('RewardGrant', rewardGrantSchema);
