# 📊 데이터베이스 구조 분석 및 통합 가이드

**날짜**: 2025-10-26
**상태**: ✅ 분석 완료
**목표**: Supabase + BeMore 감정 분석 시스템 통합

---

## 📋 현재 상황 분석

### 1️⃣ 기존 Supabase 스키마 (사용자 관리, 독서 기록)

```
📚 주요 테이블:
├─ profiles (사용자 프로필)
├─ books (도서 정보)
├─ notes (독서 노트)
├─ entities (개념/인물)
├─ tags (태그)
├─ book_tags (도서-태그 관계)
├─ note_tags (노트-태그 관계)
├─ links (노드 간 관계)
└─ attachments (파일 첨부)
```

**특징**:
- UUID 기반 식별자
- Supabase Auth 연동
- 사용자별 데이터 격리

### 2️⃣ 현재 BeMore 백엔드 스키마 (감정 분석)

```
🎭 주요 테이블:
├─ users (사용자)
├─ sessions (상담 세션)
│  ├─ sessionId (PK)
│  ├─ userId
│  ├─ counselorId
│  ├─ status (active/paused/ended)
│  ├─ emotionsData (JSON - 감정 배열)
│  └─ counters (JSON)
├─ reports (세션 리포트)
├─ feedback (피드백)
└─ preferences (사용자 설정)
```

**특징**:
- String 기반 ID (sessionId)
- JSON 필드로 유연한 데이터 저장
- 감정 타임라인 트래킹

---

## 🎯 통합 전략

### ✅ 권장 방식: 두 시스템 독립 유지

**이유**:
- 독서 추적 시스템 (기존): 데이터 구조가 정형화됨
- 감정 분석 시스템 (신규): 유연한 JSON 데이터 필요
- 두 시스템의 비즈니스 로직이 서로 다름
- 독립적으로 확장 가능

---

## 📊 Supabase에 BeMore 테이블 추가

### Step 1: 기존 BeMore 테이블들을 Supabase로 이전

**필요한 테이블들:**

```sql
-- 1. Users 테이블
CREATE TABLE public.bemore_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Sessions 테이블 (핵심!)
CREATE TABLE public.bemore_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,  -- 기존 sessionId 호환성
  user_id TEXT NOT NULL,  -- 또는 UUID로 변경
  counselor_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'ended')),
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  duration INTEGER,
  emotions_data JSONB DEFAULT '[]'::jsonb,  -- 감정 배열
  counters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- 인덱스
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- 3. Emotions 테이블 (감정 타임라인 분리 - 선택사항)
CREATE TABLE public.bemore_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id),
  emotion TEXT NOT NULL,
  emotion_ko TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  frame_count INTEGER,
  stt_snippet TEXT,
  intensity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  FOREIGN KEY (session_id) REFERENCES public.bemore_sessions(id) ON DELETE CASCADE
);

-- 4. Reports 테이블
CREATE TABLE public.bemore_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id),
  emotion_count INTEGER,
  primary_emotion TEXT,
  emotional_state TEXT,
  trend TEXT,
  positive_ratio INTEGER,
  negative_ratio INTEGER,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Feedback 테이블
CREATE TABLE public.bemore_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Preferences 테이블
CREATE TABLE public.bemore_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(user_id)
);
```

---

## 🔄 데이터 흐름 아키텍처

```
┌─────────────────────────────────────────┐
│         BeMore Frontend (React)           │
└─────────────────────────┬───────────────┘
                          │
                   HTTP / WebSocket
                          │
                          ▼
┌─────────────────────────────────────────┐
│     BeMore Backend (Node.js/Express)     │
│  - Session 생성 및 관리                   │
│  - Gemini API 감정 분석                  │
│  - WebSocket 실시간 업데이트              │
└─────────────────────┬───────────────────┘
                      │
                      ▼ (DATABASE_URL)
┌─────────────────────────────────────────┐
│    Supabase PostgreSQL Database          │
│                                          │
│  📚 Existing (독서 추적):                │
│  ├─ profiles, books, notes              │
│  ├─ tags, entities, links               │
│  └─ attachments                         │
│                                          │
│  🎭 New (감정 분석):                     │
│  ├─ bemore_sessions                     │
│  ├─ bemore_emotions                     │
│  ├─ bemore_reports                      │
│  ├─ bemore_feedback                     │
│  └─ bemore_user_preferences             │
└─────────────────────────────────────────┘
```

---

## 🔐 Row Level Security (RLS) 설정

### Supabase에서 데이터 보안 강화

