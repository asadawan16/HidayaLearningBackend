// Seed the Duas collection from data/duas.json.
//
// SEEDS AN EMPTY COLLECTION. Refuses a populated one unless --force.
//
// This used to upsert on `{ category, order }`, which looks like an identity and
// is not one: du'ās are admin-editable and the portal renumbers them, so by the
// time this was next run the seeded "Before sleeping" was sleep #12, the key
// matched nothing, and the upsert INSERTED a second copy. One run put seven
// duplicates into a live collection.
//
// The instinct is to find a better key. There isn't one. Matching on the Arabic
// — the source of truth everywhere else in this project — misses too, because
// the copies in the portal have been re-typed in IndoPak orthography and are a
// different string for the same words. Titles get edited. Once this collection
// has been curated, nothing in this file reliably identifies a row in it.
//
// So the honest rule is that this JSON is the INITIAL set and the portal owns
// the collection afterwards. Adding one du'ā to a live site is an admin-portal
// job (or a one-off insert), not a re-seed — and the guard below is what makes
// that hard to get wrong at 3am.
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { Dua } = require('../models');

const force = process.argv.includes('--force');

async function run() {
  const file = path.join(__dirname, 'data', 'duas.json');
  const duas = JSON.parse(fs.readFileSync(file, 'utf8'));

  await connectDatabase();

  const existing = await Dua.countDocuments();
  if (existing > 0 && !force) {
    console.log(`Duas: ${existing} already in the database — nothing seeded.`);
    console.log('This file is the initial set; the admin portal owns the collection after that.');
    console.log('Re-seeding a curated collection duplicates it — pass --force only if you mean it.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const created = await Dua.insertMany(duas);
  console.log(`Seeded ${created.length} duas${force && existing ? ` (forced, on top of ${existing} existing)` : ''}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
