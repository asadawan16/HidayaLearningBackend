# Data scripts

Run from the backend root (`node src/scripts/<file>`), with `MONGODB_URI` set in `.env`.

| Script | Command | Purpose |
| --- | --- | --- |
| `seedAdmin.js` | `npm run seed:admin -- "Name" email pass` | Create the first superadmin. |
| `importQaida.js` | `npm run import:qaida` | Seed QaidaLesson/QaidaPage. Content ported from the verified frontend Qaida (drills generated from the alphabet; word pages transcribed from `../Hidaya Qaida/`). **No network needed.** |
| `importDuas.js` | `npm run import:duas` | Seed the Duas collection from `data/duas.json` (curated starter set, admin-editable). **Refuses a non-empty collection** — see below. **No network needed.** |
| `importQuran.js` | `npm run import:quran` | Import full word-by-word Quran from the open Quran.com API v4. **Requires network.** Optional `QURAN_TRANSLATION_ID` env (default **20** = Saheeh Intl). |
| — | `npm run import:quran:resume` | Same, but skips surahs already complete in Mongo — use this to finish an import that a dropped connection interrupted. |
| — | `npm run seed:content` | Runs Qaida + Duas together (the offline seeds). |

**Import principles**
- Idempotent: safe to re-run (upsert, never duplicate).
- **`import:duas` is the exception, and it seeds an EMPTY collection only.** Its upsert key used to be
  `{ category, order }`, which is not an identity: the portal renumbers du'ās, so a re-run matched
  nothing and inserted a second copy of everything — seven duplicates into a live collection, in one
  command. There is no better key either; the curated rows have been re-typed in IndoPak orthography,
  so even the Arabic no longer matches the JSON. Once this collection has been curated **the portal
  owns it**: add a du'ā there, not by editing `data/duas.json` and re-seeding. `--force` exists and
  will duplicate the collection, which is exactly what it says it does.
- `importQuran` talks to Cloudflare-fronted api.quran.com, which some networks reach unreliably.
  It retries with backoff (`QURAN_HTTP_RETRIES`, `QURAN_HTTP_TIMEOUT_MS`), carries on past a surah it
  couldn't fetch, and exits non-zero naming them — re-run the `:resume` variant until it exits clean.
- The Arabic string is authoritative — letters/harakat/tajweed are derived on the client.
- After a bulk import, content caches are cold by default; the first request repopulates them.
