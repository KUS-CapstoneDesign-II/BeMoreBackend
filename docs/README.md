# 📚 BeMore 프로젝트 문서

> 실시간 멀티모달 감정 분석을 통한 AI 기반 심리 상담 지원 시스템

---

## 🎯 문서 개요

이 디렉토리는 BeMore 프로젝트의 전체 기술 문서를 포함합니다. 프로젝트를 이해하고 개발하는 데 필요한 모든 정보가 체계적으로 정리되어 있습니다.

---

## 📖 문서 목록

### **1. [아키텍처 문서](./ARCHITECTURE.md)** 🏗️

**내용:**
- 전체 시스템 아키텍처 다이어그램 (Mermaid)
- 레이어별 상세 구조 (클라이언트/백엔드/데이터)
- 데이터 흐름 시퀀스 다이어그램
- 핵심 컴포넌트 설명 (VAD, CBT, 멀티모달 분석기)
- 기술 스택 및 선택 이유
- 성능 특성 및 병목 지점
- 보안 고려사항
- 확장성 전략 (수평 확장, 마이크로서비스)

**대상:**
- 시스템 설계를 이해하고 싶은 개발자
- 기술적 의사결정이 필요한 아키텍트
- 프로젝트에 새로 합류하는 팀원

**핵심 다이어그램:**
```mermaid
graph TB
    Client[클라이언트] --> WebSocket[3채널 WebSocket]
    WebSocket --> Backend[백엔드 분석 엔진]
    Backend --> AI[AI 서비스<br/>Gemini/Whisper]
    Backend --> DB[(데이터베이스)]
```

---

### **2. [개발 로드맵](./ROADMAP.md)** 🗺️

**내용:**
- 프로젝트 개요 및 핵심 가치
- 현재 구현 상태 (v0.1.0 MVP)
- 5단계 개발 계획 (12주)
  - Phase 1: 기반 구축 (세션 관리 + WebSocket)
  - Phase 2: VAD 통합 (음성 활동 감지)
  - Phase 3: CBT 분석 (인지 왜곡 탐지)
  - Phase 4: 통합 분석 & 리포트
  - Phase 5: 최적화 & 고도화
- 마일스톤 및 완료 조건
- 기술 부채 및 리스크 관리
- 성공 지표 (KPI)
- 스프린트 계획 (Gantt 차트)

**대상:**
- 프로젝트 일정을 계획하는 PM
- 구현 우선순위를 파악하고 싶은 개발자
- 프로젝트 진행 상황을 추적하는 이해관계자

**주요 타임라인:**
```
Week 1-2:  기반 구축 (세션 관리)
Week 3-4:  VAD 통합
Week 5-7:  CBT 분석
Week 8-9:  통합 분석 & 리포트
Week 10-12: 최적화 & DB 통합
```

---

### **3. [API 명세서](./API.md)** 📡

**내용:**
- REST API 엔드포인트 (12개)
  - 세션 관리 (시작/일시정지/재개/종료)
  - 데이터 조회 (감정 타임라인, 리포트)
  - CBT 분석 (Phase 3)
  - STT 변환
- WebSocket API (3채널)
  - `/ws/landmarks` - 얼굴 표정 데이터
  - `/ws/voice` - 음성/VAD 데이터
  - `/ws/session` - 세션 제어 & 분석 결과
- 데이터 모델 (TypeScript 인터페이스)
- 에러 코드 및 처리 방법
- Rate Limiting 정책 (Phase 5)
- SDK 사용 예시

**대상:**
- 백엔드 API를 구현하는 개발자
- 프론트엔드와 통신을 연동하는 개발자
- API를 테스트하는 QA 엔지니어

**빠른 시작:**
```javascript
// 세션 시작
POST /api/session/start
{ "userId": "user_123", "counselorId": "counselor_456" }

// WebSocket 연결
ws://localhost:8000/ws/landmarks?sessionId=xxx
ws://localhost:8000/ws/voice?sessionId=xxx
ws://localhost:8000/ws/session?sessionId=xxx
```

---

## 🚀 빠른 시작 가이드

### **프로젝트 이해하기**

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** 먼저 읽기
   - 시스템 전체 구조 파악
   - 주요 컴포넌트 이해
   - 데이터 흐름 확인

2. **[ROADMAP.md](./ROADMAP.md)** 개발 계획 확인
   - 현재 구현 상태 파악
   - 다음 단계 작업 확인
   - 우선순위 이해

3. **[API.md](./API.md)** API 명세 숙지
   - 엔드포인트 확인
   - 데이터 모델 이해
   - 통신 프로토콜 학습

---

## 📂 문서 구조

```
docs/
├── README.md           # 📚 이 파일 (문서 인덱스)
├── ARCHITECTURE.md     # 🏗️ 시스템 아키텍처
├── ROADMAP.md          # 🗺️ 개발 로드맵
└── API.md              # 📡 API 명세서
```

---

## 🎯 역할별 추천 문서

