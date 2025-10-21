const { Report } = require('../models');

async function create(reportPayload) {
  if (!Report || typeof Report.create !== 'function') return null;
  try {
    return await Report.create(reportPayload);
  } catch (e) {
    return null;
  }
}

async function findLatestBySession(sessionId) {
  if (!Report || typeof Report.findOne !== 'function') return null;
  try {
    return await Report.findOne({ where: { sessionId }, order: [['createdAt', 'DESC']] });
  } catch (e) {
    return null;
  }
}

module.exports = { create, findLatestBySession };


