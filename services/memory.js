// 최신 음성(STT) 텍스트를 임시로 저장하는 전역 캐시

let latestSpeechText = "";

function updateSpeechText(text) {
  latestSpeechText = text;
}

function getLatestSpeechText() {
  return latestSpeechText;
}

module.exports = { updateSpeechText, getLatestSpeechText };
