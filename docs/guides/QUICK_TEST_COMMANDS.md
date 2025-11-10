# 🚀 Phase 0-1.5 Quick Test Commands

빠른 수동 테스트를 위한 명령어 모음입니다.

---

## 🔧 준비

### 1. Migration 실행 (최초 1회)
```bash
npx sequelize-cli db:migrate
```

### 2. Access Token 획득
```bash
# 로그인
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'

# 응답에서 accessToken 복사 후:
export ACCESS_TOKEN="복사한_토큰_여기에_붙여넣기"
```

---

## ✅ GET /api/auth/me

### 정상 조회
```bash
curl -X GET https://bemorebackend.onrender.com/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**기대 결과** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "yourusername",
      "email": "your@email.com",
      "profileImage": null
    }
  }
}
```

---

### 인증 없이 접근 (에러 확인)
```bash
curl -X GET https://bemorebackend.onrender.com/api/auth/me
```

**기대 결과** (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

---

## ✏️ PUT /api/auth/profile

### username 변경
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newusername"
  }'
```

**기대 결과** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newusername",
      "email": "your@email.com",
      "profileImage": null
    }
  }
}
```

---

### profileImage 설정
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "https://example.com/avatar.jpg"
  }'
```

**기대 결과** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "newusername",
      "email": "your@email.com",
      "profileImage": "https://example.com/avatar.jpg"
    }
  }
}
```

---

### username과 profileImage 동시 변경
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "finalusername",
    "profileImage": "https://example.com/new-avatar.jpg"
  }'
```

---

### profileImage 제거 (null로 설정)
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": null
  }'
```

---

## 🧪 에러 케이스 테스트

### 짧은 username (Validation Error)
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab"
  }'
```

**기대 결과** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed"
  }
}
```

---

### 유효하지 않은 URL (Validation Error)
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "not-a-url"
  }'
```

**기대 결과** (400):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed"
  }
}
```

---

### 인증 없이 업데이트 시도 (Unauthorized)
```bash
curl -X PUT https://bemorebackend.onrender.com/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker"
  }'
```

**기대 결과** (401):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

---

## 🔄 전체 플로우 테스트

```bash
#!/bin/bash

BASE_URL="https://bemorebackend.onrender.com"
ACCESS_TOKEN="여기에_복사한_토큰_붙여넣기"

echo "1. 내 정보 조회 (초기)"
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

echo -e "\n2. username 변경"
curl -s -X PUT $BASE_URL/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"updated_user"}' | jq .

echo -e "\n3. profileImage 설정"
curl -s -X PUT $BASE_URL/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileImage":"https://example.com/pic.jpg"}' | jq .

echo -e "\n4. 내 정보 조회 (최종)"
curl -s -X GET $BASE_URL/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
```

---

## 📋 체크리스트

테스트 완료 시 체크:

- [ ] GET /me: 정상 조회 (200 OK)
- [ ] GET /me: 인증 없음 (401)
- [ ] PUT /profile: username 변경 (200 OK)
- [ ] PUT /profile: profileImage 설정 (200 OK)
- [ ] PUT /profile: 동시 변경 (200 OK)
- [ ] PUT /profile: profileImage null (200 OK)
- [ ] PUT /profile: 짧은 username (400)
- [ ] PUT /profile: 유효하지 않은 URL (400)
- [ ] PUT /profile: 인증 없음 (401)
- [ ] 전체 플로우: 정상 동작

---

## 💡 팁

### jq로 예쁘게 출력
```bash
curl ... | jq .
```

### 응답 헤더 확인
```bash
curl -i ...
```

### Verbose 모드로 디버깅
```bash
curl -v ...
```

### Access Token 자동 추출
```bash
ACCESS_TOKEN=$(curl -s -X POST ... | jq -r '.data.accessToken')
```

---

**작성일**: 2025-01-10
**Phase**: 0-1.5 Testing
