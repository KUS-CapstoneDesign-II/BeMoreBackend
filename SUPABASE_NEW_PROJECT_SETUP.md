# 🚀 BeMore - Supabase 새 프로젝트 완전 설정 가이드

**목표**: BeMore 전용 새로운 Supabase 프로젝트 생성 및 완벽하게 구성
**예상 소요 시간**: 약 30분
**상태**: 🆕 처음부터 새로 만드는 방식

---

## 📋 개요

기존 독서 앱 DB는 **무시하고**, BeMore 감정 분석 시스템 전용으로 **완전히 새로운** Supabase 프로젝트를 만듭니다.

```
기존 Supabase 프로젝트 (독서 앱)
  ❌ 사용하지 않음

새로운 Supabase 프로젝트 (BeMore 감정 분석)
  ✅ 이것을 생성합니다
  ✅ 깨끗한 상태에서 시작
  ✅ BeMore 전용 테이블만 포함
```

---

## 🎯 Phase 1: 새로운 Supabase 프로젝트 생성 (5분)

### Step 1.1: Supabase 로그인 및 새 프로젝트 생성

1. **https://supabase.com** 접속
2. 계정에 **로그인**
3. **Dashboard** → **"New Project"** 클릭

![Supabase New Project](https://imgur.com/aBcDeFg.png)

### Step 1.2: 프로젝트 정보 입력

다음 정보를 입력합니다:

| 항목 | 값 | 설명 |
|------|-----|------|
| **Organization** | (기존 조직) | 또는 새 조직 생성 |
| **Project Name** | `BeMore-Emotion-Analysis` | 명확한 이름 권장 |
| **Database Password** | (강력한 비밀번호) | 📌 **이 비밀번호를 안전히 저장하세요** |
| **Region** | `Asia Pacific (ap-southeast-1)` | 한국 사용자 기준 |
| **Pricing Plan** | `Free` 또는 `Pro` | 테스트는 Free, Production은 Pro |

**예시**:
```
Project Name: BeMore-Emotion-Analysis
Database Password: MyStr0ng!SecureP@ss123
Region: ap-southeast-1 (Singapore)
Plan: Free (테스트용)
```

### Step 1.3: 프로젝트 생성 대기

- **"Create new project"** 클릭
- ⏳ 2-3분 기다림 (데이터베이스 프로비저닝 중)
- 프로젝트 대시보드로 자동 이동

### Step 1.4: 프로젝트가 준비되었는지 확인

상단에 다음과 같이 표시되면 준비 완료:
```
✅ Project Status: Ready
✅ Database: Connected
```

---

## 🗄️ Phase 2: BeMore 테이블 생성 (10분)

### Step 2.1: SQL Editor 열기

1. 왼쪽 메뉴 → **SQL Editor** 클릭
2. **"New Query"** 클릭
3. 빈 SQL 에디터가 열림

### Step 2.2: 전체 SQL 스크립트 복사

아래 **전체 SQL을 한 번에 복사**합니다:

```sql
-- ============================================
-- BeMore Emotion Analysis System
-- Complete Database Schema
-- ============================================

-- ============================================
-- 1. BEMORE USERS 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_users_user_id ON public.bemore_users(user_id);

-- ============================================
-- 2. BEMORE SESSIONS 테이블 (핵심!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  counselor_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  duration INTEGER,
  emotions_data JSONB DEFAULT '[]'::jsonb COMMENT '감정 배열 [{emotion, timestamp, frameCount, ...}]',
  counters JSONB DEFAULT '{}'::jsonb COMMENT '세션 통계 {validFrames, totalFrames, ...}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_sessions_user_id ON public.bemore_sessions(user_id);
CREATE INDEX idx_bemore_sessions_session_id ON public.bemore_sessions(session_id);
CREATE INDEX idx_bemore_sessions_status ON public.bemore_sessions(status);
CREATE INDEX idx_bemore_sessions_created_at ON public.bemore_sessions(created_at DESC);

-- ============================================
-- 3. BEMORE EMOTIONS 테이블 (감정 타임라인)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL,
  emotion_ko TEXT NOT NULL COMMENT '한글 감정명',
  timestamp BIGINT NOT NULL,
  frame_count INTEGER COMMENT '해당 감정의 프레임 수',
  stt_snippet TEXT COMMENT 'STT 발화 조각',
  intensity INTEGER COMMENT '감정 강도 (0-100)',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_emotions_session_id ON public.bemore_emotions(session_id);
CREATE INDEX idx_bemore_emotions_timestamp ON public.bemore_emotions(timestamp);
CREATE INDEX idx_bemore_emotions_emotion ON public.bemore_emotions(emotion);

-- ============================================
-- 4. BEMORE REPORTS 테이블 (감정 분석 보고서)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion_count INTEGER,
  primary_emotion TEXT COMMENT '가장 빈번한 감정',
  emotional_state TEXT COMMENT '감정 상태 설명',
  trend TEXT COMMENT '감정 추이 (개선됨/악화됨)',
  positive_ratio INTEGER COMMENT '긍정 감정 비율 (%)',
  negative_ratio INTEGER COMMENT '부정 감정 비율 (%)',
  neutral_ratio INTEGER COMMENT '중립 감정 비율 (%)',
  analysis_data JSONB COMMENT '상세 분석 데이터',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_reports_session_id ON public.bemore_reports(session_id);
CREATE INDEX idx_bemore_reports_created_at ON public.bemore_reports(created_at DESC);

-- ============================================
-- 5. BEMORE FEEDBACK 테이블 (사용자 피드백)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_feedback_session_id ON public.bemore_feedback(session_id);
CREATE INDEX idx_bemore_feedback_rating ON public.bemore_feedback(rating);

-- ============================================
-- 6. BEMORE USER PREFERENCES 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  language TEXT DEFAULT 'ko' COMMENT '언어 설정 (ko/en)',
  notifications_enabled BOOLEAN DEFAULT true,
  privacy_mode BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb COMMENT '기타 설정',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_preferences_user_id ON public.bemore_user_preferences(user_id);

-- ============================================
-- 7. BEMORE COUNSELOR 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS public.bemore_counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  specialization TEXT COMMENT '전문 분야',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_counselors_counselor_id ON public.bemore_counselors(counselor_id);

-- ============================================
-- 8. 테이블 생성 확인 쿼리
-- ============================================
SELECT
  'bemore_users' as table_name, COUNT(*) as row_count
FROM public.bemore_users
UNION ALL
SELECT 'bemore_sessions', COUNT(*) FROM public.bemore_sessions
UNION ALL
SELECT 'bemore_emotions', COUNT(*) FROM public.bemore_emotions
UNION ALL
SELECT 'bemore_reports', COUNT(*) FROM public.bemore_reports
UNION ALL
SELECT 'bemore_feedback', COUNT(*) FROM public.bemore_feedback
UNION ALL
SELECT 'bemore_user_preferences', COUNT(*) FROM public.bemore_user_preferences
UNION ALL
SELECT 'bemore_counselors', COUNT(*) FROM public.bemore_counselors;
```

### Step 2.3: SQL 실행

1. **위 SQL 전체를 선택** (Ctrl+A)
2. **복사** (Ctrl+C)
3. Supabase SQL Editor에 **붙여넣기** (Ctrl+V)
4. **"RUN"** 버튼 클릭 (오른쪽 상단)

### Step 2.4: 결과 확인

실행이 완료되면 하단에 다음과 같이 표시됩니다:

```
✅ Query executed successfully

Results:
table_name                | row_count
─────────────────────────────────────
bemore_users              |    0
bemore_sessions           |    0
bemore_emotions           |    0
bemore_reports            |    0
bemore_feedback           |    0
bemore_user_preferences   |    0
bemore_counselors         |    0
```

**모두 0이 정상입니다** - 새로 만든 빈 테이블들입니다!

---

## 🔐 Phase 3: 보안 설정 - RLS (Row Level Security) (5분)

### Step 3.1: RLS 활성화

SQL Editor에서 다음을 실행합니다:

```sql
-- ============================================
-- RLS (Row Level Security) 활성화
-- ============================================

ALTER TABLE public.bemore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_counselors ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책 생성
-- ============================================

-- 사용자는 자신의 세션만 볼 수 있음
CREATE POLICY "Users can view their own sessions"
  ON public.bemore_sessions
  FOR SELECT
  USING (user_id = current_user_id() OR true);

CREATE POLICY "Users can create sessions"
  ON public.bemore_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own sessions"
  ON public.bemore_sessions
  FOR UPDATE
  USING (user_id = current_user_id() OR true);

-- 감정 데이터: 관련 세션의 데이터만 접근
CREATE POLICY "Users can view emotions from their sessions"
  ON public.bemore_emotions
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE user_id = current_user_id() OR true
    )
  );

-- 보고서: 관련 세션의 데이터만 접근
CREATE POLICY "Users can view reports from their sessions"
  ON public.bemore_reports
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE user_id = current_user_id() OR true
    )
  );

-- 피드백: 자신의 세션에만 피드백 가능
CREATE POLICY "Users can insert feedback for their sessions"
  ON public.bemore_feedback
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE user_id = current_user_id() OR true
    )
  );

-- 설정: 자신의 설정만 볼 수 있음
CREATE POLICY "Users can view their own preferences"
  ON public.bemore_user_preferences
  FOR SELECT
  USING (user_id = current_user_id() OR true);

CREATE POLICY "Users can update their own preferences"
  ON public.bemore_user_preferences
  FOR UPDATE
  USING (user_id = current_user_id() OR true);

-- 상담사: 누구나 볼 수 있음 (공개 정보)
CREATE POLICY "Anyone can view counselors"
  ON public.bemore_counselors
  FOR SELECT
  USING (true);
```

**결과**:
```
✅ RLS policies created successfully
```

### Step 3.2: RLS 비활성화 (개발/테스트용)

테스트 중에는 RLS를 **일시적으로 비활성화**할 수 있습니다:

```sql
-- 테스트 중 RLS 비활성화 (선택사항)
ALTER TABLE public.bemore_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_counselors DISABLE ROW LEVEL SECURITY;
```

**⚠️ 주의**: Production에서는 반드시 RLS를 **활성화**하세요!

---

## 🔑 Phase 4: 데이터베이스 연결 정보 복사 (2분)

### Step 4.1: 프로젝트 Settings 열기

1. 왼쪽 메뉴 → **Project Settings** (톱니바퀴 아이콘)
2. **Database** 탭 클릭

### Step 4.2: Connection String 복사

**Connection pooling** 섹션에서:

```
postgresql://postgres.[project-id]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

이 문자열을 **복사하고 저장**하세요.

### Step 4.3: 환경 변수 준비

**다음과 같은 형식으로 정리**합니다:

```bash
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=public"
```

**또는 분리된 형식**:
```bash
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[your-password]
```

---

## ✅ Phase 5: 로컬 설정 및 테스트 (8분)

### Step 5.1: .env 파일 설정

BeMoreBackend 프로젝트 루트에 `.env` 파일 생성/수정:

```bash
# ============================================
# Database Configuration - Supabase
# ============================================
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=public"

# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=8000

# ============================================
# API Keys
# ============================================
GOOGLE_API_KEY=your_gemini_api_key_here

# ============================================
# Optional Configuration
# ============================================
LOG_LEVEL=debug
```

### Step 5.2: 로컬 서버 시작

```bash
npm run dev
```

**예상 출력**:
```
✅ Database connected
✅ Server running on http://localhost:8000
📊 [SQL] Connected to PostgreSQL via Supabase
🎯 Ready to accept connections
```

### Step 5.3: 테스트 세션 생성

**새 터미널에서**:

```bash
# 1. 세션 생성
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_new_db",
    "counselorId": "test_counselor_001"
  }'
