# 🚨 로그인 500 에러 - 특정 계정만 성공하는 문제

**보고일**: 2025-01-12
**우선순위**: 🔴 HIGH
**영향도**: CRITICAL - 테스트 계정 제외 모든 사용자 로그인 불가
**상태**: 🔍 INVESTIGATING

---

## 📋 문제 요약

**Frontend 팀 보고**: 프로덕션에서 특정 계정(`final2025@test.com`)만 로그인 성공, 다른 모든 계정은 500 에러 발생

### 증상

| 계정 | 상태 | 응답 코드 | 비고 |
|------|------|-----------|------|
| `final2025@test.com` | ✅ 성공 | 200 OK | 정상 로그인 |
| 다른 모든 계정 | ❌ 실패 | 500 Internal Server Error | 로그인 불가 |

### 재현 방법

**프론트엔드 환경**:
- URL: https://be-more-frontend.vercel.app/auth/login
- 브라우저: 모든 브라우저에서 동일 증상
- 프론트엔드 코드: 검증 완료 (GitHub Actions E2E 통과)

**재현 단계**:
1. https://be-more-frontend.vercel.app/auth/login 접속
2. `final2025@test.com` 로그인 시도 → ✅ 성공
3. 다른 계정으로 로그인 시도 → ❌ 500 에러

---

## 🔍 Frontend 팀 검증 완료 사항

### ✅ 프론트엔드 정상 동작 확인

1. **GitHub Actions E2E 테스트 통과**
   - 회원가입 플로우 정상
   - 로그인 플로우 정상
   - 모든 E2E 테스트 통과

2. **코드 검증 완료**
   - 동일한 코드로 모든 계정 처리
   - 특정 계정에 대한 특별 처리 없음
   - API 호출 로직 동일

3. **수동 테스트 완료**
   - `final2025@test.com`: 로그인 성공 확인
   - 다른 테스트 계정: 500 에러 확인
   - 네트워크 요청/응답 정상

**결론**: 프론트엔드는 정상 작동, Backend 측 문제로 판단

---

## 🎯 Backend 확인 요청 사항

### 1️⃣ Render 로그 확인 (최우선)

**확인 항목**:
- 500 에러 발생 시 스택 트레이스
- 에러 메시지 전문
- Request ID 및 timestamp

**예상 에러 패턴**:
```javascript
// 가능한 에러 시나리오
❌ TypeError: Cannot read property 'xxx' of null
❌ ReferenceError: xxx is not defined
❌ SequelizeValidationError: ...
❌ Column 'xxx' not found
```

**로그 확인 방법**:
```bash
# Render Dashboard → Logs
# 검색 키워드: "POST /api/auth/login" AND "500"
# 시간대: 2025-01-12 이후
```

---

### 2️⃣ 데이터베이스 계정 상태 비교

**Supabase SQL Editor**에서 실행:

#### A. 테스트 계정 상태 확인
```sql
-- final2025@test.com 계정 전체 정보
SELECT
  id,
  username,
  email,
  "isActive",
  "emailVerified",
  "createdAt",
  "updatedAt",
  "refreshToken" IS NOT NULL AS "hasRefreshToken"
FROM users
WHERE email = 'final2025@test.com';
```

**예상 결과**:
```
id | username | email                  | isActive | emailVerified | hasRefreshToken
---+----------+------------------------+----------+---------------+-----------------
XX | final2025| final2025@test.com     | true     | true/NULL     | true
```

#### B. 다른 계정들과 비교
```sql
-- 다른 계정들 상태 확인
SELECT
  id,
  username,
  email,
  "isActive",
  "emailVerified",
  "createdAt",
  "refreshToken" IS NOT NULL AS "hasRefreshToken"
FROM users
WHERE email != 'final2025@test.com'
ORDER BY "createdAt" DESC
LIMIT 10;
```

#### C. 문제 계정 찾기
```sql
-- isActive = false 또는 emailVerified = false인 계정
SELECT
  email,
  "isActive",
  "emailVerified",
  "createdAt"
FROM users
WHERE (
  "isActive" = false
  OR "emailVerified" = false
)
AND email != 'final2025@test.com';
```

