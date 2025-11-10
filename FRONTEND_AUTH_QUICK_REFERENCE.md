# 🚀 인증 시스템 빠른 참조 (프론트엔드)

**API 베이스**: `https://bemorebackend.onrender.com`

---

## 📌 API 엔드포인트 요약

| API | Method | URL | Request | Response |
|-----|--------|-----|---------|----------|
| **회원가입** | POST | `/api/auth/signup` | `{username, email, password}` | `{user, accessToken, refreshToken}` |
| **로그인** | POST | `/api/auth/login` | `{email, password}` | `{user, accessToken, refreshToken}` |
| **토큰 갱신** | POST | `/api/auth/refresh` | `{refreshToken}` | `{accessToken}` |
| **로그아웃** | POST | `/api/auth/logout` | `{refreshToken}` | `{success: true}` |

---

## ⚡ 빠른 시작

### 1. 로그인 구현

```javascript
// Login
const response = await fetch('https://bemorebackend.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();
// data.accessToken (메모리 저장)
// data.refreshToken (localStorage 저장)
// data.user
```

### 2. 인증 API 호출

```javascript
// API 호출 시 Authorization 헤더 추가
const response = await fetch('https://bemorebackend.onrender.com/api/session/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({ userId: 'user123' })
});
```

### 3. 토큰 갱신 (401 에러 시)

```javascript
// 401 에러 발생 → Refresh Token으로 갱신
const response = await fetch('https://bemorebackend.onrender.com/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { data } = await response.json();
// data.accessToken (새 토큰)
```

---

## 🔐 토큰 저장 규칙

| 토큰 | 저장 위치 | 만료 | 이유 |
|------|----------|------|------|
| **Access Token** | 메모리 (변수) | 15분 | XSS 방어 |
| **Refresh Token** | localStorage | 7일 | 세션 지속 |

```javascript
// ✅ 올바른 방법
let accessToken = null; // 메모리
localStorage.setItem('refreshToken', token); // localStorage

// ❌ 잘못된 방법
localStorage.setItem('accessToken', token); // XSS 취약
```

---

## 🔄 자동 토큰 갱신 (Axios)

```javascript
// Axios Response Interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post('/api/auth/refresh', { refreshToken });

      const newToken = data.data.accessToken;
      setAccessToken(newToken); // 메모리 저장

      error.config.headers['Authorization'] = `Bearer ${newToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## ❌ 에러 코드

| 코드 | HTTP | 의미 | 대응 |
|------|------|------|------|
| `INVALID_CREDENTIALS` | 401 | 이메일/비밀번호 틀림 | 재입력 요청 |
| `USER_EXISTS` | 409 | 중복 이메일/유저명 | 다른 값 입력 |
| `INVALID_TOKEN` | 401 | Access Token 만료 | Refresh 시도 |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh Token 만료 | 재로그인 |
| `VALIDATION_ERROR` | 400 | 입력 형식 오류 | 입력 검증 |

---

## 📝 유효성 검증 규칙

```javascript
// 회원가입
{
  username: "3-50자",
  email: "유효한 이메일 형식",
  password: "최소 8자"
}

// 로그인
{
  email: "유효한 이메일 형식",
  password: "최소 1자"
}
```

---

## 🧪 테스트 cURL

```bash
# 회원가입
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"password123"}'

# 로그인
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# API 호출 (인증 필요)
curl -X GET https://bemorebackend.onrender.com/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ⚠️ CORS 허용 도메인

```
http://localhost:5173
http://localhost:5174
https://bemore-app.vercel.app
https://be-more-frontend.vercel.app
```

새 도메인 추가 필요 시 백엔드 팀에 요청하세요.

---

## 📚 상세 문서

전체 구현 가이드: [FRONTEND_AUTH_INTEGRATION.md](FRONTEND_AUTH_INTEGRATION.md)

- API 엔드포인트 상세
- React + Axios 예제 코드
- AuthContext 구현
- 에러 핸들링
- 보안 고려사항
