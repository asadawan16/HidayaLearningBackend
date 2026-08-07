const { z } = require('zod');

const apply = {
  body: z.object({
    academyName: z.string().min(2).max(120),
    contactName: z.string().min(2).max(120),
    contactEmail: z.string().email(),
    contactPhone: z.string().max(40).optional(),
    country: z.string().max(80).optional(),
    studentsCount: z.coerce.number().int().positive().optional(),
    message: z.string().max(1000).optional(),
  }),
};

const approve = {
  body: z.object({
    maxConcurrentSessions: z.coerce.number().int().min(0).max(100).default(1),
  }),
};

module.exports = { apply, approve };
