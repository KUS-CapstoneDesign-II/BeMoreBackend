# 🚀 배포 환경 설정 가이드 (Render + Supabase)

**작성일**: 2025-01-10
**Phase**: 0-1.5 배포 준비
**상태**: ⚠️ DATABASE_URL 설정 필요

---

## 🚨 현재 문제

### 프로덕션 환경 (Render)
```
❌ 에러: Cannot read properties of null (reading 'findOne')
📍 원인: DATABASE_URL 환경변수가 설정되지 않음
🔧 해결: Render Dashboard에서 DATABASE_URL 추가
```

### 로컬 환경
```
❌ 에러: getaddrinfo ENOTFOUND db.zyujxskhparxovpydjez.supabase.co
📍 원인: .env 파일의 DATABASE_URL이 잘못된 호스트
🔧 해결: 실제 Supabase DATABASE_URL로 교체
```

---

## ✅ 해결 방법

### Step 1: Supabase에서 DATABASE_URL 확인

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard

2. **프로젝트 선택**
   - BeMore 프로젝트 클릭

3. **Database 설정으로 이동**
   - 좌측 메뉴: Settings ⚙️ → Database

4. **Connection String 복사**
   - **Connection string** 섹션 찾기
   - **URI** 탭 선택
   - 문자열 복사 (예시):
     ```
     postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
     ```

5. **비밀번호 입력**
   - `[YOUR-PASSWORD]` 부분을 실제 DB 비밀번호로 교체
   - 비밀번호를 모르면 Supabase에서 재설정

**최종 형식**:
```
postgresql://postgres.abcdefgh:MySecurePassword123@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

---

### Step 2: 로컬 환경 (.env 파일) 설정

1. **`.env` 파일 열기**
   ```bash
   code .env
   # 또는
   nano .env
   ```

2. **DATABASE_URL 수정**
   ```bash
   # 기존 (잘못된 예시 URL)
   DATABASE_URL=postgresql://postgres:your_password@db.zyujxskhparxovpydjez.supabase.co:5432/postgres

   # 변경 (Step 1에서 복사한 실제 URL)
   DATABASE_URL=postgresql://postgres.abcdefgh:MySecurePassword123@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

3. **저장 및 확인**
   ```bash
   # .env 파일 저장 후
   npm start

   # 성공 시 출력:
   # ✅ 데이터베이스 연결 성공
   # 🚀 서버 실행 중 (port): 8000
   ```

---

### Step 3: Render 환경변수 설정

1. **Render Dashboard 접속**
   - https://dashboard.render.com

2. **BeMoreBackend 서비스 선택**
   - Services → BeMoreBackend 클릭

3. **Environment 탭 이동**
   - 좌측 메뉴: Environment

4. **DATABASE_URL 추가/수정**

   **방법 A: 새로 추가 (없을 경우)**
   - **Add Environment Variable** 버튼 클릭
   - Key: `DATABASE_URL`
   - Value: (Step 1에서 복사한 Supabase URI)
   - **Save Changes** 클릭

   **방법 B: 수정 (있을 경우)**
   - 기존 `DATABASE_URL` 행 찾기
   - 🔍 (Edit) 아이콘 클릭
   - Value를 실제 Supabase URI로 교체
   - **Save Changes** 클릭

5. **자동 재배포 확인**
   - 환경변수 변경 시 자동으로 재배포됨
   - **Logs** 탭에서 배포 진행 상황 확인
   - 성공 메시지 확인:
     ```
     ✅ 데이터베이스 연결 성공
     🚀 서버 실행 중 (port): 10000
     ```

---

### Step 4: Migration 실행

**중요**: DATABASE_URL 설정 후 Migration을 실행해야 `profileImage` 컬럼이 추가됩니다.

#### 방법 A: Render Shell에서 실행 (권장)

1. **Render Dashboard → Shell 탭**
2. **명령어 실행**:
   ```bash
   npx sequelize-cli db:migrate
   ```

3. **예상 출력**:
   ```
   Sequelize CLI [Node: 18.x.x, CLI: 6.6.3, ORM: 6.37.7]

   Loaded configuration file "config/config.json".
   Using environment "production".

   == 20251110031538-add-profileImage-to-users: migrating =======
   == 20251110031538-add-profileImage-to-users: migrated (0.123s)
   ```

#### 방법 B: 로컬에서 프로덕션 DB로 실행

1. **임시로 .env 파일을 프로덕션 DB로 설정**
   ```bash
   # 기존 .env 백업
   cp .env .env.backup

   # DATABASE_URL을 프로덕션 Supabase URI로 변경
   # (Step 1에서 복사한 것과 동일)
   ```

2. **Production 환경으로 Migration 실행**:
   ```bash
   NODE_ENV=production npx sequelize-cli db:migrate
   ```

3. **.env 파일 복원**:
   ```bash
   mv .env.backup .env
   ```

---

## 🧪 테스트 (DATABASE_URL 설정 후)

### 로컬 테스트