### **프론트엔드 개발자**
1. ✅ [API.md](./API.md) - WebSocket 통신 방법
2. ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - 클라이언트 계층 구조
3. ✅ [ROADMAP.md](./ROADMAP.md) - Phase 1 프론트엔드 작업

### **백엔드 개발자**
1. ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - 백엔드 계층 구조
2. ✅ [API.md](./API.md) - REST/WebSocket 구현 명세
3. ✅ [ROADMAP.md](./ROADMAP.md) - Phase 1-5 백엔드 작업

### **데이터 사이언티스트**
1. ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - AI 엔진 구조 (VAD, CBT)
2. ✅ [ROADMAP.md](./ROADMAP.md) - Phase 2-3 AI 통합 계획
3. ✅ [API.md](./API.md) - 데이터 모델 및 입출력 포맷

### **프로젝트 매니저**
1. ✅ [ROADMAP.md](./ROADMAP.md) - 전체 일정 및 마일스톤
2. ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) - 기술 스택 및 리스크
3. ✅ [API.md](./API.md) - 기능 명세

---

## 🔄 문서 업데이트 정책

### **문서 버전 관리**

각 문서는 다음 형식으로 버전을 관리합니다:

```markdown
**마지막 업데이트:** 2025-01-17
**문서 버전:** 1.0.0
**프로젝트 버전:** v0.1.0 (MVP)
```

### **업데이트 주기**

| 문서 | 업데이트 주기 | 담당자 |
|------|--------------|--------|
| ARCHITECTURE.md | 아키텍처 변경 시 | 백엔드 리드 |
| ROADMAP.md | 매 스프린트 종료 시 | PM |
| API.md | API 변경 시 | 백엔드 개발자 |
| README.md | 필요 시 | 전체 팀 |

### **변경 이력**

각 문서 하단에 변경 이력을 기록합니다:

```markdown
## 📝 변경 이력

### v1.1.0 (2025-01-24)
- Phase 1 구현 완료 반영
- WebSocket 재연결 로직 추가

### v1.0.0 (2025-01-17)
- 초기 문서 작성
```

---

## 🤝 기여 가이드

### **문서 기여 방법**

1. **오타 수정 또는 간단한 개선**
   - 직접 수정 후 커밋
   - 커밋 메시지: `docs: Fix typo in ARCHITECTURE.md`

2. **구조적 변경 또는 새 섹션 추가**
   - Issue 생성 후 논의
   - PR 제출 및 리뷰 요청

### **문서 작성 규칙**

- ✅ **Markdown 문법** 준수
- ✅ **Mermaid 다이어그램** 활용 (시각화)
- ✅ **코드 예시** 포함 (JavaScript/TypeScript)
- ✅ **이모지** 적절히 사용 (가독성)
- ✅ **목차** 필수 (긴 문서)
- ✅ **링크** 내부 문서 간 연결

---

## 📊 문서 통계

| 문서 | 줄 수 | 단어 수 | 다이어그램 수 |
|------|-------|---------|--------------|
| ARCHITECTURE.md | ~800 | ~3,500 | 8개 |
| ROADMAP.md | ~900 | ~4,000 | 6개 |
| API.md | ~1,200 | ~5,000 | 0개 |
| **합계** | **~2,900** | **~12,500** | **14개** |

---

## 🔗 외부 참고 자료

### **기술 문서**
- [MediaPipe Face Mesh](https://google.github.io/mediapipe/solutions/face_mesh)
- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text)
- [Google Gemini](https://ai.google.dev/gemini-api/docs)
- [Silero VAD](https://github.com/snakers4/silero-vad)

### **인지행동치료 (CBT)**
- [인지 왜곡 10가지](https://www.mindful.org/cognitive-distortions/)
- [CBT 개입 기법](https://positivepsychology.com/cbt-techniques/)

### **WebSocket**
- [ws 라이브러리](https://github.com/websockets/ws)
- [WebSocket MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

## ❓ 자주 묻는 질문 (FAQ)

### **Q1: 문서를 어떤 순서로 읽어야 하나요?**
**A:** ARCHITECTURE.md → ROADMAP.md → API.md 순서를 추천합니다.

### **Q2: API 명세가 변경되면 어떻게 알 수 있나요?**
**A:** API.md 하단의 "변경 이력" 섹션을 확인하거나, Git 커밋 히스토리를 확인하세요.

### **Q3: 새로운 문서를 추가하고 싶어요.**
**A:** Issue를 생성하여 문서 제안 → 팀 리뷰 → docs/ 폴더에 추가 → 이 README에 링크 추가

### **Q4: Mermaid 다이어그램이 보이지 않아요.**
**A:** GitHub에서는 자동 렌더링됩니다. 로컬에서는 VSCode + Mermaid 확장을 설치하세요.

---

## 📞 문의 및 피드백

- **문서 오류 제보:** GitHub Issues
- **개선 제안:** Pull Request
- **질문:** 팀 채널 또는 담당자에게 직접 문의

---

**마지막 업데이트:** 2025-01-17
**문서 버전:** 1.0.0
**관리자:** BeMore 개발팀
