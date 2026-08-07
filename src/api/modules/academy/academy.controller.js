const asyncHandler = require('../../../utils/asyncHandler');
const service = require('./academy.service');

const apply = asyncHandler(async (req, res) => {
  const app = await service.apply(req.body);
  res.status(201).json({
    success: true,
    message: 'Application received. We will email you after review.',
    id: app._id,
  });
});

const listApplications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listApplications(req.query.status) });
});

const approve = asyncHandler(async (req, res) => {
  const result = await service.approve(req.params.id, req.user._id, req.body.maxConcurrentSessions);
  res.json({ success: true, ...result });
});

const reject = asyncHandler(async (req, res) => {
  const result = await service.reject(req.params.id, req.user._id);
  res.json({ success: true, ...result });
});

module.exports = { apply, listApplications, approve, reject };
