const { UserPreferences } = require('../models');

async function getPreferences(req, res) {
  try {
    const userId = (req.user && req.user.sub) || req.query.userId || 'anon';
    const pref = await (UserPreferences && UserPreferences.findOne ? UserPreferences.findOne({ where: { userId } }) : null);
    return res.json({ success: true, data: pref ? pref.preferences : {} });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'PREF_GET_ERROR', message: err.message } });
  }
}

async function setPreferences(req, res) {
  try {
    const userId = (req.user && req.user.sub) || req.body.userId || 'anon';
    const preferences = req.body && req.body.preferences ? req.body.preferences : {};
    if (!UserPreferences || !UserPreferences.findOrCreate) return res.json({ success: true, data: { userId, preferences } });
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


