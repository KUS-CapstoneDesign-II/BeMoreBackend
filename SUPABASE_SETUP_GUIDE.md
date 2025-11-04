# 🔗 Supabase PostgreSQL 설정 가이드

**작성일**: 2025-11-04
**목적**: Backend를 Supabase PostgreSQL과 연동
**상태**: 🟢 **자동 마이그레이션 지원**

---

## 📋 제공된 정보

```
Host: db.zyujxskhparxovpydjez.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR_PASSWORD]
```

---

## 🚀 Setup Steps (3 단계)

### Step 1: .env 파일 업데이트

**파일**: `.env`

현재:
```env
GEMINI_API_KEY=AIzaSyCrwtOaR2AehWHZxacMieHHqHhfrTyutcU
OPENAI_API_KEY=sk-proj-...
PORT=8000
NODE_ENV=development
```

**수정 사항 추가**:
```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres

# Existing env vars (유지)
GEMINI_API_KEY=AIzaSyCrwtOaR2AehWHZxacMieHHqHhfrTyutcU
OPENAI_API_KEY=sk-proj-...
FRONTEND_URLS=http://localhost:5173,https://be-more-frontend.vercel.app
PORT=8000
NODE_ENV=development
```

**예시** (실제 password 입력):
```env
DATABASE_URL=postgresql://postgres:MySecurePassword123@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

---

### Step 2: Render 환경변수 설정

**Render 대시보드**:
1. Service 선택 → Environment 탭
2. "Add Environment Variable" 클릭
3. 다음 변수 추가:

```
KEY: DATABASE_URL
VALUE: postgresql://postgres:[YOUR_PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

예시:
```
postgresql://postgres:MySecurePassword123@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

**주의**: 값 끝에 세미콜론이나 추가 텍스트 없어야 함

---

### Step 3: 서버 재시작

**옵션 A: Render 대시보드**
- Service 페이지에서 "Redeploy" 클릭
- 배포 로그 확인

**옵션 B: 로컬 테스트**
```bash
export DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres"
npm start
```

---

## ✅ 설정 확인

### 1. 로컬에서 테스트

```bash
# .env에 DATABASE_URL 추가 후
npm start
```

**예상 출력**:
```
✅ 데이터베이스 연결 성공
✅ SessionManager 초기화 완료
✅ WebSocket 3채널 라우터 설정 완료
🚀 서버 실행 중 (port): 8000
```

**실패 시**: 아래 "문제 해결" 섹션 참조

---

### 2. Render에서 배포 후 확인

```bash
# 헬스 체크
curl https://bemorebackend.onrender.com/health

