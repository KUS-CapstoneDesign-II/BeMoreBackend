# 📘 Phase 2: VAD 통합 상세 구현 가이드

> **Voice Activity Detection (VAD)** 음성 활동 감지 통합 및 심리 지표 추출

**작성일**: 2025-01-17
**대상 Phase**: Phase 2 (VAD Integration)
**예상 소요 시간**: 10-14시간
**난이도**: ⭐⭐⭐⭐ (고급)

---

## 📋 목차

1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [Task 2.1: Silero VAD 통합](#task-21-silero-vad-통합)
4. [Task 2.2: VAD 메트릭 분석 시스템](#task-22-vad-메트릭-분석-시스템)
5. [Task 2.3: 심리 지표 추출](#task-23-심리-지표-추출)
6. [Task 2.4: 프론트엔드 VAD UI](#task-24-프론트엔드-vad-ui)
7. [통합 테스트](#통합-테스트)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

### Phase 2의 목표

Phase 1에서 구축한 세션 관리와 3채널 WebSocket 위에 **VAD (Voice Activity Detection)** 기능을 통합합니다.

**핵심 기능**:
1. **Silero VAD**: 실시간 음성 활동 감지 (100ms 단위)
2. **VAD 메트릭**: 발화 속도, 침묵 길이, 발화 빈도 분석
3. **심리 지표**: 우울/불안 패턴 추출 (긴 침묵, 느린 발화 등)
4. **실시간 UI**: 프론트엔드에 VAD 상태 시각화

### 아키텍처 변화

```mermaid
graph TB
    subgraph "Frontend"
        A[마이크 입력] --> B[AudioContext]
        B --> C[100ms 청크]
    end

    subgraph "WebSocket /ws/voice"
        C --> D[VAD Handler]
        D --> E[Silero VAD]
        E --> F[음성/침묵 판정]
    end

    subgraph "VAD Analyzer"
        F --> G[메트릭 수집]
        G --> H[심리 지표 추출]
        H --> I[10초마다 분석]
    end

    subgraph "통합 분석"
        I --> J[Gemini 멀티모달]
        K[얼굴 표정] --> J
        L[STT 텍스트] --> J
        J --> M[종합 감정 분석]
    end

    M --> N[/ws/session으로 결과 전송]
```

---

## 사전 준비사항

### 1. Node.js 의존성 설치

```bash
# Silero VAD 관련 패키지
npm install @ricky0123/vad-node
npm install @ricky0123/vad-web  # 프론트엔드용

# 오디오 처리
npm install wav-encoder
npm install audio-buffer-utils

# 통계 분석
npm install simple-statistics
```

### 2. 디렉토리 구조 확인

```bash
services/
├── vad/
│   ├── VadAnalyzer.js          # 생성 예정
│   ├── VadMetrics.js           # 생성 예정
│   └── PsychologicalIndicators.js  # 생성 예정
├── socket/
│   └── voiceHandler.js         # Phase 1에서 생성됨
└── session/
    └── SessionManager.js       # Phase 1에서 생성됨
```

### 3. 환경 변수 확인

`.env` 파일에 다음 추가:

```bash
# VAD 설정
VAD_SAMPLE_RATE=16000
VAD_FRAME_SIZE=512
VAD_THRESHOLD=0.5

# 심리 지표 임계값
SILENCE_THRESHOLD_MS=3000      # 3초 이상 침묵 → 우울 지표
FAST_SPEECH_THRESHOLD=180      # 180 단어/분 이상 → 불안 지표
SLOW_SPEECH_THRESHOLD=90       # 90 단어/분 이하 → 우울 지표
```

---

## Task 2.1: Silero VAD 통합

### 2.1.1 VAD Analyzer 클래스 생성

**파일**: `services/vad/VadAnalyzer.js`

```javascript
const { MicVAD } = require("@ricky0123/vad-node");
const { Readable } = require("stream");

class VadAnalyzer {
  constructor() {
    this.vad = null;
    this.isInitialized = false;
    this.sampleRate = parseInt(process.env.VAD_SAMPLE_RATE) || 16000;
    this.threshold = parseFloat(process.env.VAD_THRESHOLD) || 0.5;
  }

  /**
   * VAD 모델 초기화
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ VAD already initialized");
      return;
    }

    try {
      console.log("🔄 Initializing Silero VAD model...");

      // Silero VAD 모델 로드 (약 2-3초 소요)
      this.vad = await MicVAD.new({
        positiveSpeechThreshold: this.threshold,
        negativeSpeechThreshold: this.threshold - 0.15,
        redemptionFrames: 8,
        preSpeechPadFrames: 1,
        minSpeechFrames: 3,
      });

      this.isInitialized = true;
      console.log("✅ VAD model loaded successfully");
    } catch (err) {
      console.error("❌ VAD initialization failed:", err);
      throw new Error("Failed to initialize VAD model");
    }
  }

  /**
   * 오디오 청크 분석 (100ms 단위)
   * @param {Float32Array} audioChunk - 16kHz 샘플링 오디오 데이터
   * @returns {Promise<Object>} { isSpeech: boolean, probability: number }
   */
  async analyzeChunk(audioChunk) {
    if (!this.isInitialized) {
      throw new Error("VAD not initialized. Call initialize() first.");
    }

    try {
      // Float32Array를 Buffer로 변환
      const audioBuffer = Buffer.from(audioChunk.buffer);

      // Silero VAD 분석
      const result = await this.vad.processAudio(audioBuffer);

      return {
        isSpeech: result.isSpeech,
        probability: result.probability || 0,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.error("VAD analysis error:", err);
      return { isSpeech: false, probability: 0, timestamp: Date.now() };
    }
  }

  /**
   * VAD 리소스 정리
   */
  async destroy() {
    if (this.vad) {
      console.log("🧹 Destroying VAD instance...");
      this.vad = null;
      this.isInitialized = false;
    }
  }
}

// Singleton 패턴
let instance = null;

function getVadAnalyzer() {
  if (!instance) {
    instance = new VadAnalyzer();
  }
  return instance;
}

module.exports = { getVadAnalyzer };
```

**핵심 포인트**:
- **Silero VAD**: ONNX 기반 경량 모델 (약 2MB)
- **100ms 분석**: 실시간 음성/침묵 판정
- **Threshold 조정**: `positiveSpeechThreshold`로 민감도 설정
- **Singleton**: 서버 전체에서 하나의 VAD 인스턴스 공유

---

### 2.1.2 Voice Handler 업데이트

**파일**: `services/socket/voiceHandler.js` (Phase 1에서 생성됨)

기존 코드를 다음과 같이 **완전히 교체**:

```javascript
const { getVadAnalyzer } = require("../vad/VadAnalyzer");
const { VadMetrics } = require("../vad/VadMetrics");
const { extractPsychologicalIndicators } = require("../vad/PsychologicalIndicators");

const ANALYSIS_INTERVAL_MS = 10 * 1000; // 10초마다 분석

/**
 * /ws/voice WebSocket 핸들러
 */
async function handleVoice(ws, session) {
  console.log(`🎤 Voice channel connected: ${session.sessionId}`);

  // VAD 초기화
  const vadAnalyzer = getVadAnalyzer();
  if (!vadAnalyzer.isInitialized) {
    await vadAnalyzer.initialize();
  }

  // VAD 메트릭 수집기
  const vadMetrics = new VadMetrics(session.sessionId);

  // 세션 객체에 WebSocket 연결 저장
  session.wsConnections.voice = ws;

  // 10초마다 VAD 메트릭 분석
  const analysisInterval = setInterval(async () => {
    if (session.status !== "active") {
      console.log(`⏸️ Session paused, skipping VAD analysis`);
      return;
    }

    try {
      // 메트릭 계산
      const metrics = vadMetrics.calculateMetrics();

      // 심리 지표 추출
      const indicators = extractPsychologicalIndicators(metrics);

      console.log(`📊 VAD Metrics for ${session.sessionId}:`, {
        speechRate: metrics.speechRate,
        silenceRate: metrics.silenceRate,
        avgSilenceDuration: metrics.avgSilenceDuration,
        indicators: indicators.map(i => i.type),
      });

      // 세션에 VAD 데이터 저장
      session.vadMetrics = metrics;
      session.psychologicalIndicators = indicators;

      // /ws/session으로 VAD 상태 브로드캐스트
      if (session.wsConnections.session?.readyState === 1) {
        session.wsConnections.session.send(JSON.stringify({
          type: "vad_update",
          data: {
            metrics,
            indicators,
            timestamp: new Date().toISOString(),
          },
        }));
      }

      // 메트릭 버퍼 초기화 (다음 10초를 위해)
      vadMetrics.reset();

    } catch (err) {
      console.error("VAD analysis error:", err);
    }
  }, ANALYSIS_INTERVAL_MS);

  // 클라이언트로부터 오디오 청크 수신
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === "audio_chunk") {
        // Float32Array 복원
        const audioChunk = new Float32Array(message.data);

        // VAD 분석
        const result = await vadAnalyzer.analyzeChunk(audioChunk);

        // 메트릭 수집
        vadMetrics.addEvent({
          isSpeech: result.isSpeech,
          probability: result.probability,
          timestamp: result.timestamp,
          duration: 100, // 100ms 청크
        });

        // 실시간 VAD 상태 전송 (선택적)
        ws.send(JSON.stringify({
          type: "vad_status",
          isSpeech: result.isSpeech,
          probability: result.probability,
        }));
      }
    } catch (err) {
      console.error("Voice message parsing error:", err);
    }
  });

  // 연결 종료 처리
  ws.on("close", () => {
    console.log(`❌ Voice channel closed: ${session.sessionId}`);
    clearInterval(analysisInterval);
    session.wsConnections.voice = null;
  });

  ws.on("error", (err) => {
    console.error("Voice WebSocket error:", err);
    clearInterval(analysisInterval);
  });
}

module.exports = { handleVoice };
```

**핵심 로직**:
1. **100ms 청크 수신**: 프론트엔드에서 전송한 오디오 데이터
2. **VAD 분석**: Silero VAD로 음성/침묵 판정
3. **메트릭 수집**: VadMetrics 객체에 이벤트 누적
4. **10초마다 분석**: 통계 계산 + 심리 지표 추출
5. **결과 전송**: `/ws/session`으로 브로드캐스트

---

## Task 2.2: VAD 메트릭 분석 시스템

### 2.2.1 VAD Metrics 클래스

**파일**: `services/vad/VadMetrics.js`

```javascript
const stats = require("simple-statistics");

class VadMetrics {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.events = []; // { isSpeech, probability, timestamp, duration }
    this.startTime = Date.now();
  }

  /**
   * VAD 이벤트 추가
   */
  addEvent(event) {
    this.events.push(event);
  }

  /**
   * 메트릭 계산
   */
  calculateMetrics() {
    if (this.events.length === 0) {
      return this._getEmptyMetrics();
    }

    const totalDuration = Date.now() - this.startTime;
    const speechEvents = this.events.filter(e => e.isSpeech);
    const silenceEvents = this.events.filter(e => !e.isSpeech);

    // 1. 발화 비율 (Speech Rate)
    const speechDuration = speechEvents.reduce((sum, e) => sum + e.duration, 0);
    const speechRate = (speechDuration / totalDuration) * 100;

    // 2. 침묵 비율 (Silence Rate)
    const silenceDuration = silenceEvents.reduce((sum, e) => sum + e.duration, 0);
    const silenceRate = (silenceDuration / totalDuration) * 100;

    // 3. 평균 발화 길이 (Average Speech Duration)
    const speechSegments = this._extractSegments(speechEvents);
    const avgSpeechDuration = speechSegments.length > 0
      ? stats.mean(speechSegments.map(s => s.duration))
      : 0;

    // 4. 평균 침묵 길이 (Average Silence Duration)
    const silenceSegments = this._extractSegments(silenceEvents);
    const avgSilenceDuration = silenceSegments.length > 0
      ? stats.mean(silenceSegments.map(s => s.duration))
      : 0;

    // 5. 최대 침묵 길이 (Max Silence Duration)
    const maxSilenceDuration = silenceSegments.length > 0
      ? Math.max(...silenceSegments.map(s => s.duration))
      : 0;

    // 6. 발화 빈도 (Speech Frequency per minute)
    const speechFrequency = (speechSegments.length / (totalDuration / 60000));

    // 7. VAD 확률 분포
    const probabilities = this.events.map(e => e.probability);
    const avgProbability = stats.mean(probabilities);
    const stdProbability = stats.standardDeviation(probabilities);

    return {
      totalDuration,
      speechRate: speechRate.toFixed(2),
      silenceRate: silenceRate.toFixed(2),
      avgSpeechDuration: avgSpeechDuration.toFixed(0),
      avgSilenceDuration: avgSilenceDuration.toFixed(0),
      maxSilenceDuration: maxSilenceDuration.toFixed(0),
      speechFrequency: speechFrequency.toFixed(2),
      speechSegmentsCount: speechSegments.length,
      silenceSegmentsCount: silenceSegments.length,
      avgProbability: avgProbability.toFixed(3),
      stdProbability: stdProbability.toFixed(3),
    };
  }

  /**
   * 연속된 이벤트를 세그먼트로 그룹화
   * 예: [speech, speech, speech, silence, silence] → [{start, end, duration}]
   */
  _extractSegments(events) {
    if (events.length === 0) return [];

    const segments = [];
    let currentSegment = {
      start: events[0].timestamp,
      end: events[0].timestamp,
      duration: events[0].duration,
    };

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];

      // 연속된 이벤트 (100ms 이내 간격)
      if (curr.timestamp - prev.timestamp <= 150) {
        currentSegment.end = curr.timestamp;
        currentSegment.duration += curr.duration;
      } else {
        // 새로운 세그먼트 시작
        segments.push(currentSegment);
        currentSegment = {
          start: curr.timestamp,
          end: curr.timestamp,
          duration: curr.duration,
        };
      }
    }

    segments.push(currentSegment);
    return segments;
  }

  /**
   * 빈 메트릭 반환
   */
  _getEmptyMetrics() {
    return {
      totalDuration: 0,
      speechRate: "0.00",
      silenceRate: "0.00",
      avgSpeechDuration: "0",
      avgSilenceDuration: "0",
      maxSilenceDuration: "0",
      speechFrequency: "0.00",
      speechSegmentsCount: 0,
      silenceSegmentsCount: 0,
      avgProbability: "0.000",
      stdProbability: "0.000",
    };
  }

  /**
   * 메트릭 초기화 (다음 분석 주기를 위해)
   */
  reset() {
    this.events = [];
    this.startTime = Date.now();
  }
}

module.exports = { VadMetrics };
```

**핵심 메트릭**:
- **speechRate**: 전체 시간 중 발화 비율 (%)
- **avgSilenceDuration**: 평균 침묵 길이 (ms)
- **speechFrequency**: 분당 발화 횟수
- **maxSilenceDuration**: 최대 침묵 길이 (긴 침묵 = 우울 지표)

---

## Task 2.3: 심리 지표 추출

### 2.3.1 Psychological Indicators 모듈

**파일**: `services/vad/PsychologicalIndicators.js`

```javascript
/**
 * VAD 메트릭에서 심리 지표 추출
 *
 * 심리학 연구 기반:
 * - 긴 침묵 (>3초) → 우울증 지표
 * - 빠른 발화 (>180 wpm) → 불안 지표
 * - 느린 발화 (<90 wpm) → 우울증 지표
 * - 낮은 발화 빈도 → 위축, 무기력
 */

const SILENCE_THRESHOLD_MS = parseInt(process.env.SILENCE_THRESHOLD_MS) || 3000;
const FAST_SPEECH_THRESHOLD = parseInt(process.env.FAST_SPEECH_THRESHOLD) || 180;
const SLOW_SPEECH_THRESHOLD = parseInt(process.env.SLOW_SPEECH_THRESHOLD) || 90;

/**
 * 심리 지표 추출
 * @param {Object} metrics - VadMetrics.calculateMetrics() 결과
 * @returns {Array} indicators - [{ type, severity, description }]
 */
function extractPsychologicalIndicators(metrics) {
  const indicators = [];

  // 1. 긴 침묵 감지 (우울증 지표)
  if (parseFloat(metrics.maxSilenceDuration) > SILENCE_THRESHOLD_MS) {
    indicators.push({
      type: "prolonged_silence",
      severity: calculateSeverity(
        parseFloat(metrics.maxSilenceDuration),
        SILENCE_THRESHOLD_MS,
        10000
      ),
      description: `최대 침묵 ${(parseFloat(metrics.maxSilenceDuration) / 1000).toFixed(1)}초 감지`,
      relatedMetric: "maxSilenceDuration",
      psychologicalMeaning: "우울, 무기력, 사고 차단",
    });
  }

  // 2. 높은 침묵 비율 (위축, 회피)
  if (parseFloat(metrics.silenceRate) > 70) {
    indicators.push({
      type: "high_silence_rate",
      severity: calculateSeverity(parseFloat(metrics.silenceRate), 70, 90),
      description: `침묵 비율 ${metrics.silenceRate}% (높음)`,
      relatedMetric: "silenceRate",
      psychologicalMeaning: "사회적 위축, 회피, 무반응",
    });
  }

  // 3. 낮은 발화 빈도 (무기력)
  if (parseFloat(metrics.speechFrequency) < 3) {
    indicators.push({
      type: "low_speech_frequency",
      severity: calculateSeverity(3 - parseFloat(metrics.speechFrequency), 0, 3),
      description: `발화 빈도 ${metrics.speechFrequency}회/분 (낮음)`,
      relatedMetric: "speechFrequency",
      psychologicalMeaning: "무기력, 동기 저하, 인지 둔화",
    });
  }

  // 4. 짧은 발화 길이 (단답형, 회피)
  if (parseFloat(metrics.avgSpeechDuration) < 1000 && metrics.speechSegmentsCount > 0) {
    indicators.push({
      type: "short_speech_segments",
      severity: "low",
      description: `평균 발화 ${(parseFloat(metrics.avgSpeechDuration) / 1000).toFixed(1)}초 (짧음)`,
      relatedMetric: "avgSpeechDuration",
      psychologicalMeaning: "회피적 태도, 소극적 반응",
    });
  }

  // 5. VAD 확률 낮음 (목소리 작음, 에너지 부족)
  if (parseFloat(metrics.avgProbability) < 0.3) {
    indicators.push({
      type: "low_voice_energy",
      severity: "low",
      description: `음성 에너지 낮음 (VAD 확률 ${metrics.avgProbability})`,
      relatedMetric: "avgProbability",
      psychologicalMeaning: "에너지 저하, 피로, 자신감 부족",
    });
  }

  return indicators;
}

/**
 * 심각도 계산 (low, medium, high)
 */
function calculateSeverity(value, minThreshold, maxThreshold) {
  const normalized = (value - minThreshold) / (maxThreshold - minThreshold);

  if (normalized < 0.33) return "low";
  if (normalized < 0.66) return "medium";
  return "high";
}

module.exports = { extractPsychologicalIndicators };
```

**심리 지표 예시**:

```javascript
[
  {
    type: "prolonged_silence",
    severity: "high",
    description: "최대 침묵 5.2초 감지",
    relatedMetric: "maxSilenceDuration",
    psychologicalMeaning: "우울, 무기력, 사고 차단"
  },
  {
    type: "low_speech_frequency",
    severity: "medium",
    description: "발화 빈도 2.1회/분 (낮음)",
    relatedMetric: "speechFrequency",
    psychologicalMeaning: "무기력, 동기 저하, 인지 둔화"
  }
]
```

---

## Task 2.4: 프론트엔드 VAD UI

### 2.4.1 프론트엔드 오디오 캡처

**파일**: `public/vad-test.html` (새로 생성)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>VAD 테스트 페이지</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    button { padding: 10px 20px; margin: 5px; font-size: 14px; cursor: pointer; border-radius: 4px; border: none; }
    .btn-primary { background: #007bff; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
    .status.speaking { background: #d4edda; border: 1px solid #c3e6cb; }
    .status.silence { background: #f8d7da; border: 1px solid #f5c6cb; }
    .metrics { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-top: 10px; }
    .metric-item { display: flex; justify-content: space-between; margin: 5px 0; }
    .indicator { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 5px 0; }
    .indicator.high { border-left-color: #dc3545; background: #f8d7da; }
    .log { background: #f8f9fa; padding: 10px; border-radius: 4px; max-height: 300px; overflow-y: auto; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎤 VAD (Voice Activity Detection) 테스트</h1>

    <div>
      <button class="btn-primary" onclick="startSession()">세션 시작</button>
      <button class="btn-danger" onclick="stopSession()">세션 종료</button>
      <button class="btn-primary" onclick="startVAD()" id="vadBtn" disabled>VAD 시작</button>
    </div>

    <div id="vadStatus" class="status silence">
      <strong>VAD 상태:</strong> <span id="vadText">침묵</span>
      <br>
      <strong>확률:</strong> <span id="vadProb">0.000</span>
    </div>

    <div class="metrics" id="metricsPanel" style="display:none;">
      <h3>📊 10초 VAD 메트릭</h3>
      <div class="metric-item">
        <span>발화 비율:</span>
        <span id="speechRate">-</span>
      </div>
      <div class="metric-item">
        <span>침묵 비율:</span>
        <span id="silenceRate">-</span>
      </div>
      <div class="metric-item">
        <span>평균 침묵 길이:</span>
        <span id="avgSilence">-</span>
      </div>
      <div class="metric-item">
        <span>최대 침묵 길이:</span>
        <span id="maxSilence">-</span>
      </div>
      <div class="metric-item">
        <span>발화 빈도:</span>
        <span id="speechFreq">-</span>
      </div>
    </div>

    <div id="indicatorsPanel" style="margin-top: 10px;"></div>

    <h3>로그</h3>
    <div class="log" id="logArea"></div>
  </div>

  <script>
    let sessionId = null;
    let voiceWs = null;
    let sessionWs = null;
    let audioContext = null;
    let mediaStream = null;
    let scriptProcessor = null;

    // 세션 시작
    async function startSession() {
      try {
        const res = await fetch("http://localhost:8000/api/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "test_user_vad",
            counselorId: "test_counselor"
          })
        });

        const data = await res.json();
        if (data.success) {
          sessionId = data.data.sessionId;
          log(`✅ 세션 생성: ${sessionId}`);

          // /ws/session 연결 (VAD 업데이트 수신용)
          connectSessionWs();

          document.getElementById("vadBtn").disabled = false;
        }
      } catch (err) {
        log(`❌ 세션 시작 실패: ${err.message}`);
      }
    }

    // /ws/session 연결
    function connectSessionWs() {
      sessionWs = new WebSocket(`ws://localhost:8000/ws/session?sessionId=${sessionId}`);

      sessionWs.onopen = () => log("✅ Session WebSocket 연결됨");

      sessionWs.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "vad_update") {
          displayMetrics(data.data.metrics);
          displayIndicators(data.data.indicators);
        }
      };

      sessionWs.onerror = (err) => log(`❌ Session WS 에러: ${err}`);
    }

    // VAD 시작
    async function startVAD() {
      try {
        // 마이크 권한 요청
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          }
        });

        log("✅ 마이크 접근 허용됨");

        // AudioContext 생성
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        });

        const source = audioContext.createMediaStreamSource(mediaStream);
        scriptProcessor = audioContext.createScriptProcessor(1600, 1, 1); // 100ms @ 16kHz

        // /ws/voice 연결
        voiceWs = new WebSocket(`ws://localhost:8000/ws/voice?sessionId=${sessionId}`);

        voiceWs.onopen = () => {
          log("✅ Voice WebSocket 연결됨");

          // 오디오 처리 시작
          scriptProcessor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0); // Float32Array

            if (voiceWs.readyState === WebSocket.OPEN) {
              voiceWs.send(JSON.stringify({
                type: "audio_chunk",
                data: Array.from(audioData) // Float32Array → Array
              }));
            }
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContext.destination);
        };

        voiceWs.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "vad_status") {
            updateVadStatus(data.isSpeech, data.probability);
          }
        };

        voiceWs.onerror = (err) => log(`❌ Voice WS 에러: ${err}`);

        document.getElementById("vadBtn").disabled = true;

      } catch (err) {
        log(`❌ VAD 시작 실패: ${err.message}`);
      }
    }

    // VAD 상태 업데이트
    function updateVadStatus(isSpeech, probability) {
      const statusDiv = document.getElementById("vadStatus");
      const textSpan = document.getElementById("vadText");
      const probSpan = document.getElementById("vadProb");

      if (isSpeech) {
        statusDiv.className = "status speaking";
        textSpan.textContent = "🗣️ 발화 중";
      } else {
        statusDiv.className = "status silence";
        textSpan.textContent = "🤐 침묵";
      }

      probSpan.textContent = probability.toFixed(3);
    }

    // 메트릭 표시
    function displayMetrics(metrics) {
      document.getElementById("metricsPanel").style.display = "block";
      document.getElementById("speechRate").textContent = `${metrics.speechRate}%`;
      document.getElementById("silenceRate").textContent = `${metrics.silenceRate}%`;
      document.getElementById("avgSilence").textContent = `${(parseFloat(metrics.avgSilenceDuration) / 1000).toFixed(1)}초`;
      document.getElementById("maxSilence").textContent = `${(parseFloat(metrics.maxSilenceDuration) / 1000).toFixed(1)}초`;
      document.getElementById("speechFreq").textContent = `${metrics.speechFrequency}회/분`;

      log(`📊 메트릭 업데이트: 발화 ${metrics.speechRate}%, 침묵 ${metrics.silenceRate}%`);
    }

    // 심리 지표 표시
    function displayIndicators(indicators) {
      const panel = document.getElementById("indicatorsPanel");
      panel.innerHTML = "<h3>⚠️ 심리 지표</h3>";

      if (indicators.length === 0) {
        panel.innerHTML += "<p>감지된 지표 없음</p>";
        return;
      }

      indicators.forEach(ind => {
        const div = document.createElement("div");
        div.className = `indicator ${ind.severity}`;
        div.innerHTML = `
          <strong>[${ind.type}]</strong> ${ind.description}<br>
          <small>심리적 의미: ${ind.psychologicalMeaning}</small>
        `;
        panel.appendChild(div);
      });

      log(`⚠️ ${indicators.length}개 심리 지표 감지`);
    }

    // 세션 종료
    function stopSession() {
      if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      if (voiceWs) {
        voiceWs.close();
        voiceWs = null;
      }
      if (sessionWs) {
        sessionWs.close();
        sessionWs = null;
      }

      log("🛑 세션 종료됨");
      document.getElementById("vadBtn").disabled = true;
    }

    // 로그 출력
    function log(message) {
      const logArea = document.getElementById("logArea");
      const time = new Date().toLocaleTimeString();
      logArea.innerHTML += `[${time}] ${message}<br>`;
      logArea.scrollTop = logArea.scrollHeight;
    }
  </script>