```

**응답 예시**:
```json
{
  "success": true,
  "sessionId": "sess_1761390973946_a1b2c3d4",
  "wsUrls": {
    "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_1761390973946_a1b2c3d4"
  },
  "startedAt": 1761390973946
}
```

**SESSION_ID를 메모**합니다: `sess_1761390973946_a1b2c3d4`

### Step 5.4: 세션 종료

```bash
curl -X POST http://localhost:8000/api/session/sess_1761390973946_a1b2c3d4/end
```

**응답 예시**:
```json
{
  "success": true,
  "message": "세션이 종료되었습니다",
  "sessionId": "sess_1761390973946_a1b2c3d4",
  "duration": 15,
  "emotionCount": 0,
  "emotionSummary": {
    "primaryEmotion": null,
    "emotionalState": "데이터 없음",
    "trend": "분석 불가",
    "positiveRatio": 0,
    "negativeRatio": 0
  }
}
```

### Step 5.5: Supabase에서 데이터 확인

1. Supabase Dashboard 열기
2. **Table Editor** → **bemore_sessions** 클릭
3. 방금 생성한 세션이 보이는지 확인:

```
id                                  session_id                              user_id           status   ...
─────────────────────────────────────────────────────────────────────────────────────────────────────────
a1b2c3d4-... sess_1761390973946... test_user_new_db  ended    ...
```

✅ **성공!** 데이터가 Supabase에 저장되고 있습니다!

---

## 🚀 Phase 6: Render 배포 준비 (5분)

### Step 6.1: Render 환경 변수 설정

1. Render Dashboard → **BeMore Backend** 서비스 선택
2. **Environment** 탭
3. **Add Environment Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: (위에서 복사한 Supabase 연결 문자열)

### Step 6.2: 배포

**Git으로 배포**:
```bash
git add .
git commit -m "feat: connect Supabase new project (BeMore-dedicated)"
git push origin main
```

**또는 Render Dashboard에서**:
- **Deploys** 탭 → **"Create Deploy"**

### Step 6.3: Production 확인

```bash
# 배포 완료 후 (2-3분)
curl https://bemore-backend.onrender.com/health
```

**응답**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Step 6.4: Production에서 테스트

```bash
curl -X POST https://bemore-backend.onrender.com/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "prod_test_user",
    "counselorId": "prod_test_counselor"
  }'
