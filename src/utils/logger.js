// Minimal timestamped logger. Deliberately dependency-free so nothing native has
// to compile on shared hosting. Swap for pino/winston later if needed.
const ts = () => new Date().toISOString();

const logger = {
  info: (...a) => console.log(`[${ts()}] INFO `, ...a),
  warn: (...a) => console.warn(`[${ts()}] WARN `, ...a),
  error: (...a) => console.error(`[${ts()}] ERROR`, ...a),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') console.debug(`[${ts()}] DEBUG`, ...a);
  },
};

module.exports = logger;