</body>
</html>
```

**핵심 기능**:
- **ScriptProcessor**: 100ms 단위 오디오 청크 추출
- **WebSocket 전송**: Float32Array → Array → JSON
- **실시간 VAD 상태**: 발화/침묵 시각화
- **10초 메트릭**: 백엔드에서 계산한 통계 표시
- **심리 지표**: 감지된 이상 패턴 표시

---

## 통합 테스트

### 테스트 1: 서버 시작 및 VAD 초기화

```bash
# 터미널 1: 서버 시작
npm run dev

# 예상 출력:
# 🔄 Initializing Silero VAD model...
# ✅ VAD model loaded successfully
# Server running on port 8000
```

### 테스트 2: 프론트엔드 테스트

```bash
# 브라우저에서 접속
open http://localhost:8000/vad-test.html

# 1. "세션 시작" 클릭
# 2. "VAD 시작" 클릭 → 마이크 권한 허용
# 3. 말하기 → 🗣️ 발화 중 표시 확인
# 4. 침묵 → 🤐 침묵 표시 확인
# 5. 10초 대기 → 📊 메트릭 업데이트 확인
```

### 테스트 3: 심리 지표 테스트

**시나리오 1: 긴 침묵 테스트**

```
1. VAD 시작
2. 5초 이상 침묵 유지
3. 10초 후 메트릭 확인

