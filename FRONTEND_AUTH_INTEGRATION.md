# 🔐 BeMore 인증 시스템 프론트엔드 연동 가이드

**작성일**: 2025-11-10
**백엔드 버전**: Phase 0-1 완료
**API 베이스 URL**: `https://bemorebackend.onrender.com`

---

## 📋 목차

1. [개요](#개요)
2. [API 엔드포인트](#api-엔드포인트)
3. [인증 플로우](#인증-플로우)
4. [토큰 관리](#토큰-관리)
5. [예제 코드](#예제-코드)
6. [에러 핸들링](#에러-핸들링)
7. [보안 고려사항](#보안-고려사항)
8. [테스트](#테스트)

---

## 개요

### ✅ 구현 완료 사항

- **회원가입** (POST /api/auth/signup)
- **로그인** (POST /api/auth/login)
- **토큰 갱신** (POST /api/auth/refresh)
- **로그아웃** (POST /api/auth/logout)
- **JWT 기반 인증** (Access Token 15분, Refresh Token 7일)
- **CORS 설정 완료** (프론트엔드 도메인 허용)

### 🔐 보안 기능

- bcrypt 비밀번호 해싱
- JWT 토큰 타입 검증 (access vs refresh)
- Refresh Token DB 저장 및 검증
- Rate Limiting (10분 600회)
- Zod 입력 유효성 검증

---

## API 엔드포인트

### 1. 회원가입

**`POST /api/auth/signup`**

새로운 사용자를 생성하고 Access Token과 Refresh Token을 발급합니다.

**Request Body**:
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**Validation Rules**:
- `username`: 3-50자
- `email`: 유효한 이메일 형식, 최대 100자
- `password`: 최소 8자, 최대 100자

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:

- **409 Conflict** (중복 이메일/유저명):
```json
{
  "success": false,
  "error": {
    "code": "USER_EXISTS",
    "message": "Username or email already exists"
  }
}
```

- **400 Bad Request** (유효성 검증 실패):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input"
  }
}
```

---

### 2. 로그인

**`POST /api/auth/login`**

이메일과 비밀번호로 로그인하고 토큰을 발급받습니다.

**Request Body**:
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response** (401):
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

### 3. Access Token 갱신

**`POST /api/auth/refresh`**

만료된 Access Token을 Refresh Token으로 갱신합니다.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:

- **401 Unauthorized** (유효하지 않은 토큰):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid or expired refresh token"
  }
}
```

- **400 Bad Request** (토큰 누락):
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REFRESH_TOKEN",
    "message": "Refresh token is required"
  }
}
```

---

### 4. 로그아웃

**`POST /api/auth/logout`**

Refresh Token을 무효화하여 로그아웃합니다.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**참고**: 유효하지 않은 토큰이어도 200 응답을 반환합니다 (이미 로그아웃된 상태).

---

### 5. 인증이 필요한 API 호출

기존 API 엔드포인트에 Access Token을 추가합니다.

**Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**예시** (세션 시작):
```bash
curl -X POST https://bemorebackend.onrender.com/api/session/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"userId": "user123"}'
```

**인증이 필요한 엔드포인트**:
- `/api/session/*` (AUTH_ENABLED=true일 때)
- `/api/dashboard/*` (AUTH_ENABLED=true일 때)
- `/api/user/*` (AUTH_ENABLED=true일 때)
- `/api/stt/*` (AUTH_ENABLED=true일 때)

---

## 인증 플로우

### 1. 회원가입/로그인 플로우

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │
       │ 1. 회원가입/로그인 요청
       ▼
┌─────────────────────┐
│   POST /auth/signup  │
│   POST /auth/login   │
└──────┬──────────────┘
       │
       │ 2. Access Token (15분)
       │    Refresh Token (7일) 발급
       ▼
┌─────────────────────┐
│   프론트엔드 저장    │
│  - accessToken (메모리)│
│  - refreshToken (저장소)│
└─────────────────────┘
```

### 2. API 호출 플로우

```
┌─────────────┐
│  API 호출   │
└──────┬──────┘
       │
       │ Authorization: Bearer {accessToken}
       ▼
┌─────────────────────┐
│   백엔드 인증 검증   │
└──────┬──────────────┘
       │
       ├─ ✅ 성공 → API 응답
       │
       └─ ❌ 401 Unauthorized
          │
          ▼
     ┌──────────────────┐
     │ Refresh Token으로 │
     │   토큰 갱신 시도  │
     └─────┬────────────┘
           │
           ├─ ✅ 성공 → 새 accessToken 저장 → API 재시도
           │
           └─ ❌ 실패 → 로그인 페이지로 리다이렉트
```

### 3. 자동 토큰 갱신 로직

```javascript
// Axios Interceptor 예제
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Access Token 만료 (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh Token으로 갱신
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        // 새 Access Token 저장
        const newAccessToken = data.data.accessToken;
        setAccessToken(newAccessToken); // 메모리 저장

        // 원래 요청 재시도
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh Token도 만료 → 로그아웃
        handleLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 토큰 관리

### 저장 위치

| 토큰 타입 | 저장 위치 | 만료 시간 | 용도 |
|----------|----------|----------|------|
| **Access Token** | 메모리 (변수) | 15분 | API 인증 |
| **Refresh Token** | localStorage/sessionStorage | 7일 | Access Token 갱신 |

### ⚠️ 보안 고려사항

**Access Token**:
- ✅ **메모리에 저장** (JavaScript 변수)
- ❌ localStorage/sessionStorage에 저장 금지 (XSS 취약)
- 페이지 새로고침 시 Refresh Token으로 재발급

**Refresh Token**:
- ✅ localStorage (지속성) 또는 sessionStorage (브라우저 닫으면 삭제)
- ⚠️ httpOnly 쿠키가 가장 안전하지만 현재 미구현 (차후 개선 가능)

### 권장 구현

```javascript
// 토큰 관리 유틸리티
class AuthManager {
  constructor() {
    this.accessToken = null; // 메모리
  }

  // Access Token 설정 (메모리)
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Access Token 가져오기
  getAccessToken() {
    return this.accessToken;
  }

  // Refresh Token 저장 (localStorage)
  setRefreshToken(token) {
    localStorage.setItem('refreshToken', token);
  }

  // Refresh Token 가져오기
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // 로그아웃 (모든 토큰 삭제)
  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('refreshToken');
  }

  // 사용자 정보 저장
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // 사용자 정보 가져오기
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}

export default new AuthManager();
```

---

## 예제 코드

### React + Axios 예제

#### 1. API 클라이언트 설정

```javascript
// src/api/client.js
import axios from 'axios';
import authManager from './authManager';

const API_BASE_URL = 'https://bemorebackend.onrender.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Access Token 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = authManager.getAccessToken();
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 자동 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = authManager.getRefreshToken();
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = data.data.accessToken;
        authManager.setAccessToken(newAccessToken);

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh 실패 → 로그아웃
        authManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 2. 인증 API 함수

```javascript
// src/api/auth.js
import apiClient from './client';
import authManager from './authManager';

export const authAPI = {
  // 회원가입
  async signup(username, email, password) {
    const { data } = await apiClient.post('/api/auth/signup', {
      username,
      email,
      password,
    });

    // 토큰 저장
    authManager.setAccessToken(data.data.accessToken);
    authManager.setRefreshToken(data.data.refreshToken);
    authManager.setUser(data.data.user);

    return data.data;
  },

  // 로그인
  async login(email, password) {
    const { data } = await apiClient.post('/api/auth/login', {
      email,
      password,
    });

    // 토큰 저장
    authManager.setAccessToken(data.data.accessToken);
    authManager.setRefreshToken(data.data.refreshToken);
    authManager.setUser(data.data.user);

    return data.data;
  },

  // 로그아웃
  async logout() {
    const refreshToken = authManager.getRefreshToken();

    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // 로컬 토큰 삭제
    authManager.clearTokens();
  },

  // Access Token 갱신
  async refreshAccessToken() {
    const refreshToken = authManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await apiClient.post('/api/auth/refresh', {
      refreshToken,
    });

    authManager.setAccessToken(data.data.accessToken);
    return data.data.accessToken;
  },
};
```

#### 3. React Context 예제

```javascript
// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/auth';
import authManager from '../api/authManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 초기 로드: Refresh Token으로 Access Token 복원
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = authManager.getRefreshToken();

      if (refreshToken) {
        try {
          await authAPI.refreshAccessToken();
          const storedUser = authManager.getUser();
          setUser(storedUser);
        } catch (error) {
          console.error('Failed to restore session:', error);
          authManager.clearTokens();
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const signup = async (username, email, password) => {
    const data = await authAPI.signup(username, email, password);
    setUser(data.user);
    return data;
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 4. 로그인 컴포넌트 예제

```javascript
// src/components/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>로그인</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
};
```

---

## 에러 핸들링

### 에러 코드 및 대응

| HTTP 상태 | 에러 코드 | 의미 | 대응 방법 |
|----------|----------|------|----------|
| 400 | `VALIDATION_ERROR` | 입력 유효성 검증 실패 | 입력 값 확인 후 재시도 |
| 400 | `MISSING_REFRESH_TOKEN` | Refresh Token 누락 | 로그인 페이지로 리다이렉트 |
| 401 | `UNAUTHORIZED` | Bearer Token 누락 | 로그인 페이지로 리다이렉트 |
| 401 | `INVALID_TOKEN` | 토큰 유효하지 않음 | Refresh Token으로 갱신 시도 |
| 401 | `INVALID_CREDENTIALS` | 이메일/비밀번호 틀림 | 사용자에게 오류 메시지 표시 |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh Token 만료/무효 | 로그인 페이지로 리다이렉트 |
| 401 | `INVALID_TOKEN_TYPE` | Access Token 대신 Refresh Token 사용 | 올바른 토큰 사용 |
| 409 | `USER_EXISTS` | 이메일/유저명 중복 | 다른 값으로 재시도 |
| 500 | `SERVER_MISCONFIG` | JWT_SECRET 미설정 | 백엔드 팀에 문의 |
| 500 | `SIGNUP_ERROR` | 회원가입 서버 오류 | 잠시 후 재시도 |
| 500 | `LOGIN_ERROR` | 로그인 서버 오류 | 잠시 후 재시도 |
| 500 | `REFRESH_ERROR` | 토큰 갱신 오류 | 로그인 페이지로 리다이렉트 |
| 500 | `LOGOUT_ERROR` | 로그아웃 오류 | 로컬 토큰 삭제 후 진행 |

### 에러 핸들링 예제

```javascript
// src/utils/errorHandler.js
export const handleAuthError = (error) => {
  const errorCode = error.response?.data?.error?.code;
  const errorMessage = error.response?.data?.error?.message;

  switch (errorCode) {
    case 'INVALID_CREDENTIALS':
      return '이메일 또는 비밀번호가 올바르지 않습니다.';

    case 'USER_EXISTS':
      return '이미 사용 중인 이메일 또는 유저명입니다.';

    case 'VALIDATION_ERROR':
      return '입력 형식이 올바르지 않습니다. 다시 확인해주세요.';

    case 'INVALID_TOKEN':
    case 'INVALID_REFRESH_TOKEN':
    case 'UNAUTHORIZED':
      return '세션이 만료되었습니다. 다시 로그인해주세요.';

    case 'MISSING_REFRESH_TOKEN':
      return '인증 정보가 없습니다. 로그인해주세요.';

    default:
      return errorMessage || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
};
```

---

## 보안 고려사항

### 1. XSS (Cross-Site Scripting) 방어

- ✅ Access Token을 localStorage에 저장하지 않음 (메모리 변수 사용)
- ✅ 사용자 입력 sanitization (React는 기본 제공)
- ⚠️ `dangerouslySetInnerHTML` 사용 주의

### 2. CSRF (Cross-Site Request Forgery) 방어

- ✅ CORS 설정으로 허용된 도메인만 API 호출 가능
- ✅ JWT 토큰 기반 인증 (쿠키 미사용으로 CSRF 위험 감소)

### 3. Token 관리 보안

**Access Token**:
- ✅ 메모리 저장 (JavaScript 변수)
- ✅ 15분 짧은 만료 시간
- ❌ localStorage/sessionStorage 저장 금지

**Refresh Token**:
- ✅ localStorage 저장 (현재 구현)
- ⚠️ httpOnly 쿠키 권장 (차후 개선 가능)
- ✅ 7일 만료 시간

### 4. HTTPS 필수

- ⚠️ **프로덕션 환경에서는 반드시 HTTPS 사용**
- ⚠️ HTTP에서는 토큰이 평문 전송되어 도청 가능

### 5. 비밀번호 정책

백엔드에서 검증되지만 프론트엔드에서도 사전 검증 권장:
- 최소 8자 이상
- 영문, 숫자, 특수문자 조합 권장
- 일반적인 비밀번호(123456, password 등) 차단 권장

---

## 테스트

### 1. cURL 테스트

```bash
# 회원가입
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 로그인
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 인증이 필요한 API 호출
curl -X GET https://bemorebackend.onrender.com/api/dashboard/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 토큰 갱신
curl -X POST https://bemorebackend.onrender.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'

# 로그아웃
curl -X POST https://bemorebackend.onrender.com/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 2. Postman Collection

Postman Collection을 만들어 공유하면 테스트가 편리합니다:

1. **Environment Variables 설정**:
   - `base_url`: `https://bemorebackend.onrender.com`
   - `accessToken`: (자동 설정됨)
   - `refreshToken`: (자동 설정됨)

2. **Login Request의 Tests 탭**:
```javascript
// 자동으로 토큰 저장
const response = pm.response.json();
pm.environment.set("accessToken", response.data.accessToken);
pm.environment.set("refreshToken", response.data.refreshToken);
```

3. **인증 필요한 요청의 Headers**:
```
Authorization: Bearer {{accessToken}}
```

---

## FAQ

### Q1: Access Token이 만료되면 어떻게 하나요?

A: Axios Interceptor가 자동으로 Refresh Token으로 갱신을 시도합니다. 실패하면 로그인 페이지로 리다이렉트됩니다.

### Q2: 페이지를 새로고침하면 로그인이 풀리나요?

A: Access Token은 메모리에 저장되어 사라지지만, Refresh Token이 localStorage에 남아있어 자동으로 재발급됩니다.

### Q3: 로그아웃하면 Refresh Token도 무효화되나요?

A: 네, 백엔드 DB에서 Refresh Token이 삭제됩니다. 프론트엔드에서도 localStorage를 삭제해야 합니다.

### Q4: CORS 에러가 발생하면 어떻게 하나요?

A: 백엔드의 `.env` 파일에 프론트엔드 도메인이 `FRONTEND_URLS`에 추가되어 있는지 확인하세요. 현재 허용된 도메인:
- `http://localhost:5173`
- `http://localhost:5174`
- `https://bemore-app.vercel.app`
- `https://be-more-frontend.vercel.app`

### Q5: AUTH_ENABLED가 false면 어떻게 되나요?

A: 인증이 비활성화되어 JWT 검증을 건너뜁니다. 프로덕션에서는 반드시 `AUTH_ENABLED=true`로 설정하세요.

---

## 체크리스트

프론트엔드 개발자를 위한 구현 체크리스트:

### 필수 구현
- [ ] API 클라이언트 설정 (Axios/Fetch)
- [ ] Access Token 메모리 저장 구현
- [ ] Refresh Token localStorage 저장 구현
- [ ] 자동 토큰 갱신 Interceptor 구현
- [ ] 로그인/회원가입 UI
- [ ] 로그아웃 기능
- [ ] 401 에러 핸들링
- [ ] 로그인 상태 Context/Store 관리

### 권장 구현
- [ ] 회원가입 유효성 검증 (프론트엔드)
- [ ] 비밀번호 표시/숨김 토글
- [ ] 로딩 상태 UI
- [ ] 에러 메시지 표시
- [ ] Protected Route 구현
- [ ] 자동 로그인 (Remember me)
- [ ] 비밀번호 변경 기능 (차후 백엔드 구현 필요)

### 테스트
- [ ] 회원가입 플로우 테스트
- [ ] 로그인 플로우 테스트
- [ ] 토큰 만료 시 자동 갱신 테스트
- [ ] 로그아웃 테스트
- [ ] 중복 이메일/유저명 에러 테스트
- [ ] 잘못된 비밀번호 에러 테스트

---

## 연락처

**백엔드 팀 문의**:
- 문제 발생 시 에러 로그 및 요청 내용 공유
- API 변경사항은 사전 공지 예정

**참고 문서**:
- [README.md](README.md) - 전체 프로젝트 문서
- [PHASE_0-1_STATUS.md](PHASE_0-1_STATUS.md) - 구현 현황 분석
- [PHASE_0-1_IMPLEMENTATION.md](PHASE_0-1_IMPLEMENTATION.md) - 백엔드 구현 상세

---

**작성자**: Backend Team
**버전**: 1.0.0
**최종 업데이트**: 2025-11-10
