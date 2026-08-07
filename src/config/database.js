const mongoose = require('mongoose');
const { env } = require('./env');
const logger = require('../utils/logger');

// Connects to MongoDB Atlas. If MONGODB_URI is absent we start anyway (so the
// health check and static routes still respond) but log a clear warning.
async function connectDatabase() {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI not set — starting WITHOUT a database connection');
    return null;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 10_000,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  return mongoose.connection;
}

module.exports = { connectDatabase };