```sql
-- Enable RLS on BeMore tables
ALTER TABLE public.bemore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 볼 수 있음
CREATE POLICY "Users can view their own sessions"
  ON public.bemore_sessions
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own sessions"
  ON public.bemore_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- 유사하게 다른 테이블에도 적용
```

---

## 🔌 Backend 연동 (현재 구현)

### Sequelize 모델 연동 계획

**현재 상황**:
```javascript
// models/Session.js - 이미 구현됨
Session.init({
  sessionId: STRING,
  userId: STRING,
  emotionsData: JSON,
  // ... 기타 필드
})
```

**Supabase 연동 시**:
```javascript
// 그대로 사용 가능 - DATABASE_URL만 Supabase로 변경하면 됨
const DATABASE_URL = process.env.DATABASE_URL
// = postgresql://user:password@db.xxx.supabase.co:5432/postgres
```

---

## 📈 마이그레이션 전략

### Phase 1: 준비 (지금)
```
1. Supabase 프로젝트 생성
2. 테이블 생성 (위의 SQL 실행)
3. RLS 설정
4. DATABASE_URL 복사
```

### Phase 2: 로컬 테스트
```
1. Render 없이 로컬에서 테스트
2. DATABASE_URL 환경변수 설정
3. npm run dev로 연동 확인
```

### Phase 3: Render 배포
```
1. DATABASE_URL을 Render 환경변수로 추가
2. Render에 코드 배포
3. 프로덕션 로그 확인
```

---

## ⚡ 주요 이점

### ✅ 장점
- **중앙 집중식 데이터**: Supabase에서 모든 데이터 관리
- **보안**: PostgreSQL 기반 + RLS
- **확장성**: 테이블 추가로 기능 확장 가능
- **모니터링**: Supabase 대시보드에서 실시간 모니터링
- **백업**: Supabase가 자동 백업 제공
- **API**: 자동으로 생성되는 REST/GraphQL API

### ⚠️ 고려사항
- 기존 로컬 테스트 데이터 마이그레이션 필요
- UUID vs STRING ID 혼용 (호환성 유지)
- JSONB 인덱싱 최적화

---

## 🧪 테스트 방법

### 1단계: 로컬에서 테스트

```bash
# 1. Supabase DATABASE_URL 설정
export DATABASE_URL="postgresql://..."

# 2. 로컬 서버 시작
npm run dev

# 3. 테스트
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","counselorId":"test"}'
```

### 2단계: Supabase 대시보드 확인

```
1. Supabase 대시보드 → SQL Editor
2. 쿼리 실행:
   SELECT * FROM public.bemore_sessions;
3. 데이터 확인
```

### 3단계: 감정 데이터 확인

```bash
# JSON 데이터 조회
curl http://localhost:8000/api/session/{sessionId}/summary

# 응답 확인:
{
  "emotionCount": 4,
  "emotionSummary": {
    "primaryEmotion": { "emotion": "happy", "percentage": 75 },
    ...
  }
}
```

---

## 📋 다음 단계

### 즉시할 일
- [ ] Supabase 계정 생성 및 프로젝트 생성
- [ ] 테이블 SQL 실행 (위의 스키마)
- [ ] DATABASE_URL 복사

### 로컬 테스트
- [ ] .env 파일에 DATABASE_URL 추가
- [ ] `npm run dev` 실행
- [ ] API 테스트

### 배포 준비
- [ ] Render 환경변수 추가
- [ ] 코드 배포
- [ ] 로그 확인

---

## 🎯 최종 아키텍처

```
┌─────────────────────────────────────────────┐
│         Frontend (React)                     │
├─────────────────────────────────────────────┤
│         Backend (Node.js/Express)            │
│  - Session Manager                          │
│  - WebSocket Handler                        │
│  - Gemini Integration                       │
│  - Emotion Analyzer                         │
├─────────────────────────────────────────────┤
│    Supabase PostgreSQL                      │
│                                             │
│  📚 독서 추적 (기존):                        │
│  - profiles, books, notes, tags             │
│                                             │
│  🎭 감정 분석 (신규):                        │
│  - sessions, emotions, reports              │
│                                             │
│  🔐 보안: RLS + Auth 연동                    │
└─────────────────────────────────────────────┘
```

---

## 📞 문의 및 참고

**Supabase 문서**: https://supabase.com/docs
**PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

---

**상태**: ✅ 분석 완료, 구현 준비 완료

다음: Supabase 프로젝트 생성 후 테이블 SQL 실행
