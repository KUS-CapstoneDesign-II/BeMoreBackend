# 📘 Phase 3: CBT 분석 상세 구현 가이드

> **Cognitive Behavioral Therapy (CBT)** 인지행동치료 기반 인지 왜곡 탐지 및 치료적 개입

**작성일**: 2025-01-17
**대상 Phase**: Phase 3 (CBT Analysis)
**예상 소요 시간**: 12-16시간
**난이도**: ⭐⭐⭐⭐⭐ (최고급)

---

## 📋 목차

1. [개요](#개요)
2. [사전 준비사항](#사전-준비사항)
3. [Task 3.1: 인지 왜곡 탐지 시스템](#task-31-인지-왜곡-탐지-시스템)
4. [Task 3.2: 소크라테스식 질문 생성](#task-32-소크라테스식-질문-생성)
5. [Task 3.3: 행동 과제 추천](#task-33-행동-과제-추천)
6. [Task 3.4: 치료적 개입 통합](#task-34-치료적-개입-통합)
7. [통합 테스트](#통합-테스트)
8. [트러블슈팅](#트러블슈팅)

---

## 개요

### Phase 3의 목표

Phase 2에서 구축한 멀티모달 분석(표정 + 음성 + STT) 위에 **CBT (Cognitive Behavioral Therapy)** 기반 심리 치료 기능을 통합합니다.

**핵심 기능**:
1. **10가지 인지 왜곡**: 파국화, 흑백논리, 과일반화 등 자동 탐지
2. **소크라테스식 질문**: 인지 재구조화를 위한 질문 자동 생성
3. **행동 과제**: 구체적인 치료 과제 추천
4. **실시간 개입**: 상담 중 치료적 개입 제안

### 아키텍처 변화

```mermaid
graph TB
    subgraph "입력 데이터"
        A[STT 텍스트]
        B[감정 분석 결과]
        C[VAD 메트릭]
    end

    subgraph "CBT 분석 엔진"
        D[인지 왜곡 탐지기]
        E[패턴 매칭]
        F[심각도 평가]
    end

    subgraph "개입 생성"
        G[소크라테스식 질문]
        H[행동 과제]
        I[치료적 피드백]
    end

    subgraph "Gemini AI 통합"
        J[컨텍스트 분석]
        K[맞춤형 개입 생성]
        L[검증 및 필터링]
    end

    A --> D
    B --> F
    C --> F
    D --> E
    E --> F
    F --> G
    F --> H
    F --> I
    G --> J
    H --> J
    I --> J
    J --> K
    K --> L
    L --> M[/ws/session으로 전송]
```

### 10가지 인지 왜곡 (Beck's Cognitive Distortions)

| 번호 | 왜곡 유형 | 설명 | 예시 |
|------|----------|------|------|
| 1 | **파국화** (Catastrophizing) | 최악의 시나리오를 가정 | "시험 망치면 인생 끝이야" |
| 2 | **흑백논리** (All-or-Nothing) | 극단적 이분법 사고 | "완벽하지 않으면 실패야" |
| 3 | **과일반화** (Overgeneralization) | 한 번의 사건을 일반화 | "항상 나는 실패해" |
| 4 | **정신적 여과** (Mental Filter) | 부정적 측면만 집중 | "칭찬은 무시하고 비난만 기억" |
| 5 | **긍정 부인** (Disqualifying Positive) | 긍정적 경험 무시 | "운이 좋았을 뿐이야" |
| 6 | **성급한 결론** (Jumping to Conclusions) | 증거 없이 부정적 해석 | "그가 날 싫어할 거야" |
| 7 | **확대/축소** (Magnification/Minimization) | 중요도 왜곡 | "내 실수는 크고 성취는 작아" |
| 8 | **감정적 추론** (Emotional Reasoning) | 감정을 사실로 간주 | "불안하니까 위험한 거야" |
| 9 | **당위적 사고** (Should Statements) | 경직된 규칙 적용 | "나는 ~해야만 해" |
| 10 | **낙인찍기** (Labeling) | 부정적 자기 정의 | "나는 실패자야" |

---

## 사전 준비사항

### 1. Node.js 의존성 설치

```bash
# 자연어 처리
npm install natural
npm install compromise

# 감정 분석 (영어)
npm install sentiment

# 한국어 형태소 분석 (선택)
npm install koalanlp

# 텍스트 유사도
npm install string-similarity
```

### 2. 디렉토리 구조

```bash
services/
├── cbt/
│   ├── CognitiveDistortionDetector.js   # 생성 예정
│   ├── SocraticQuestioner.js            # 생성 예정
│   ├── BehavioralTaskRecommender.js     # 생성 예정
│   ├── InterventionGenerator.js         # 생성 예정
│   └── patterns/
│       ├── catastrophizing.json         # 패턴 데이터
│       ├── all-or-nothing.json
│       └── ... (10개 파일)
└── gemini/
    └── gemini.js                        # 업데이트 예정
```

### 3. 환경 변수

`.env` 파일에 추가:

```bash
# CBT 설정
CBT_DETECTION_THRESHOLD=0.6       # 인지 왜곡 탐지 임계값
CBT_INTERVENTION_FREQUENCY=3      # 3회 탐지 시 개입
CBT_LANGUAGE=ko                   # 한국어

# Gemini CBT 전용 모델
GEMINI_CBT_MODEL=gemini-2.5-flash
GEMINI_CBT_TEMPERATURE=0.7        # 창의적 질문 생성
```

---

## Task 3.1: 인지 왜곡 탐지 시스템

### 3.1.1 패턴 데이터베이스 생성

**파일**: `services/cbt/patterns/catastrophizing.json`

```json
{
  "type": "catastrophizing",
  "name_ko": "파국화",
  "name_en": "Catastrophizing",
  "description": "최악의 시나리오를 가정하거나 상황을 과도하게 부정적으로 해석하는 사고 패턴",
  "keywords": [
    "끝이야", "망했어", "최악", "절망", "죽을 것 같아",
    "살 수 없어", "불가능", "아무것도", "전부", "영원히",
    "다 끝났어", "망쳤어", "재앙", "파멸"
  ],
  "patterns": [
    {
      "regex": "(시험|발표|면접).*(망|실패).*(인생|끝|미래)",
      "severity": "high",
      "example": "시험 망치면 인생 끝이야"
    },
    {
      "regex": "(이번에).*(안|못).*(되면|하면).*(다|모두|전부).*(끝|망)",
      "severity": "high",
      "example": "이번에 안 되면 다 끝이야"
    },
    {
      "regex": "최악|파국|재앙|절망|끝장",
      "severity": "medium",
      "example": "이건 최악의 상황이야"
    },
    {
      "regex": "(절대|영원히).*(안|못).*(될|할)",
      "severity": "medium",
      "example": "절대 안 될 거야"
    }
  ],
  "psychological_impact": "불안, 우울, 무기력, 회피",
  "intervention_priority": "high"
}
```

**파일**: `services/cbt/patterns/all-or-nothing.json`

```json
{
  "type": "all-or-nothing",
  "name_ko": "흑백논리",
  "name_en": "All-or-Nothing Thinking",
  "description": "중간 지대 없이 극단적 이분법으로 상황을 판단하는 사고 패턴",
  "keywords": [
    "완벽", "전부", "아무것도", "항상", "절대", "전혀",
    "모두", "하나도", "100%", "0%", "성공", "실패"
  ],
  "patterns": [
    {
      "regex": "완벽.*(아니|못).*(실패|쓸모)",
      "severity": "high",
      "example": "완벽하지 않으면 실패야"
    },
    {
      "regex": "(전부|모두|다).*(성공|완벽).*(아니면).*(의미|쓸모|가치).*(없)",
      "severity": "high",
      "example": "전부 성공하지 않으면 의미 없어"
    },
    {
      "regex": "(항상|절대).*(성공|실패)",
      "severity": "medium",
      "example": "항상 성공해야 해"
    },
    {
      "regex": "100%.*(아니면|못)",
      "severity": "medium",
      "example": "100% 완벽하지 않으면 안 돼"
    }
  ],
  "psychological_impact": "완벽주의, 자기비판, 우울",
  "intervention_priority": "high"
}
```

**나머지 8개 파일** (`overgeneralization.json`, `mental-filter.json` 등)도 같은 구조로 생성 (생략)

---

### 3.1.2 인지 왜곡 탐지기 클래스

**파일**: `services/cbt/CognitiveDistortionDetector.js`

```javascript
const fs = require("fs");
const path = require("path");

class CognitiveDistortionDetector {
  constructor() {
    this.patterns = this._loadPatterns();
    this.threshold = parseFloat(process.env.CBT_DETECTION_THRESHOLD) || 0.6;
  }

  /**
   * 10가지 인지 왜곡 패턴 로드
   */
  _loadPatterns() {
    const patternsDir = path.join(__dirname, "patterns");
    const patterns = [];

    const files = [
      "catastrophizing.json",
      "all-or-nothing.json",
      "overgeneralization.json",
      "mental-filter.json",
      "disqualifying-positive.json",
      "jumping-to-conclusions.json",
      "magnification.json",
      "emotional-reasoning.json",
      "should-statements.json",
      "labeling.json",
    ];

    files.forEach(file => {
      try {
        const filePath = path.join(patternsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        patterns.push(data);
      } catch (err) {
        console.error(`Failed to load pattern: ${file}`, err);
      }
    });

    console.log(`✅ Loaded ${patterns.length} CBT patterns`);
    return patterns;
  }

  /**
   * STT 텍스트에서 인지 왜곡 탐지
   * @param {string} text - STT 텍스트
   * @returns {Array} 탐지된 왜곡 목록
   */
  detectDistortions(text) {
    if (!text || text.trim().length === 0) return [];

    const detections = [];

    this.patterns.forEach(pattern => {
      const matches = this._matchPattern(text, pattern);
      if (matches.length > 0) {
        detections.push({
          type: pattern.type,
          name: pattern.name_ko,
          matches: matches,
          severity: this._calculateSeverity(matches),
          description: pattern.description,
          psychologicalImpact: pattern.psychological_impact,
          priority: pattern.intervention_priority,
          timestamp: Date.now(),
        });
      }
    });

    // 심각도 순 정렬
    detections.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return detections;
  }

  /**
   * 패턴 매칭
   */
  _matchPattern(text, pattern) {
    const matches = [];

    // 1. 키워드 매칭
    const keywordMatches = pattern.keywords.filter(kw => text.includes(kw));
    if (keywordMatches.length > 0) {
      matches.push({
        type: "keyword",
        matched: keywordMatches,
        confidence: 0.5,
      });
    }

    // 2. 정규표현식 매칭
    pattern.patterns.forEach(p => {
      const regex = new RegExp(p.regex, "gi");
      const regexMatches = text.match(regex);
      if (regexMatches) {
        matches.push({
          type: "pattern",
          matched: regexMatches,
          severity: p.severity,
          confidence: 0.8,
          example: p.example,
        });
      }
    });

    return matches;
  }

  /**
   * 심각도 계산
   */
  _calculateSeverity(matches) {
    if (matches.length === 0) return "low";

    const patternMatches = matches.filter(m => m.type === "pattern");
    if (patternMatches.length === 0) return "low";

    const highSeverity = patternMatches.some(m => m.severity === "high");
    if (highSeverity) return "high";

    const mediumSeverity = patternMatches.some(m => m.severity === "medium");
    if (mediumSeverity) return "medium";

    return "low";
  }

  /**
   * 심각도 점수 계산 (0-1)
   */
  getSeverityScore(detections) {
    if (detections.length === 0) return 0;

    const severityMap = { high: 1.0, medium: 0.6, low: 0.3 };
    const scores = detections.map(d => severityMap[d.severity] || 0);
    return Math.max(...scores);
  }
}

// Singleton
let instance = null;

function getCognitiveDistortionDetector() {
  if (!instance) {
    instance = new CognitiveDistortionDetector();
  }
  return instance;
}

module.exports = { getCognitiveDistortionDetector };
```

**핵심 기능**:
- **10가지 패턴**: JSON 파일로 관리 (유지보수 용이)
- **키워드 + Regex**: 2단계 매칭으로 정확도 향상
- **심각도 평가**: high/medium/low 자동 분류
- **우선순위**: 개입 필요성 평가

---

## Task 3.2: 소크라테스식 질문 생성

### 3.2.1 질문 생성기 클래스

**파일**: `services/cbt/SocraticQuestioner.js`

```javascript
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

class SocraticQuestioner {
  constructor() {
    this.model = process.env.GEMINI_CBT_MODEL || "gemini-2.5-flash";
    this.temperature = parseFloat(process.env.GEMINI_CBT_TEMPERATURE) || 0.7;
  }

  /**
   * 인지 왜곡에 대한 소크라테스식 질문 생성
   * @param {Object} distortion - 탐지된 왜곡 객체
   * @param {string} originalText - 원문
   * @returns {Promise<Array>} 질문 리스트
   */
  async generateQuestions(distortion, originalText) {
    const prompt = this._buildPrompt(distortion, originalText);

    try {
      const response = await genAI.models.generateContent({
        model: this.model,
        contents: prompt,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: 500,
        },
      });

      const questions = this._parseResponse(response.text);
      console.log(`✅ Generated ${questions.length} Socratic questions for ${distortion.type}`);
      return questions;

    } catch (err) {
      console.error("Gemini Socratic question generation error:", err);
      return this._getFallbackQuestions(distortion.type);
    }
  }

  /**
   * 프롬프트 구성
   */
  _buildPrompt(distortion, originalText) {
    return `
당신은 전문 심리 상담사입니다. 내담자의 인지 왜곡을 소크라테스식 질문법으로 재구조화하세요.

**인지 왜곡 유형**: ${distortion.name} (${distortion.type})
**설명**: ${distortion.description}
**원문**: "${originalText}"

**소크라테스식 질문법 원칙**:
1. **증거 탐색**: "그렇게 생각하는 증거가 있나요?"
2. **대안 탐색**: "다른 가능성은 없을까요?"
3. **결과 예측**: "실제로 그렇게 된다면 어떻게 될까요?"
4. **과거 경험**: "과거에 비슷한 상황은 어떻게 해결했나요?"
5. **타인 관점**: "친구가 같은 상황이라면 뭐라고 할까요?"

**요구사항**:
- 3-5개의 질문 생성
- 비판적이지 않고 호기심 어린 톤
- 내담자가 스스로 답을 찾도록 유도
- 한국어로 작성
- 각 질문은 줄바꿈으로 구분

**출력 형식**:
Q1: [질문 1]
Q2: [질문 2]
Q3: [질문 3]
    `.trim();
  }

  /**
   * Gemini 응답 파싱
   */
  _parseResponse(text) {
    const lines = text.trim().split("\n").filter(l => l.trim().length > 0);
    const questions = [];

    lines.forEach(line => {
      // "Q1:", "1.", "- " 등 제거
      const cleaned = line.replace(/^(Q\d+:|[\d]+\.|-)\s*/, "").trim();
      if (cleaned.length > 5) {
        questions.push(cleaned);
      }
    });

    return questions;
  }

  /**
   * 폴백 질문 (Gemini 실패 시)
   */
  _getFallbackQuestions(distortionType) {
    const fallbacks = {
      catastrophizing: [
        "최악의 상황이 실제로 일어날 가능성은 얼마나 될까요?",
        "과거에 비슷한 걱정을 했을 때 실제로 어떻게 되었나요?",
        "만약 친구가 같은 걱정을 한다면 어떤 조언을 해주고 싶으신가요?",
      ],
      "all-or-nothing": [
        "완벽과 실패 사이에 중간 단계가 있을 수 있을까요?",
        "80% 성공했다면 그것도 실패인가요?",
        "부분적인 성공도 의미가 있지 않을까요?",
      ],
      overgeneralization: [
        "항상 그런 건가요? 예외적인 경우는 없었나요?",
        "한 번의 경험이 모든 상황에 적용될까요?",
        "과거에 성공한 적도 있지 않나요?",
      ],
    };

    return fallbacks[distortionType] || [
      "그렇게 생각하는 구체적인 이유가 있을까요?",
      "다른 관점에서 볼 수 있는 방법은 없을까요?",
      "이 생각이 도움이 되나요?",
    ];
  }
}

// Singleton
let instance = null;

function getSocraticQuestioner() {
  if (!instance) {
    instance = new SocraticQuestioner();
  }
  return instance;
}

module.exports = { getSocraticQuestioner };
```

**핵심 원리**:
- **Gemini AI**: 맥락에 맞는 맞춤형 질문 생성
- **5가지 원칙**: 증거, 대안, 결과, 경험, 타인 관점
- **비판 금지**: 호기심 어린 톤으로 자기성찰 유도
- **폴백**: AI 실패 시 사전 정의된 질문 사용

---

## Task 3.3: 행동 과제 추천

### 3.3.1 행동 과제 추천기 클래스

**파일**: `services/cbt/BehavioralTaskRecommender.js`

```javascript
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

class BehavioralTaskRecommender {
  constructor() {
    this.model = process.env.GEMINI_CBT_MODEL || "gemini-2.5-flash";
    this.temperature = 0.8; // 창의적 과제 생성
  }

  /**
   * 행동 과제 추천
   * @param {Object} distortion - 인지 왜곡
   * @param {Object} context - 세션 컨텍스트 (감정, VAD 등)
   * @returns {Promise<Array>} 과제 리스트
   */
  async recommendTasks(distortion, context = {}) {
    const prompt = this._buildPrompt(distortion, context);

    try {
      const response = await genAI.models.generateContent({
        model: this.model,
        contents: prompt,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: 600,
        },
      });

      const tasks = this._parseResponse(response.text);
      console.log(`✅ Recommended ${tasks.length} behavioral tasks for ${distortion.type}`);
      return tasks;

    } catch (err) {
      console.error("Gemini task recommendation error:", err);
      return this._getFallbackTasks(distortion.type);
    }
  }

  /**
   * 프롬프트 구성
   */
  _buildPrompt(distortion, context) {
    return `
당신은 CBT 전문 상담사입니다. 내담자의 인지 왜곡을 개선하기 위한 구체적인 행동 과제를 추천하세요.

**인지 왜곡**: ${distortion.name} (${distortion.type})
**설명**: ${distortion.description}
**심리적 영향**: ${distortion.psychologicalImpact}

${context.emotion ? `**현재 감정**: ${context.emotion}` : ""}
${context.vadMetrics ? `
**음성 패턴**:
- 발화 비율: ${context.vadMetrics.speechRate}%
- 평균 침묵 길이: ${(parseFloat(context.vadMetrics.avgSilenceDuration) / 1000).toFixed(1)}초
` : ""}

**행동 과제 원칙**:
1. **구체적**: 측정 가능하고 실행 가능한 과제
2. **점진적**: 작은 단계부터 시작
3. **안전함**: 내담자에게 부담 없는 수준
4. **일상적**: 일상에서 실천 가능
5. **기록**: 과제 수행 후 기록 권장

**요구사항**:
- 2-3개의 과제 추천
- 각 과제는 제목, 설명, 기대 효과 포함
- 한국어로 작성

**출력 형식**:
[Task 1]
제목: [과제 제목]
설명: [구체적 실행 방법]
기대효과: [예상 심리적 효과]

[Task 2]
...
    `.trim();
  }

  /**
   * 응답 파싱
   */
  _parseResponse(text) {
    const tasks = [];
    const blocks = text.split(/\[Task \d+\]/).filter(b => b.trim().length > 0);

    blocks.forEach(block => {
      const lines = block.trim().split("\n");
      const task = {};

      lines.forEach(line => {
        if (line.startsWith("제목:")) {
          task.title = line.replace("제목:", "").trim();
        } else if (line.startsWith("설명:")) {
          task.description = line.replace("설명:", "").trim();
        } else if (line.startsWith("기대효과:") || line.startsWith("기대 효과:")) {
          task.expectedEffect = line.replace(/기대\s?효과:/, "").trim();
        }
      });

      if (task.title && task.description) {
        tasks.push(task);
      }
    });

    return tasks;
  }

  /**
   * 폴백 과제
   */
  _getFallbackTasks(distortionType) {
    const fallbacks = {
      catastrophizing: [
        {
          title: "최악의 시나리오 vs 현실 비교",
          description: "걱정되는 상황의 '최악의 결과'와 '가장 현실적인 결과'를 종이에 적어보세요. 과거에 비슷한 걱정이 실제로 어떻게 되었는지도 기록하세요.",
          expectedEffect: "과도한 걱정과 현실의 차이를 인식하고, 걱정의 비합리성을 깨달을 수 있습니다.",
        },
        {
          title: "하루 3가지 괜찮았던 일 기록",
          description: "매일 자기 전, '오늘 괜찮았던 일 3가지'를 메모장에 적어보세요. 아주 작은 것도 괜찮습니다 (예: 따뜻한 커피, 친구 메시지).",
          expectedEffect: "부정적 사고에서 벗어나 긍정적 측면에 주의를 돌릴 수 있습니다.",
        },
      ],
      "all-or-nothing": [
        {
          title: "부분 성공 인정하기",
          description: "완벽하지 않았지만 부분적으로 성공한 경험 3가지를 찾아 적어보세요. 각각 몇 % 성공했는지 숫자로 표현하세요.",
          expectedEffect: "완벽과 실패 사이의 회색 지대를 인식하고, 부분적 성공의 가치를 깨닫습니다.",
        },
      ],
    };

    return fallbacks[distortionType] || [
      {
        title: "생각 기록하기",
        description: "부정적 생각이 들 때마다 메모장에 적어보세요. 나중에 다시 읽으면 새로운 관점을 발견할 수 있습니다.",
        expectedEffect: "자동적 사고 패턴을 인식하고, 객관적으로 평가할 수 있습니다.",
      },
    ];
  }
}

// Singleton
let instance = null;

function getBehavioralTaskRecommender() {
  if (!instance) {
    instance = new BehavioralTaskRecommender();
  }
  return instance;
}

module.exports = { getBehavioralTaskRecommender };
```

**과제 예시**:

```javascript
[
  {
    title: "최악의 시나리오 vs 현실 비교",
    description: "걱정되는 상황의 '최악의 결과'와 '가장 현실적인 결과'를 종이에 적어보세요.",
    expectedEffect: "과도한 걱정과 현실의 차이를 인식합니다."
  },
  {
    title: "하루 3가지 괜찮았던 일 기록",
    description: "매일 자기 전 오늘 괜찮았던 일 3가지를 메모하세요.",
    expectedEffect: "긍정적 측면에 주의를 돌릴 수 있습니다."
  }
]
```

---

## Task 3.4: 치료적 개입 통합

### 3.4.1 개입 생성기 클래스

**파일**: `services/cbt/InterventionGenerator.js`

```javascript
const { getCognitiveDistortionDetector } = require("./CognitiveDistortionDetector");
const { getSocraticQuestioner } = require("./SocraticQuestioner");
const { getBehavioralTaskRecommender } = require("./BehavioralTaskRecommender");

class InterventionGenerator {
  constructor() {
    this.detector = getCognitiveDistortionDetector();
    this.questioner = getSocraticQuestioner();
    this.taskRecommender = getBehavioralTaskRecommender();

    this.interventionFrequency = parseInt(process.env.CBT_INTERVENTION_FREQUENCY) || 3;
    this.distortionHistory = new Map(); // sessionId -> [distortions]
  }

  /**
   * STT 텍스트 분석 및 개입 생성
   * @param {string} sessionId
   * @param {string} text - STT 텍스트
   * @param {Object} context - 감정, VAD 메트릭 등
   * @returns {Promise<Object|null>} 개입 객체 또는 null
   */
  async analyzeAndIntervene(sessionId, text, context = {}) {
    // 1. 인지 왜곡 탐지
    const distortions = this.detector.detectDistortions(text);

    if (distortions.length === 0) {
      console.log(`✅ No cognitive distortions detected in: "${text.slice(0, 50)}..."`);
      return null;
    }

    console.log(`⚠️ Detected ${distortions.length} cognitive distortion(s):`, distortions.map(d => d.name));

    // 2. 히스토리 업데이트
    if (!this.distortionHistory.has(sessionId)) {
      this.distortionHistory.set(sessionId, []);
    }
    const history = this.distortionHistory.get(sessionId);
    history.push(...distortions);

    // 3. 개입 필요성 판단
    const shouldIntervene = this._shouldIntervene(distortions, history);

    if (!shouldIntervene) {
      console.log(`📝 Distortion recorded but intervention not triggered yet`);
      return { distortions, intervention: null };
    }

    // 4. 개입 생성
    const intervention = await this._generateIntervention(distortions[0], text, context);

    console.log(`✅ Intervention generated for ${distortions[0].name}`);
    return { distortions, intervention };
  }

  /**
   * 개입 필요성 판단
   */
  _shouldIntervene(currentDistortions, history) {
    // 1. 심각도가 high면 즉시 개입
    if (currentDistortions.some(d => d.severity === "high")) {
      return true;
    }

    // 2. 같은 유형의 왜곡이 N회 이상 반복되면 개입
    const recentDistortions = history.slice(-10); // 최근 10개만
    const typeCounts = {};

    recentDistortions.forEach(d => {
      typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(typeCounts));
    if (maxCount >= this.interventionFrequency) {
      return true;
    }

    // 3. 다양한 왜곡이 동시 발생하면 개입
    if (currentDistortions.length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * 개입 생성 (질문 + 과제)
   */
  async _generateIntervention(distortion, originalText, context) {
    try {
      // 병렬 처리
      const [questions, tasks] = await Promise.all([
        this.questioner.generateQuestions(distortion, originalText),
        this.taskRecommender.recommendTasks(distortion, context),
      ]);

      return {
        distortionType: distortion.type,
        distortionName: distortion.name,
        severity: distortion.severity,
        description: distortion.description,
        questions,
        tasks,
        timestamp: new Date().toISOString(),
        context: {
          emotion: context.emotion || null,
          vadMetrics: context.vadMetrics || null,
        },
      };
    } catch (err) {
      console.error("Intervention generation error:", err);
      return null;
    }
  }

  /**
   * 세션 종료 시 히스토리 정리
   */
  clearHistory(sessionId) {
    this.distortionHistory.delete(sessionId);
    console.log(`🧹 Cleared CBT history for session: ${sessionId}`);
  }
}

// Singleton
let instance = null;

function getInterventionGenerator() {
  if (!instance) {
    instance = new InterventionGenerator();
  }
  return instance;
}

module.exports = { getInterventionGenerator };
```

**개입 예시**:

```javascript
{
  distortionType: "catastrophizing",
  distortionName: "파국화",
  severity: "high",
  description: "최악의 시나리오를 가정하거나 상황을 과도하게 부정적으로 해석하는 사고 패턴",
  questions: [
    "최악의 상황이 실제로 일어날 가능성은 얼마나 될까요?",
    "과거에 비슷한 걱정을 했을 때 실제로 어떻게 되었나요?",
    "만약 친구가 같은 걱정을 한다면 어떤 조언을 해주고 싶으신가요?"
  ],
  tasks: [
    {
      title: "최악의 시나리오 vs 현실 비교",
      description: "걱정되는 상황의 '최악의 결과'와 '가장 현실적인 결과'를 종이에 적어보세요.",
      expectedEffect: "과도한 걱정과 현실의 차이를 인식합니다."
    }
  ],
  timestamp: "2025-01-17T10:30:00.000Z",
  context: {
    emotion: "불안",
    vadMetrics: { /* VAD 데이터 */ }
  }
}
```

---

### 3.4.2 Gemini 멀티모달 통합 업데이트

**파일**: `services/gemini/gemini.js` (기존 파일 수정)

기존 `analyzeExpression` 함수를 다음과 같이 확장:

```javascript
const { getInterventionGenerator } = require("../cbt/InterventionGenerator");

async function analyzeExpression(sessionId, accumulatedData, speechText = "", vadMetrics = null, psychoIndicators = []) {
  // ... 기존 표정 분석 코드 ...

  // CBT 개입 생성 (새로 추가)
  let cbtIntervention = null;
  if (speechText && speechText.trim().length > 0) {
    const interventionGen = getInterventionGenerator();
    const result = await interventionGen.analyzeAndIntervene(sessionId, speechText, {
      vadMetrics,
      psychoIndicators,
    });

    if (result && result.intervention) {
      cbtIntervention = result.intervention;
    }
  }

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
    ` : ""}

    ${psychoIndicators.length > 0 ? `
    [심리 지표]
    ${psychoIndicators.map(i => `- ${i.description}: ${i.psychologicalMeaning}`).join("\n")}
    ` : ""}

    ${cbtIntervention ? `
    [인지 왜곡 탐지]
    - 유형: ${cbtIntervention.distortionName}
    - 심각도: ${cbtIntervention.severity}
    - 설명: ${cbtIntervention.description}
    ` : ""}

    단계:
    1. 표정 변화를 해석합니다.
    2. 음성 활동 패턴을 고려합니다.
    3. 발화 내용과 심리 지표를 분석합니다.
    4. 인지 왜곡 패턴이 있다면 감정 판단에 반영합니다.
    5. 감정을 단어 하나로 출력합니다. (예: 불안, 우울, 평온, 긴장 등)
  `;

  try {
    const res = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const emotion = res.text.trim().split("\n").pop();

    console.log(`Gemini 분석 완료: ${emotion}${cbtIntervention ? " (CBT 개입 있음)" : ""}`);

    return {
      emotion,
      cbtIntervention, // 새로 추가
    };

  } catch (err) {
    console.error("Gemini Error:", err);
    return {
      emotion: "분석 실패",
      cbtIntervention: null,
    };
  }
}

module.exports = { analyzeExpression };
```

---

### 3.4.3 WebSocket 핸들러 통합

**파일**: `services/socket/landmarksHandler.js` (수정)

10초 분석 주기에 CBT 개입 포함:

```javascript
// ... 기존 코드 ...

const analysisInterval = setInterval(async () => {
  if (session.status !== "active") return;

  const framesToAnalyze = [...session.landmarkBuffer];
  const sttToAnalyze = getAccumulatedSpeechText(lastAnalysisTime);
  const vadMetrics = session.vadMetrics || null;
  const psychoIndicators = session.psychologicalIndicators || [];

  try {
    // Gemini 멀티모달 분석 (CBT 포함)
    const result = await analyzeExpression(
      session.sessionId,
      framesToAnalyze,
      sttToAnalyze,
      vadMetrics,
      psychoIndicators
    );

    console.log(`🎯 Gemini 분석: ${result.emotion}${result.cbtIntervention ? " (CBT 개입)" : ""}`);

    // 세션에 저장
    session.emotions.push({
      timestamp: Date.now(),
      emotion: result.emotion,
      framesCount: framesToAnalyze.length,
      sttLength: sttToAnalyze.length,
      cbtIntervention: result.cbtIntervention, // 새로 추가
    });

    // /ws/session으로 전송
    if (session.wsConnections.session?.readyState === 1) {
      session.wsConnections.session.send(JSON.stringify({
        type: "emotion_update",
        data: {
          emotion: result.emotion,
          timestamp: new Date().toISOString(),
          framesCount: framesToAnalyze.length,
          cbtIntervention: result.cbtIntervention, // 새로 추가
        },
      }));
    }

    // 버퍼 초기화
    session.landmarkBuffer = [];
    lastAnalysisTime = Date.now();
    clearSpeechBuffer(lastAnalysisTime);

  } catch (err) {
    console.error("Analysis error:", err);
  }
}, ANALYSIS_INTERVAL_MS);
```

---

## 통합 테스트

### 테스트 1: 인지 왜곡 탐지 테스트

**파일**: `test-cbt.js` (루트 디렉토리에 생성)

```javascript
const { getCognitiveDistortionDetector } = require("./services/cbt/CognitiveDistortionDetector");

const detector = getCognitiveDistortionDetector();

const testCases = [
  {
    text: "시험 망치면 인생 끝이야",
    expected: "catastrophizing",
  },
  {
    text: "완벽하지 않으면 실패야",
    expected: "all-or-nothing",
  },
  {
    text: "항상 나는 실패해",
    expected: "overgeneralization",
  },
  {
    text: "나는 쓸모없는 사람이야",
    expected: "labeling",
  },
];

console.log("=== CBT 인지 왜곡 탐지 테스트 ===\n");

testCases.forEach((test, idx) => {
  console.log(`[Test ${idx + 1}] "${test.text}"`);
  const detections = detector.detectDistortions(test.text);

  if (detections.length > 0) {
    console.log(`✅ 탐지됨: ${detections[0].name} (${detections[0].type})`);
    console.log(`   심각도: ${detections[0].severity}`);
    console.log(`   매칭: ${JSON.stringify(detections[0].matches, null, 2)}`);
  } else {
    console.log(`❌ 탐지 실패`);
  }
  console.log("");
});
```

**실행**:

```bash
node test-cbt.js

# 예상 출력:
# === CBT 인지 왜곡 탐지 테스트 ===
#
# [Test 1] "시험 망치면 인생 끝이야"
# ✅ 탐지됨: 파국화 (catastrophizing)
#    심각도: high
#    매칭: [{"type":"pattern","matched":["시험 망 인생 끝"],"severity":"high",...}]
#
# [Test 2] "완벽하지 않으면 실패야"
# ✅ 탐지됨: 흑백논리 (all-or-nothing)
#    심각도: high
#    ...
```

---

### 테스트 2: 소크라테스식 질문 생성 테스트

```javascript
// test-socratic.js
const { getSocraticQuestioner } = require("./services/cbt/SocraticQuestioner");
const { getCognitiveDistortionDetector } = require("./services/cbt/CognitiveDistortionDetector");

(async () => {
  const detector = getCognitiveDistortionDetector();
  const questioner = getSocraticQuestioner();

  const text = "시험 망치면 인생 끝이야";
  const detections = detector.detectDistortions(text);

  if (detections.length > 0) {
    console.log(`탐지된 왜곡: ${detections[0].name}\n`);

    const questions = await questioner.generateQuestions(detections[0], text);

    console.log("생성된 질문:");
    questions.forEach((q, idx) => {
      console.log(`${idx + 1}. ${q}`);
    });
  }
})();
```

**실행**:

```bash
node test-socratic.js

# 예상 출력:
# 탐지된 왜곡: 파국화
#
# 생성된 질문:
# 1. 시험에서 원하는 성적을 받지 못한다면 정말로 인생이 끝나는 건가요?
# 2. 과거에 시험을 망쳤을 때 실제로 어떤 일이 일어났나요?
# 3. 시험 하나가 전체 인생을 결정한다고 볼 수 있을까요?
# 4. 만약 친구가 같은 걱정을 한다면 어떤 말을 해주고 싶으신가요?
```

---

### 테스트 3: 프론트엔드 통합 테스트

**파일**: `public/cbt-test.html` (새로 생성)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>CBT 개입 테스트</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .intervention { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; }
    .intervention.high { border-left-color: #dc3545; background: #f8d7da; }
    .questions { background: #d4edda; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .tasks { background: #cfe2ff; padding: 10px; margin: 10px 0; border-radius: 4px; }
    button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧠 CBT 개입 테스트</h1>

    <div>
      <button onclick="startSession()">세션 시작</button>
      <button onclick="connectWs()">WebSocket 연결</button>
      <button onclick="sendTestMessage('시험 망치면 인생 끝이야')">파국화 테스트</button>
      <button onclick="sendTestMessage('완벽하지 않으면 실패야')">흑백논리 테스트</button>
    </div>

    <div id="interventionPanel" style="margin-top: 20px;"></div>
  </div>

  <script>
    let sessionId = null;
    let sessionWs = null;

    async function startSession() {
      const res = await fetch("http://localhost:8000/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "test_cbt", counselorId: "counselor" })
      });

      const data = await res.json();
      sessionId = data.data.sessionId;
      console.log("✅ 세션 생성:", sessionId);
    }

    function connectWs() {
      sessionWs = new WebSocket(`ws://localhost:8000/ws/session?sessionId=${sessionId}`);

      sessionWs.onopen = () => console.log("✅ Session WS 연결됨");

      sessionWs.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "emotion_update" && data.data.cbtIntervention) {
          displayIntervention(data.data.cbtIntervention);
        }
      };
    }

    function sendTestMessage(text) {
      // 실제로는 STT에서 전송되지만, 테스트를 위해 직접 서버 메모리에 삽입
      console.log(`📤 테스트 메시지 전송: "${text}"`);
      alert(`실제 구현에서는 STT를 통해 전송됩니다.\n테스트 텍스트: "${text}"`);
    }

    function displayIntervention(intervention) {
      const panel = document.getElementById("interventionPanel");

      const div = document.createElement("div");
      div.className = `intervention ${intervention.severity}`;
      div.innerHTML = `
        <h3>⚠️ ${intervention.distortionName} 감지</h3>
        <p>${intervention.description}</p>
        <p><strong>심각도:</strong> ${intervention.severity}</p>

        <div class="questions">
          <h4>💡 소크라테스식 질문</h4>
          <ol>
            ${intervention.questions.map(q => `<li>${q}</li>`).join("")}
          </ol>
        </div>

        <div class="tasks">
          <h4>📝 행동 과제</h4>
          ${intervention.tasks.map(t => `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 4px;">
              <strong>${t.title}</strong><br>
              <small>${t.description}</small><br>
              <em>기대효과: ${t.expectedEffect}</em>
            </div>
          `).join("")}
        </div>

        <p><small>시간: ${intervention.timestamp}</small></p>
      `;

      panel.appendChild(div);
    }
  </script>
</body>
</html>
```

---

## 트러블슈팅

### 문제 1: 패턴 파일 로드 실패

**증상**:
```
Failed to load pattern: catastrophizing.json
```

**해결**:

```bash
# 1. 패턴 디렉토리 확인
ls services/cbt/patterns/

# 2. 파일 권한 확인
chmod 644 services/cbt/patterns/*.json

# 3. JSON 구문 검증
node -e "console.log(JSON.parse(require('fs').readFileSync('services/cbt/patterns/catastrophizing.json')))"
```

---

### 문제 2: Gemini API 할당량 초과

**증상**:
```
Gemini Error: 429 Too Many Requests
```

**해결**:

1. **폴백 메커니즘 활성화**:
```javascript
// SocraticQuestioner.js에서 이미 구현됨
return this._getFallbackQuestions(distortion.type);
```

2. **요청 제한 설정** (`.env`):
```bash
CBT_INTERVENTION_FREQUENCY=5  # 3회 → 5회 (개입 빈도 낮춤)
```

3. **캐싱 추가**:
```javascript
// SocraticQuestioner.js
this.cache = new Map(); // type -> questions

async generateQuestions(distortion, originalText) {
  const cacheKey = `${distortion.type}_${originalText.slice(0, 20)}`;

  if (this.cache.has(cacheKey)) {
    console.log("✅ Using cached questions");
    return this.cache.get(cacheKey);
  }

  const questions = await this._callGemini(...);
  this.cache.set(cacheKey, questions);
  return questions;
}
```

---

### 문제 3: 한국어 텍스트 매칭 정확도 낮음

**증상**:
```
"시험 망치면 인생 끝이야" → 탐지 실패
```

**해결**:

1. **정규표현식 튜닝**:
```json
// catastrophizing.json
{
  "regex": "(시험|발표|면접).*(망|실패).*(인생|끝|미래)",
  "regex": "(시험|발표|면접).{0,5}(망|실패).{0,5}(인생|끝|미래)"
}
```

2. **키워드 확장**:
```json
{
  "keywords": [
    "끝이야", "망했어", "최악", "절망", "죽을 것 같아",
    "끝장", "파탄", "재앙", "비참", "참담"  // 추가
  ]
}
```

3. **형태소 분석 사용** (선택):
```bash
npm install koalanlp
```

```javascript
// CognitiveDistortionDetector.js
const koalanlp = require("koalanlp");

_tokenize(text) {
  // 형태소 분석 후 키워드 매칭 정확도 향상
  const tokens = koalanlp.analyze(text);
  return tokens.map(t => t.surface);
}
```

---

## 체크리스트

### Task 3.1: 인지 왜곡 탐지
- [ ] 10개 패턴 JSON 파일 생성
- [ ] `CognitiveDistortionDetector.js` 구현
- [ ] 패턴 로딩 및 매칭 테스트
- [ ] 한국어 정규표현식 검증

### Task 3.2: 소크라테스식 질문
- [ ] `SocraticQuestioner.js` 구현
- [ ] Gemini 프롬프트 최적화
- [ ] 폴백 질문 작성
- [ ] 질문 품질 검증

### Task 3.3: 행동 과제 추천
- [ ] `BehavioralTaskRecommender.js` 구현
- [ ] 과제 템플릿 작성
- [ ] Gemini 과제 생성 테스트
- [ ] 과제 실행 가능성 검증

### Task 3.4: 치료적 개입 통합
- [ ] `InterventionGenerator.js` 구현
- [ ] Gemini 멀티모달 통합 업데이트
- [ ] WebSocket 핸들러 수정
- [ ] 프론트엔드 UI 구현

### 통합 테스트
- [ ] 10가지 왜곡 탐지 정확도 검증
- [ ] 개입 생성 품질 평가
- [ ] 세션 일시정지/재개 시 동작 확인
- [ ] 리소스 사용량 모니터링

---

## 예상 소요 시간

| Task | 예상 시간 | 난이도 |
|------|-----------|--------|
| 3.1: 인지 왜곡 탐지 | 4-5시간 | ⭐⭐⭐⭐⭐ |
| 3.2: 소크라테스식 질문 | 2-3시간 | ⭐⭐⭐⭐ |
| 3.3: 행동 과제 추천 | 2-3시간 | ⭐⭐⭐⭐ |
| 3.4: 치료적 개입 통합 | 3-4시간 | ⭐⭐⭐⭐ |
| 통합 테스트 & 튜닝 | 1-2시간 | ⭐⭐⭐ |
| **합계** | **12-16시간** | |

---

## 다음 단계

Phase 3 완료 후 **Phase 4: 멀티모달 통합 분석 & 리포트**로 이동:
- 표정 + 음성 + STT + CBT 통합 분석
- 세션별 종합 리포트 자동 생성
- 감정 타임라인 시각화
- PDF 리포트 생성

상세 가이드: `docs/STEP4_GUIDE.md` (다음 문서)

---

**마지막 업데이트**: 2025-01-17
**문서 버전**: 1.0.0
**작성자**: BeMore 개발팀