# 예상 응답
{
  "status": "ok",
  "timestamp": "2025-11-04T15:30:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

---

### 3. API 테스트

```bash
# Frontend 통신 테스트
curl -X GET https://bemorebackend.onrender.com/api/dashboard/summary \
  -H "Origin: https://be-more-frontend.vercel.app"

# CORS 헤더 확인
# Response Header에 다음이 있어야 함:
# Access-Control-Allow-Origin: https://be-more-frontend.vercel.app
```

---

## 🔐 보안 체크리스트

- [ ] PASSWORD를 .env에 저장 (git commit 하지 말기)
- [ ] .gitignore에 `.env` 포함되어 있나?
- [ ] Render의 DATABASE_URL이 정확한가?
- [ ] Supabase에서 PostgreSQL이 실행 중인가?
- [ ] 방화벽이 5432 포트를 허용하는가?

---

## 📊 마이그레이션 상태

| 항목 | 상태 | 설명 |
|------|------|------|
| **PostgreSQL 드라이버** | ✅ 설치됨 | pg, pg-hstore 설치 완료 |
| **Sequelize 설정** | ✅ 수정됨 | models/index.js에서 dialect 지정 |
| **.env.example** | ✅ 업데이트됨 | DATABASE_URL 포맷 추가 |
| **CORS 설정** | ✅ 정상 | Frontend URL 허용됨 |
| **API 라우터** | ✅ 정상 | 모든 엔드포인트 정의됨 |

---

## 🐛 문제 해결

### 문제 1: "Password authentication failed"

```
Error: password authentication failed for user "postgres"
```

**원인**: 잘못된 password 입력

**해결**:
1. Supabase 대시보드에서 정확한 password 확인
2. 특수문자가 있으면 URL 인코딩 필요:
   ```
   @ → %40
   # → %23
   $ → %24
   % → %25
   & → %26
   ```

**예시**:
```
Password: pass@word#123
DATABASE_URL: postgresql://postgres:pass%40word%23123@db...
```

---

### 문제 2: "connect ECONNREFUSED 127.0.0.1:3306"

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**원인**: DATABASE_URL이 설정되지 않았음 (MySQL로 fallback)

**해결**:
1. `.env`에 DATABASE_URL 있는지 확인
2. 정확한 host/port 확인
3. 따옴표 제거: `DATABASE_URL=postgresql://...` (O)
4. 따옴표 포함: `DATABASE_URL="postgresql://..."` (X)

---

### 문제 3: "unsupported dialect mysql"

```
Error: unsupported dialect mysql
```

**원인**: config.json의 mysql dialect가 계속 적용됨

**해결**: models/index.js가 올바르게 수정되었는지 확인
```javascript
// ✅ 올바른 형태
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...config,
    dialect: 'postgres'  // ← 반드시 포함
  });
}
```

---

### 문제 4: Render에서 "502 Bad Gateway"

**확인 사항**:
1. Render 대시보드 → Logs 탭에서 에러 메시지 확인
2. DATABASE_URL이 정확한가?
3. Supabase가 실행 중인가?
4. 방화벽 설정 확인

**디버깅**:
```bash
# Render에서 환경변수 확인
# Service → Environment 탭에서 DATABASE_URL 값 확인
# 특수문자나 공백이 없는지 확인
```

---

## 📝 생성된 파일

| 파일 | 변경 사항 |
|------|---------|
| `models/index.js` | DATABASE_URL 사용 시 dialect: 'postgres' 설정 |
| `.env.example` | DATABASE_URL 포맷 추가 |
| `package.json` | pg, pg-hstore 자동 추가됨 |

---

## 🚀 배포 순서

### Phase 1: 로컬 테스트 (지금)
1. DATABASE_URL을 .env에 추가
2. `npm start` 실행
3. 데이터베이스 연결 확인

### Phase 2: Render 설정 (다음)
1. Render 대시보드 접속
2. Environment Variables에 DATABASE_URL 추가
3. "Redeploy" 클릭

### Phase 3: 검증 (최종)
1. Health check: `curl https://bemorebackend.onrender.com/health`
2. API test: `/api/dashboard/summary` 호출
3. Frontend 연결 확인

---

## 📞 참고 정보

### Supabase PostgreSQL 기본 설정

```
Host: db.zyujxskhparxovpydjez.supabase.co
Port: 5432
Database: postgres
User: postgres
SSL Mode: require (자동으로 적용됨)
```

### Sequelize PostgreSQL 호환성

| 기능 | 지원 |
|------|------|
| **연결** | ✅ 완벽 |
| **마이그레이션** | ✅ 자동 (force: false) |
| **모델** | ✅ 기존 모델 그대로 |
| **쿼리** | ✅ 호환 |
| **트랜잭션** | ✅ 지원 |
| **관계** | ✅ 지원 |

---

## ✨ 다음 단계

1. ✅ **이 파일 검토**
2. ⏳ **`.env` 파일에 DATABASE_URL 추가**
3. ⏳ **로컬에서 `npm start` 테스트**
4. ⏳ **Render 환경변수 설정**
5. ⏳ **Render Redeploy 실행**
6. ⏳ **Frontend에서 API 연결 확인**

---

**설정 완료 후**: Frontend와 Backend가 완벽하게 연동됩니다! 🎉

---

**작성일**: 2025-11-04
**마지막 수정**: 2025-11-04
**상태**: 🟢 **Ready for deployment**
