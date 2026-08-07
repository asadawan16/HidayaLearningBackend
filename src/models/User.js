const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'academy_admin', 'tutor'],
      default: 'tutor',
      index: true,
    },
    academy: { type: Schema.Types.ObjectId, ref: 'Academy', default: null, index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    mustResetPassword: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
  return this;
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = model('User', userSchema);
