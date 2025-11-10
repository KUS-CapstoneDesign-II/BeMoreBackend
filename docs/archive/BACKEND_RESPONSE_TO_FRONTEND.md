# 백엔드 팀 → 프론트엔드 팀 응답

**작성일**: 2025-01-10
**응답자**: Backend Team
**관련 커밋**: `97767a0` (프론트엔드)

---

## 📋 통합 작업 확인 완료

프론트엔드 팀의 인증 API 통합 작업을 확인했습니다. 대부분 백엔드 명세와 일치하게 구현되었으나, 몇 가지 차이점과 추가 구현이 필요한 사항을 발견했습니다.

---

## ✅ 확인 완료 사항

### 1. User 데이터 구조
```typescript
interface User {
  id: number;        // ✅ Sequelize AUTO_INCREMENT → number 타입 맞음
  username: string;  // ✅ 백엔드에서 username 필드 사용 중
  email: string;     // ✅ 일치
}
```
**백엔드 확인**: User 모델의 `id`는 Sequelize가 자동 생성하는 INTEGER AUTO_INCREMENT이므로 `number` 타입이 정확합니다.

### 2. 구현 완료된 API 엔드포인트

#### ✅ POST /api/auth/signup
```json
// 현재 백엔드 응답
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### ✅ POST /api/auth/login
```json
// 현재 백엔드 응답
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### ✅ POST /api/auth/refresh
```json
// 현재 백엔드 응답
{
  "success": true,
  "data": {
    "accessToken": "..."
  }
}
```

#### ✅ POST /api/auth/logout
```json
// 현재 백엔드 응답
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 3. CORS 설정 확인
현재 백엔드 CORS 허용 도메인 ([app.js:78-95](app.js#L78-L95)):
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://bemore-app.vercel.app',
  'https://be-more-frontend.vercel.app'
];
```
✅ 프론트엔드 개발 서버(`localhost:5173`) 이미 허용됨

### 4. 에러 응답 형식
✅ 백엔드는 이미 프론트엔드 기대 형식과 일치:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

---

## ⚠️ 차이점 및 조정 필요 사항

### 1. 응답 형식 차이

**현재 백엔드** (data 객체로 감싸짐):
```json
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**프론트엔드 기대** (평탄화된 구조 + message 필드):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {...},
  "accessToken": "...",
  "refreshToken": "..."
}
```

**📌 제안**:
- **Option A (권장)**: 프론트엔드에서 `response.data.data`로 접근하도록 수정 (백엔드 변경 없음)
- **Option B**: 백엔드 응답 형식 변경 (모든 API 일관성 검토 필요)

**백엔드 입장**: REST API 표준에서는 `data` 객체로 감싸는 것이 일반적이므로 **Option A 권장**

---

## 🚧 미구현 엔드포인트

프론트엔드가 사용하는 다음 2개 엔드포인트가 현재 백엔드에 구현되지 않았습니다:

### 1. ❌ GET /api/auth/me
**용도**: 현재 로그인된 사용자 정보 조회
**상태**: 미구현

### 2. ❌ PUT /api/auth/profile
**용도**: 사용자 프로필 업데이트 (username, profileImage)
**상태**: 미구현

**📌 백엔드 팀 조치 필요**:
이 두 엔드포인트를 Phase 0-1.5로 추가 구현하겠습니다.

---

## 📝 백엔드 팀 답변

