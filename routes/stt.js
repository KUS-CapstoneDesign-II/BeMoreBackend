// routes/stt.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const OpenAI = require("openai");
const dotenv = require("dotenv");
const { toFile } = require("openai/uploads"); // 💡 toFile 함수 임포트
const { updateSpeechText } = require("../services/memory");
const errorHandler = require("../services/ErrorHandler");

dotenv.config();
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "tmp/"),
  filename: (req, file, cb) => cb(null, `audio_${Date.now()}.webm`),
});

const upload = multer({ storage });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Node 환경에서 File 객체 없을 때 정의
if (typeof File === "undefined") {
  global.File = require("node:buffer").File;
}

// ❌ STT 오탐 문장 목록 (oepn ai 에서 지속적으로 무음 시 처리되는 문장 처리)
const INVALID_PATTERNS = [
  "시청해주셔서 감사합니다",
  "끝까지 시청해주셔서 감사합니다",
  "좋아요와 구독 부탁드립니다",
  "영상이 도움이 되셨다면",
  "감사합니다",
  "구독해주세요",
  "고맙습니다",
  "다음 영상에서 만나요",
  "오늘도 시청해 주셔서",
  "오늘도 영상 봐주셔서",
  "영상 봐주셔서",
  "마블 시네마틱",
  "데드풀",
  "올버린",
  "유니버스",
  "스튜디오",
  "데이터플레이커",
  "\\.",  // 점 하나만 있는 경우
  "\\.\\.+",  // 점이 여러개인 경우
];

// 🔢 숫자만 있는지 체크 (1,2,3,4,5 같은 패턴)
function isOnlyNumbers(text) {
  const cleaned = text.replace(/[\s,،]+/g, ''); // 공백과 쉼표 제거
  return /^[\d]+$/.test(cleaned);
}

// 🎧 무음 감지 (ffmpeg mean_volume 이용)
function isSilent(audioPath) {
  try {
    const result = spawnSync("ffmpeg", [
      "-i", audioPath,
      "-af", "volumedetect",
      "-f", "null", "-"
    ], { encoding: "utf-8" });

    const output = result.stderr || "";
    const match = output.match(/mean_volume: ([-\d.]+) dB/);
    if (!match) return false;

    const meanVolume = parseFloat(match[1]);
    console.log(`🎚 평균 음량: ${meanVolume} dB`);
    return meanVolume < -50; // 🔇 -50dB 이하 → 무음 판단 (더 엄격하게)
  } catch (err) {
    errorHandler.handle(err, {
      module: 'stt-silence-detection',
      metadata: { audioPath }
    });
    return false;
  }
}

// ✂️ 오탐 문장 필터링
function cleanTranscript(text) {
  let cleaned = text.trim();
  for (const phrase of INVALID_PATTERNS) {
    const regex = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(regex, "");
  }
  return cleaned.trim();
}

// 🔊 Whisper STT 변환
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  const filePath = req.file.path;

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.warn("🚫 빈 오디오 파일");
    return res.json({ text: "" });
  }

  try {
    // ✅ 1. 무음일 경우 Whisper 호출 생략
    if (isSilent(filePath)) {
      console.log("🚫 무음 구간 → Whisper 호출 생략");
      return res.json({ text: "" });
    }

    // ✅ 2. Whisper 호출
    const fileToUpload = await toFile(
      fs.createReadStream(filePath),
      path.basename(filePath),
      { type: "audio/webm" }
    );

    const result = await openai.audio.transcriptions.create({
      file: fileToUpload,
      model: "whisper-1",
      language: "ko",
      temperature: 0.0,
    });

    // ✅ 3. 텍스트 필터링
    let text = cleanTranscript(result.text);

    // 숫자만 있는 텍스트 필터링
    if (text && isOnlyNumbers(text)) {
      console.log("🚫 숫자만 있는 텍스트 필터링됨:", text);
      text = "";
    }

    if (!text) {
      console.log("🚫 오탐 문장 필터링됨:", result.text);
      text = "";
    }

    console.log("🗣️ STT 결과:", text || "(빈 텍스트)");

    // ✅ 4. 최신 STT 텍스트 저장
    updateSpeechText(text);
    res.json({ text });
  } catch (err) {
    errorHandler.handle(err, {
      module: 'stt-transcribe',
      level: errorHandler.levels.ERROR,
      metadata: { filePath, fileSize: stats.size }
    });
    res.json({ text: "" });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) {
        errorHandler.handle(err, {
          module: 'stt-cleanup',
          level: errorHandler.levels.WARN,
          metadata: { filePath }
        });
      }
    });
  }
});

module.exports = router;
