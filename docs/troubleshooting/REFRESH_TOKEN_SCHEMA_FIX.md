# 🔧 refreshToken Schema Fix - Post-Mortem (2025-01-12)

**우선순위**: ✅ RESOLVED
**영향도**: 🔴 CRITICAL (전체 인증 시스템 중단)
**해결 시간**: 30분
**근본 원인**: Schema-Model 불일치

---

## 📋 문제 요약

**증상**:
- ✅ 데이터베이스 연결 성공 (23:15 UTC)
- ❌ 회원가입/로그인 모두 500 에러 (23:31 UTC)
- ❌ `column "refreshToken" does not exist`

**타임라인**:
```
22:58 UTC - IPv6 연결 문제 발견 및 해결
23:05 UTC - 비밀번호 인코딩 문제 해결
23:15 UTC - "데이터베이스 연결 성공" 발표
23:31 UTC - 프론트엔드 테스트 결과: 여전히 500 에러
23:45 UTC - 실제 에러 발견: refreshToken 컬럼 누락
23:50 UTC - SQL 수정 완료 및 스키마 파일 업데이트
```

---

## 🔍 근본 원인 분석

### Schema-Model 불일치 발견

**Sequelize Model** ([models/User.js:23-26](../../models/User.js#L23-L26)):
```javascript
refreshToken: {
  type: Sequelize.TEXT,
  allowNull: true,
},
```

**Database Schema** (schema/init.sql - 수정 전):
```sql
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  -- ❌ refreshToken 컬럼 누락!
  "name" VARCHAR(100),
  ...
);
```

### 에러 발생 위치

**controllers/authController.js**:

**Line 46 (signup)**:
```javascript
// Refresh token DB 저장
user.refreshToken = refreshToken;
await user.save();  // ❌ Error: column "refreshToken" does not exist
```

**Line 118 (login)**:
```javascript
// Refresh token DB 저장
user.refreshToken = refreshToken;
await user.save();  // ❌ Error: column "refreshToken" does not exist
```

---

## ✅ 해결 방법

### 1단계: 프로덕션 긴급 수정 (즉시)

**Supabase SQL Editor**에서 실행:
```sql
ALTER TABLE "users" ADD COLUMN "refreshToken" VARCHAR(500);
```

**결과**: `Success. No rows returned`

### 2단계: 스키마 파일 수정 (재발 방지)

**schema/init.sql** 업데이트:
```sql
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "refreshToken" VARCHAR(500),  -- ✅ 추가
  "name" VARCHAR(100),
  ...
);
```

### 3단계: 문서 업데이트

**업데이트된 파일**:
- ✅ [schema/init.sql](../../schema/init.sql#L25)
- ✅ [docs/troubleshooting/P0_SUPABASE_TABLE_SETUP.md](./P0_SUPABASE_TABLE_SETUP.md#L66)
- ✅ [docs/troubleshooting/DB_RECONNECTION_GUIDE.md](./DB_RECONNECTION_GUIDE.md#L102)

---

## 📊 영향 분석

### 발생한 문제

| 시간 | 상태 | 영향 |
|------|------|------|
| 23:15-23:31 UTC | "연결 성공" 발표 | ❌ 잘못된 정보 전달 |
| 23:31-23:45 UTC | 500 에러 지속 | ❌ 인증 시스템 완전 중단 |
| 23:45-23:50 UTC | 수정 작업 | ⚠️ 긴급 대응 |
| 23:50+ UTC | 수정 완료 | ✅ 정상 작동 |

### 학습한 교훈

**❌ 잘못된 판단**:
1. 데이터베이스 **연결 성공**만으로 **전체 시스템 정상**으로 판단
2. 실제 API 호출 없이 성공 발표
3. Schema와 Model 일치 여부 미확인

**✅ 개선 방향**:
1. 연결 성공 후 **실제 CRUD 작업 테스트** 필수
2. Schema 변경 시 **Model과 비교 검증** 필수
3. 프로덕션 배포 전 **스키마 검증 체크리스트** 사용

---

## 🛡️ 재발 방지 조치

### Schema 검증 체크리스트

**배포 전 필수 확인 사항**:

```bash
# 1. Sequelize 모델에서 필드 목록 확인
grep -A 20 "static initiate" models/User.js

# 2. schema/init.sql에서 컬럼 목록 확인
grep -A 15 'CREATE TABLE "users"' schema/init.sql

# 3. 일치 여부 수동 검증
# Model 필드: username, email, password, refreshToken, profileImage
# Schema 컬럼: username, email, password, refreshToken, profileImage
#              name, role, isActive, createdAt, updatedAt
```

### 자동화 스크립트 (향후 구현 권장)

```javascript
// scripts/validate-schema.js (예시)
const User = require('../models/User');
const fs = require('fs');

// 1. Sequelize 모델에서 필드 추출
const modelFields = Object.keys(User.rawAttributes);

// 2. schema/init.sql 파싱하여 컬럼 추출
const schemaSQL = fs.readFileSync('schema/init.sql', 'utf8');
const usersTableMatch = schemaSQL.match(/CREATE TABLE "users" \(([\s\S]*?)\);/);
// ... 컬럼 파싱 로직

// 3. 비교 및 경고
const missingInSchema = modelFields.filter(field => !schemaColumns.includes(field));
if (missingInSchema.length > 0) {
  console.error(`❌ Schema missing columns: ${missingInSchema.join(', ')}`);
  process.exit(1);
}
```

---

## 🚀 검증 방법

### 프로덕션 테스트

**회원가입 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser2",
    "email": "test2@example.com",
    "password": "password123"
  }'
```

**예상 응답 (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "testuser2",
      "email": "test2@example.com"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**로그인 테스트**:
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123"
  }'
```

---

## 📚 관련 문서

### Troubleshooting 가이드
- [로그인 500 에러 진단](./LOGIN_500_DIAGNOSTIC_GUIDE.md) - 일반적인 로그인 문제
- [DB 재연결 가이드](./DB_RECONNECTION_GUIDE.md) - DB 재생성 후 재연결
- [P0: Supabase 테이블 설정](./P0_SUPABASE_TABLE_SETUP.md) - 초기 스키마 생성

### Frontend 협업
- [DB 연결 복구 완료 (2025-01-11)](../frontend/DB_CONNECTION_RESOLVED_20250111.md) - 이전 이슈 해결

---

## 💡 기술적 세부사항

### refreshToken 역할

**JWT 인증 시스템**:
1. **Access Token**: 짧은 만료 시간 (15-30분)
2. **Refresh Token**: 긴 만료 시간 (7-30일), DB에 저장

**보안 이유**:
- Access Token 탈취 시 피해 최소화 (짧은 유효 기간)
- Refresh Token은 서버에서 무효화 가능 (DB에 저장)
- 사용자가 로그인 상태 유지 (긴 유효 기간)

### Sequelize vs. Raw SQL

**문제의 본질**:
- Sequelize는 런타임에 SQL 생성
- Schema는 배포 시점에 한 번만 실행
- 둘 사이의 동기화가 수동으로 이루어져야 함

**일반적인 해결책**:
1. **Migrations 사용** (Sequelize CLI)
2. **Schema First 접근** (SQL → Model 생성)
3. **Model First 접근** (Model → Migration 생성)
4. **검증 스크립트** (CI/CD 파이프라인 통합)

---

## 🎯 Action Items

### 완료됨 ✅
- [x] 프로덕션 DB에 `refreshToken` 컬럼 추가
- [x] `schema/init.sql` 수정
- [x] P0 가이드 업데이트
- [x] DB 재연결 가이드 업데이트
- [x] Post-mortem 문서 작성

### 향후 개선 (선택)
- [ ] Schema 검증 자동화 스크립트 작성
- [ ] CI/CD 파이프라인에 스키마 검증 추가
- [ ] Sequelize Migrations 도입 검토
- [ ] 배포 전 체크리스트 문서화

---

**작성**: Backend 개발팀
**최종 수정**: 2025-01-12
**상태**: 🟢 해결 완료 | 📚 재발 방지 조치 완료

**관련 Request IDs**:
- `c461080d-3b00-49d0-b564-c9f836cea8ba` (signup 500 에러)
- `0059b5da-e393-44ba-97d4-f9fc05ceb52f` (signup 500 에러 - 이전)
- `1e128695-2525-4e65-b9cb-fb0dd792876d` (login 500 에러 - 이전)