예상 결과:
⚠️ 심리 지표
[prolonged_silence] 최대 침묵 5.2초 감지
심리적 의미: 우울, 무기력, 사고 차단
```

**시나리오 2: 낮은 발화 빈도 테스트**

```
1. VAD 시작
2. 10초 동안 2-3번만 짧게 발화
3. 메트릭 확인

예상 결과:
⚠️ 심리 지표
[low_speech_frequency] 발화 빈도 2.1회/분 (낮음)
심리적 의미: 무기력, 동기 저하, 인지 둔화
```

### 테스트 4: Gemini 멀티모달 통합 (Phase 2 완료 후)

**파일**: `services/gemini/gemini.js` 수정

기존 `analyzeExpression` 함수에 VAD 데이터 추가:

```javascript
async function analyzeExpression(accumulatedData, speechText = "", vadMetrics = null, psychoIndicators = []) {
  // ... 기존 코드 ...

  const prompt = `
    당신은 멀티모달 감정 분석 전문가입니다.
    아래 정보를 종합하여 사용자의 감정을 한 단어로 요약하세요.

    [표정 데이터]
    ${summaryText}

    [발화 내용(STT)]
    ${speechText?.trim() ? speechText : "발화 없음"}

    ${vadMetrics ? `
    [음성 활동 패턴(VAD)]
    - 발화 비율: ${vadMetrics.speechRate}%
    - 침묵 비율: ${vadMetrics.silenceRate}%
    - 평균 침묵 길이: ${(parseFloat(vadMetrics.avgSilenceDuration) / 1000).toFixed(1)}초
    - 최대 침묵 길이: ${(parseFloat(vadMetrics.maxSilenceDuration) / 1000).toFixed(1)}초
    - 발화 빈도: ${vadMetrics.speechFrequency}회/분
    ` : ""}

    ${psychoIndicators.length > 0 ? `
    [심리 지표]
    ${psychoIndicators.map(i => `- ${i.description}: ${i.psychologicalMeaning}`).join("\n")}
    ` : ""}

    단계:
    1. 표정 변화를 해석합니다.
    2. 음성 활동 패턴(긴 침묵, 낮은 발화 빈도 등)을 고려합니다.
    3. 발화 내용과 심리 지표를 종합합니다.
    4. 감정을 단어 하나로 출력합니다. (예: 불안, 우울, 평온, 긴장 등)
  `;

  // ... Gemini 호출 ...
}
```

**통합 테스트**:

```bash
# 1. 우울 시뮬레이션
# - 5초 침묵 → 짧은 발화 → 3초 침묵 반복
# - 표정: 눈썹 내림, 입꼬리 하강
# - 예상 결과: "우울" 또는 "무기력"

