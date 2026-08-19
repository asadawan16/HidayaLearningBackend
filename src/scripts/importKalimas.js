// Seed the Kalima collection from data/kalimas.json (the six Kalimas).
// Idempotent: upserts by slug, so re-running refreshes the text without
// duplicating. Everything here is admin-editable afterwards — treat this JSON as
// the starting set, not the record.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { Kalima } = require('../models');

async function run() {
  const file = path.join(__dirname, 'data', 'kalimas.json');
  const kalimas = JSON.parse(fs.readFileSync(file, 'utf8'));

  await connectDatabase();

  let upserts = 0;
  for (const k of kalimas) {
    await Kalima.findOneAndUpdate(
      { slug: k.slug },
      { $set: k, $inc: { contentVersion: 1 } },
      { upsert: true, new: true },
    );
    upserts += 1;
  }

  console.log(`Seeded ${upserts} kalimas`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
