function validateStart(req, res, next) {
  const { userId, counselorId } = req.body || {};
  if (typeof userId !== 'string' || typeof counselorId !== 'string' || !userId || !counselorId) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'userId와 counselorId는 문자열이어야 합니다' } });
  }
  next();
}

function validateParamId(req, res, next) {
  const { id } = req.params || {};
  if (typeof id !== 'string' || !id) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_PARAM', message: 'id 파라미터가 필요합니다' } });
  }
  next();
}

module.exports = { validateStart, validateParamId };