# 2. 불안 시뮬레이션
# - 빠른 발화 → 짧은 침묵 → 빠른 발화 반복
# - 표정: 눈썹 올림, 눈 크게 뜸
# - 예상 결과: "불안" 또는 "긴장"

# 3. 평온 시뮬레이션
# - 적절한 발화 속도, 자연스러운 침묵
# - 표정: 중립적 표정
# - 예상 결과: "평온" 또는 "안정"
```

---

## 트러블슈팅

### 문제 1: VAD 모델 로딩 실패

**증상**:
```
❌ VAD initialization failed: Error: Cannot find module '@ricky0123/vad-node'
```

**해결 방법**:
```bash
# 1. 패키지 재설치
npm install @ricky0123/vad-node --save

# 2. 캐시 클리어 후 재설치
rm -rf node_modules package-lock.json
npm install

# 3. Node.js 버전 확인 (18+ 필요)
node --version
```

---

### 문제 2: 오디오 청크 전송 실패

**증상**:
```
Voice message parsing error: SyntaxError: Unexpected token
```

**해결 방법**:

프론트엔드에서 Float32Array를 Array로 변환:

```javascript
// ❌ 잘못된 코드
voiceWs.send(audioData); // Float32Array는 JSON으로 직렬화 불가

// ✅ 올바른 코드
voiceWs.send(JSON.stringify({
  type: "audio_chunk",
  data: Array.from(audioData) // Float32Array → Array
}));
```

백엔드에서 Array를 Float32Array로 복원:

```javascript
const message = JSON.parse(data);
const audioChunk = new Float32Array(message.data);
```

---

### 문제 3: VAD 분석이 너무 느림

**증상**:
```
⚠️ VAD analysis taking >500ms per chunk
```

**해결 방법**:

1. **샘플레이트 확인**:
```javascript
// 16kHz 확인
console.log("Sample rate:", audioContext.sampleRate); // 16000이어야 함
```

2. **청크 크기 조정**:
```javascript
// 100ms @ 16kHz = 1600 samples
scriptProcessor = audioContext.createScriptProcessor(1600, 1, 1);
```

3. **VAD Threshold 조정**:
```bash
# .env 파일
VAD_THRESHOLD=0.7  # 0.5 → 0.7 (더 높은 확률만 음성으로 판정)
```

---

### 문제 4: 메트릭이 업데이트되지 않음

**증상**:
```
📊 메트릭 패널이 10초 후에도 업데이트되지 않음
```

**디버깅**:

```javascript
// voiceHandler.js에 로그 추가
console.log(`[DEBUG] Events count: ${vadMetrics.events.length}`);
console.log(`[DEBUG] Session status: ${session.status}`);
console.log(`[DEBUG] Session WS state: ${session.wsConnections.session?.readyState}`);

