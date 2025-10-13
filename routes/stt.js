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
  "고맙습니다."
];

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
    return meanVolume < -45; // 🔇 -45dB 이하 → 무음 판단
  } catch (err) {
    console.error("무음 감지 실패:", err);
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
    if (!text) {
      console.log("🚫 오탐 문장 필터링됨:", result.text);
      text = "";
    }

    console.log("🗣️ STT 결과:", text || "(빈 텍스트)");

    // ✅ 4. 최신 STT 텍스트 저장
    updateSpeechText(text);
    res.json({ text });
  } catch (err) {
    console.error("❌ STT 변환 실패:", err);
    res.json({ text: "" });
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error("임시 파일 삭제 실패:", err);
    });
  }
});

module.exports = router;
