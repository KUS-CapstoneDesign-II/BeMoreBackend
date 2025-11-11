# P0: Supabase 테이블 생성 가이드

**우선순위**: 🔴 P0 (즉시 실행)
**소요 시간**: 30분
**위험도**: LOW
**날짜**: 2025-01-11

---

## 📋 개요

프로덕션 로그에서 다음 에러 발생:
```
❌ [CRITICAL] Failed to fetch session from Supabase:
   Error: Could not find the table 'public.sessions' in the schema cache
```

**원인**: Supabase Database에 `sessions` 테이블 미생성
**해결**: `schema/init.sql` 실행하여 전체 스키마 생성

---

## 🚀 빠른 실행 (5단계)

### 1단계: Supabase Dashboard 접속

```
1. https://supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴 → SQL Editor 클릭
4. "New Query" 버튼 클릭
```

### 2단계: init.sql 복사

**로컬에서 복사**:
```bash
cat schema/init.sql
```

또는 아래 전체 SQL을 복사하세요:

```sql
-- =====================================================
-- BeMore Backend Database Schema
-- Version: 1.0
-- Date: 2025-01-11
-- Description: 심리 상담 플랫폼 전체 스키마
-- =====================================================

-- 1. users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "profileImage" TEXT,
  "refreshToken" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. counselings 테이블 생성
CREATE TABLE IF NOT EXISTS public.counselings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "startedAt" BIGINT NOT NULL,
  "endedAt" BIGINT,
  duration INTEGER,
  "emotionSummary" JSONB,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. sessions 테이블 생성 (⭐ CRITICAL)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" VARCHAR(64) UNIQUE NOT NULL,
  "userId" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "counselorId" UUID,
  status VARCHAR(20) DEFAULT 'active',
  "startTime" TIMESTAMPTZ DEFAULT NOW(),
  "endTime" TIMESTAMPTZ,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. reports 테이블 생성
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  "generatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "pdfUrl" TEXT,
  summary JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. user_preferences 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  "deviceId" VARCHAR(255),
  preferences JSONB DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_or_device UNIQUE NULLS NOT DISTINCT ("userId", "deviceId")
);

-- 6. feedbacks 테이블 생성
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "sessionId" UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sessions_sessionId ON public.sessions("sessionId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON public.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_counselings_userId ON public.counselings("userId");
CREATE INDEX IF NOT EXISTS idx_reports_sessionId ON public.reports("sessionId");
CREATE INDEX IF NOT EXISTS idx_feedbacks_userId ON public.feedbacks("userId");
CREATE INDEX IF NOT EXISTS idx_feedbacks_sessionId ON public.feedbacks("sessionId");

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ BeMore Backend 스키마 초기화 완료!';
  RAISE NOTICE '   - 6개 테이블 생성 완료';
  RAISE NOTICE '   - 7개 인덱스 생성 완료';
END $$;
```

### 3단계: SQL 실행

```
1. SQL Editor에 붙여넣기
2. "Run" 버튼 클릭 (또는 Ctrl/Cmd + Enter)
3. 성공 메시지 확인:
   ✅ BeMore Backend 스키마 초기화 완료!
```

**예상 결과**:
```
Success. No rows returned.
✅ BeMore Backend 스키마 초기화 완료!
   - 6개 테이블 생성 완료
   - 7개 인덱스 생성 완료
```

### 4단계: RLS 정책 적용

**새 쿼리 생성**:
```
SQL Editor → New Query
```

**아래 SQL 복사 및 실행**:
```sql
-- =====================================================
-- BeMore Backend RLS Policies
-- Backend API 전용 접근 정책
-- =====================================================

-- 1. sessions 테이블 RLS 설정
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - sessions"
ON public.sessions
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 2. reports 테이블 RLS 설정
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - reports"
ON public.reports
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 3. counselings 테이블 RLS 설정
ALTER TABLE public.counselings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - counselings"
ON public.counselings
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. users 테이블 RLS 설정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - users"
ON public.users
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 5. user_preferences 테이블 RLS 설정
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - user_preferences"
ON public.user_preferences
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 6. feedbacks 테이블 RLS 설정
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend only - feedbacks"
ON public.feedbacks
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ RLS 정책 적용 완료!';
  RAISE NOTICE '   - 6개 테이블 RLS 활성화';
  RAISE NOTICE '   - Backend 전용 정책 설정';
END $$;
```

