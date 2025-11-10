# 🧪 Phase 0-1.5 테스트 가이드

Phase 0-1.5 (GET /api/auth/me, PUT /api/auth/profile) 테스트 자료입니다.

---

## 📁 테스트 파일 구성

### 1. **PHASE_0-1.5_TEST_GUIDE.md** (상세 테스트 케이스)
- 15개 테스트 케이스 전체 명세
- 각 테스트의 Request/Response 예시
- cURL 명령어 제공
- Integration Test 시나리오
- Test Report 템플릿

**용도**: 수동 테스트 및 상세 검증

### 2. **test-phase-0-1.5.sh** (자동화 테스트 스크립트)
- 원클릭 자동화 테스트
- 15개 테스트 케이스 자동 실행
- 컬러 출력 및 결과 요약
- Pass/Fail 판정 자동화

**용도**: 빠른 회귀 테스트 및 CI/CD 통합

---

## 🚀 Quick Start

### 방법 1: 자동화 스크립트 (권장)

```bash
# 1. 스크립트 실행
./test-phase-0-1.5.sh

# 또는 다른 서버 URL로 테스트
./test-phase-0-1.5.sh http://localhost:3000
```

**결과 예시**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Phase 0-1.5 Quick Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PASS: User info retrieved correctly (profileImage is null)
✅ PASS: Username updated successfully
✅ PASS: profileImage set successfully
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100.0%

✅ All tests passed! Phase 0-1.5 implementation is working correctly.
```

---

### 방법 2: 수동 테스트

1. **PHASE_0-1.5_TEST_GUIDE.md** 문서 열기
2. "Quick Start" 섹션 참고하여 Access Token 획득
3. 각 테스트 케이스의 cURL 명령어 실행
4. Expected Response와 비교하여 결과 검증

---

## 📋 테스트 체크리스트

### GET /api/auth/me
- [x] 정상 조회 (200 OK)
- [x] Access Token 없음 (401)
- [x] 유효하지 않은 Token (401)
- [ ] 만료된 Token (401) - 15분 대기 필요

### PUT /api/auth/profile
- [x] username 변경 (200 OK)
- [x] profileImage 설정 (200 OK)
- [x] 동시 변경 (200 OK)
- [x] profileImage null 설정 (200 OK)
- [x] Access Token 없음 (401)
- [ ] 중복 username (409) - 수동 검증 필요
- [x] 유효하지 않은 username (400)
- [x] 유효하지 않은 URL (400)
- [x] 빈 body (200 OK)

---

## 🔧 필수 준비사항

### 1. Migration 실행 (최우선)

프로덕션 DB에 `profileImage` 컬럼을 추가해야 합니다:

```bash
# Production 환경
npx sequelize-cli db:migrate --env production

# 또는 Render Dashboard Shell에서 실행
npx sequelize-cli db:migrate
```

**예상 출력**:
```
== 20251110031538-add-profileImage-to-users: migrating =======
== 20251110031538-add-profileImage-to-users: migrated (0.123s)
```

### 2. 의존성 확인

자동화 스크립트 실행 시 필요:
- **curl**: HTTP 요청 (필수)
- **jq**: JSON 파싱 (선택적, 설치 권장)

```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq
```

---

## 🎯 테스트 전략

### 자동화 스크립트 실행 흐름

1. **Setup**: 테스트용 계정 생성 (타임스탬프 기반 고유 username/email)
2. **Test 1-9**: 15개 테스트 케이스 순차 실행
3. **Cleanup**: 로그아웃 및 세션 정리
4. **Summary**: Pass/Fail 통계 출력

### 테스트 격리

- 각 실행마다 새로운 계정 생성 (`testuser_{timestamp}`)
- 이전 테스트 데이터와 격리 보장
- 중복 username 테스트는 수동 검증 필요

---

## 🐛 트러블슈팅

### 문제 1: Migration 오류
```
ERROR: column "profileImage" does not exist
```

**해결**: Migration을 먼저 실행하세요
```bash
npx sequelize-cli db:migrate
```

---

### 문제 2: 401 Unauthorized 오류
```json
{"success":false,"error":{"code":"UNAUTHORIZED"}}
```

**원인**: Access Token이 만료되었거나 유효하지 않음

**해결**: 새로운 Access Token 획득
```bash
curl -X POST https://bemorebackend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

---

### 문제 3: 스크립트 실행 권한 오류
```
Permission denied: ./test-phase-0-1.5.sh
```

**해결**: 실행 권한 부여
```bash
chmod +x test-phase-0-1.5.sh
```

---

### 문제 4: jq 미설치 경고
```
Warning: jq is not installed
```

**영향**: 테스트는 정상 실행되지만, JSON 파싱이 grep/cut으로 대체됨

**해결**: jq 설치 권장 (선택적)
```bash
brew install jq  # macOS
```

---

## 📊 테스트 결과 해석

### 성공 케이스 (100% Pass)
```
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100.0%

✅ All tests passed!
```

→ Phase 0-1.5 구현 완료, 프로덕션 배포 가능

---

### 일부 실패 케이스
```
Total Tests: 15
Passed: 12
Failed: 3
Success Rate: 80.0%

❌ Some tests failed. Please review the results above.
```

→ 실패한 테스트 케이스 확인 및 수정 필요

---

## 🔄 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Phase 0-1.5 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: |
          sudo apt-get install -y jq
      - name: Run tests
        run: |
          chmod +x test-phase-0-1.5.sh
          ./test-phase-0-1.5.sh ${{ secrets.API_BASE_URL }}
```

---

## 📝 테스트 리포트 작성

### 리포트 템플릿

```markdown
# Phase 0-1.5 Test Report

**테스트 실행일**: 2025-01-10
**환경**: Production (Render)
**테스터**: [이름]

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1-1: GET /me 정상 조회 | ✅ PASS | - |
| TC2-1: PUT /profile username 변경 | ✅ PASS | - |
| ... | ... | ... |

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

## 📚 참고 문서

- **PHASE_0-1.5_UPDATE.md**: Phase 0-1.5 구현 상세 설명
- **PHASE_0-1.5_TEST_GUIDE.md**: 15개 테스트 케이스 전체 명세
- **BACKEND_RESPONSE_TO_FRONTEND.md**: 프론트엔드 팀 응답 문서
- **FRONTEND_AUTH_INTEGRATION.md**: 프론트엔드 연동 가이드

---

## ✅ 다음 단계

1. ✅ Migration 실행 → `npx sequelize-cli db:migrate`
2. ✅ 자동화 테스트 실행 → `./test-phase-0-1.5.sh`
3. ✅ 테스트 결과 확인 → 100% Pass 확인
4. ✅ 프론트엔드 팀에게 테스트 결과 공유
5. ✅ 프로덕션 배포 승인

---

**작성자**: Backend Team
**문서 버전**: 1.0
**Phase**: 0-1.5 Testing
**Last Updated**: 2025-01-10
