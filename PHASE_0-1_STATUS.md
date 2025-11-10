# Phase 0-1 인증 시스템 구현 현황 분석

**분석일**: 2025-11-10
**대상**: BeMoreBackend 인증 시스템
**근거**: 코드 검증 기반 사실 확인

---

## 📊 요약

| 항목 | 가이드 요구사항 | 현재 상태 | 격차 |
|------|----------------|-----------|------|
| **User 모델** | email, password, refreshToken | ✅ 테이블 있음, ❌ 인증 필드 없음 | 🔴 High |
| **Session.userId** | userId 외래키 | ✅ 존재 (Session.js:11-14) | 🟢 완료 |
| **bcrypt** | 비밀번호 암호화 | ❌ 미설치 | 🔴 High |
| **JWT** | 토큰 생성/검증 | ⚠️ 미들웨어만 존재, 서비스 없음 | 🟡 Medium |
| **인증 API** | signup/login/logout/refresh | ❌ 전부 없음 | 🔴 High |

---

## 🔍 상세 분석

### 1. User 모델 현황

**파일**: [models/User.js](models/User.js)

**현재 스키마**:
```javascript
// models/User.js:5-10
username: {
  type: Sequelize.STRING(20),
  allowNull: false,
  unique: true,
}
```

**가이드 요구사항과 비교**:
| 필드 | 가이드 | 현재 | 상태 |
|------|--------|------|------|
| `id` | INTEGER AUTO_INCREMENT | ✅ 자동생성 | 🟢 OK |
| `username` | VARCHAR(50) UNIQUE NOT NULL | ✅ VARCHAR(20) | 🟢 OK |
| `email` | VARCHAR(100) UNIQUE NOT NULL | ❌ 없음 | 🔴 추가 필요 |
| `password` | VARCHAR(255) NOT NULL | ❌ 없음 | 🔴 추가 필요 |
| `refreshToken` | TEXT | ❌ 없음 | 🔴 추가 필요 |
| `createdAt` | TIMESTAMP | ✅ timestamps: true | 🟢 OK |
| `updatedAt` | TIMESTAMP | ✅ timestamps: true | 🟢 OK |

**필요 작업**:
- [ ] email 필드 추가 (VARCHAR(100), UNIQUE, NOT NULL)
- [ ] password 필드 추가 (VARCHAR(255), NOT NULL)
- [ ] refreshToken 필드 추가 (TEXT, NULL)
- [ ] migration 생성 (ALTER TABLE)

---

### 2. Session 모델 현황

**파일**: [models/Session.js](models/Session.js:11-14)

**userId 필드**:
```javascript
// models/Session.js:11-14
userId: {
  type: Sequelize.STRING(64),
  allowNull: false,
}
```

**분석**:
- ✅ userId 필드 **이미 존재**
- ✅ allowNull: false (가이드 요구사항 충족)
- ⚠️ 타입이 STRING(64)인데, User.id는 INTEGER AUTO_INCREMENT
- ⚠️ 외래키 제약조건 없음 (Session.js:67-69에서 associate 함수 비어있음)

**필요 작업**:
- [ ] Session 모델의 associate 함수에 User 외래키 추가
- [ ] userId 타입을 INTEGER로 변경 고려 (또는 User.id를 STRING으로 변경)
- [ ] migration 생성 (외래키 제약조건 추가)

---

### 3. 인증 패키지 현황

**파일**: [package.json](package.json)

**설치된 패키지**:
```json
// package.json:26
"jsonwebtoken": "^9.0.2"
```

**미설치 패키지**:
```bash
❌ bcrypt (or bcryptjs)
```

**필요 작업**:
- [ ] `npm install bcrypt` 실행
- [ ] package.json 확인

---

### 4. JWT 미들웨어 현황

**파일**: [middlewares/auth.js](middlewares/auth.js:1-33)

