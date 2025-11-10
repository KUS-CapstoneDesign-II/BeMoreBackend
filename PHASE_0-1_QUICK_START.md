# Phase 0-1 빠른 시작 가이드

**목표**: 3-4시간 내에 인증 시스템 완성
**난이도**: 중급 (Sequelize, JWT, bcrypt 지식 필요)

---

## 🎯 한 눈에 보는 작업 목록

```bash
✅ 이미 완료된 것
- JWT 미들웨어 (optionalJwtAuth)
- Session.userId 필드
- jsonwebtoken 패키지

❌ 해야 할 것 (10 steps)
1. npm install bcrypt                    # 2분
2. User 모델 필드 추가                     # 10분
3. Migration 생성 및 실행                  # 15분
4. authService 구현                       # 30분
5. authController 구현                    # 45분
6. routes/auth 구현                       # 15분
7. app.js 라우터 등록                      # 5분
8. 환경 변수 설정                          # 5분
9. requireAuth 미들웨어 추가               # 10분
10. Jest 테스트 작성                      # 60분
```

---

## ⚡ 빠른 실행 (Copy & Paste)

### Step 1: 패키지 설치
```bash
npm install bcrypt
```

### Step 2: 파일 생성
```bash
mkdir -p services/auth
touch services/auth/authService.js
touch controllers/authController.js
touch routes/auth.js
touch tests/auth.test.js
```

### Step 3: Migration 생성
```bash
npx sequelize-cli migration:generate --name add-auth-fields-to-users
```

### Step 4: 환경 변수 추가 (.env)
```bash
cat >> .env << 'EOF'

# Authentication
AUTH_ENABLED=true
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
EOF
```

### Step 5: Migration 실행
```bash
npx sequelize-cli db:migrate
```

### Step 6: 테스트 실행
```bash
npm test -- tests/auth.test.js
```

---

## 📁 생성할 파일 목록

| 파일 | 용도 | 크기 | 시간 |
|------|------|------|------|
| services/auth/authService.js | 해싱, 토큰 생성 | ~150 lines | 30분 |
| controllers/authController.js | signup/login/refresh/logout | ~250 lines | 45분 |
| routes/auth.js | API 라우팅 | ~40 lines | 15분 |
| migrations/XXX-add-auth-fields.js | DB 스키마 변경 | ~50 lines | 15분 |
| tests/auth.test.js | 테스트 케이스 | ~150 lines | 60분 |

**수정할 파일**:
- models/User.js (필드 추가)
- middlewares/auth.js (requireAuth 추가)
- app.js (라우터 등록)
- .env.example (환경 변수 문서화)

---

## 🔍 핵심 코드 스니펫

### User 모델 필드 추가 (models/User.js)
```javascript
User.init({
  username: { type: Sequelize.STRING(50), allowNull: false, unique: true },
  email: { type: Sequelize.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: Sequelize.STRING(255), allowNull: false },
  refreshToken: { type: Sequelize.TEXT, allowNull: true },
}, { /* ... */ });
```

### authService 핵심 함수
```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}
```

### signup 컨트롤러 핵심
```javascript
const hashedPassword = await authService.hashPassword(password);
const user = await User.create({ username, email, password: hashedPassword });
const { accessToken, refreshToken } = authService.createTokens(user);
user.refreshToken = refreshToken;
await user.save();
return res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
```

### app.js 라우터 등록
```javascript
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);
```

---

## ✅ 검증 명령어

### 1. bcrypt 설치 확인
```bash
grep "bcrypt" package.json
# 출력: "bcrypt": "^5.1.1"
```

### 2. Migration 상태 확인
```bash
npx sequelize-cli db:migrate:status
# 출력: up YYYYMMDDHHMMSS-add-auth-fields-to-users.js
```

### 3. 환경 변수 확인
```bash
grep "JWT_SECRET" .env
# 출력: JWT_SECRET=dev-secret-key-change-in-production
```

