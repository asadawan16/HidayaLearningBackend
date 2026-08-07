const rateLimit = require('express-rate-limit');

// General public API limiter — generous, protects against scraping/abuse.
const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints (login/refresh) to slow brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

module.exports = { publicLimiter, authLimiter };
