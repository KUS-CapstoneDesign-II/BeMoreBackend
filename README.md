# 🧠 BeMore - AI 기반 심리 상담 지원 시스템

> 실시간 멀티모달 감정 분석을 통한 인지행동치료(CBT) 상담 지원 플랫폼

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

---

## 🎯 프로젝트 소개

**BeMore**는 실시간으로 **얼굴 표정**, **음성 활동**, **대화 내용**을 분석하여 사용자의 심리 상태를 예측하고, **인지행동치료(CBT)** 기반의 치료적 개입을 자동으로 추천하는 AI 상담 지원 시스템입니다.

### **핵심 기능**

```mermaid
graph LR
    A[얼굴 표정<br/>MediaPipe] --> D[멀티모달<br/>통합 분석]
    B[음성 활동<br/>VAD] --> D
    C[대화 내용<br/>STT] --> D
    D --> E[감정 분석<br/>Gemini AI]
    D --> F[CBT 분석<br/>인지 왜곡 탐지]
    E --> G[실시간<br/>상담 지원]
    F --> G
    G --> H[세션 리포트<br/>생성]
```

---

## ✨ 주요 특징

### **🎭 멀티모달 감정 분석**
- **얼굴 표정**: MediaPipe Face Mesh로 468개 랜드마크 실시간 추출
- **음성 활동**: Silero VAD로 발화 패턴 및 침묵 분석
- **대화 내용**: OpenAI Whisper로 음성을 텍스트로 변환

### **🧠 CBT 인지 왜곡 탐지**
- 10가지 인지 왜곡 유형 자동 탐지 (파국화, 흑백논리, 과일반화 등)
- 소크라테스식 질문 자동 생성
- 행동 과제 추천
- 실시간 치료적 개입 제안

### **📊 실시간 분석 & 리포트**
- 10초 단위 감정 변화 추적
- 세션별 종합 리포트 자동 생성
- 감정 타임라인 시각화
- VAD 메트릭 분석 (발화 속도, 침묵 길이, 발화 빈도)

---

## 🚀 빠른 시작

### **전제 조건**

```bash
# Node.js 18+ 필요
node --version  # v18.0.0 이상

# ffmpeg 설치 (무음 감지용)
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### **설치 및 실행**

```bash
# 1. 저장소 클론
git clone https://github.com/KUS-CapstoneDesign-II/BeMoreBackend.git
cd BeMoreBackend

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력
# GEMINI_API_KEY=your_gemini_api_key
# OPENAI_API_KEY=your_openai_api_key

# 4. 개발 서버 실행
npm run dev

# 5. 브라우저 접속
open http://localhost:8000
```

### **환경 변수 (.env)**

```bash
# ============================================================
# 🔐 API Keys & Credentials
# ============================================================

# Google Gemini API (감정 분석)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API (STT/TTS)
OPENAI_API_KEY=your_openai_api_key_here

# ============================================================
# 🗄️ Database Configuration (⚠️ CRITICAL FOR DEPLOYMENT)
# ============================================================

# Supabase PostgreSQL - 프로덕션 필수!
# Format: postgresql://username:password@host:port/database
# ⚠️ IMPORTANT: Production 환경에서 반드시 설정 필요
# 미설정 시: Report 모델 로드 실패 → 감정 분석 데이터 미저장
DATABASE_URL=postgresql://postgres:your_password@db.zyujxskhparxovpydjez.supabase.co:5432/postgres

# ============================================================
# 🌐 Server Configuration
# ============================================================

# Frontend URL (CORS 화이트리스트)
FRONTEND_URLS=http://localhost:5173,https://be-more-frontend.vercel.app

# 서버 포트
PORT=8000

