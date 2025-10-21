const express = require('express');
const router = express.Router();
const { UserPreferences } = require('../models');

router.get('/preferences', async (req, res) => {
  try {
    const userId = (req.user && req.user.sub) || req.query.userId || 'anon';
    const pref = await UserPreferences.findOne({ where: { userId } });
    res.json({ success: true, data: pref ? pref.preferences : {} });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'PREF_GET_ERROR', message: err.message } });
  }
});

router.put('/preferences', async (req, res) => {
  try {
    const userId = (req.user && req.user.sub) || req.body.userId || 'anon';
    const preferences = req.body && req.body.preferences ? req.body.preferences : {};
    const [pref, created] = await UserPreferences.findOrCreate({ where: { userId }, defaults: { preferences } });
    if (!created) {
      pref.preferences = preferences;
      await pref.save();
    }
    res.json({ success: true, data: { userId, preferences: pref.preferences } });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: 'PREF_SET_ERROR', message: err.message } });
  }
});

module.exports = router;


