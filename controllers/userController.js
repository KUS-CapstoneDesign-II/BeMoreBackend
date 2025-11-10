const { UserPreferences } = require('../models');
const errorHandler = require('../services/ErrorHandler');

async function getPreferences(req, res) {
  try {
    // 인증되지 않은 사용자는 기본값만 반환
    if (!req.user || !req.user.sub) {
      return res.json({
        success: true,
        data: { language: 'ko', theme: 'system', density: 'spacious', notifications: false },
        message: 'Unauthenticated user - returning defaults'
      });
    }

    const userId = req.user.sub;

    if (process.env.DB_DISABLED === 'true' || !UserPreferences || !UserPreferences.findOne) {
      return res.json({ success: true, data: { language: 'ko', theme: 'system', density: 'spacious', notifications: false } });
    }

    const pref = await UserPreferences.findOne({ where: { userId } });
    return res.json({
      success: true,
      data: pref ? pref.preferences : { language: 'ko', theme: 'system', density: 'spacious', notifications: false }
    });
  } catch (err) {
    errorHandler.handle(err, { module: 'user-preferences', level: errorHandler.levels.ERROR, metadata: { method: 'GET', path: '/api/user/preferences', requestId: req.requestId } });
    return res.status(500).json({ success: false, error: { code: 'PREF_GET_ERROR', message: err.message, requestId: req.requestId } });
  }
}

async function setPreferences(req, res) {
  try {
    const preferences = req.body && req.body.preferences ? req.body.preferences : {};

    // 인증되지 않은 사용자는 성공 응답만 반환 (DB에 저장하지 않음)
    if (!req.user || !req.user.sub) {
      return res.json({
        success: true,
        data: { preferences },
        message: 'Unauthenticated user - preferences not persisted to database'
      });
    }

    const userId = req.user.sub;

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
    errorHandler.handle(err, { module: 'user-preferences', level: errorHandler.levels.ERROR, metadata: { method: 'PUT', path: '/api/user/preferences', requestId: req.requestId } });
    return res.status(500).json({ success: false, error: { code: 'PREF_SET_ERROR', message: err.message, requestId: req.requestId } });
  }
}

module.exports = { getPreferences, setPreferences };