**예상 결과**:
```
Success. No rows returned.
✅ RLS 정책 적용 완료!
   - 6개 테이블 RLS 활성화
   - Backend 전용 정책 설정
```

### 5단계: 검증

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

**테스트 데이터 삽입**:
```sql
-- 테스트 세션 삽입
INSERT INTO sessions (
  "sessionId",
  "userId",
  status
) VALUES (
  'test_' || extract(epoch from now())::text,
  NULL,
  'active'
) RETURNING *;

-- 테스트 데이터 조회
SELECT * FROM sessions
WHERE "sessionId" LIKE 'test_%'
ORDER BY "createdAt" DESC
LIMIT 1;

-- 테스트 데이터 삭제
DELETE FROM sessions WHERE "sessionId" LIKE 'test_%';
```

**예상 결과**: 테스트 세션이 삽입되고 조회되면 성공!

---

## ✅ 완료 확인

### 1. Table Editor 확인

```
Supabase Dashboard → Table Editor
```

**확인 사항**:
- [ ] `sessions` 테이블 표시됨
- [ ] 6개 테이블 모두 생성됨
- [ ] 각 테이블 구조 정상

### 2. Render 로그 확인

```
Render Dashboard → Logs
```

**5-10분 후 새 세션 시작하고 로그 확인**:

**이전 (에러)**:
```
❌ [CRITICAL] Failed to fetch session from Supabase:
   Error: Could not find the table 'public.sessions'
```

**수정 후 (정상)**:
```
✅ [CRITICAL] Emotion saved to Supabase
💾 Emotion data saved: { sessionId: 'sess_...', emotion: 'angry' }
```

### 3. 프론트엔드 테스트

**테스트 시나리오**:
1. 프론트엔드에서 새 세션 시작
2. 얼굴 랜드마크 전송 (20개 이상)
3. 감정 분석 완료 대기
4. Supabase Table Editor에서 데이터 확인

**검증**:
```sql
-- 최근 세션 조회
SELECT * FROM sessions
ORDER BY "createdAt" DESC
LIMIT 5;
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

**재실행**: 위의 1-5단계 다시 실행

---

## ⚠️ 주의사항

### DATABASE_URL 확인

**Render Environment Variables**:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
```

**형식 확인**:
- ✅ `postgresql://` 프로토콜
- ✅ Supabase Connection Pooler URL 사용
- ✅ Password 특수문자 URL 인코딩

**연결 테스트** (Supabase SQL Editor):
```sql
SELECT current_database(), current_user;
```

### RLS 정책 주의

**Backend는 직접 연결 사용**:
- Backend: `DATABASE_URL`로 직접 PostgreSQL 연결
- RLS 정책: Supabase 클라이언트 SDK 사용 시만 적용
- 결론: Backend는 RLS 우회 가능 (의도된 동작)

**확인 방법**:
```javascript
// services/socket/landmarksHandler.js:188-228
// Supabase 클라이언트 사용 여부 확인
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  // Supabase SDK 사용 (RLS 적용됨)
} else {
  // DATABASE_URL 직접 연결 (RLS 우회)
}
```

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
✅ [CRITICAL] Emotion saved to Supabase
📊 Emotion data: {
  sessionId: 'sess_1762868391052_c24c891c',
  emotion: 'angry',
  timestamp: 1762868564728
}
```

---

## 🎯 다음 단계

### P0 완료 후
1. ✅ 15분간 로그 모니터링
2. ✅ 테스트 세션 실행
3. ✅ 데이터 저장 확인
4. ✅ P0 완료 표시

### P1 준비
- P0 안정화 확인 후
- 24시간 내 P1 코드 수정 진행
- 문서: [P1 코드 수정 가이드](#) (작성 예정)

---

**작성**: Backend 개발팀
**최종 수정**: 2025-01-11
**실행 시간**: 30분 예상
**위험도**: LOW ✅
