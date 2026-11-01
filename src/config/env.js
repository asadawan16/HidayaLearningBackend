require('dotenv').config();

function opt(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function warnMissing(name) {
  if (!process.env[name]) {
    // Don't hard-crash during early scaffolding — warn loudly instead.
    // eslint-disable-next-line no-console
    console.warn(`[env] Missing recommended environment variable: ${name}`);
  }
}

['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].forEach(warnMissing);

const env = {
  NODE_ENV: opt('NODE_ENV', 'development'),
  PORT: parseInt(opt('PORT', '3000'), 10),

  MONGODB_URI: opt('MONGODB_URI'),

  JWT_ACCESS_SECRET: opt('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: opt('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  JWT_ACCESS_TTL: opt('JWT_ACCESS_TTL', '15m'),
  JWT_REFRESH_TTL: opt('JWT_REFRESH_TTL', '30d'),
  SESSION_TOKEN_SECRET: opt('SESSION_TOKEN_SECRET', 'dev-session-secret-change-me'),

  CLIENT_ORIGINS: opt('CLIENT_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  SMTP_HOST: opt('SMTP_HOST'),
  SMTP_PORT: parseInt(opt('SMTP_PORT', '587'), 10),
  SMTP_USER: opt('SMTP_USER'),
  SMTP_PASS: opt('SMTP_PASS'),
  // The site's name in emails and the API banner. One codebase runs more than
  // one site (Hidaya Online, Qaida Online), so it is a setting, not a string.
  APP_NAME: opt('APP_NAME', 'Hidaya Online'),
  MAIL_FROM: opt('MAIL_FROM', 'Hidaya Online <no-reply@hidaya.online>'),

  CONTENT_CACHE_TTL_MS: parseInt(opt('CONTENT_CACHE_TTL_MS', String(1000 * 60 * 60)), 10),

  // Socket.IO transports, in preference order. WebSocket first — on long-polling
  // every live-mirror packet costs an HTTP round trip. Hosts that block the WS
  // upgrade (cPanel/LiteSpeed) should set SOCKET_TRANSPORTS=polling,websocket.
  SOCKET_TRANSPORTS: opt('SOCKET_TRANSPORTS', 'websocket,polling')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

module.exports = { env };
