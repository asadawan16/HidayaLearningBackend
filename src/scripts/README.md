# Data scripts

Run from the backend root (`node src/scripts/<file>`), with `MONGODB_URI` set in `.env`.

| Script | Command | Purpose |
| --- | --- | --- |
| `seedAdmin.js` | `npm run seed:admin -- "Name" email pass` | Create the first superadmin. |
| `importQaida.js` | `npm run import:qaida` | Seed QaidaLesson/QaidaPage. Content ported from the verified frontend Qaida (drills generated from the alphabet; word pages transcribed from `../Hidaya Qaida/`). **No network needed.** |
| `importDuas.js` | `npm run import:duas` | Seed the Duas collection from `data/duas.json` (curated starter set, admin-editable). **No network needed.** |
| `importQuran.js` | `npm run import:quran` | Import full word-by-word Quran from the open Quran.com API v4. **Requires network.** Optional `QURAN_TRANSLATION_ID` env (default 131 = Saheeh Intl). |
| — | `npm run seed:content` | Runs Qaida + Duas together (the offline seeds). |

**Import principles**
- Idempotent: safe to re-run (upsert, never duplicate).
- The Arabic string is authoritative — letters/harakat/tajweed are derived on the client.
- After a bulk import, content caches are cold by default; the first request repopulates them.
