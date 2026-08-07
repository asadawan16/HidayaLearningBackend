const { z } = require('zod');

const login = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
};

const changePassword = {
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
  }),
};

const refresh = {
  body: z.object({ refreshToken: z.string().min(10) }),
};

module.exports = { login, changePassword, refresh };