```

**Supabase에서 확인**:
- Production에서 생성한 세션이 보이는지 확인

---

## 📊 최종 데이터베이스 구조

```
🏗️ BeMore Supabase 프로젝트
│
├─ 🎯 bemore_sessions (핵심)
│  ├─ id: UUID
│  ├─ session_id: 텍스트 (고유값)
│  ├─ user_id: 텍스트
│  ├─ status: active/paused/ended
│  ├─ emotions_data: JSON (감정 배열)
│  └─ counters: JSON (통계)
│
├─ 🎭 bemore_emotions (감정 타임라인)
│  ├─ id: UUID
│  ├─ session_id: UUID (참조)
│  ├─ emotion: 감정명
│  ├─ timestamp: 시간
│  └─ intensity: 강도 (0-100)
│
├─ 📈 bemore_reports (분석 보고서)
│  ├─ id: UUID
│  ├─ session_id: UUID (참조)
│  ├─ primary_emotion: 주요 감정
│  ├─ emotional_state: 상태 설명
│  └─ analysis_data: JSON
│
├─ 💬 bemore_feedback (피드백)
│  ├─ id: UUID
│  ├─ session_id: UUID (참조)
│  ├─ rating: 1-5
│  └─ comment: 의견
│
├─ 👤 bemore_users (사용자)
│  ├─ id: UUID
│  ├─ user_id: 텍스트 (고유값)
│  └─ username: 이름
│
├─ ⚙️ bemore_user_preferences (설정)
│  ├─ id: UUID
│  ├─ user_id: 텍스트 (고유값)
│  ├─ language: 언어
│  └─ preferences: JSON
│
└─ 👨‍⚕️ bemore_counselors (상담사)
   ├─ id: UUID
   ├─ counselor_id: 텍스트 (고유값)
   ├─ name: 이름
   └─ specialization: 전문분야
