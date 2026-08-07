const { Schema, model } = require('mongoose');

// A game instance. `versus` games require an active teaching Session (tutor vs
// student); `solo` games can be spawned from a tutor-granted reward.
const gameSessionSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'Session', index: true },
    game: { type: String, required: true }, // 'tictactoe', 'letter-match', ...
    mode: { type: String, enum: ['solo', 'versus'], default: 'versus' },
    players: [{ role: String, name: String }],
    state: Schema.Types.Mixed,
    status: { type: String, enum: ['open', 'playing', 'finished'], default: 'open' },
    expiresAt: Date,
  },
  { timestamps: true },
);

module.exports = model('GameSession', gameSessionSchema);
