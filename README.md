# Hidaya Online — Backend

API + real-time server for the Hidaya Online learning platform.
**Express · MongoDB (Mongoose) · Socket.IO**, CommonJS, single persistent Node process.

## Architecture

```
app.js                     # cPanel/Passenger entry — just requires src/server.js
src/
├─ server.js               # bootstrap: connect DB → build app → attach sockets → listen
├─ express.js              # Express app factory (helmet, cors, compression, routes)
├─ config/                 # env + database connection
├─ api/
│  ├─ index.js             # mounts /api/* routers
│  └─ modules/<feature>/   # each: routes · controller · service · validation
│     ├─ health/  auth/  content/  academy/
├─ models/                 # Mongoose schemas (+ central index.js)
├─ middlewares/            # auth, authorize, validate, rateLimit, error, notFound
├─ services/               # cache (LRU), email (nodemailer), token (JWT)
├─ realtime/               # Socket.IO gateway, room manager, handlers
└─ scripts/                # seedAdmin + content import (Phase 1)
```

**Layered flow:** `route → validate → controller → service → model`. Controllers stay thin; business logic lives in services; the error middleware formats everything.

**The Arabic string is the source of truth.** Content stores the Arabic text; letters, harakat and tajweed roles are derived on the client by the shared engine. Admins fix content by editing the string (plus optional per-item overrides).

## Local development

```bash
cp .env.example .env      # fill MONGODB_URI (Atlas) + secrets
npm install
npm run dev               # nodemon on app.js
npm run seed:admin -- "Admin" admin@hidaya.online StrongPass123
```

Health check: `GET http://localhost:3000/api/health`

## Key endpoints (Phase 1)

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/health` | public |
| GET | `/api/content/quran/surahs` | public (cached) |
| GET | `/api/content/quran/surahs/:number` | public (cached) |
| GET | `/api/content/qaida/lessons` | public (cached) |
| GET | `/api/content/qaida/lessons/:slug` | public (cached) |
| GET | `/api/content/duas` | public (cached) |
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | authenticated |
| POST | `/api/academies/apply` | public |
| GET | `/api/academies/applications` | admin |
| POST | `/api/academies/applications/:id/approve` | admin |

## Real-time (Socket.IO)

- Shares the **same port** as Express (required on cPanel).
- Transports `['polling','websocket']` so it works behind LiteSpeed even without a WS upgrade.
- Handshake auth: tutor **access token**, or student **session token + code**.
- Live-mirror events (`session:cursor|hover|focus|page|scroll|theme|font|tajweed|context`) relay tutor → students. Room state is in-memory (no Redis; single instance).

## Deploying on cPanel / Hostinger

1. **Database:** create a free **MongoDB Atlas** cluster (Hostinger shared hosting has no MongoDB). Allow-list the server IP; copy the connection string into `MONGODB_URI`.
2. **Upload** the `HidayaLearningBackend/` folder (exclude `node_modules`) to the server, e.g. `~/hidaya-api`.
3. cPanel → **Setup Node.js App**:
   - Application root: `hidaya-api`
   - Application startup file: `app.js`
   - Node version: 18+
   - Add all environment variables from `.env.example` (set real secrets).
4. Click **Run NPM Install**, then **Start**. Passenger provides the port; the app reads `process.env.PORT`.
5. Point a subdomain (e.g. `api.hidaya.online`) at the app; set `CLIENT_ORIGINS` to your frontend origin(s).
6. Create the first admin: run `npm run seed:admin -- "Admin" you@site.com Pass` from the app's terminal, or a one-off Node command.

**Notes**
- `bcryptjs` (pure JS) is used instead of native `bcrypt` so nothing needs to compile on shared hosting.
- If WebSocket upgrades are blocked by the host, Socket.IO automatically stays on long-polling — live teaching still works.
- Scaling to multiple instances later requires sticky sessions + a Socket.IO adapter (the only Redis-shaped dependency, intentionally deferred).
