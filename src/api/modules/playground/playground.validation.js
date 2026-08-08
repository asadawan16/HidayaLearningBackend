const { z } = require('zod');

const grant = {
  body: z.object({
    durationMin: z.coerce.number().int().min(5).max(120).optional(),
    games: z.array(z.string()).max(20).optional(),
    studentName: z.string().max(80).optional(),
  }),
};

const byToken = { params: z.object({ token: z.string().min(8).max(64) }) };

module.exports = { grant, byToken };
