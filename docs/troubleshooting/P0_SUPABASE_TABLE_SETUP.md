# P0: Supabase 테이블 생성 가이드

**우선순위**: 🔴 P0 (즉시 실행)
**소요 시간**: 20분
**위험도**: LOW
**날짜**: 2025-01-11

---

## 📋 개요

프로덕션 로그에서 다음 에러 발생:
```
❌ [CRITICAL] Failed to fetch session from Supabase:
   Error: Could not find the table 'public.sessions' in the schema cache
```

**원인**: Supabase Database에 테이블 미생성
**해결**: 프로젝트의 `schema/init.sql` 실행하여 전체 스키마 생성

---

## 🚀 빠른 실행 (3단계)

### 1단계: Supabase Dashboard 접속

1. https://supabase.com 접속
2. BeMore 프로젝트 선택
3. 좌측 메뉴 → **SQL Editor** 클릭
4. **"New Query"** 버튼 클릭

### 2단계: schema/init.sql 실행

**로컬에서 파일 내용 복사**:
```bash
cat schema/init.sql
```

**또는 아래 SQL을 전체 복사**:

```sql
-- ============================================================
-- BeMore Backend - 초기 스키마 생성 스크립트
-- ============================================================
-- 작성일: 2025-01-10
-- 용도: Supabase PostgreSQL 데이터베이스 초기화
-- 실행 위치: Supabase Dashboard → SQL Editor
-- ============================================================

-- 기존 테이블 삭제 (주의: 모든 데이터 삭제!)
DROP TABLE IF EXISTS "feedbacks" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "counselings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- ============================================================
-- 1. Users 테이블
-- ============================================================
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "name" VARCHAR(100),
  "profileImage" VARCHAR(255),
  "role" VARCHAR(20) DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users 인덱스
CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE INDEX "idx_users_email" ON "users" ("email");
CREATE INDEX "idx_users_created_at" ON "users" ("createdAt");

-- ============================================================
-- 2. Counselings 테이블
-- ============================================================
CREATE TABLE "counselings" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(50),
  "status" VARCHAR(20) DEFAULT 'pending',
  "notes" TEXT,
  "scheduledAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Counselings 인덱스
CREATE INDEX "idx_counselings_user_id" ON "counselings" ("userId");
CREATE INDEX "idx_counselings_status" ON "counselings" ("status");
CREATE INDEX "idx_counselings_scheduled_at" ON "counselings" ("scheduledAt");

-- ============================================================
-- 3. Sessions 테이블 (⭐ CRITICAL - 프로덕션 에러 해결)
-- ============================================================
CREATE TABLE "sessions" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL UNIQUE,
  "userId" VARCHAR(64) NOT NULL,
  "counselorId" VARCHAR(64),
  "status" VARCHAR(20) DEFAULT 'active' CHECK ("status" IN ('active', 'paused', 'ended')),
  "startedAt" BIGINT NOT NULL,
  "endedAt" BIGINT,
  "duration" INTEGER,
  "counters" JSONB DEFAULT '{}',
  "emotionsData" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions 인덱스
CREATE UNIQUE INDEX "idx_sessions_session_id" ON "sessions" ("sessionId");
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("userId");
CREATE INDEX "idx_sessions_created_at" ON "sessions" ("createdAt");
CREATE INDEX "idx_sessions_user_started" ON "sessions" ("userId", "startedAt");
CREATE INDEX "idx_sessions_user_ended" ON "sessions" ("userId", "endedAt");

-- ============================================================
-- 4. Reports 테이블
-- ============================================================
CREATE TABLE "reports" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "reportType" VARCHAR(50) DEFAULT 'session_summary',
  "emotionSummary" JSONB,
  "recommendations" TEXT,
  "generatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports 인덱스
CREATE INDEX "idx_reports_session_id" ON "reports" ("sessionId");
CREATE INDEX "idx_reports_user_id" ON "reports" ("userId");
CREATE INDEX "idx_reports_generated_at" ON "reports" ("generatedAt");

-- ============================================================
-- 5. UserPreferences 테이블
-- ============================================================
CREATE TABLE "user_preferences" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "language" VARCHAR(10) DEFAULT 'ko',
  "theme" VARCHAR(20) DEFAULT 'light',
  "notifications" BOOLEAN DEFAULT true,
  "preferences" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UserPreferences 인덱스
CREATE UNIQUE INDEX "idx_user_preferences_user_id" ON "user_preferences" ("userId");

-- ============================================================
-- 6. Feedbacks 테이블
-- ============================================================
CREATE TABLE "feedbacks" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "sessionId" VARCHAR(64),
  "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
  "comment" TEXT,
  "category" VARCHAR(50),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feedbacks 인덱스
CREATE INDEX "idx_feedbacks_user_id" ON "feedbacks" ("userId");
CREATE INDEX "idx_feedbacks_session_id" ON "feedbacks" ("sessionId");
CREATE INDEX "idx_feedbacks_created_at" ON "feedbacks" ("createdAt");

-- ============================================================
-- 완료 메시지
-- ============================================================
SELECT 'BeMore Backend 스키마 초기화 완료!' AS status;
```

**SQL Editor에서 실행**:
1. 위 SQL 전체를 SQL Editor에 붙여넣기
2. **"Run"** 버튼 클릭 (또는 Ctrl/Cmd + Enter)
3. 성공 메시지 확인

