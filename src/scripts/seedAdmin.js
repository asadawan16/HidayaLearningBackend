// Create the first superadmin.
// Usage: node src/scripts/seedAdmin.js "Full Name" admin@example.com StrongPass123
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { User } = require('../models');

(async () => {
  const [, , name, email, password] = process.argv;
  if (!name || !email || !password) {
    console.error('Usage: node src/scripts/seedAdmin.js "Full Name" email password');
    process.exit(1);
  }

  await connectDatabase();

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    console.log(`User already exists: ${email}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const user = new User({ name, email, role: 'superadmin' });
  await user.setPassword(password);
  await user.save();

  console.log(`Superadmin created: ${email}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
