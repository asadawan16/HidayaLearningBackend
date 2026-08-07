const { Schema, model } = require('mongoose');

// Public registration form submissions. Admin reviews → approve creates an Academy
// + academy_admin User and emails a temp password.
const applicationSchema = new Schema(
  {
    academyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    contactPhone: String,
    country: String,
    studentsCount: Number,
    message: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    academy: { type: Schema.Types.ObjectId, ref: 'Academy' },
  },
  { timestamps: true },
);

module.exports = model('AcademyApplication', applicationSchema);