// 예상 출력:
// [DEBUG] Events count: 100 (10초 × 10 events/sec)
// [DEBUG] Session status: active
// [DEBUG] Session WS state: 1 (OPEN)
```

**해결 방법**:

1. **세션 상태 확인**:
```javascript
// 세션이 paused 상태면 분석 건너뜀
if (session.status !== "active") return;
```

2. **WebSocket 연결 확인**:
```javascript
// /ws/session이 연결되어 있는지 확인
if (!session.wsConnections.session) {
  console.error("Session WebSocket not connected");
}
```

---

### 문제 5: 심리 지표가 과도하게 감지됨

**증상**:
```
⚠️ 정상적인 대화에서도 지표가 너무 많이 감지됨
```

**해결 방법**:

임계값 조정 (`.env` 파일):

```bash
# 더 엄격한 기준 적용
SILENCE_THRESHOLD_MS=5000      # 3초 → 5초
FAST_SPEECH_THRESHOLD=200      # 180 → 200
SLOW_SPEECH_THRESHOLD=70       # 90 → 70
```

---

## 체크리스트

### Task 2.1: Silero VAD 통합
- [ ] `VadAnalyzer.js` 생성 및 테스트
- [ ] `voiceHandler.js` 업데이트
- [ ] VAD 모델 로딩 확인 (서버 시작 시 2-3초 소요)
- [ ] 100ms 청크 분석 정상 동작 확인

### Task 2.2: VAD 메트릭 분석
- [ ] `VadMetrics.js` 생성
- [ ] 10초 메트릭 계산 정상 동작 확인
- [ ] 세그먼트 추출 로직 검증
- [ ] 통계 계산 정확성 확인

### Task 2.3: 심리 지표 추출
- [ ] `PsychologicalIndicators.js` 생성
- [ ] 5가지 지표 감지 로직 검증
- [ ] 심각도 계산 정확성 확인
- [ ] 임계값 튜닝

### Task 2.4: 프론트엔드 VAD UI
- [ ] `vad-test.html` 생성
- [ ] 마이크 접근 권한 획득
- [ ] 오디오 청크 전송 확인
- [ ] 실시간 VAD 상태 표시 확인
- [ ] 메트릭 및 지표 UI 정상 작동

### 통합 테스트
- [ ] VAD + 표정 + STT 멀티모달 분석 테스트
- [ ] Gemini 프롬프트에 VAD 데이터 포함 확인
- [ ] 세션 일시정지/재개 시 VAD 동작 확인
- [ ] 리소스 정리 (WebSocket 종료 시) 확인

---

## 예상 소요 시간

| Task | 예상 시간 | 난이도 |
|------|-----------|--------|
| 2.1: Silero VAD 통합 | 3-4시간 | ⭐⭐⭐⭐ |
| 2.2: VAD 메트릭 분석 | 2-3시간 | ⭐⭐⭐ |
| 2.3: 심리 지표 추출 | 2-3시간 | ⭐⭐⭐ |
| 2.4: 프론트엔드 VAD UI | 2-3시간 | ⭐⭐⭐ |
| 통합 테스트 & 디버깅 | 1-2시간 | ⭐⭐ |
| **합계** | **10-14시간** | |

---

## 다음 단계

Phase 2 완료 후 **Phase 3: CBT 분석**으로 이동:
- 10가지 인지 왜곡 패턴 탐지
- 소크라테스식 질문 생성
- 행동 과제 추천
- 치료적 개입 제안

상세 가이드: `docs/STEP3_GUIDE.md` (다음 문서)

---

**마지막 업데이트**: 2025-01-17
**문서 버전**: 1.0.0
**작성자**: BeMore 개발팀
