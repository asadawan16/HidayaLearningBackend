// Seed the Duas collection from data/duas.json.
// Idempotent: upserts by (category, order). Content is admin-editable afterwards,
// so treat this JSON as an initial curated set — verify/expand it in the portal.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { Dua } = require('../models');

async function run() {
  const file = path.join(__dirname, 'data', 'duas.json');
  const duas = JSON.parse(fs.readFileSync(file, 'utf8'));

  await connectDatabase();

  let upserts = 0;
  for (const d of duas) {
    await Dua.findOneAndUpdate(
      { category: d.category, order: d.order },
      { $set: d, $inc: { contentVersion: 1 } },
      { upsert: true, new: true },
    );
    upserts += 1;
  }

  console.log(`Seeded ${upserts} duas`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
