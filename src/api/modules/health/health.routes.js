const { Router } = require('express');
const mongoose = require('mongoose');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
