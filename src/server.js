const http = require('http');
const { env } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { createExpressApp } = require('./express');
const { attachRealtime } = require('./realtime');
const logger = require('./utils/logger');

async function bootstrap() {
  await connectDatabase();

  const app = createExpressApp();
  const server = http.createServer(app);

  // Socket.IO shares the SAME http server/port as Express — required on cPanel,
  // where Passenger injects a single port and won't expose a second one.
  attachRealtime(server);

  server.listen(env.PORT, () => {
    logger.info(`Hidaya API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});
