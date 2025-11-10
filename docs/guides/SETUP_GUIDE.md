# 🚀 BeMore 프로젝트 통합 설정 가이드

**최종 업데이트**: 2025-10-26
**상태**: ✅ 모든 시스템 운영 가능 (프로덕션 배포 완료)
**버전**: v2.1 (최종)

---

## 📋 목차

1. [현재 상태](#현재-상태)
2. [프로젝트 구조](#프로젝트-구조)
3. [필수 문서](#필수-문서)
4. [빠른 시작](#빠른-시작)
5. [시스템 아키텍처](#시스템-아키텍처)
6. [배포 및 운영](#배포-및-운영)
7. [문제 해결](#문제-해결)

---

## 현재 상태

### ✅ 완료된 항목

| 항목 | 상태 | 상세 |
|------|------|------|
| **Supabase 설정** | ✅ 완료 | 13개 테이블, 20개 RLS 정책, 35+ 인덱스 |
| **백엔드 배포** | ✅ 완료 | Render 배포, DATABASE_URL 설정 |
| **프론트엔드 테스트** | ✅ 완료 | 실제 데이터 흐름 검증 (세션, 음성, 얼굴) |
| **WebSocket 통신** | ✅ 완료 | 3채널 (landmarks, voice, session) |
| **감정 분석 시스템** | ✅ 완료 | VAD + 감정 분류 + 타임라인 |
| **데이터 영속성** | ✅ 완료 | Supabase PostgreSQL에 데이터 저장 |

### 📊 시스템 통계

```
데이터베이스:
  - 테이블: 13개
  - RLS 정책: 20개
  - 트리거: 3개
  - 인덱스: 35+개

API 엔드포인트:
  - 세션 관리: 5개
  - 감정 분석: 3개
  - 피드백: 2개
  - 건강체크: 1개

WebSocket 채널:
  - landmarks (얼굴 랜드마크)
  - voice (음성 분석)
  - session (세션 관리)
```

---

## 프로젝트 구조

```
BeMoreBackend/
├── SETUP_GUIDE.md              ← 이 파일 (통합 가이드)
├── IMPROVED_SCHEMA_V2_1_FIXED.md ← 최종 Supabase 스키마
├── SUPABASE_IMPLEMENTATION_GUIDE.md ← 상세 설정 단계
├── QUICK_START.md              ← 빠른 시작
├── MAINTENANCE.md              ← 운영 가이드
├── BACKEND_EMOTION_DEPLOYMENT.md ← 배포 가이드
│
├── src/
│   ├── app.js                  ← Express 메인 서버
│   ├── socket.js               ← WebSocket 통신
│   ├── models/                 ← DB 모델 (Sequelize)
│   ├── routes/                 ← API 엔드포인트
│   ├── middleware/             ← 미들웨어
│   └── services/               ← 비즈니스 로직
│
├── docs/
│   ├── archived/               ← 과거 문서들
│   ├── ARCHITECTURE.md         ← 시스템 아키텍처
│   ├── API.md                  ← API 명세
│   └── README.md               ← 문서 인덱스
│
└── package.json
```

---

## 필수 문서

### 🔴 **처음 시작하는 경우**

1. **QUICK_START.md** (5분)
   - 프로젝트 로컬 실행
   - 기본 테스트

2. **SUPABASE_IMPLEMENTATION_GUIDE.md** (30분)
   - Supabase 새 프로젝트 생성
   - 스키마 배포
   - RLS 정책 설정

3. **BACKEND_EMOTION_DEPLOYMENT.md** (20분)
   - Render 배포 설정
   - DATABASE_URL 설정

### 🟡 **운영 중인 경우**

1. **MAINTENANCE.md** (읽기)
   - 모니터링 포인트
   - 트러블슈팅

2. **docs/API.md** (참고용)
   - API 엔드포인트
   - 요청/응답 형식

### 🟢 **기타 참고**

- **docs/ARCHITECTURE.md** - 시스템 설계
- **docs/archived/** - 이전 버전 문서들

---

## 빠른 시작

### 1️⃣ 로컬 서버 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env 파일)
echo "DATABASE_URL=your_supabase_connection_string" > .env

# 3. 서버 시작
npm run dev
```

**확인**:
```bash
curl http://localhost:8000/health
# 응답: {"status":"healthy","database":"connected"}
```

### 2️⃣ 세션 테스트

```bash
# 세션 생성
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","counselorId":"test_counselor"}'

# 응답: {"sessionId":"sess_xxxxx"}
```

### 3️⃣ WebSocket 테스트

브라우저 DevTools에서:
```javascript
// 스크립트 복사하여 Console에 실행
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onopen = () => {
  console.log('✅ WebSocket connected');
  ws.send(JSON.stringify({
    type: 'session:join',
    sessionId: 'sess_xxxxx'
  }));
};
ws.onmessage = (event) => {
  console.log('Message:', event.data);
};
```

---

## 시스템 아키텍처

### 데이터 흐름

```
┌─────────────────┐
│   프론트엔드      │ (React + Vite)
│  - 얼굴 인식      │  MediaPipe Face Mesh
│  - 음성 캡처      │  Web Audio API
└────────┬─────────┘
         │ WebSocket
         ↓
┌─────────────────┐
│  백엔드 (Render)  │ (Express.js)
│  - WebSocket 서버 │
│  - 감정 분석      │ (Multimodal + VAD)
│  - API 엔드포인트 │
└────────┬─────────┘
         │ DATABASE_URL
         ↓
┌─────────────────┐
│ Supabase DB     │ (PostgreSQL)
│  - bemore_...   │ (13개 테이블)
│  - RLS 정책     │ (20개 정책)
└─────────────────┘
```

### 핵심 데이터 구조

**세션 (Session)**
```javascript
{
  sessionId: "sess_1761462510664_75678cf8",
  userId: "user_001",
  counselorId: "counselor_001",
  status: "active|paused|ended",
  startedAt: "2025-10-26T10:30:00Z",
  endedAt: "2025-10-26T10:45:00Z",
  duration: 900
}
```

**감정 타임라인**
```javascript
{
  timestamp: "2025-10-26T10:30:05Z",
  emotion: "happy|sad|angry|anxious|excited|neutral",
  intensity: 0-100,
  confidence: 0-1.0,
  voiceRatio: 0-100
}
```

---

## 배포 및 운영

### 🚀 Render 배포 체크리스트

```bash
# 1. 코드 푸시
git push origin main

# 2. Render 대시보드에서 자동 배포 확인
# https://dashboard.render.com

# 3. 배포 확인
curl https://bemore-backend.onrender.com/health
```

### 📊 모니터링

**주요 모니터링 포인트** (MAINTENANCE.md 참고):

```
✓ 세션 생성/종료 성공률
✓ WebSocket 연결 안정성
✓ 데이터베이스 응답 시간
✓ 감정 분석 정확도
✓ 에러율 (< 1%)
✓ 응답 시간 (< 200ms)
```

### 🔍 로그 확인

```bash
# Render 로그
# https://dashboard.render.com → 서비스 → Logs

# 로컬 로그
npm run dev 2>&1 | tee server.log
```

---

## 문제 해결

### ❌ 데이터베이스 연결 안 됨

```bash
# 1. DATABASE_URL 확인
echo $DATABASE_URL

# 2. Supabase 연결 테스트
psql $DATABASE_URL -c "SELECT version();"

# 3. .env 파일 확인
cat .env
```

### ❌ WebSocket 연결 실패

```bash
# 1. 포트 열림 확인
lsof -i :8000

# 2. 방화벽 확인 (Render 환경)
# 자동으로 HTTPS/WSS 리다이렉트

# 3. 로그 확인
npm run dev
```

### ❌ 감정 분석 안 됨

```bash
# 1. VAD 서비스 확인
curl http://localhost:8000/health | jq .

# 2. 음성 데이터 전송 확인
# WebSocket console.log 확인

# 3. GPU 리소스 확인 (로컬)
nvidia-smi  # 또는 apple silicon: system_profiler SPHardwareDataType
```

### ❌ 세션이 저장 안 됨

```bash
# 1. RLS 정책 확인
psql $DATABASE_URL -c "\dp bemore_sessions"

# 2. 인증 유저 확인
psql $DATABASE_URL -c "SELECT auth.uid();"

# 3. 데이터 직접 쿼리
psql $DATABASE_URL -c "SELECT * FROM public.bemore_sessions LIMIT 1;"
```

---

## 추가 도움말

### 📚 상세 가이드

| 문서 | 용도 | 읽기 시간 |
|------|------|---------|
| IMPROVED_SCHEMA_V2_1_FIXED.md | 데이터베이스 스키마 | 20분 |
| SUPABASE_IMPLEMENTATION_GUIDE.md | Supabase 설정 | 30분 |
| BACKEND_EMOTION_DEPLOYMENT.md | 배포 절차 | 20분 |
| MAINTENANCE.md | 운영 가이드 | 15분 |
| docs/ARCHITECTURE.md | 시스템 아키텍처 | 15분 |
| docs/API.md | API 명세 | 10분 |

### 🆘 지원

1. **로그 파일 확인** - `npm run dev` 실행 중 로그 모니터링
2. **Supabase 대시보드** - SQL 에디터에서 직접 쿼리 실행
3. **Render 대시보드** - 배포 로그 확인
4. **데이터베이스 백업** - Supabase에서 자동 백업

---

## 다음 단계

- [ ] 프론트엔드 프로덕션 배포
- [ ] 모니터링 대시보드 설정
- [ ] 사용자 테스트 (Beta)
- [ ] 성능 최적화
- [ ] 문서화 완료

---

**마지막 수정**: 2025-10-26 ✅
**상태**: 프로덕션 준비 완료