#### D. 스키마 확인
```sql
-- users 테이블 컬럼 확인
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**주요 확인 사항**:
- ✅ `isActive` 컬럼 존재 여부 (camelCase)
- ✅ `emailVerified` 컬럼 존재 여부 (camelCase)
- ✅ 모든 계정의 `isActive` 상태
- ✅ `refreshToken` 컬럼 존재 및 데이터 여부

---

### 3️⃣ authController.js 로그인 로직 확인

**확인 위치**: `controllers/authController.js` - `login` 함수

**확인 항목**:

#### A. 계정 조회 로직
```javascript
// 1. 사용자 조회
const user = await User.findOne({ where: { email } });

// 확인: User 모델에 isActive, emailVerified 필드가 정의되어 있는지?
// 확인: 특정 계정만 조회되는 조건이 있는지?
```

#### B. 계정 상태 검증
```javascript
// 2. 계정 활성화 체크
if (!user.isActive) {
  // 에러 처리
}

// 확인: isActive가 undefined인 경우 처리되는지?
// 확인: emailVerified 체크 로직이 있는지?
```

#### C. refreshToken 저장
```javascript
// 3. refreshToken 저장
user.refreshToken = refreshToken;
await user.save();

// 확인: refreshToken 컬럼이 모든 계정에 존재하는지?
// 확인: save() 실패 시 에러 처리되는지?
```

#### D. 특별 처리 로직
```javascript
// 확인: final2025@test.com에 대한 특별 처리가 있는지?
if (email === 'final2025@test.com') {
  // 특별 처리?
}
```

---

### 4️⃣ User 모델 스키마 확인

**확인 위치**: `models/User.js`

**확인 항목**:
```javascript
// User.init({ ... }) 내부

// 1. isActive 필드 정의 확인
isActive: {
  type: Sequelize.BOOLEAN,
  allowNull: true,  // ← NULL 허용 여부
  defaultValue: true  // ← 기본값 확인
},

// 2. emailVerified 필드 정의 확인
emailVerified: {
  type: Sequelize.BOOLEAN,
  allowNull: true,
  defaultValue: false  // ← 기본값 확인
},
```

**스키마 불일치 가능성**:
- ❌ 모델에 `isActive` 필드 정의 안됨
- ❌ 모델에 `emailVerified` 필드 정의 안됨
- ❌ DB에는 컬럼 존재하지만 모델 정의 누락
- ❌ snake_case vs camelCase 불일치 (`is_active` vs `isActive`)

---

## 🔬 예상 근본 원인

### 가설 1: 스키마-모델 불일치 (refreshToken과 유사)
```
- 2025-01-12: refreshToken 컬럼 누락으로 인한 500 에러 해결
- 유사한 문제: isActive 또는 emailVerified 컬럼 처리 문제
```

**확인 방법**:
1. `models/User.js`에 `isActive`, `emailVerified` 필드 정의 확인
2. `schema/init.sql`에 해당 컬럼 존재 확인
3. Supabase에서 실제 테이블 컬럼 확인

### 가설 2: 계정 상태 검증 로직 문제
```javascript
// authController.js에서
if (!user.isActive) {
  throw new Error('Account is not active');
}

// 문제: isActive가 undefined인 경우
// !undefined = true → 에러 발생
```

**확인 방법**:
1. 로그인 로직에서 `isActive` 체크 여부 확인
2. `undefined` 처리 로직 확인
3. `final2025@test.com`의 `isActive` 값 확인

### 가설 3: 데이터 마이그레이션 문제
```
- final2025@test.com: 최근 생성된 계정 (모든 필드 정상)
- 다른 계정들: 이전에 생성된 계정 (일부 필드 누락)
```

**확인 방법**:
1. 계정 생성 시간 비교 (`createdAt`)
2. `isActive`, `emailVerified` NULL 여부 확인
3. 컬럼 추가 시점과 계정 생성 시점 비교

---

## 🛠️ 임시 해결 방법 (선택 사항)

### 옵션 1: 모든 계정 활성화 (긴급 대응)
```sql
-- 주의: 프로덕션 실행 전 백업 권장
UPDATE users
SET
  "isActive" = true,
  "emailVerified" = true