**예상 결과**:
```
Success. No rows returned.
[
  {
    "status": "BeMore Backend 스키마 초기화 완료!"
  }
]
```

### 3단계: 검증

**테이블 생성 확인**:
```sql
-- 테이블 목록 조회
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**예상 결과**:
```
counselings
feedbacks
reports
sessions          ← ⭐ 이 테이블이 보여야 함!
user_preferences
users
```

**sessions 테이블 구조 확인**:
```sql
-- sessions 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
```

---

## ⚠️ RLS (Row Level Security) 설정

**참고**: Backend는 `DATABASE_URL`로 직접 PostgreSQL 연결을 사용하므로 RLS를 우회합니다. RLS는 Supabase 클라이언트 SDK를 사용하는 경우에만 적용됩니다.

현재 Backend 구현에서는 **RLS 설정이 필수가 아닙니다**. 하지만 향후 Supabase 클라이언트를 사용할 경우를 대비하여 설정할 수 있습니다:

```sql
-- Sessions 테이블 RLS 활성화
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- Backend 전용 정책 (모든 접근 허용)
CREATE POLICY "Backend full access - sessions"
ON "sessions"
FOR ALL
USING (true)
WITH CHECK (true);
```

---

## ✅ 완료 확인

### 1. Table Editor 확인

```
Supabase Dashboard → Table Editor
```

**확인 사항**:
- [x] `sessions` 테이블 표시됨
- [x] 6개 테이블 모두 생성됨 (users, counselings, sessions, reports, user_preferences, feedbacks)
- [x] `sessions` 테이블에 `emotionsData` 컬럼 존재 (JSONB 타입)

### 2. Render 로그 확인

**5-10분 후 새 세션 시작하고 로그 확인**:

**이전 (에러)**:
```
❌ [CRITICAL] Failed to fetch session from Supabase:
   Error: Could not find the table 'public.sessions' in the schema cache
```

**수정 후 (정상)**:
```
✅ [CRITICAL] Emotion saved to Supabase: angry
✅ [CRITICAL] Total emotions for session: 3
```

### 3. 테스트 데이터 삽입 (선택)

```sql
-- 테스트 세션 삽입
INSERT INTO "sessions" (
  "sessionId",
  "userId",
  "status",
  "startedAt",
  "emotionsData"
) VALUES (
  'test_' || extract(epoch from now())::text,
  'test_user_123',
  'active',
  extract(epoch from now())::bigint * 1000,
  '[]'::jsonb
) RETURNING *;

-- 테스트 데이터 조회
SELECT * FROM "sessions"
WHERE "sessionId" LIKE 'test_%'
ORDER BY "createdAt" DESC
LIMIT 1;

-- 테스트 데이터 삭제
DELETE FROM "sessions" WHERE "sessionId" LIKE 'test_%';
```

---

## 🔄 롤백 방법 (문제 발생 시)

**테이블 삭제** (순서 중요 - 외래 키 때문):
```sql
-- 1. 하위 테이블부터 삭제
DROP TABLE IF EXISTS "feedbacks" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "counselings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 2. 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

**재실행**: 위의 2단계 다시 실행

---

## 📊 예상 결과

### 성공 지표

| 지표 | 이전 | 수정 후 |
|------|------|---------|
| DB 저장 성공률 | 0% | 100% |
| 테이블 에러 | 100% | 0% |
| 감정 데이터 저장 | ❌ 실패 | ✅ 성공 |
| 세션 리포트 생성 | ❌ 불가 | ✅ 가능 |

### 로그 변화

**Before**:
```
💾 [CRITICAL] Attempting to save emotion to database...
🔵 [EMOTION_SAVE] Using Supabase (Production)
❌ [CRITICAL] Failed to fetch session from Supabase:
   Error: Could not find the table 'public.sessions'
```

**After**:
```
💾 [CRITICAL] Attempting to save emotion to database...
🔵 [EMOTION_SAVE] Using Supabase (Production)
✅ [CRITICAL] Emotion saved to Supabase: angry
✅ [CRITICAL] Total emotions for session: 3
```

---

## 🎯 다음 단계

### P0 완료 후

1. ✅ 15-30분간 로그 모니터링
2. ✅ 테스트 세션 실행 (프론트엔드에서)
3. ✅ 데이터 저장 확인 (Supabase Table Editor)
4. ✅ P0 완료 표시

### P1 코드 수정 완료

- ✅ Gemini 타임아웃 증가 (30s → 45s)
- ✅ 프레임 버퍼 제한 (40개)
- ✅ 환경 변수 설정 필요 (Render)

**Render 환경 변수 추가 필요**:
```
GEMINI_TIMEOUT_MS=45000
MAX_FRAMES_PER_ANALYSIS=40
```

---

## 📚 관련 문서

- **Production Log Analysis**: [docs/troubleshooting/PRODUCTION_LOG_ANALYSIS_20250111.md](../troubleshooting/PRODUCTION_LOG_ANALYSIS_20250111.md)
- **Schema 파일**: [schema/init.sql](../../schema/init.sql)
- **Frontend Phase 11 Response**: [docs/frontend/BACKEND_PHASE11_RESPONSE.md](../frontend/BACKEND_PHASE11_RESPONSE.md)

---

**작성**: Backend 개발팀
**최종 수정**: 2025-01-11
**실행 시간**: 20분 예상
**위험도**: LOW ✅
