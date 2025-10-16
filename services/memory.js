// memory.js (누적 STT 관리)
let speechBuffer = []; // { text, timestamp } 형태로 저장

// STT 추가
function updateSpeechText(text) {
  if (!text || text.trim() === "") return;
  speechBuffer.push({ text: text.trim(), timestamp: Date.now() });
}

// 특정 시점 이후의 누적 STT 가져오기
function getAccumulatedSpeechText(sinceTimestamp = 0) {
  const texts = speechBuffer
    .filter(item => item.timestamp > sinceTimestamp)
    .map(item => item.text);
  return texts.join("\n");
}

// 특정 시점까지의 STT 제거 (전송 완료 후)
function clearSpeechBuffer(upToTimestamp) {
  speechBuffer = speechBuffer.filter(item => item.timestamp > upToTimestamp);
}

module.exports = { updateSpeechText, getAccumulatedSpeechText, clearSpeechBuffer };
