# 🚨 DB 재생성 후 재연결 가이드 (긴급)

**작성일**: 2025-01-11
**우선순위**: 🔴 CRITICAL
**상태**: DB 재생성 후 연결 실패
**예상 소요 시간**: 15분

---

## 📋 문제 요약

**증상**:
- ✅ 서버 실행 중 (`/` → 200 OK)
- ❌ `/api/auth/signup` → 500 (DB 연결 실패)
- ❌ `/api/auth/login` → 500 (DB 연결 실패)

**원인**: Supabase DB 재생성으로 DATABASE_URL 변경됨

**Request IDs**:
- 회원가입: `0059b5da-e393-44ba-97d4-f9fc05ceb52f`
- 로그인: `1e128695-2525-4e65-b9cb-fb0dd792876d`

---

## 🚀 빠른 해결 (3단계, 15분)

### Step 1: 새 DATABASE_URL 가져오기 (5분)

**Supabase Dashboard**:

1. https://supabase.com 접속
2. BeMore 프로젝트 선택
3. **Settings** → **Database** 클릭
4. **Connection string** 섹션에서 **URI** 탭 선택
5. 비밀번호 표시 토글 활성화
6. 전체 연결 문자열 복사

**형식 확인**:
```bash
postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

**⚠️ 주의사항**:
- `postgres://`가 아닌 `postgresql://`로 시작해야 함
- 비밀번호에 특수문자 있으면 URL 인코딩 필요
- 포트는 보통 `5432` (Direct) 또는 `6543` (Pooler)

---

### Step 2: Render 환경변수 업데이트 (3분)

**Render Dashboard**:

1. https://dashboard.render.com 접속
2. **BeMoreBackend** 서비스 선택
3. 좌측 메뉴 → **Environment** 클릭
4. `DATABASE_URL` 찾기
5. **Edit** 버튼 클릭
6. Step 1에서 복사한 연결 문자열 붙여넣기
7. **Save Changes** 클릭

**⚠️ 추가로 확인할 환경변수** (P1 완료 위해):
```bash
GEMINI_TIMEOUT_MS=45000
MAX_FRAMES_PER_ANALYSIS=40
```

**예상 결과**:
- 자동 재배포 트리거 (3-5분 소요)
- 로그에 "Deploying..." 메시지 표시

---

### Step 3: DB 스키마 적용 (5분)

**Supabase Dashboard → SQL Editor**:

1. **SQL Editor** 클릭
2. **New Query** 버튼 클릭
3. 아래 SQL 복사해서 붙여넣기
4. **Run** 버튼 클릭 (Ctrl/Cmd + Enter)

```sql
-- ============================================================
-- BeMore Backend - 초기 스키마 생성 스크립트 (간소화)
-- ============================================================

-- 기존 테이블 삭제 (주의: 모든 데이터 삭제!)
DROP TABLE IF EXISTS "feedbacks" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "counselings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 1. Users 테이블
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "refreshToken" VARCHAR(500),
  "name" VARCHAR(100),
  "profileImage" VARCHAR(255),
  "role" VARCHAR(20) DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE INDEX "idx_users_email" ON "users" ("email");

-- 2. Counselings 테이블
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

CREATE INDEX "idx_counselings_user_id" ON "counselings" ("userId");

-- 3. Sessions 테이블 (⭐ CRITICAL)
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

CREATE UNIQUE INDEX "idx_sessions_session_id" ON "sessions" ("sessionId");
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("userId");

-- 4. Reports 테이블
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

CREATE INDEX "idx_reports_session_id" ON "reports" ("sessionId");

-- 5. UserPreferences 테이블
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

CREATE UNIQUE INDEX "idx_user_preferences_user_id" ON "user_preferences" ("userId");

-- 6. Feedbacks 테이블
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

CREATE INDEX "idx_feedbacks_user_id" ON "feedbacks" ("userId");
CREATE INDEX "idx_feedbacks_session_id" ON "feedbacks" ("sessionId");

-- RLS 비활성화 (Backend 직접 접근 허용)
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "counselings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_preferences" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "feedbacks" DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT 'BeMore Backend 스키마 초기화 완료!' AS status;
```

**예상 결과**:
```
Success. No rows returned.
[
  {
    "status": "BeMore Backend 스키마 초기화 완료!"
  }
]
```

---

### Step 4: 검증 (2분)

