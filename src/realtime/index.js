const { Server } = require('socket.io');
const { env } = require('../config/env');
const logger = require('../utils/logger');
const socketAuth = require('./socketAuth');
const registerSessionHandlers = require('./handlers/session.handlers');
const registerGameHandlers = require('./handlers/game.handlers');

// Attaches Socket.IO to the shared HTTP server. Polling is listed first so the
// connection works even when a WebSocket upgrade is restricted behind
// cPanel/LiteSpeed; it transparently upgrades to WS when allowed.
function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.CLIENT_ORIGINS, credentials: true },
    transports: ['polling', 'websocket'],
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.debug(`socket connected ${socket.id} role=${socket.data.role}`);
    registerSessionHandlers(io, socket);
    registerGameHandlers(io, socket);
    socket.on('disconnect', (reason) =>
      logger.debug(`socket ${socket.id} disconnected: ${reason}`));
  });

  return io;
}

module.exports = { attachRealtime };
