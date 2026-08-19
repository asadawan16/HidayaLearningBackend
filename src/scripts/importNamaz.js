// Seed the NamazStep collection from data/namaz.json — the salah in the order
// it is performed, each step carrying its position and what is recited in it.
// Idempotent: upserts by slug. Admin-editable afterwards.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { NamazStep } = require('../models');

async function run() {
  const file = path.join(__dirname, 'data', 'namaz.json');
  const steps = JSON.parse(fs.readFileSync(file, 'utf8'));

  await connectDatabase();

  let upserts = 0;
  for (const s of steps) {
    await NamazStep.findOneAndUpdate(
      { slug: s.slug },
      { $set: s, $inc: { contentVersion: 1 } },
      { upsert: true, new: true },
    );
    upserts += 1;
  }

  console.log(`Seeded ${upserts} namaz steps`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
