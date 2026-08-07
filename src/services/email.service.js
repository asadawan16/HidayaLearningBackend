const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) return null; // dev mode → log instead of send
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

// Sends an email, or logs it to the console when SMTP isn't configured (dev).
async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[email:dev] to=${to} subject="${subject}"\n${text || html}`);
    return { queued: false };
  }
  await t.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
  return { queued: true };
}

module.exports = { sendMail };