WHERE "isActive" IS NULL
   OR "emailVerified" IS NULL
   OR "isActive" = false;
```

### 옵션 2: 로그인 로직 수정 (안전한 대응)
```javascript
// controllers/authController.js

// Before
if (!user.isActive) {
  throw new Error('Account is not active');
}

// After
if (user.isActive === false) {  // ← 명시적 false 체크
  throw new Error('Account is not active');
}
```

---

## 📊 디버깅 체크리스트

### Backend 팀 확인 사항

- [ ] **Render 로그 확인**
  - [ ] 500 에러 스택 트레이스 확인
  - [ ] 에러 메시지 전문 확인
  - [ ] Request ID 및 timestamp 기록

- [ ] **데이터베이스 확인**
  - [ ] `final2025@test.com` 계정 상태 조회
  - [ ] 다른 계정들 상태 비교
  - [ ] `isActive`, `emailVerified` 컬럼 존재 확인
  - [ ] NULL 또는 false 값 가진 계정 확인

- [ ] **코드 확인**
  - [ ] `models/User.js` - `isActive`, `emailVerified` 필드 정의
  - [ ] `controllers/authController.js` - 로그인 로직
  - [ ] 계정 상태 검증 로직 확인
  - [ ] 특정 계정 특별 처리 여부 확인

- [ ] **스키마 확인**
  - [ ] `schema/init.sql` - `isActive`, `emailVerified` 컬럼
  - [ ] Supabase 실제 테이블 스키마 확인
  - [ ] camelCase vs snake_case 일치 여부

---

## 📚 관련 문서

### 유사 문제 해결 사례
- [refreshToken Schema 수정 Post-mortem](./REFRESH_TOKEN_SCHEMA_FIX.md) - 스키마-모델 불일치 사례
- [로그인 500 에러 진단 가이드](./LOGIN_500_DIAGNOSTIC_GUIDE.md) - 일반적인 로그인 문제

### 스키마 관리
- [P0: Supabase 테이블 설정](./P0_SUPABASE_TABLE_SETUP.md) - 테이블 생성 가이드
- [Schema 검증 스크립트](../../scripts/validate-schema.js) - 자동 검증 도구

---

## 💬 Frontend 팀 연락처

**보고자**: Frontend 개발팀
**보고일**: 2025-01-12
**테스트 환경**: https://be-more-frontend.vercel.app
**검증 완료**: GitHub Actions E2E 테스트 통과

### 추가 정보 제공 가능 항목
1. Network 탭 Request/Response 상세 내용
2. 특정 계정 테스트 ID/PW (필요 시)
3. 브라우저 콘솔 로그
4. 재현 영상 또는 스크린샷

---

## 🎯 다음 단계

### Backend 팀 액션 아이템
1. **즉시**: Render 로그 확인 및 에러 메시지 공유
2. **30분 이내**: 데이터베이스 쿼리 실행 및 결과 공유
3. **1시간 이내**: 코드 확인 및 근본 원인 파악
4. **2시간 이내**: 수정 방안 제시 및 배포

### Frontend 팀 대기 사항
- Backend 팀 분석 결과 대기
- 추가 정보 요청 시 즉시 제공
- 수정 후 재테스트 준비

---

**작성**: Frontend → Backend 협업 리포트
**우선순위**: 🔴 HIGH
**상태**: 🔍 INVESTIGATING
**예상 해결 시간**: 2-4시간

---

## 📝 업데이트 로그

| 시간 | 내용 | 담당 |
|------|------|------|
| 2025-01-12 00:45 | 문제 보고 및 리포트 작성 | Frontend |
| 2025-01-12 XX:XX | Render 로그 확인 결과 | Backend |
| 2025-01-12 XX:XX | DB 쿼리 실행 결과 | Backend |
| 2025-01-12 XX:XX | 근본 원인 파악 | Backend |
| 2025-01-12 XX:XX | 수정 완료 및 배포 | Backend |