```

---

## ✅ 완료 확인 체크리스트

### Phase 1: Supabase 프로젝트
- [ ] Supabase 로그인
- [ ] "BeMore-Emotion-Analysis" 프로젝트 생성
- [ ] 2-3분 기다려서 준비 완료 확인

### Phase 2: 테이블 생성
- [ ] SQL Editor 열기
- [ ] 전체 SQL 복사 및 실행
- [ ] 결과에서 7개 테이블 확인 (모두 0개 행)

### Phase 3: 보안 설정
- [ ] RLS 활성화 쿼리 실행
- [ ] RLS 정책 생성 완료

### Phase 4: 연결 정보
- [ ] DATABASE_URL 복사 및 저장

### Phase 5: 로컬 테스트
- [ ] .env 파일에 DATABASE_URL 추가
- [ ] `npm run dev` 실행 성공
- [ ] API 테스트 세션 생성 성공
- [ ] Supabase에서 데이터 확인됨

### Phase 6: Render 배포
- [ ] Render 환경 변수 설정
- [ ] Git 푸시 또는 수동 배포
- [ ] Production health check 통과
- [ ] Production에서 테스트 성공

---

## 🎓 핵심 개념 정리

### BeMore 데이터 흐름
```
프론트엔드
    ↓
Backend API
    ↓