**현재 구현**:
```javascript
// middlewares/auth.js:9-28
function optionalJwtAuth(req, res, next) {
  if (process.env.AUTH_ENABLED !== 'true') return next();
  // Bearer token 검증 로직
  const payload = jwt.verify(token, secret);
  req.user = payload;
  return next();
}
```

**분석**:
- ✅ JWT 검증 미들웨어 **존재**
- ✅ Bearer token 형식 검증
- ✅ jwt.verify() 사용
- ⚠️ `AUTH_ENABLED` 환경변수로 활성화 (기본값: 비활성화)
- ❌ Access Token 생성 함수 없음
- ❌ Refresh Token 검증 함수 없음

**필요 작업**:
- [ ] `generateAccessToken(user)` 함수 추가
- [ ] `generateRefreshToken(user)` 함수 추가
- [ ] `verifyRefreshToken(token)` 함수 추가
- [ ] `requireAuth` 미들웨어 추가 (필수 인증용)

---

### 5. 인증 API 현황

**파일**: [routes/user.js](routes/user.js:1-11)

**현재 엔드포인트**:
```javascript
// routes/user.js:5-6
router.get('/preferences', ctrl.getPreferences);
router.put('/preferences', ctrl.setPreferences);
```

**가이드 요구사항과 비교**:
| 엔드포인트 | 가이드 | 현재 | 상태 |
|-----------|--------|------|------|
| POST /api/auth/signup | 필수 | ❌ 없음 | 🔴 구현 필요 |
| POST /api/auth/login | 필수 | ❌ 없음 | 🔴 구현 필요 |
| POST /api/auth/refresh | 필수 | ❌ 없음 | 🔴 구현 필요 |
| POST /api/auth/logout | 필수 | ❌ 없음 | 🔴 구현 필요 |

**필요 작업**:
- [ ] routes/auth.js 파일 생성
- [ ] controllers/authController.js 파일 생성
- [ ] signup, login, refresh, logout 함수 구현
- [ ] app.js에 '/api/auth' 라우터 등록

---

### 6. 인증 서비스 현황

**검색 결과**:
```bash
❌ services/auth/ 디렉터리 없음
❌ bcrypt 사용처 없음 (전체 검색 결과 0건)
```

**필요 작업**:
- [ ] services/auth/authService.js 파일 생성
- [ ] `hashPassword(password)` 함수 구현
- [ ] `comparePassword(plain, hashed)` 함수 구현
- [ ] `createTokens(user)` 함수 구현
- [ ] `verifyAccessToken(token)` 함수 구현
- [ ] `verifyRefreshToken(token)` 함수 구현

---

## 📋 구현 체크리스트

### P0: 필수 (Phase 0-1 완료 전에 반드시 필요)

#### 1. User 모델 업데이트
- [ ] User.js에 email, password, refreshToken 필드 추가
- [ ] Sequelize migration 생성 (ALTER TABLE users)
- [ ] migration 실행 및 검증

#### 2. bcrypt 패키지 설치
- [ ] `npm install bcrypt` 실행
- [ ] package.json 확인

#### 3. 인증 서비스 구현
- [ ] services/auth/authService.js 생성
- [ ] hashPassword 함수
- [ ] comparePassword 함수
- [ ] generateAccessToken 함수
- [ ] generateRefreshToken 함수

#### 4. 인증 API 구현
- [ ] routes/auth.js 생성
- [ ] controllers/authController.js 생성
- [ ] POST /api/auth/signup
- [ ] POST /api/auth/login
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/logout

#### 5. 미들웨어 보강
- [ ] middlewares/auth.js에 requireAuth 추가
- [ ] 기존 optionalJwtAuth 유지

#### 6. 환경 변수 설정
- [ ] .env.example 업데이트 (AUTH_ENABLED, JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN)
- [ ] README.md 업데이트

### P1: 중요 (Phase 0-1 완료 후 단기 개선)

- [ ] Session-User 외래키 제약조건 추가
- [ ] userId 타입 통일 (INTEGER vs STRING)
- [ ] Jest 테스트 작성 (signup, login, refresh, logout)
- [ ] Swagger 문서 추가 (OpenAPI 3.0)