```bash
# 1. 로컬 서버 실행
npm start

# 2. 다른 터미널에서 테스트 실행
./test-phase-0-1.5.sh http://localhost:8000
```

### 프로덕션 테스트

```bash
# DATABASE_URL 설정 + Migration 완료 후
./test-phase-0-1.5.sh https://bemorebackend.onrender.com
```

**예상 결과** (100% Pass):
```
════════════════════════════════════════════════════════
📊 Test Summary
════════════════════════════════════════════════════════

Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100.0%

✅ All tests passed! Phase 0-1.5 implementation is working correctly.
```

---

## 🔍 문제 해결

### 문제 1: Migration 실행 시 "SequelizeConnectionError"

**증상**:
```
SequelizeConnectionError: connect ECONNREFUSED
```

**원인**: DATABASE_URL이 여전히 잘못되었거나 네트워크 문제

**해결**:
1. DATABASE_URL 다시 확인 (복사 오류 없는지)
2. Supabase 프로젝트가 활성 상태인지 확인
3. Supabase Dashboard → Database → Connection pooling이 활성화되어 있는지 확인

---

### 문제 2: Render에서 "Cannot read properties of null" 계속 발생

**증상**:
```json
{"success":false,"error":{"code":"SIGNUP_ERROR","message":"Cannot read properties of null..."}}
```

**원인**: DATABASE_URL 환경변수가 여전히 설정되지 않았거나 재배포 안 됨

**해결**:
1. Render Dashboard → Environment에서 DATABASE_URL 확인
2. **Manual Deploy** 버튼 클릭하여 강제 재배포:
   - Dashboard → Manual Deploy → **Deploy latest commit**
3. Logs에서 "✅ 데이터베이스 연결 성공" 메시지 확인

---

### 문제 3: Migration 이미 실행됨 ("Migration already executed")

**증상**:
```
== 20251110031538-add-profileImage-to-users: migrated (0.123s)

ERROR: column "profileImage" already exists
```

**원인**: Migration이 이미 실행되었거나 컬럼이 이미 존재함

**해결**: 이는 정상입니다. 이미 컬럼이 존재하므로 테스트 진행 가능

**확인 방법**:
```bash
# Render Shell 또는 로컬에서
npx sequelize-cli db:migrate:status

# 출력:
# up 20251110031538-add-profileImage-to-users.js
```

---

### 문제 4: Supabase 비밀번호 분실

**해결**:
1. Supabase Dashboard → Settings → Database
2. **Database Password** 섹션에서 **Reset database password** 클릭
3. 새 비밀번호 생성 및 저장
4. DATABASE_URL의 `[YOUR-PASSWORD]` 부분을 새 비밀번호로 교체
5. Render와 로컬 .env 모두 업데이트

---

## 📋 체크리스트

### 로컬 환경
- [ ] Supabase에서 DATABASE_URL 복사
- [ ] .env 파일의 DATABASE_URL 수정
- [ ] `npm start`로 서버 시작 확인
- [ ] "✅ 데이터베이스 연결 성공" 메시지 확인
- [ ] Migration 실행 (`npx sequelize-cli db:migrate`)
- [ ] 로컬 테스트 실행 (`./test-phase-0-1.5.sh http://localhost:8000`)

### Render 환경
- [ ] Render Dashboard → Environment에서 DATABASE_URL 추가/수정
- [ ] 자동 재배포 완료 확인 (또는 Manual Deploy)
- [ ] Logs에서 "✅ 데이터베이스 연결 성공" 확인
- [ ] Render Shell에서 Migration 실행
- [ ] 프로덕션 테스트 실행 (`./test-phase-0-1.5.sh https://bemorebackend.onrender.com`)

---

## 📊 완료 기준

✅ **로컬 환경**:
- npm start 시 DB 연결 성공
- Migration 완료
- 테스트 15개 모두 Pass

✅ **Render 환경**:
- 배포 성공 (Logs 확인)
- DB 연결 성공 (Logs 확인)
- Migration 완료
- 테스트 15개 모두 Pass

---

## 📚 관련 문서

- **PHASE_0-1.5_UPDATE.md**: Phase 0-1.5 구현 상세
- **TESTING_README.md**: 테스트 실행 가이드
- **PHASE_0-1.5_TEST_GUIDE.md**: 15개 테스트 케이스 명세
- **QUICK_TEST_COMMANDS.md**: 빠른 테스트 명령어

---

## 🆘 추가 지원

DATABASE_URL 설정 후에도 문제가 지속되면:

1. **Supabase 프로젝트 상태 확인**
   - https://supabase.com/dashboard
   - Project Health 체크

2. **Render 서비스 로그 확인**
   - Dashboard → Logs 탭
   - 에러 메시지 복사

3. **GitHub Issues 또는 팀 채널에 문의**
   - 에러 메시지와 함께 공유
   - 스크린샷 첨부 권장

---

**작성자**: Backend Team
**최종 수정**: 2025-01-10
**문서 버전**: 1.0