### Q1: username 필드 정상 처리 확인
**✅ 확인 완료**: 백엔드는 `username` 필드를 사용합니다.
- 모델: [models/User.js:6-10](models/User.js#L6-L10)
- 컨트롤러: [controllers/authController.js:12](controllers/authController.js#L12)

### Q2: 사용자 ID가 number 타입인지 확인
**✅ 확인 완료**: Sequelize AUTO_INCREMENT로 생성되므로 `number` 타입입니다.
- 응답 예시: `"id": 1` (JSON number)

### Q3: 응답에 createdAt 필드가 포함되지 않는지 확인
**✅ 확인 완료**: 응답에서 명시적으로 제외합니다.
```javascript
// controllers/authController.js:51-55
user: {
  id: user.id,
  username: user.username,
  email: user.email,
  // createdAt 제외됨
}
```

### Q4: CORS 설정 확인
**✅ 설정 완료**: `http://localhost:5173` 이미 허용됨
- 추가 도메인 필요 시 백엔드 팀에 요청

### Q5: 사용자명(username) 규칙
**백엔드 검증 규칙**:
- 최소 3자 (Zod: `z.string().min(3)`)
- 최대 50자 (Zod: `z.string().max(50)`)
- DB 제약: VARCHAR(50), UNIQUE
- 특수문자/공백: 현재 제한 없음 (추가 검증 필요 시 논의)

**프론트엔드 규칙(2-50자)과 차이**:
- 백엔드: 최소 3자
- 프론트엔드: 최소 2자

**📌 조정 필요**: 프론트엔드를 3자로 맞추거나 백엔드를 2자로 변경 (권장: **3자 통일**)

### Q6: 프로필 이미지 업로드 방식
**현재 상태**: `profileImage` 필드가 User 모델에 없음

**📌 구현 계획**:
- User 모델에 `profileImage` 필드 추가 (TEXT 또는 VARCHAR(500))
- URL 문자열로 저장 (이미지는 별도 스토리지에 업로드 후 URL 반환)
- 파일 업로드는 별도 엔드포인트 필요 (예: POST /api/upload/image)

### Q7: 토큰 만료 시간
**✅ 확인 완료** ([services/auth/authService.js:5-6](services/auth/authService.js#L5-L6)):
```javascript
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
```
- Access Token: **15분** (프로덕션: .env 설정 필요)
- Refresh Token: **7일** (프로덕션: .env 설정 필요)

---

## 🛠️ 백엔드 팀 조치 계획

### Phase 0-1.5: 추가 엔드포인트 구현

#### 1. GET /api/auth/me (우선순위: 높음)
```javascript
// Request
GET /api/auth/me
Authorization: Bearer {accessToken}

// Response (200)
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "profileImage": null
    }
  }
}
```

**구현 예정일**: 2025-01-11

#### 2. PUT /api/auth/profile (우선순위: 중간)
```javascript
// Request
PUT /api/auth/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "username": "newusername",
  "profileImage": "https://example.com/image.jpg"
}

// Response (200)
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newusername",
      "email": "test@example.com",
      "profileImage": "https://example.com/image.jpg"
    }
  }
}
```

**구현 예정일**: 2025-01-11

#### 3. User 모델 업데이트
```sql
-- Migration 필요
ALTER TABLE users ADD COLUMN profileImage TEXT;
```

---

## 📊 통합 테스트 로드맵

### 1단계: 기존 API 통합 테스트 (즉시 가능)
- ✅ POST /api/auth/signup
- ✅ POST /api/auth/login
- ✅ POST /api/auth/refresh
- ✅ POST /api/auth/logout

**프론트엔드 조치 필요**:
```typescript
// 응답 접근 방식 수정
// 변경 전
const user = response.data.user;

// 변경 후
const user = response.data.data.user;
const accessToken = response.data.data.accessToken;
```

### 2단계: 신규 API 통합 테스트 (2025-01-11 이후)
- 🚧 GET /api/auth/me
- 🚧 PUT /api/auth/profile

---

## 🔄 응답 형식 통일 방안

### 백엔드 관점

**현재 백엔드 응답 패턴**:
```json
// 성공
{
  "success": true,
  "data": { ... }
}

// 에러
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

**장점**:
- RESTful API 표준에 부합
- 데이터와 메타데이터 구분 명확
- 확장성 좋음 (pagination, metadata 추가 용이)

**제안**:
1. **백엔드 유지** + 프론트엔드 어댑터 패턴 사용 (권장)
2. 백엔드 평탄화 (모든 API 영향 → 리스크 높음)

---

## 🐛 알려진 이슈

### 1. 응답 형식 불일치
**영향**: 프론트엔드에서 `response.data.data` 접근 필요
**우선순위**: 중간
**해결 방안**: 프론트엔드 API 클라이언트 어댑터 추가

### 2. username 최소 길이 불일치
**영향**: 프론트엔드 2자, 백엔드 3자
**우선순위**: 낮음
**해결 방안**: 프론트엔드를 3자로 통일 권장

### 3. profileImage 필드 없음
**영향**: User 모델에 필드 없음
**우선순위**: 중간
**해결 방안**: Migration 추가 예정 (2025-01-11)

---

## 📞 커뮤니케이션

### 백엔드 팀 요청 사항

1. **즉시 테스트 가능**: 기존 4개 엔드포인트는 바로 통합 테스트 가능합니다.
   - 단, 프론트엔드에서 `response.data.data`로 접근하도록 수정 필요

2. **응답 형식 논의**: Slack/Discord에서 응답 형식 통일 방안 논의 요청
   - Option A: 프론트엔드 어댑터 (권장)
   - Option B: 백엔드 평탄화 (리스크 검토 필요)

3. **신규 API 대기**: `/me`, `/profile` 엔드포인트는 2025-01-11 구현 완료 예정

### 다음 미팅 아젠다

- [ ] 응답 형식 통일 방안 결정
- [ ] username 최소 길이 정책 통일 (2자 vs 3자)
- [ ] profileImage 업로드 방식 결정 (URL vs File Upload)
- [ ] 통합 테스트 일정 조율

---

## 📅 타임라인

| 날짜 | 작업 | 담당 | 상태 |
|------|------|------|------|
| 2025-01-10 | 프론트엔드 통합 완료 | Frontend | ✅ 완료 |
| 2025-01-10 | 백엔드 검토 및 응답 | Backend | ✅ 완료 |
| 2025-01-11 | GET /me 구현 | Backend | 🚧 예정 |
| 2025-01-11 | PUT /profile 구현 | Backend | 🚧 예정 |
| 2025-01-11 | User 모델 Migration | Backend | 🚧 예정 |
| 2025-01-12 | 통합 테스트 | Both | 📋 계획 |
| 2025-01-13 | QA 및 버그 수정 | Both | 📋 계획 |

---

## ✅ 체크리스트 (백엔드)

### 즉시 조치 가능
- [x] 현재 API 응답 형식 확인
- [x] CORS 설정 확인
- [x] User 모델 구조 확인
- [x] 토큰 만료 시간 확인

### 추가 구현 필요
- [ ] GET /api/auth/me 구현
- [ ] PUT /api/auth/profile 구현
- [ ] User 모델에 profileImage 필드 추가
- [ ] Migration 생성 및 실행
- [ ] 새 엔드포인트 테스트 작성
- [ ] FRONTEND_AUTH_INTEGRATION.md 업데이트

### 논의 필요
- [ ] 응답 형식 통일 방안 결정
- [ ] username 최소 길이 정책
- [ ] profileImage 업로드 방식

---

**백엔드 팀**
작성일: 2025-01-10
다음 업데이트: 2025-01-11 (신규 엔드포인트 구현 완료 후)