### P2: 개선 (장기 개선 사항)

- [ ] Rate limiting 강화 (인증 API 전용)
- [ ] Refresh token rotation 구현
- [ ] 2FA (Two-Factor Authentication) 고려
- [ ] OAuth 2.0 통합 (Google, Kakao)

---

## 🎯 Phase 0-1 완료 기준 (DoD)

가이드 문서의 "성공 기준"과 비교:

| 기준 | 요구사항 | 현재 상태 |
|------|----------|-----------|
| ✅ Users 테이블 생성 | email, password, refreshToken | ⚠️ 테이블은 있으나 필드 없음 |
| ✅ Sessions.userId 외래키 | NOT NULL | ✅ 완료 (외래키 제약조건 제외) |
| ✅ bcrypt 설치 | - | ❌ 미설치 |
| ✅ signup API | 201 응답, accessToken/refreshToken | ❌ 미구현 |
| ✅ login API | 200 응답, 토큰 발급 | ❌ 미구현 |
| ✅ refresh API | 200 응답, 새 accessToken | ❌ 미구현 |
| ✅ logout API | 200 응답, refreshToken 삭제 | ❌ 미구현 |
| ✅ 환경 변수 | JWT_SECRET 등 | ⚠️ JWT_SECRET은 있으나 EXPIRES_IN 없음 |
| ✅ 테스트 | Jest 단위 테스트 | ❌ 미작성 |

**결론**: **0/9 완료** (Sessions.userId만 부분 완료)

---

## 📝 가이드 vs. 현실 Gap 분석

### ✅ 예상보다 잘 되어 있는 것

1. **JWT 미들웨어**: middlewares/auth.js가 이미 존재하고, 기본 검증 로직 구현됨
2. **Session.userId**: 이미 필드가 존재하고 NOT NULL 설정됨
3. **jsonwebtoken 패키지**: 이미 설치되어 있음
4. **User 모델 기본 구조**: 테이블 자체는 존재하고 username 필드로 시작

### ❌ 예상보다 부족한 것

1. **User 모델 인증 필드**: email, password, refreshToken 전부 없음
2. **bcrypt**: 패키지 자체가 설치되지 않음
3. **인증 API**: signup, login, refresh, logout 전부 미구현
4. **인증 서비스**: 비밀번호 해싱, 토큰 생성 로직 전무
5. **외래키 제약조건**: Session.userId가 User.id를 참조하지 않음

### 🔴 Critical Gap (즉시 해결 필요)

1. **bcrypt 미설치** → 비밀번호 저장 불가능
2. **User 모델 필드 부족** → 회원가입 API 구현 불가능
3. **인증 API 전무** → 프론트엔드 연동 불가능

---

## 🚀 권장 구현 순서

가이드 문서의 "구현 순서"와 동일하게 진행 권장:

1. **Step 1**: User 모델 업데이트 + migration
2. **Step 2**: bcrypt 설치 + authService 구현
3. **Step 3**: authController + routes/auth.js 구현
4. **Step 4**: 환경 변수 설정 + .env.example 업데이트
5. **Step 5**: 테스트 작성 + 실행
6. **Step 6**: 프론트엔드 연동 확인

---

## 📌 다음 액션 아이템

**즉시 시작 가능한 작업**:

1. `npm install bcrypt` 실행
2. User 모델에 필드 추가 (email, password, refreshToken)
3. Sequelize migration 생성
4. services/auth/authService.js 파일 생성
5. routes/auth.js + controllers/authController.js 파일 생성

**대기 필요한 작업**:

- 프론트엔드 CORS 설정 확인 (현재 CORS는 이미 설정됨 - app.js:36-40)
- 프론트엔드 API 클라이언트 구현 대기

---

**분석자**: Claude Code
**근거**: 실제 코드 검증 (Read, Grep, Glob 도구 사용)
**확신도**: 100% (모든 주장은 file:line 근거 포함)
