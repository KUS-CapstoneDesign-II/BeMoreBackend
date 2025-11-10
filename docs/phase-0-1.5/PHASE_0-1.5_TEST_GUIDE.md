# 🧪 Phase 0-1.5 테스트 가이드

**작성일**: 2025-01-10
**대상**: GET /api/auth/me, PUT /api/auth/profile
**환경**: Production (https://bemorebackend.onrender.com)

---

## 📋 테스트 준비사항

### 1. Migration 실행 (필수)

프로덕션 DB에 migration을 먼저 실행해야 합니다:

```bash
# Render Dashboard에서 실행 또는 로컬에서 프로덕션 DB 연결하여 실행
npx sequelize-cli db:migrate --env production
```

**예상 결과**:
```
== 20251110031538-add-profileImage-to-users: migrating =======
== 20251110031538-add-profileImage-to-users: migrated (0.123s)
```

### 2. Access Token 획득

테스트용 계정으로 로그인하여 Access Token을 획득합니다:

```bash
# 1. 회원가입 (신규 계정)
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser01",
    "email": "testuser01@example.com",
    "password": "testpass123"
  }'

# 또는 2. 로그인 (기존 계정)
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser01@example.com",
    "password": "testpass123"
  }'
```

**응답 예시**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser01",
      "email": "testuser01@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**중요**: 응답에서 `accessToken` 값을 복사하여 이후 테스트에 사용합니다.

---

## 🧪 Test Case 1: GET /api/auth/me (사용자 정보 조회)

### TC1-1: 정상 조회 (200 OK)

**Request**:
```bash
ACCESS_TOKEN="여기에_복사한_토큰_붙여넣기"

curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "testuser01",
      "email": "testuser01@example.com",
      "profileImage": null
    }
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 200
- ✅ `success`: true
- ✅ `data.user.id`: number 타입
- ✅ `data.user.username`: 로그인한 사용자명
- ✅ `data.user.email`: 로그인한 이메일
- ✅ `data.user.profileImage`: null (초기값)

---

### TC1-2: Access Token 없음 (401 Unauthorized)

**Request**:
```bash
curl -X GET https://bemorebackend.onrender.com/api/auth/me
```

**Expected Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 401
- ✅ `success`: false
- ✅ `error.code`: "UNAUTHORIZED"

---

### TC1-3: 유효하지 않은 Access Token (401 Unauthorized)

**Request**:
```bash
curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACCESS_TOKEN",
    "message": "Invalid or expired access token"
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 401
- ✅ `success`: false
- ✅ `error.code`: "INVALID_ACCESS_TOKEN"

---

### TC1-4: 만료된 Access Token (401 Unauthorized)

**Setup**: 15분 이상 된 Access Token 사용

**Request**:
```bash
OLD_TOKEN="15분_이상_된_토큰"

curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer $OLD_TOKEN"
```

**Expected Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_ACCESS_TOKEN",
    "message": "Invalid or expired access token"
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 401
- ✅ Token 만료 시 적절한 에러 메시지

---

## 🧪 Test Case 2: PUT /api/auth/profile (프로필 업데이트)

### TC2-1: username 변경 (200 OK)

**Request**:
```bash
ACCESS_TOKEN="여기에_복사한_토큰_붙여넣기"

curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newusername01"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newusername01",
      "email": "testuser01@example.com",
      "profileImage": null
    }
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 200
- ✅ `data.user.username`: "newusername01" (변경됨)
- ✅ 다른 필드는 그대로 유지

**후속 검증**:
```bash
# GET /me로 변경 확인
curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### TC2-2: profileImage 설정 (200 OK)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "https://example.com/avatar.jpg"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newusername01",
      "email": "testuser01@example.com",
      "profileImage": "https://example.com/avatar.jpg"
    }
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 200
- ✅ `data.user.profileImage`: "https://example.com/avatar.jpg" (설정됨)

---

### TC2-3: username과 profileImage 동시 변경 (200 OK)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "finalusername",
    "profileImage": "https://example.com/new-avatar.jpg"
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "finalusername",
      "email": "testuser01@example.com",
      "profileImage": "https://example.com/new-avatar.jpg"
    }
  }
}
```

**검증 항목**:
- ✅ 두 필드 모두 정상 변경

---

### TC2-4: profileImage null로 설정 (200 OK)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": null
  }'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "finalusername",
      "email": "testuser01@example.com",
      "profileImage": null
    }
  }
}
```

**검증 항목**:
- ✅ profileImage null로 초기화 성공

---

### TC2-5: Access Token 없음 (401 Unauthorized)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hackername"
  }'
```

**Expected Response** (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

**검증 항목**:
- ✅ 인증 없이 접근 불가

---

### TC2-6: 중복된 username (409 Conflict)

**Setup**: 다른 계정 생성 후 그 계정의 username 사용 시도

**Request**:
```bash
# 1. 다른 계정 생성
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "existinguser",
    "email": "existing@example.com",
    "password": "testpass123"
  }'

# 2. 첫 번째 계정으로 중복 username 사용 시도
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "existinguser"
  }'
