# 🚨 로그인 500 에러 진단 가이드 (2025-01-11)

**작성일**: 2025-01-11
**우선순위**: 🔴 CRITICAL
**상태**: P0 완료했지만 로그인 여전히 실패
**Request ID**: 0934a7ff-d01e-49bd-85a7-2484a5f3d6c6

---

## 📋 문제 요약

### Frontend 테스트 결과

**✅ 정상 작동**:
- 서버 응답: 루트 경로 200 OK
- 한국어 에러 메시지: "서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요." ✅

**❌ 실패**:
- `/api/health` → 404 Not Found
- `/api/auth/login` → 500 Internal Server Error

**Request ID**: `0934a7ff-d01e-49bd-85a7-2484a5f3d6c6`

---

## 🔍 근본 원인 분석

### 1. `/api/health` 404 에러 (경로 불일치)

**문제**: 엔드포인트 경로 설정 오류

**원인 분석**:
```javascript
// app.js:151
app.use("/api/health", healthRouter);

// routes/health.js:26
router.get('/health', (req, res) => { ... });
```

**실제 경로**: `/api/health` + `/health` = **`/api/health/health`** ❌

**사용 가능한 엔드포인트**:
```bash
✅ GET /health                    # app.js:172 (standalone)
✅ GET /api/health/health        # routes/health.js:26
✅ GET /api/health/stats         # routes/health.js:58
✅ GET /api/health/ready         # routes/health.js:93
✅ GET /api/health/live          # routes/health.js:105

❌ GET /api/health               # 존재하지 않음 (404)
```

**해결 방법**:
```bash
# Option 1: 기존 standalone endpoint 사용
curl https://bemorebackend.onrender.com/health

# Option 2: 정확한 경로 사용
curl https://bemorebackend.onrender.com/api/health/health
```

---

### 2. `/api/auth/login` 500 에러 (데이터베이스 문제)

