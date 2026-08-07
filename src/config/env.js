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
  MAIL_FROM: opt('MAIL_FROM', 'Hidaya Online <no-reply@hidaya.online>'),

  CONTENT_CACHE_TTL_MS: parseInt(opt('CONTENT_CACHE_TTL_MS', String(1000 * 60 * 60)), 10),
};

module.exports = { env };
