const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { env } = require('./config/env');
const apiRouter = require('./api');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/error');
const logger = require('./utils/logger');

// Builds the Express application (middleware + routes). Kept separate from the
// HTTP server so it can be imported in tests without opening a port.
function createExpressApp() {
  const app = express();

  // Behind cPanel/LiteSpeed/Passenger — trust the proxy so client IPs (rate-limit)
  // and secure cookies work correctly.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.CLIENT_ORIGINS.includes('*') || env.CLIENT_ORIGINS.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (m) => logger.info(m.trim()) },
    }));
  }

  app.get('/', (req, res) => res.json({ name: `${env.APP_NAME} API`, status: 'ok' }));
  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createExpressApp };
