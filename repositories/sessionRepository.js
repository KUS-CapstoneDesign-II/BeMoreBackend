const { Session } = require('../models');

async function upsertSummary(summary) {
  if (!Session || typeof Session.findOrCreate !== 'function') return false;
  try {
    const [row, created] = await Session.findOrCreate({ where: { sessionId: summary.sessionId }, defaults: summary });
    if (!created) {
      row.status = summary.status;
      row.endedAt = summary.endedAt;
      row.duration = summary.duration;
      row.counters = summary.counters;
      await row.save();
    }
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { upsertSummary };


