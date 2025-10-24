function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(rows) {
  return rows.map(row => row.map(escapeCsvValue).join(',')).join('\n');
}

function csvFromVadTimeline(vadTimeline) {
  const headers = ['index', 'timestamp', 'valence', 'arousal', 'dominance', 'riskScore', 'riskLevel', 'alertsCount'];
  const body = (vadTimeline?.dataPoints || []).map(dp => [
    dp.index,
    dp.timestamp,
    dp.metrics?.valence ?? '',
    dp.metrics?.arousal ?? '',
    dp.metrics?.dominance ?? '',
    dp.psychological?.riskScore ?? '',
    dp.psychological?.riskLevel ?? '',
    Array.isArray(dp.psychological?.alerts) ? dp.psychological.alerts.length : 0,
  ]);
  return toCsv([headers, ...body]);
}

function csvFromEmotionTimeline(emotionTimeline) {
  const headers = ['index', 'timestamp', 'relativeTime', 'emotion', 'frameCount', 'sttLength', 'hasCBTDistortion', 'cbtDistortionCount'];
  const body = (emotionTimeline?.dataPoints || []).map(dp => [
    dp.index,
    dp.timestamp,
    dp.relativeTime,
    dp.emotion ?? '',
    dp.frameCount ?? '',
    dp.sttLength ?? '',
    Boolean(dp.hasCBTDistortion),
    dp.cbtDistortionCount ?? 0,
  ]);
  return toCsv([headers, ...body]);
}

module.exports = { csvFromVadTimeline, csvFromEmotionTimeline };


