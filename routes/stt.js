// routes/stt.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const dotenv = require("dotenv");
const { toFile } = require("openai/uploads"); // 💡 toFile 함수 임포트
const { updateSpeechText } = require("../services/memory");

dotenv.config();
const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "tmp/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `audio_${Date.now()}.webm`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// OpenAI 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Node 환경에서 File이 없으면 설정
if (typeof File === "undefined") {
  global.File = require("node:buffer").File;
}

// 🔊 Whisper STT 변환
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  const filePath = req.file.path; // 업로드된 파일 경로

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw new Error("빈 오디오 파일");
  }

  let fileToUpload;
  try {

    fileToUpload = await toFile(fs.createReadStream(filePath), path.basename(filePath), { type: "audio/webm" });

    const result = await openai.audio.transcriptions.create({
      file: fileToUpload,
      model: "whisper-1",
      language: "ko",
    });

    console.log("상담 내용:", result.text);
    console.log("파일 사이즈 : ", fileToUpload.size);


    // 최신 STT 텍스트 저장
    updateSpeechText(result.text);

    res.json({ text: result.text });
  } catch (err) {
    console.error("STT 변환 실패", err);
    console.log("파일 사이즈 : ", fileToUpload.size);
    res.json({ text: "목소리가 인식되지 않습니다." });


  } finally {
    fs.unlink(filePath, (err) => {
      if (err) console.error("임시 파일 삭제 실패:", err);
    });
  }
});

module.exports = router;
