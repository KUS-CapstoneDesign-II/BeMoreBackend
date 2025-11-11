# Backend 업데이트 공지 - 2025.01.11

**배포 시간**: 2025-01-11 (약 3분 소요)
**영향**: CORS 정책, Analytics 엔드포인트, 에러 메시지
**프로덕션 URL**: `https://bemorebackend.onrender.com`

---

## 📦 주요 변경사항

### 1. ✅ CORS 설정 개선 (Commit: dcec327)

**변경 내용**:
- `localhost:3000` 추가 (로컬 개발 지원)
- Vercel Preview Deployments 와일드카드 지원 추가
- CORS 허용/차단 상세 로깅 추가

**지원되는 Origin**:
```javascript
✅ http://localhost:5173
✅ http://localhost:3000
✅ https://be-more-frontend.vercel.app
✅ https://be-more-frontend-*.vercel.app  // Preview deployments
```

**영향**:
- 기존 CORS 에러 해결
- Preview 브랜치 배포 시 자동으로 CORS 허용
- 서버 로그에서 CORS 허용/차단 추적 가능

---

### 2. ✅ Analytics Vitals 엔드포인트 추가 (Commit: dcec327)

**새 엔드포인트**: `POST /api/analytics/vitals`

**Request Body**:
```typescript
{
  metric: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB' | 'INP',
  value: number,                    // 0 이상의 숫자
  pathname: string,                 // 예: "/app/session"
  id?: string,                      // 메트릭 고유 ID (optional)
  navigationType?: string           // 네비게이션 타입 (optional)
}
```

**Response**:
```typescript
// Success (200)
{
  success: true
}

// Error (500)
{
  success: false,
  error: {
    code: 'VITALS_STORAGE_ERROR',
    message: 'Failed to store vitals metric'
  }
}
```

**사용 예시**:
```javascript
// Web Vitals 전송 예시
await fetch('https://bemorebackend.onrender.com/api/analytics/vitals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metric: 'LCP',
    value: 2450.5,
    pathname: '/app/session',
    id: 'v3-1704960000000-123',
    navigationType: 'navigate'
  })
});
```

**검증 규칙** (Zod):
- `metric`: 정확히 6개 메트릭만 허용
- `value`: 음수 불가
- `pathname`: 빈 문자열 불가

---

### 3. ✅ 에러 메시지 한국어 변환 (Commit: 7e8c91e)

**변경 내용**:
- `authController.js`의 모든 에러 메시지를 한국어로 변환
- 모든 에러 응답에 `requestId` 필드 추가

**변경된 엔드포인트**:
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 사용자 정보 조회
- `PUT /api/auth/profile` - 프로필 업데이트

**에러 메시지 변경 예시**:

| 상황 | Before | After |
|------|--------|-------|
| 회원가입 중복 | `Username or email already exists` | `이미 사용 중인 이메일입니다.` |
| 로그인 실패 | `Invalid email or password` | `이메일 또는 비밀번호가 올바르지 않습니다.` |
| 토큰 누락 | `Refresh token is required` | `리프레시 토큰이 필요합니다.` |
| 토큰 만료 | `Invalid or expired refresh token` | `유효하지 않거나 만료된 리프레시 토큰입니다.` |
| 로그아웃 성공 | `Logged out successfully` | `로그아웃되었습니다.` |
| 사용자 없음 | `User not found` | `사용자를 찾을 수 없습니다.` |
| 사용자명 중복 | `Username already exists` | `이미 사용 중인 사용자 이름입니다.` |
| 서버 에러 | (영어 메시지) | `서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.` |

**Response 구조 (변경 없음)**:
```typescript
{
  success: false,
  error: {
    code: string,           // 에러 코드 (영어, 로그용)
    message: string,        // 에러 메시지 (한국어, 사용자 표시용)
    requestId: string       // 요청 추적 ID (새로 추가)
  }
}
```

**Frontend 대응 불필요**:
- 기존 `error.message` 표시 로직 그대로 사용 가능
- 자동으로 한국어 메시지가 표시됨
- `requestId`는 선택적으로 로그에 기록 (디버깅용)

---

## 🧪 테스트 방법

### Test 1: CORS 동작 확인
```bash
# 로컬 개발 환경에서 API 호출
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"email":"test@example.com","password":"test123"}'

# 브라우저 콘솔에서 CORS 에러가 사라졌는지 확인
```

### Test 2: Analytics Vitals 전송
```javascript
// 브라우저 콘솔에서 실행
await fetch('https://bemorebackend.onrender.com/api/analytics/vitals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metric: 'LCP',
    value: 2500,
    pathname: window.location.pathname
  })
});
```

### Test 3: 한국어 에러 메시지 확인
```javascript
// 로그인 실패 시나리오
const response = await fetch('https://bemorebackend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'wrong@example.com',
    password: 'wrongpassword'
  })
});

const data = await response.json();
console.log(data.error.message);
// 출력: "이메일 또는 비밀번호가 올바르지 않습니다."
```

---

## 📊 배포 정보

**Git Commits**:
```
7e8c91e - fix(auth): convert all error messages to Korean for frontend display
dcec327 - fix(cors): enhance CORS config and add /vitals endpoint
```

**배포 상태**:
- ✅ Main Branch 푸시 완료
- 🔄 Render 자동 배포 진행 중 (약 3분 소요)
- 🚀 배포 완료 예상: 2025-01-11 12:00 (KST)

**배포 확인**:
```bash
# Health check
curl https://bemorebackend.onrender.com/health

# 예상 응답
{
  "status": "ok",
  "timestamp": "2025-01-11T03:00:00.000Z",
  "uptime": 123.45,
  "version": "1.2.1",
  "commit": "7e8c91e"
}
```

---

## 🔧 Frontend 액션 아이템

### 즉시 가능
1. **기존 코드 변경 불필요**: 에러 메시지가 자동으로 한국어로 표시됨
2. **CORS 에러 해결**: Preview deployments도 자동으로 허용됨

### 선택적 개선
1. **requestId 로깅 추가** (권장):
   ```javascript
   if (error.requestId) {
     console.error('[Error Tracking]', error.requestId, error.message);
   }
   ```

2. **Web Vitals 전송 활성화** (선택):
   - 기존 Web Vitals 측정 코드에서 Backend 전송 활성화
   - `/api/analytics/vitals` 엔드포인트 사용

### 주의사항
- 없음 (Breaking changes 없음)

---

## 📞 문의 및 이슈

**Backend 담당자**: Claude (AI Assistant)
**관련 문서**:
- [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)
- [P1 UX Backend Response](./FRONTEND_P1_UX_BACKEND_RESPONSE.md)

**이슈 리포팅**:
- Slack: #backend-support
- GitHub Issues: BeMoreBackend repository

---

## 🎯 요약

| 항목 | 상태 | Frontend 액션 |
|------|------|--------------|
| CORS 개선 | ✅ 완료 | 변경 불필요 |
| Analytics Vitals | ✅ 완료 | 선택적 활성화 |
| 한국어 에러 메시지 | ✅ 완료 | 변경 불필요 |
| requestId 추가 | ✅ 완료 | 선택적 로깅 |

**배포 완료 시**: 모든 기능이 자동으로 적용되며, Frontend 코드 변경 없이 사용 가능합니다.