# 개발/프로덕션 모드
NODE_ENV=development
```

**자세한 설정 가이드**: [.env.example](./.env.example)

---

## 📁 프로젝트 구조

```
BeMoreBackend/
├── app.js                              # 🚀 서버 진입점
├── package.json                        # 📦 의존성 관리
│
├── docs/                               # 📚 프로젝트 문서
│   ├── README.md                       # 문서 인덱스
│   ├── ARCHITECTURE.md                 # 시스템 아키텍처
│   ├── ROADMAP.md                      # 개발 로드맵
│   └── API.md                          # API 명세서
│
├── public/                             # 🎨 정적 파일
│   └── index.html                      # 테스트용 프론트엔드
│
├── routes/                             # 🛣️ API 라우터
│   └── stt.js                          # STT API 라우터
│
├── services/                           # 🔧 비즈니스 로직
│   ├── socket/
│   │   └── setupLandmarkSocket.js      # WebSocket 핸들러
│   ├── gemini/
│   │   └── gemini.js                   # Gemini 감정 분석
│   └── memory.js                       # STT 버퍼 관리
│
├── face_detector/                      # (사용 안 함)
└── tmp/                                # 임시 오디오 파일
```

---

## 🛠️ 기술 스택

### **Backend**
- **Runtime**: Node.js 18+
- **Framework**: Express 5.1
- **WebSocket**: ws 8.18
- **Media Processing**: ffmpeg

### **AI/ML**
- **감정 분석**: Google Gemini 2.5 Flash
- **음성 변환**: OpenAI Whisper
- **얼굴 추적**: MediaPipe Face Mesh (클라이언트)
- **음성 활동 감지**: Silero VAD (예정)

### **Frontend** (예정)
- **Framework**: React 18 / Next.js 14
- **State**: Context API / Zustand
- **Charts**: Chart.js / Recharts
- **Styling**: Tailwind CSS

---

## 📊 현재 개발 상태 (v0.2.0 - Phase 2/3/4 진행 중)

### **✅ 구현 완료 (Phase 1-4)**

#### **Phase 1: 기초 구축**
- [x] MediaPipe 실시간 얼굴 랜드마크 추출 (468 points)
- [x] WebSocket으로 표정 데이터 전송
- [x] OpenAI Whisper STT 음성 변환
- [x] ffmpeg 무음 감지로 API 호출 최적화
- [x] Gemini로 감정 분석

#### **Phase 2: VAD 통합** ✅ **완료**
- [x] Silero VAD 음성 활동 감지 (7가지 메트릭)
- [x] 실시간 VAD 메트릭 계산 (speechRate, pauseRatio 등)
- [x] 10초 주기 VAD 분석 결과 전송
- [x] 심리 지표 분석 (위험도, 경고)
- [x] Frontend VAD 호환성 검증 ✅

#### **Phase 3: CBT 분석 & Session Management**
- [x] 세션 관리 시스템 (시작/종료)
- [x] WebSocket 3채널 분리 (landmarks/voice/session)
- [x] 감정 데이터 수집 및 집계
- [x] 감정 요약 및 트렌드 분석
- [x] Supabase 데이터 저장

#### **Phase 4: 멀티모달 통합 & 리포트 생성** ✅ **완료**
- [x] 세션별 통합 분석
- [x] 감정 분석 데이터 저장 (Supabase)
- [x] 세션 리포트 자동 생성
- [x] VAD 메트릭 저장 및 조회
- [x] Dashboard API 구현

### **🚧 진행 중**

- [ ] **Phase 5**: 성능 최적화, 보안 강화
- [ ] Frontend-Backend 통합 테스트
- [ ] VAD 필드명 표준화 (선택사항)
- [ ] API 문서 업데이트

### **🎯 Frontend 통합 상태**

| 항목 | 상태 | 비고 |
|------|------|------|
| **WebSocket 연결** | ✅ | 3채널 정상 작동 |
| **감정 데이터 수신** | ✅ | Gemini 분석 정상 |
| **VAD 메트릭 수신** | ✅ | 필드명 매핑 완료 |
| **리포트 생성** | ✅ | Dashboard API 정상 |
| **Database 연동** | ✅ | Supabase 저장 정상 |

---

## 🗺️ 개발 로드맵

```mermaid
gantt
    title BeMore 개발 로드맵 (12주)
    dateFormat YYYY-MM-DD
    section Phase 1
    기반 구축          :p1, 2025-01-20, 14d
    section Phase 2
    VAD 통합          :p2, 2025-02-03, 14d
    section Phase 3
    CBT 분석          :p3, 2025-02-17, 21d
    section Phase 4
    통합 & 리포트      :p4, 2025-03-10, 14d
    section Phase 5
    최적화            :p5, 2025-03-24, 21d
