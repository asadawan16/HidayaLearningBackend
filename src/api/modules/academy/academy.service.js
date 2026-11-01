const crypto = require('crypto');
const ApiError = require('../../../utils/ApiError');
const { AcademyApplication, Academy, User } = require('../../../models');
const { sendMail } = require('../../../services/email.service');
const { env } = require('../../../config/env');

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function apply(payload) {
  const pending = await AcademyApplication.findOne({
    contactEmail: payload.contactEmail,
    status: 'pending',
  });
  if (pending) throw ApiError.conflict('An application with this email is already pending');
  return AcademyApplication.create(payload);
}

async function listApplications(status = 'pending') {
  const filter = status === 'all' ? {} : { status };
  return AcademyApplication.find(filter).sort('-createdAt').lean();
}

async function approve(applicationId, adminId, maxConcurrentSessions = 1) {
  const app = await AcademyApplication.findById(applicationId);
  if (!app) throw ApiError.notFound('Application not found');
  if (app.status !== 'pending') throw ApiError.conflict('Application already reviewed');

  // Guard: don't create a duplicate login if this email is already a user.
  const existingUser = await User.findOne({ email: app.contactEmail });
  if (existingUser) throw ApiError.conflict('A user with this email already exists');

  const academy = await Academy.create({
    name: app.academyName,
    slug: `${slugify(app.academyName)}-${crypto.randomBytes(2).toString('hex')}`,
    contactName: app.contactName,
    contactEmail: app.contactEmail,
    contactPhone: app.contactPhone,
    country: app.country,
    status: 'approved',
    maxConcurrentSessions,
    approvedAt: new Date(),
    approvedBy: adminId,
  });

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const user = new User({
    name: app.contactName,
    email: app.contactEmail,
    role: 'academy_admin',
    academy: academy._id,
    mustResetPassword: true,
  });
  await user.setPassword(tempPassword);
  await user.save();

  app.status = 'approved';
  app.reviewedAt = new Date();
  app.reviewedBy = adminId;
  app.academy = academy._id;
  await app.save();

  await sendMail({
    to: app.contactEmail,
    subject: `Your ${env.APP_NAME} academy has been approved`,
    text:
      `Assalamu alaikum ${app.contactName},\n\n` +
      `Your academy "${academy.name}" has been approved on ${env.APP_NAME}.\n\n` +
      `Login email: ${app.contactEmail}\n` +
      `Temporary password: ${tempPassword}\n\n` +
      `Please log in and change your password on first sign-in.\n\n` +
      `JazakAllahu khayran,\n${env.APP_NAME}`,
  });

  return { academy: academy.toObject(), tempPasswordIssued: true };
}

async function reject(applicationId, adminId) {
  const app = await AcademyApplication.findById(applicationId);
  if (!app) throw ApiError.notFound('Application not found');
  if (app.status !== 'pending') throw ApiError.conflict('Application already reviewed');
  app.status = 'rejected';
  app.reviewedAt = new Date();
  app.reviewedBy = adminId;
  await app.save();
  return { success: true };
}

module.exports = { apply, listApplications, approve, reject };
