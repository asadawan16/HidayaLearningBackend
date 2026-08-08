const { z } = require('zod');

const create = {
  body: z.object({
    durationMin: z.coerce.number().int().min(5).max(240).optional(),
    type: z.enum(['live', 'screenshare']).optional(),
  }),
};

const byCode = { params: z.object({ code: z.string().min(4).max(12) }) };

module.exports = { create, byCode };