```

**상세 로드맵:** [docs/ROADMAP.md](./docs/ROADMAP.md)

---

## 📚 문서

### **전체 문서 목록**

| 문서 | 설명 | 대상 |
|------|------|------|
| [📖 docs/README.md](./docs/README.md) | 문서 인덱스 | 모든 팀원 |
| [🏗️ ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 시스템 아키텍처 | 개발자, 아키텍트 |
| [🗺️ ROADMAP.md](./docs/ROADMAP.md) | 개발 로드맵 | PM, 개발자 |
| [📡 API.md](./docs/API.md) | API 명세서 | 백엔드/프론트엔드 |

### **최신 통합 검토 문서 (2025-11-04)**

| 문서 | 설명 | 중요도 |
|------|------|------|
| [📋 BACKEND_VAD_CODE_REVIEW_2025-11-04.md](./BACKEND_VAD_CODE_REVIEW_2025-11-04.md) | Backend VAD 코드 상세 검사 | 🟡 참고 |
| [📊 FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md](./FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md) | Frontend VAD 호환성 처리 분석 | 🟡 참고 |
| [📧 FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md](./FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md) | Frontend 팀 협력 메시지 | 📢 협력 |
| [📋 FRONTEND_BACKEND_INTEGRATION_CHECK.md](./FRONTEND_BACKEND_INTEGRATION_CHECK.md) | 통합 검증 체크리스트 | ✅ 테스트 |
| [🔍 INTEGRATION_DIAGNOSIS_2025-11-04.md](./INTEGRATION_DIAGNOSIS_2025-11-04.md) | 통합 진단 보고서 | 📊 분석 |
| [🚀 RENDER_DEPLOYMENT_SETUP_2025-11-04.md](./RENDER_DEPLOYMENT_SETUP_2025-11-04.md) | Render 배포 설정 가이드 | 🔧 배포 |

### **빠른 링크**

- **처음 시작하는 분**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md) → [ROADMAP.md](./docs/ROADMAP.md)
- **API 구현하는 분**: [API.md](./docs/API.md)
- **프론트엔드 개발자**: [API.md](./docs/API.md) → [FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md](./FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md)
- **배포 담당자**: [RENDER_DEPLOYMENT_SETUP_2025-11-04.md](./RENDER_DEPLOYMENT_SETUP_2025-11-04.md)
- **Backend-Frontend 협력**: [FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md](./FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md)
- **통합 검증**: [FRONTEND_BACKEND_INTEGRATION_CHECK.md](./FRONTEND_BACKEND_INTEGRATION_CHECK.md)

---

## 🔌 API 미리보기

### **REST API**

```bash
# 세션 시작
POST /api/session/start
{
  "userId": "user_123",
  "counselorId": "counselor_456"
}

# 세션 종료
POST /api/session/:id/end

# 리포트 조회
GET /api/session/:id/report

# Dashboard 조회
GET /api/dashboard/summary
```

### **WebSocket API (3채널)**

```javascript
// Channel 1: 얼굴 표정 랜드마크
const landmarksWs = new WebSocket('ws://localhost:8000/ws/landmarks?sessionId=xxx');
landmarksWs.onmessage = (event) => {
  const { emotion, confidence } = JSON.parse(event.data);
  console.log('감정:', emotion); // "불안", "평온" 등
};

// Channel 2: 음성 활동 감지 (VAD)
const voiceWs = new WebSocket('ws://localhost:8000/ws/voice?sessionId=xxx');
voiceWs.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  if (type === 'vad_analysis') {
    console.log('VAD 메트릭:', {
      speechRate: data.metrics.speechRate,      // 0-100 (%)
      silenceRate: data.metrics.silenceRate,
      avgSpeechDuration: data.metrics.avgSpeechDuration, // ms
      avgSilenceDuration: data.metrics.avgSilenceDuration,
      speechTurnCount: data.metrics.speechTurnCount,
      psychologicalRiskScore: data.psychological.riskScore // 0-100
    });
  }
};