```

**Expected Response** (409):
```json
{
  "success": false,
  "error": {
    "code": "USERNAME_EXISTS",
    "message": "Username already exists"
  }
}
```

**검증 항목**:
- ✅ HTTP Status Code: 409
- ✅ 중복 username 차단

---

### TC2-7: 유효하지 않은 username (400 Bad Request)

**Request**:
```bash
# 2자 (최소 3자 필요)
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

**검증 항목**:
- ✅ Zod 스키마 검증 동작

---

### TC2-8: 유효하지 않은 profileImage URL (400 Bad Request)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "not-a-url"
  }'
```

**Expected Response** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

**검증 항목**:
- ✅ URL 형식 검증 동작

---

### TC2-9: 빈 body (200 OK - 변경 없음)

**Request**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "finalusername",
      "email": "testuser01@example.com",
      "profileImage": null
    }
  }
}
```

**검증 항목**:
- ✅ 빈 body도 허용 (선택적 필드이므로)
- ✅ 기존 데이터 유지

---

## 🔄 Integration Test (전체 플로우)

### Scenario: 신규 사용자 전체 플로우

```bash
#!/bin/bash

BASE_URL="https://bemorebackend.onrender.com"

echo "=== 1. 회원가입 ==="
SIGNUP_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "integrationtest",
    "email": "integration@example.com",
    "password": "testpass123"
  }')
echo $SIGNUP_RESPONSE | jq .

ACCESS_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:50}..."

echo -e "\n=== 2. 내 정보 조회 (초기 상태) ==="
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n=== 3. username 변경 ==="
curl -s -X PUT $BASE_URL/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "integration_updated"
  }' | jq .

echo -e "\n=== 4. profileImage 설정 ==="
curl -s -X PUT $BASE_URL/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "https://example.com/integration-avatar.jpg"
  }' | jq .

echo -e "\n=== 5. 내 정보 조회 (최종 상태) ==="
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n=== 6. 로그아웃 ==="
REFRESH_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.refreshToken')
curl -s -X POST $BASE_URL/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq .

echo -e "\n✅ Integration Test Complete"
```

**Expected Output**:
```
=== 1. 회원가입 ===
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}

=== 2. 내 정보 조회 (초기 상태) ===
{
  "success": true,
  "data": {
    "user": {
      "username": "integrationtest",
      "profileImage": null
    }
  }
}

=== 3. username 변경 ===
{ "success": true, "data": { "user": { "username": "integration_updated" } } }

=== 4. profileImage 설정 ===
{ "success": true, "data": { "user": { "profileImage": "https://..." } } }

=== 5. 내 정보 조회 (최종 상태) ===
{
  "success": true,
  "data": {
    "user": {
      "username": "integration_updated",
      "profileImage": "https://example.com/integration-avatar.jpg"
    }
  }
}

=== 6. 로그아웃 ===
{ "success": true, "message": "Logged out successfully" }

✅ Integration Test Complete
```

---

## 📊 Test Checklist

### GET /api/auth/me
- [ ] TC1-1: 정상 조회 (200 OK)
- [ ] TC1-2: Access Token 없음 (401)
- [ ] TC1-3: 유효하지 않은 Token (401)
- [ ] TC1-4: 만료된 Token (401)

### PUT /api/auth/profile
- [ ] TC2-1: username 변경 (200 OK)
- [ ] TC2-2: profileImage 설정 (200 OK)
- [ ] TC2-3: 동시 변경 (200 OK)
- [ ] TC2-4: profileImage null 설정 (200 OK)
- [ ] TC2-5: Access Token 없음 (401)
- [ ] TC2-6: 중복 username (409)
- [ ] TC2-7: 유효하지 않은 username (400)
- [ ] TC2-8: 유효하지 않은 URL (400)
- [ ] TC2-9: 빈 body (200 OK)

### Integration Test
- [ ] 전체 플로우 테스트

---

## 🚀 Quick Start

### 1단계: Migration 실행
```bash
npx sequelize-cli db:migrate
```

### 2단계: Access Token 획득
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 3단계: 테스트 실행
```bash
export ACCESS_TOKEN="복사한_토큰"

# GET /me
curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# PUT /profile
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname","profileImage":"https://example.com/pic.jpg"}'
```

---

## 📝 Test Report Template

```markdown
# Phase 0-1.5 Test Report

**테스트 실행일**: 2025-01-10
**환경**: Production (Render)
**테스터**: [이름]

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1-1: GET /me 정상 조회 | ✅ PASS | - |
| TC1-2: GET /me 인증 없음 | ✅ PASS | - |
| TC2-1: PUT /profile username 변경 | ✅ PASS | - |
| TC2-2: PUT /profile profileImage 설정 | ✅ PASS | - |
| TC2-6: PUT /profile 중복 username | ✅ PASS | - |
| Integration Test | ✅ PASS | - |

## Issues Found
- None

## Summary
- **Total**: 15 test cases
- **Passed**: 15
- **Failed**: 0
- **Success Rate**: 100%

## Recommendations
- ✅ Phase 0-1.5 구현 완료, 프로덕션 배포 가능
```

---

**작성자**: Backend Team
**문서 버전**: 1.0
**Phase**: 0-1.5 Testing
