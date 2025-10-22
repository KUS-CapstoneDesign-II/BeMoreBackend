const { UserPreferences } = require('../models');

async function getPreferences(req, res) {
  try {
    const userId = (req.user && req.user.sub) || req.query.userId || 'anon';
    if (process.env.DB_DISABLED === 'true' || !UserPreferences || !UserPreferences.findOne) {
      return res.json({ success: true, data: { language: 'ko', theme: 'system', density: 'spacious', notifications: false } });
    }
    const pref = await UserPreferences.findOne({ where: { userId } });
    return res.json({ success: true, data: pref ? pref.preferences : { language: 'ko', theme: 'system', density: 'spacious', notifications: false } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'PREF_GET_ERROR', message: err.message } });
  }
}

async function setPreferences(req, res) {
  try {
    const userId = (req.user && req.user.sub) || req.body.userId || 'anon';
    const preferences = req.body && req.body.preferences ? req.body.preferences : {};
    if (process.env.DB_DISABLED === 'true' || !UserPreferences || !UserPreferences.findOrCreate) {
      return res.json({ success: true, data: { userId, preferences } });
    }
    const [pref, created] = await UserPreferences.findOrCreate({ where: { userId }, defaults: { preferences } });
    if (!created) {
      pref.preferences = preferences;
      await pref.save();
    }
    return res.json({ success: true, data: { userId, preferences: pref.preferences } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'PREF_SET_ERROR', message: err.message } });
  }
}

module.exports = { getPreferences, setPreferences };


