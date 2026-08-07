const { Schema, model } = require('mongoose');

const academySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    contactName: String,
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: String,
    country: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
      index: true,
    },
    // How many live sessions this academy may run at once (set by admin on approval).
    maxConcurrentSessions: { type: Number, default: 1, min: 0 },
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true },
);

module.exports = model('Academy', academySchema);
