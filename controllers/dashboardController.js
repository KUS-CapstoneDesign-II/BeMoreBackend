const { Op } = require('sequelize');
const { Report } = require('../models');

function avg(nums) { return (!nums || nums.length === 0) ? null : nums.reduce((a,b)=>a+b,0)/nums.length; }

async function summary(req, res) {
  try {
    const now = new Date();
    const start7d = new Date(now.getTime() - 7*24*60*60*1000);
    const reports = await Report.findAll({ where: { createdAt: { [Op.gte]: start7d } }, order: [['createdAt', 'DESC']], limit: 100 }).catch(()=>[]);
    const todayStr = now.toISOString().slice(0,10);
    const yesterdayStr = new Date(now.getTime() - 24*60*60*1000).toISOString().slice(0,10);
    const today = reports.filter(r => r.createdAt.toISOString().slice(0,10) === todayStr);
    const yesterday = reports.filter(r => r.createdAt.toISOString().slice(0,10) === yesterdayStr);
    const pick = (arr, key) => arr.map(r => (r.vadVector && typeof r.vadVector[key] === 'number') ? r.vadVector[key] : null).filter(v => typeof v === 'number');
    const todayAvg = { valence: avg(pick(today,'valence')), arousal: avg(pick(today,'arousal')), dominance: avg(pick(today,'dominance')) };
    const yesterdayAvg = { valence: avg(pick(yesterday,'valence')), arousal: avg(pick(yesterday,'arousal')), dominance: avg(pick(yesterday,'dominance')) };
    const trend = { dayOverDay: { valence: (todayAvg.valence ?? 0) - (yesterdayAvg.valence ?? 0), arousal: (todayAvg.arousal ?? 0) - (yesterdayAvg.arousal ?? 0), dominance: (todayAvg.dominance ?? 0) - (yesterdayAvg.dominance ?? 0) } };
    const recent = reports.slice(0,3).map(r => ({ sessionId: r.sessionId, reportId: r.reportId, createdAt: r.createdAt, vadScore: r.vadVector || null }));
    const recs = [];
    if (typeof todayAvg.arousal === 'number' && todayAvg.arousal > 0.6) recs.push({ id: 'breathing', title: '4-6 호흡', desc: '4초 들이쉬고, 6초 내쉬기 5회', cta: '지금 실행' });
    if (typeof todayAvg.valence === 'number' && todayAvg.valence < 0) recs.push({ id: 'gratitude', title: '감사 저널', desc: '감사한 일 3가지 기록', cta: '작성하기' });
    if (typeof todayAvg.dominance === 'number' && todayAvg.dominance < 0) recs.push({ id: 'posture', title: '자세 교정', desc: '어깨 펴고 1분 스트레칭', cta: '따라하기' });

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.json({ success: true, data: { todayAvg, trend, recommendations: recs.slice(0,3), recentSessions: recent } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'DASHBOARD_ERROR', message: err.message } });
  }
}

module.exports = { summary };


