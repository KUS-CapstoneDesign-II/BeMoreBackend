# 🔌 Backend 데이터베이스 연동 - Supabase DATABASE_URL 설정

**상태**: ✅ Supabase RLS 설정 완료
**다음**: Backend에 DATABASE_URL 설정
**예상 시간**: 5분

---

## 📍 현재 상태

✅ Supabase 프로젝트 생성
✅ 13개 테이블 생성
✅ 12개 테이블 RLS 활성화
✅ 20개 RLS 정책 생성

🎯 **다음**: DATABASE_URL 복사 및 Backend 설정

---

## 🎯 Step 1: Supabase에서 DATABASE_URL 복사

### 1.1 Supabase 대시보드 접속
```
https://app.supabase.com
```

### 1.2 프로젝트 선택
```
프로젝트: BeMore-EmotionAnalysis
```

### 1.3 DATABASE_URL 찾기

**방법 A: Connection Pooler (권장)**

1. 왼쪽 사이드바 → **Settings** → **Database**
2. **Connection pooling** 섹션 찾기
3. **Connection string** 선택 (드롭다운)
4. 다음 형식의 URL 보이기:
```
postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**복사하기**:
```bash
# 마우스로 드래그하여 선택
postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 1.4 패스워드 확인

비밀번호를 모르면:
1. **Settings** → **Database**
2. **Database password** 섹션
3. **Reset password** 클릭 (새 비밀번호 생성)
4. 복사하여 저장

---

## 🔧 Step 2: Backend .env 파일 설정

### 2.1 .env 파일 열기

프로젝트 루트에서:
```bash
nano .env
# 또는 에디터에서 직접 열기
```

### 2.2 DATABASE_URL 추가

다음 라인을 추가 또는 수정:

```bash
# ============================================
# Database Configuration
# ============================================
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# ============================================
# Existing Configuration (유지)
# ============================================
NODE_ENV=development
PORT=8000
GOOGLE_API_KEY=your_gemini_api_key
```

**예시**:
```bash
DATABASE_URL="postgresql://postgres.abcdefghijklmnop:xYzAbCdEfGhIjKlM@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NODE_ENV=development
PORT=8000
GOOGLE_API_KEY=AIzaSy...
```

### 2.3 파일 저장

```bash
# nano 에디터 사용 시:
# Ctrl + O → Enter → Ctrl + X

# 에디터에서: Ctrl+S (또는 Cmd+S)
```

---

## ✅ Step 3: 로컬 테스트

### 3.1 기존 서버 종료

```bash
# 포트 8000 사용 중인 프로세스 종료
pkill -9 -f "npm run dev"
sleep 2
```

### 3.2 환경 변수 로드

```bash
# .env 파일 적용 (npm이 자동으로 로드)
cd /Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend
```

### 3.3 서버 시작

```bash
npm run dev
```

### 3.4 예상 결과

성공하면:
```
✅ [DATABASE] Connected to Supabase PostgreSQL
✅ [SERVER] Running on http://localhost:8000
```

오류 예시와 해결:
```
❌ Error: connect ECONNREFUSED
→ DATABASE_URL이 올바른지 확인
→ Supabase IP 화이트리스트 확인

❌ Error: password authentication failed
→ 비밀번호 재확인
→ Supabase에서 비밀번호 리셋

❌ Error: cannot connect to server
→ 연결 문자열 형식 확인
→ Connection Pooler 사용 확인
```

---

## 🧪 Step 4: API 테스트

### 4.1 Health Check

```bash
curl http://localhost:8000/health | python3 -m json.tool
```

**예상 결과**:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

### 4.2 세션 생성 테스트

```bash
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "counselorId": "test_counselor_001"
  }' | python3 -m json.tool
```

**예상 결과**:
```json
{
  "success": true,
  "sessionId": "sess_1729936573841_a1b2c3d4e5f6g7h8",
  "startedAt": 1729936573841
}
```

### 4.3 세션 조회 테스트

```bash
SESSION_ID="sess_1729936573841_a1b2c3d4e5f6g7h8"  # 위의 결과에서 복사

curl http://localhost:8000/api/session/$SESSION_ID | python3 -m json.tool
```

**예상 결과**:
```json
{
  "success": true,
  "sessionId": "sess_...",
  "userId": "test_user_001",
  "status": "active",
  "startedAt": 1729936573841,
  "createdAt": "2025-10-26T10:02:53.841Z"
}
```

---

## 📊 데이터베이스 확인

Supabase Table Editor에서:

1. **Table Editor** 열기
2. **bemore_sessions** 테이블 클릭
3. 새로 생성된 세션 행 확인

```
| id (UUID)              | session_id                     | user_id        | status |
|------------------------|--------------------------------|----------------|--------|
| 550e8400-e29b-41d4... | sess_1729936573841_a1b2c3d4... | test_user_001 | active |
```

---

## 🔒 데이터베이스 연결 검증

### RLS 작동 확인 (선택사항)

```sql
-- Supabase SQL Editor에서 실행
-- 현재 로그인 사용자의 세션만 조회 가능
SELECT session_id, user_id, status FROM public.bemore_sessions;
```

**결과**:
- 로그인 없으면: 0 rows (RLS 거부)
- Supabase Auth로 로그인하면: 해당 사용자의 세션만 표시

---

## ✅ 완료 체크리스트

### DATABASE_URL 설정
- [ ] Supabase에서 CONNECTION_STRING 복사
- [ ] `.env` 파일에 DATABASE_URL 붙여넣기
- [ ] 파일 저장

### 로컬 테스트
- [ ] 서버 종료 (`pkill -9 -f "npm run dev"`)
- [ ] 서버 재시작 (`npm run dev`)
- [ ] 로그에 "Connected to Supabase PostgreSQL" 메시지 확인

### API 테스트
- [ ] Health check 성공 (`http://localhost:8000/health`)
- [ ] 세션 생성 성공 (`POST /api/session/start`)
- [ ] 세션 조회 성공 (`GET /api/session/{id}`)

### 데이터 확인
- [ ] Supabase Table Editor에서 세션 행 확인
- [ ] 데이터가 실제로 저장됨 확인

---

## 🎯 다음 단계

### 로컬 테스트 완료 후

1. ✅ Backend DATABASE_URL 설정 완료
2. ⏳ **Render 배포** (최종 단계)
   - Render 대시보드에서 DATABASE_URL 환경 변수 설정
   - 코드 배포
   - 프로덕션 테스트

---

## 🔗 관련 문서

- [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md) - Phase 5 참조
- [SUPABASE_RLS_SETUP_STEP_BY_STEP.md](SUPABASE_RLS_SETUP_STEP_BY_STEP.md) - RLS 설정 완료 확인

---

## 📝 주의사항

⚠️ **절대로 하지 마세요**:
- ❌ DATABASE_URL을 코드에 하드코딩
- ❌ DATABASE_URL을 공개 저장소에 커밋
- ❌ 비밀번호를 공유
- ❌ `.env` 파일을 Git에 업로드

✅ **항상 하세요**:
- ✅ `.env` 파일은 `.gitignore`에 포함
- ✅ 환경 변수는 Render 대시보드에서 설정
- ✅ 로컬 테스트 후 배포
- ✅ 프로덕션 환경변수는 별도로 설정

---

**상태**: 📍 DATABASE_URL 설정 준비 완료
**다음**: Supabase에서 DATABASE_URL 복사 후 .env 파일 수정!