**A. Supabase 테이블 확인**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'sessions', 'counselings', 'reports', 'user_preferences', 'feedbacks')
ORDER BY table_name;
```

**예상 결과**: 6개 테이블 모두 표시

**B. Render 재배포 완료 대기**:
- Render Dashboard → Logs
- "Build successful" 메시지 확인
- "데이터베이스 연결 성공" 로그 확인

**C. 회원가입 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**예상 성공 응답**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**D. 로그인 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 🔍 트러블슈팅

### 문제 1: DATABASE_URL 형식 오류

**증상**: Render 로그에 "invalid connection string" 에러

**해결**:
```bash
# ❌ 잘못된 형식
postgres://postgres:password@...

# ✅ 올바른 형식
postgresql://postgres:password@...
```

---

### 문제 2: 비밀번호 특수문자 문제

**증상**: "password authentication failed" 에러

**해결**: URL 인코딩 사용
```bash
# 비밀번호에 @, #, ! 등 특수문자 있으면
# https://www.urlencoder.org/ 에서 인코딩

# 예시:
# 원본: MyP@ssw0rd!
# 인코딩: MyP%40ssw0rd%21
postgresql://postgres:MyP%40ssw0rd%21@...
```

---

### 문제 3: Render 자동 재배포 안됨

**증상**: Environment 변경했는데 재배포 안됨

**해결**:
1. Render Dashboard → **Manual Deploy** 클릭
2. **Deploy latest commit** 선택
3. 배포 완료 대기 (3-5분)

---

### 문제 4: 여전히 500 에러

**증상**: 모든 단계 완료했는데 여전히 500 에러

**진단**:
1. Render Logs에서 최신 에러 확인
2. Request ID로 검색
3. 에러 메시지 전문 확인

**예상 에러 패턴**:
```bash
# Sequelize 연결 에러
❌ SequelizeConnectionError: connect ETIMEDOUT
❌ no pg_hba.conf entry for host

# 모델 초기화 에러
❌ User.findOne is not a function
❌ Cannot read property 'findOne' of null

# RLS 에러 (Step 3에서 해결되어야 함)
❌ new row violates row-level security policy
```

---

## 📊 예상 해결 시간

| 단계 | 작업 | 소요 시간 |
|------|------|-----------|
| 1 | DATABASE_URL 가져오기 | 5분 |
| 2 | Render 환경변수 업데이트 | 3분 |
| 3 | DB 스키마 적용 | 5분 |
| 4 | 검증 (재배포 대기 포함) | 5-8분 |
| **합계** | | **15-20분** |

---

## 🎯 체크리스트

### 필수 단계
- [ ] Supabase DATABASE_URL 복사
- [ ] Render Environment에 DATABASE_URL 업데이트
- [ ] Render 자동 재배포 확인 (3-5분)
- [ ] Supabase SQL Editor에서 스키마 실행
- [ ] 6개 테이블 생성 확인
- [ ] RLS 비활성화 확인

### 검증 단계
- [ ] Render 로그에서 "데이터베이스 연결 성공" 확인
- [ ] 회원가입 API 테스트 (201 Created)
- [ ] 로그인 API 테스트 (200 OK)
- [ ] Access Token 발급 확인

### 선택 단계 (P1 완료)
- [ ] GEMINI_TIMEOUT_MS=45000 환경변수 추가
- [ ] MAX_FRAMES_PER_ANALYSIS=40 환경변수 추가
- [ ] Render 재배포 (자동 또는 수동)

---

## 🔗 관련 문서

- [P0: Supabase 테이블 설정](./P0_SUPABASE_TABLE_SETUP.md) - 상세 스키마 가이드
- [로그인 500 에러 진단](./LOGIN_500_DIAGNOSTIC_GUIDE.md) - 일반적인 로그인 문제
- [프로덕션 로그 분석](./PRODUCTION_LOG_ANALYSIS_20250111.md) - 로그 분석 방법

---

## ⚡ 빠른 명령어 모음

**Supabase 테이블 확인**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

**회원가입 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

**로그인 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Health Check**:
```bash
curl https://bemorebackend.onrender.com/health
```

---

**작성**: Backend 개발팀
**최종 수정**: 2025-01-11 16:30
**다음 업데이트**: 재연결 완료 후 (17:00)

**상태**: 🔴 긴급 | 📋 즉시 실행 필요