**에러 발생 위치**: [controllers/authController.js:133-147](../controllers/authController.js#L133-L147)

**에러 처리 로직**:
```javascript
// Line 82-148: login function
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Line 87: 사용자 조회 (500 에러 발생 지점 가능성 높음)
    const user = await User.findOne({ where: { email } });

    // ... (생략)
  } catch (err) {
    // Line 134-138: ErrorHandler 로그
    errorHandler.handle(err, {
      module: 'auth',
      level: errorHandler.levels.ERROR,
      metadata: { method: 'POST', path: '/api/auth/login', requestId: req.requestId },
    });

    // Line 139-146: 500 응답 (사용자가 받은 에러 메시지)
    return res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        requestId: req.requestId,
      },
    });
  }
}
```

**가능한 원인 (우선순위순)**:

1. **🔴 P0: `users` 테이블 미생성 또는 접근 불가** (가능성 90%)
   - P0 가이드 실행했지만 `users` 테이블 없을 수 있음
   - RLS (Row Level Security) 정책 문제
   - DATABASE_URL 연결 실패

2. **🟡 P1: Sequelize 모델 초기화 실패** (가능성 5%)
   - `models/index.js:95` User.initiate() 실패
   - DATABASE_URL 형식 오류

3. **🟡 P2: 기타 데이터베이스 오류** (가능성 5%)
   - SSL 인증 문제
   - 네트워크 타임아웃
   - 권한 문제

---

## ✅ 진단 체크리스트

### 1️⃣ Supabase Database 상태 확인

**Supabase Dashboard → SQL Editor에서 실행**:

```sql
-- 1. users 테이블 존재 여부 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'users';

-- 예상 결과:
-- table_name
-- ----------
-- users        ← ✅ 이게 보여야 함!

-- 결과 없으면 → users 테이블 미생성 ❌
```

**✅ 성공 시**: `users` 테이블 1개 표시
**❌ 실패 시**: 결과 없음 → **P0 가이드 재실행 필요**

---

### 2️⃣ test@example.com 계정 존재 여부 확인

```sql
-- 2. test@example.com 사용자 조회
SELECT id, username, email, "createdAt"
FROM users
WHERE email = 'test@example.com';

-- 예상 결과:
-- id | username | email              | createdAt
-- ---|----------|--------------------|-----------
-- 1  | testuser | test@example.com   | 2025-01-11 ...

-- 결과 없으면 → 계정 미생성 (정상, 회원가입 필요)
```

**✅ 성공 시**: 사용자 정보 1개 표시
**❌ 실패 시**: 결과 없음 → 회원가입 먼저 시도해야 함

---

### 3️⃣ 전체 테이블 목록 확인

```sql
-- 3. 모든 테이블 목록 조회 (P0 완료 검증)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 예상 결과 (6개 테이블):
-- counselings
-- feedbacks
-- reports
-- sessions
-- user_preferences
-- users
```

**✅ 성공 시**: 6개 테이블 모두 표시
**❌ 실패 시**: 일부 테이블 누락 → **P0 가이드 재실행**

---

### 4️⃣ DATABASE_URL 연결 테스트

**Supabase Dashboard → Project Settings → Database**:

```
Host: db.zyujxskhparxovpydjez.supabase.co
Database name: postgres
Port: 5432
User: postgres

Connection string (URI):
postgresql://postgres:[YOUR-PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

**Render Dashboard → Environment → DATABASE_URL 확인**:
```bash
# DATABASE_URL 형식 (올바른 예시)
postgresql://postgres:password@db.zyujxskhparxovpydjez.supabase.co:5432/postgres

# ⚠️ 잘못된 예시:
postgres://...       # ❌ 'postgresql://'이어야 함
...@db.supabase.co   # ❌ 실제 호스트명이어야 함
```

**✅ 성공 시**: 형식 일치, 비밀번호 정확
**❌ 실패 시**: 형식 불일치 → Render 환경변수 수정

---

### 5️⃣ Backend 로그 확인 (가장 중요!)

**Render Dashboard → Logs → Request ID로 검색**:

```bash
# Request ID로 필터링
0934a7ff-d01e-49bd-85a7-2484a5f3d6c6
```

**찾아야 할 로그**:

**A. 정상 로그 (예상)**:
```
✅ 데이터베이스 연결 성공
🔗 DATABASE_URL (masked): postgresql://postgres:****@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
📊 DB Connection Config: { database: 'postgres', username: 'postgres', host: 'db.zyujxskhparxovpydjez.supabase.co', port: 5432, ssl: 'enabled' }
```

**B. 에러 로그 (찾아야 할 것)**:
```
❌ [auth] [ERROR] Login error for test@example.com
❌ Error: relation "users" does not exist
❌ Error: password authentication failed for user "postgres"
❌ Error: SSL SYSCALL error: EOF detected
❌ SequelizeConnectionError: connect ETIMEDOUT
```

**C. Request ID 관련 로그**:
```
📝 [RequestID: 0934a7ff-d01e-49bd-85a7-2484a5f3d6c6] POST /api/auth/login
❌ [auth] [ERROR] ... requestId: 0934a7ff-d01e-49bd-85a7-2484a5f3d6c6
```

---

## 🔧 해결 방법 (원인별)

### Case 1: `users` 테이블 미생성 ❌

**증상**: SQL 쿼리 결과 `users` 테이블 없음

**해결**:
1. [P0_SUPABASE_TABLE_SETUP.md](./P0_SUPABASE_TABLE_SETUP.md) 가이드 재실행
2. `schema/init.sql` 전체 실행
3. 6개 테이블 생성 확인
4. 테스트 데이터 삽입 (선택)

**예상 시간**: 15분

---

### Case 2: DATABASE_URL 연결 실패 ❌

**증상**:
- Backend 로그: `SequelizeConnectionError`
- Backend 로그: `password authentication failed`
- Backend 로그: `connect ETIMEDOUT`

**해결**:
1. Render → Environment → DATABASE_URL 확인
2. Supabase → Project Settings → Database에서 올바른 연결 문자열 복사
3. Render 환경변수 업데이트
4. Render 재배포 (자동 트리거)

**올바른 DATABASE_URL 형식**:
```bash
postgresql://postgres:[PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

**예상 시간**: 10분

---

### Case 3: RLS (Row Level Security) 차단 ❌

**증상**:
- `users` 테이블 존재함
- Backend 로그: `new row violates row-level security policy`

**해결** (Supabase SQL Editor):
```sql
-- users 테이블 RLS 비활성화 (Backend 직접 접근 허용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 또는 Backend 전용 정책 추가
CREATE POLICY "Backend full access - users"
ON users
FOR ALL
USING (true)
WITH CHECK (true);
```

**예상 시간**: 5분

---

### Case 4: 테스트 계정 미생성 (정상)

**증상**: `test@example.com` 계정 없음 (정상 상태)

**해결**: 회원가입 먼저 시도

```bash
# 1. 회원가입 API 호출
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "user": { "id": 1, "username": "testuser", "email": "test@example.com" },
#     "accessToken": "eyJ...",
#     "refreshToken": "eyJ..."
#   }
# }

# 2. 회원가입 성공 후 로그인 재시도
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**예상 시간**: 5분

---

## 🚀 추천 진단 순서

### Step 1: Supabase 테이블 확인 (2분)
```sql
-- Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```
- ✅ 6개 테이블 → Step 2
- ❌ 테이블 누락 → **P0 가이드 재실행**

---

### Step 2: Render 로그 확인 (5분)
```
Render Dashboard → Logs → 최근 10분 검색
"0934a7ff-d01e-49bd-85a7-2484a5f3d6c6" 또는 "auth" 또는 "ERROR"
```
- ✅ 연결 성공 로그 → Step 3
- ❌ 연결 실패 로그 → **DATABASE_URL 수정**

---

### Step 3: 회원가입 테스트 (3분)
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```
- ✅ 201 Created → Step 4
- ❌ 500 Error → **Backend 로그 재확인**

---

### Step 4: 로그인 재시도 (2분)
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```
- ✅ 200 OK → **문제 해결 완료! 🎉**
- ❌ 401/500 → **Backend 로그 공유 필요**

---

## 📊 예상 시나리오별 해결 시간

| 시나리오 | 원인 | 해결 시간 | 가능성 |
|----------|------|-----------|--------|
| 1 | users 테이블 미생성 | 15분 | 90% |
| 2 | DATABASE_URL 오류 | 10분 | 5% |
| 3 | RLS 차단 | 5분 | 3% |
| 4 | 기타 (디버깅 필요) | 30분 | 2% |

---

## 🎯 다음 단계

### 즉시 실행 (우선순위 높음)

1. **Supabase SQL 쿼리 실행** (2분)
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name;
   ```

2. **Render 로그 확인** (5분)
   - Request ID: `0934a7ff-d01e-49bd-85a7-2484a5f3d6c6` 검색
   - 에러 메시지 전문 복사

3. **회원가입 테스트** (3분)
   - 신규 계정 생성 시도
   - 응답 코드 확인 (201 or 500)

### 이후 단계 (로그 결과에 따라)

- **users 테이블 없음** → P0 가이드 재실행
- **DATABASE_URL 오류** → Render 환경변수 수정
- **회원가입 성공** → 로그인 재시도
- **여전히 500** → Backend 로그 상세 분석

---

## 📝 /api/health 엔드포인트 관련

### 현재 상태
- ❌ `/api/health` → 404 (경로 불일치)
- ✅ `/health` → 200 OK (사용 가능)
- ✅ `/api/health/health` → 200 OK (사용 가능)

### E2E 웜업용 필요 여부

**Frontend Keep-Alive 전략**:
- 목적: Render 무료 버전 1시간 자동 종료 방지
- 권장: `/health` 엔드포인트 사용 (간단하고 빠름)
- 주기: 25분마다 자동 호출

**사용 예시**:
```javascript
// Frontend keep-alive
setInterval(() => {
  fetch('https://bemorebackend.onrender.com/health');
}, 25 * 60 * 1000); // 25분
```

**필요성**: ✅ **E2E 테스트 및 프로덕션 안정성에 권장**

---

## 🔗 관련 문서

- [P0: Supabase 테이블 설정](./P0_SUPABASE_TABLE_SETUP.md)
- [프로덕션 로그 분석](./PRODUCTION_LOG_ANALYSIS_20250111.md)
- [프로덕션 긴급 수정 공지](../frontend/BACKEND_PRODUCTION_FIX_20250111.md)

---

**작성**: Backend 개발팀
**최종 수정**: 2025-01-11 15:00
**다음 업데이트**: 진단 결과 확인 후 (15:30)

**상태**: 📋 진단 대기 중 | 🔍 Backend 로그 필요