### 4. API 테스트 (서버 실행 후)
```bash
# 회원가입
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password123"}'

# 로그인
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

### 5. Jest 테스트
```bash
npm test -- tests/auth.test.js
# 모든 테스트 PASS 확인
```

---

## 🚨 자주 발생하는 문제

### 1. Migration 실패
**증상**: `ERROR: column "email" already exists`
**원인**: Migration 중복 실행
**해결**:
```bash
npx sequelize-cli db:migrate:undo
npx sequelize-cli db:migrate
```

### 2. JWT_SECRET 미설정
**증상**: `JWT_SECRET not configured`
**원인**: .env 파일 미설정 또는 서버 재시작 안 함
**해결**:
```bash
# .env 파일 확인
cat .env | grep JWT_SECRET

# 서버 재시작
npm start
```

### 3. bcrypt 설치 실패 (M1 Mac)
**증상**: `node-gyp rebuild failed`
**원인**: ARM64 아키텍처 호환성
**해결**:
```bash
npm install bcrypt --build-from-source
# 또는
npm install bcryptjs  # Pure JavaScript 버전
```

### 4. 테스트 DB 동기화 실패
**증상**: Jest 테스트에서 `Table doesn't exist`
**원인**: 테스트 환경 DB 미동기화
**해결**: tests/auth.test.js에서 `beforeAll` 확인
```javascript
beforeAll(async () => {
  await sequelize.sync({ force: true });
});
```

---

## 📊 완료 기준 (DoD)

### Phase 0-1 완료 체크리스트

- [ ] **bcrypt 설치**: package.json에 bcrypt 있음
- [ ] **User 모델**: email, password, refreshToken 필드 추가
- [ ] **Migration**: DB에 컬럼 추가 완료
- [ ] **authService**: 6개 함수 구현 (hash, compare, generate tokens, verify)
- [ ] **authController**: 4개 함수 구현 (signup, login, refresh, logout)
- [ ] **routes/auth**: 4개 엔드포인트 등록
- [ ] **app.js**: /api/auth 라우터 등록
- [ ] **환경 변수**: JWT_SECRET 등 4개 추가
- [ ] **requireAuth**: 미들웨어 구현
- [ ] **테스트**: 모든 Jest 테스트 PASS

### API 동작 확인

- [ ] POST /api/auth/signup → 201 응답, 토큰 발급
- [ ] POST /api/auth/login → 200 응답, 토큰 발급
- [ ] POST /api/auth/refresh → 200 응답, 새 accessToken
- [ ] POST /api/auth/logout → 200 응답, refreshToken 무효화

### 보안 확인

- [ ] 비밀번호 평문 저장 안 됨 (bcrypt 해싱)
- [ ] Refresh token DB 저장됨
- [ ] Access token 15분 만료
- [ ] Refresh token 7일 만료
- [ ] 중복 이메일/유저명 방지

---

## 🎓 학습 리소스

### 필수 개념

1. **bcrypt**: 비밀번호 해싱 알고리즘 ([npm](https://www.npmjs.com/package/bcrypt))
2. **JWT**: JSON Web Token ([jwt.io](https://jwt.io))
3. **Sequelize Migrations**: DB 스키마 버전 관리 ([docs](https://sequelize.org/docs/v6/other-topics/migrations/))
4. **Jest**: JavaScript 테스팅 프레임워크 ([docs](https://jestjs.io/))

### 참고 문서

- [PHASE_0-1_STATUS.md](PHASE_0-1_STATUS.md) - 현황 분석
- [PHASE_0-1_IMPLEMENTATION.md](PHASE_0-1_IMPLEMENTATION.md) - 상세 구현 가이드
- [README.md](README.md) - 프로젝트 전체 문서

---

## 📞 다음 단계

Phase 0-1 완료 후:

1. **Phase 1**: 프론트엔드 연동 (CORS, 토큰 저장)
2. **Phase 2**: 고급 기능 (2FA, OAuth, Refresh token rotation)
3. **Phase 3**: 프로덕션 배포 (HTTPS, Rate limiting 강화)

---

**작성자**: Claude Code
**버전**: 1.0.0
**최종 업데이트**: 2025-11-10