// Channel 3: 세션 관리
const sessionWs = new WebSocket('ws://localhost:8000/ws/session?sessionId=xxx');
sessionWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('세션 상태:', data);
};
```

### **VAD 메트릭 필드**

| 필드명 | 범위 | 단위 | 설명 |
|------|------|------|------|
| `speechRate` | 0-100 | % | 발화 비율 |
| `silenceRate` | 0-100 | % | 침묵 비율 |
| `avgSpeechDuration` | ≥0 | ms | 평균 발화 지속시간 |
| `avgSilenceDuration` | ≥0 | ms | 평균 침묵 지속시간 |
| `speechTurnCount` | ≥0 | count | 발화 구간 수 |
| `interruptionRate` | 0-100 | % | 중단 빈도 (500ms 이하의 발화) |
| `energyVariance` | ≥0 | variance | 음성 에너지 변동성 |

**상세 API 명세:** [docs/API.md](./docs/API.md)
**VAD 코드 검토:** [BACKEND_VAD_CODE_REVIEW_2025-11-04.md](./BACKEND_VAD_CODE_REVIEW_2025-11-04.md)

---

## 🧪 테스트

### **개발 서버 테스트**

```bash
# 서버 실행
npm run dev

# 브라우저에서 테스트 페이지 열기
open http://localhost:8000

# 카메라와 마이크 권한 허용 후 테스트
```

### **API 테스트** (Phase 1 이후)

```bash
# 세션 시작 테스트
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","counselorId":"counselor_456"}'

# 세션 조회 테스트
curl http://localhost:8000/api/session/sess_20250117_001
```

---

## 📈 성능 특성

### **데이터 처리량** (1분 상담 기준)

```
얼굴 랜드마크: ~1,200 frames × 468 points = 1.68 MB
STT 요청:      12회 (5초 단위)
VAD 분석:      ~600회 (100ms 단위, Phase 2)
Gemini 요청:   6회 (10초 단위, Phase 1 이후)
```

### **병목 지점**

1. **WebSocket 대역폭**: 1.68 MB/분 → **압축 필요** (468개 → 9개)
2. **Gemini API 응답 시간**: 2-5초 → **캐싱 고려**
3. **Whisper API 호출 빈도**: 12회/분 → **무음 필터 적용 완료**

---

## 🤝 기여 가이드

### **브랜치 전략**

```
main          # 안정 버전
├─ develop    # 개발 브랜치
   ├─ feature/session-management
   ├─ feature/vad-integration
   └─ feature/cbt-analysis
```

### **커밋 컨벤션**

```bash
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드/설정 변경
```

### **이슈 템플릿**

```markdown
## 이슈 유형
- [ ] 버그
- [ ] 기능 요청
- [ ] 문서 개선

## 설명
...

## 재현 방법 (버그인 경우)
1. ...
2. ...
```

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 📞 문의

- **GitHub Issues**: [프로젝트 이슈](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- **Email**: [이메일 주소]
- **문서 질문**: [docs/README.md](./docs/README.md) FAQ 참조

---

## 🙏 감사의 글

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [MediaPipe](https://google.github.io/mediapipe/) - 얼굴 랜드마크 추출
- [OpenAI Whisper](https://openai.com/research/whisper) - 음성 텍스트 변환
- [Google Gemini](https://ai.google.dev/) - 감정 분석
- [Silero VAD](https://github.com/snakers4/silero-vad) - 음성 활동 감지

---

**마지막 업데이트:** 2025-11-04
**프로젝트 버전:** v0.2.0 (Phase 2/3/4 완료)
**문서 버전:** 2.0.0

---

## 🔄 최근 업데이트 (2025-11-04)

### ✅ 완료 사항
- VAD (Voice Activity Detection) 통합 완료
- 세션 관리 시스템 구현
- Supabase 데이터 저장소 연동
- Frontend-Backend 통합 검증 완료
- 상세 검토 문서 작성

### 📊 검증 결과
- Backend VAD 데이터 → Frontend: ✅ 정상 작동
- 감정 분석 데이터 저장: ✅ 정상 작동
- Dashboard API: ✅ 정상 작동
- WebSocket 3채널: ✅ 정상 작동

### 📋 신규 문서
- `BACKEND_VAD_CODE_REVIEW_2025-11-04.md` - Backend 코드 검사 결과
- `FRONTEND_VAD_INTEGRATION_REPORT_2025-11-04.md` - Frontend 호환성 분석
- `FRONTEND_COLLABORATION_MESSAGE_2025-11-04.md` - 협력 메시지
- 기타 통합 검증 및 배포 문서