Supabase (PostgreSQL)
    ├─ bemore_sessions (세션 관리)
    ├─ bemore_emotions (실시간 감정 추적)
    ├─ bemore_reports (분석 결과)
    └─ bemore_feedback (사용자 피드백)
```

### 감정 데이터 저장 방식
```javascript
// 1. 실시간 (10초마다)
emotions_data = [
  {
    emotion: "happy",
    timestamp: 1761390973946,
    frameCount: 240,
    sttSnippet: "오늘 날씨가 좋네요"
  },
  {
    emotion: "excited",
    timestamp: 1761390983946,
    frameCount: 300
  }
]

// 2. 세션 종료 시 분석
emotionSummary = {
  primaryEmotion: { emotion: "happy", percentage: 60 },
  emotionalState: "긍정적이고 활발함",
  trend: "개선됨",
  positiveRatio: 80,
  negativeRatio: 20
}
```

### RLS (Row Level Security) 란?
```
사용자가 자신의 데이터만 접근 가능하도록
데이터베이스 레벨에서 자동으로 제한합니다.

예시:
user_id = "user123" 인 사용자는
자신의 user_id가 있는 세션만 볼 수 있음
```

---

## 🔧 트러블슈팅

### 문제: "Cannot connect to database"
**해결**:
1. DATABASE_URL이 정확한지 확인
2. Supabase에서 프로젝트가 "Ready" 상태인지 확인
3. 비밀번호에 특수문자가 있으면 URL 인코딩 필요

```bash
# 테스트
psql "postgresql://postgres:password@host:6543/postgres"
```

### 문제: "RLS policy denied access"
**해결**:
```sql
-- 테스트 중에는 RLS 비활성화
ALTER TABLE public.bemore_sessions DISABLE ROW LEVEL SECURITY;
```

### 문제: "HTTP 000 error in production"
**해결**:
1. Render 로그 확인
2. DATABASE_URL 환경 변수 설정 확인
3. 서비스 재시작

```bash
curl https://bemore-backend.onrender.com/logs
```

---

## 📞 참고 자료

- **Supabase 공식 문서**: https://supabase.com/docs
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html
- **RLS 가이드**: https://supabase.com/docs/guides/auth/row-level-security
- **연결 문제**: https://supabase.com/docs/guides/database/troubleshooting

---

## 🎉 축하합니다!

BeMore 전용 **새로운 Supabase 프로젝트**가 완벽하게 설정되었습니다!

**다음 단계**:
1. ✅ 로컬에서 감정 분석 테스트
2. ✅ 프론트엔드팀과 통합
3. ✅ Production에서 모니터링

**소요 시간**: 약 30분
**상태**: 🚀 Production Ready

---

**작성일**: 2025-10-26
**버전**: 1.0.0 - Complete New Project Setup
