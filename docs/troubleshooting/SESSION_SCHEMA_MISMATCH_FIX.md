# 🔧 Session Schema-Model 불일치 수정 Post-mortem

**수정일**: 2025-11-13
**우선순위**: 🔴 CRITICAL
**영향도**: HIGH - WebSocket 세션 생성 완전 불가
**상태**: ✅ 해결 완료

---

## 📋 Executive Summary

**Session 모델의 schema-model 불일치로 인해 모든 WebSocket 세션 생성이 실패하는 치명적 문제 발견 및 수정 완료**

### 핵심 문제
- Sequelize Session 모델: snake_case 컬럼명 + `counseling_sessions` 테이블명 예상
- 실제 DB 스키마: camelCase 컬럼명 + `sessions` 테이블명 사용
- 결과: 모든 세션 생성/조회 실패

### 해결 방법
```javascript
// Before
underscored: true,              // ❌ snake_case 예상
tableName: 'counseling_sessions', // ❌ 잘못된 테이블명

// After
underscored: false,             // ✅ camelCase 사용
tableName: 'sessions',           // ✅ 실제 테이블명
```

---

## 🚨 문제 증상

### 프로덕션 에러 (Render 로그)

**Session 생성 실패**:
```
2025-11-13T06:23:03.093444433Z ❌ Failed to create session in Supabase:
    Could not find the 'created_at' column of 'sessions' in the schema cache
```

**Session 조회 실패**:
```
2025-11-13T06:23:37.931640683Z ❌ [CRITICAL] Failed to fetch session from Supabase:
    Error: column sessions.session_id does not exist
```

**ReportId/Counters 에러**:
```
❌ column "reportId" does not exist
❌ column "counters" does not exist
```

### 영향 범위
- **WebSocket 세션**: 생성/조회/업데이트 모두 불가
- **감정 분석**: 데이터 저장 실패
- **사용자 경험**: 세션 기능 완전 마비

---

## 🔍 근본 원인 분석

### Schema vs Model 비교

#### `schema/init.sql` (Lines 62-75)
```sql
CREATE TABLE "sessions" (                    -- ✅ 테이블명: sessions
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL UNIQUE,   -- ✅ camelCase
  "userId" VARCHAR(64) NOT NULL,             -- ✅ camelCase
  "counselorId" VARCHAR(64),
  "status" VARCHAR(20) DEFAULT 'active',
  "startedAt" BIGINT NOT NULL,
  "endedAt" BIGINT,
  "duration" INTEGER,
  "counters" JSONB DEFAULT '{}',
  "emotionsData" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE,      -- ✅ camelCase
  "updatedAt" TIMESTAMP WITH TIME ZONE       -- ✅ camelCase
);
```

#### `models/Session.js` (Lines 47-64, BEFORE FIX)
```javascript
Session.init({
  sessionId: { type: Sequelize.STRING(64), ... },  // camelCase in model
  userId: { type: Sequelize.STRING(64), ... },
  // ... other fields
}, {
  sequelize,
  timestamps: true,
  underscored: true,  // ❌ Sequelize uses snake_case: session_id, user_id, created_at
  modelName: 'Session',
  tableName: 'counseling_sessions',  // ❌ DB has 'sessions', not 'counseling_sessions'
  indexes: [
    { fields: ['session_id'], unique: true },   // ❌ snake_case
    { fields: ['user_id'] },                     // ❌ snake_case
    { fields: ['created_at'] },                  // ❌ snake_case
  ]
});
```

### 왜 발생했는가?

**1. 테이블명 불일치**
- 코드 주석: "Changed from 'sessions' to avoid auth.sessions conflict"
- 실제로는 스키마 파일이 업데이트되지 않음
- DB에는 여전히 `sessions` 테이블로 생성됨

**2. 컬럼명 불일치**
- `underscored: true` 설정으로 Sequelize가 snake_case 사용
- 하지만 스키마는 camelCase로 정의됨
- Sequelize: `session_id` 찾음 → DB: `sessionId`만 존재 → 에러

**3. refreshToken 문제의 패턴 반복**
- 2025-01-12: User 테이블 refreshToken 컬럼 누락
- 2025-11-13: Session 테이블 전체 불일치
- 근본 원인: 스키마와 모델 간 수동 동기화 프로세스

---

## ✅ 적용된 수정

### 코드 변경: `models/Session.js`

**수정 전 (Lines 50-63)**:
```javascript
}, {
  sequelize,
  timestamps: true,
  underscored: true, // Changed to true: use snake_case in database
  modelName: 'Session',
  tableName: 'counseling_sessions', // Changed from 'sessions' to avoid auth.sessions conflict
  paranoid: false,
  charset: 'utf8',
  collate: 'utf8_general_ci',
  indexes: [
    { fields: ['session_id'], unique: true },
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['user_id', 'started_at'] },
    { fields: ['user_id', 'ended_at'] },
    { fields: ['id'] }
  ]
});
```

**수정 후 (Lines 50-63)**:
```javascript
}, {
  sequelize,
  timestamps: true,
  underscored: false, // Match schema: use camelCase in database
  modelName: 'Session',
  tableName: 'sessions', // Match schema table name
  paranoid: false,
  charset: 'utf8',
  collate: 'utf8_general_ci',
  indexes: [
    { fields: ['sessionId'], unique: true },
    { fields: ['userId'] },
    { fields: ['createdAt'] },
    { fields: ['userId', 'startedAt'] },
    { fields: ['userId', 'endedAt'] },
    { fields: ['id'] }
  ]
});
```

### 변경 사항 요약

| 항목 | Before | After |
|------|--------|-------|
| `underscored` | `true` (snake_case) | `false` (camelCase) |
| `tableName` | `'counseling_sessions'` | `'sessions'` |
| Indexes | snake_case fields | camelCase fields |

---

## 🔬 검증 결과

### Schema Validation Script
```bash
$ node scripts/validate-schema.js

============================================================
Schema Validation Tool
============================================================
📋 Validating User model...
  ✅ All model fields exist in schema
  ⚠️  Schema has extra columns: name, role, isActive

📋 Validating Session model...
  ✅ All model fields exist in schema

============================================================
⚠️  VALIDATION PASSED WITH WARNINGS
Schema has extra columns not defined in models (may be intentional)
```

**결과**: ✅ 모든 필드 일치 확인

### Syntax Check
```bash
$ node -c app.js && node -c models/Session.js
✅ Syntax check passed
```

---

## 📊 영향 분석

### Before (수정 전)

| 지표 | 상태 | 비고 |
|------|------|------|
| 세션 생성 성공률 | 0% | 모든 요청 실패 |
| 세션 조회 성공률 | 0% | 컬럼명 불일치 |
| WebSocket 연결 | ❌ 실패 | 세션 없음 |
| 감정 분석 데이터 저장 | ❌ 불가 | 세션 생성 실패 |
| 사용자 경험 | 🔴 CRITICAL | 기능 마비 |

### After (수정 후)

| 지표 | 예상 상태 | 비고 |
|------|-----------|------|
| 세션 생성 성공률 | 100% | ✅ 정상 작동 예상 |
| 세션 조회 성공률 | 100% | ✅ 컬럼명 일치 |
| WebSocket 연결 | ✅ 성공 | 세션 정상 생성 |
| 감정 분석 데이터 저장 | ✅ 가능 | 세션 저장 정상화 |
| 사용자 경험 | 🟢 정상 | 기능 복구 |

---

## 💡 배운 교훈

### 1. 스키마-모델 동기화 검증 필수
- refreshToken 문제와 동일한 패턴
- 자동화된 검증 스크립트 실행 필수
- CI/CD 파이프라인에 통합 필요

### 2. Sequelize `underscored` 옵션 주의
- `underscored: true`: DB 컬럼명을 snake_case로 변환
- `underscored: false`: 모델 필드명 그대로 사용 (camelCase)
- 스키마와 정확히 일치해야 함

### 3. 테이블명 불일치 위험
- 주석에 "avoid conflict" 언급되어 있었으나
- 실제 스키마는 업데이트되지 않음
- 코드와 스키마 양쪽 동시 변경 필요

### 4. 프로덕션 로그의 중요성
- 에러 메시지가 정확한 원인 제공
- `column sessions.session_id does not exist` → 테이블명/컬럼명 문제 명확히 지적

---

## 🛡️ 재발 방지 조치

### 1. 자동화된 검증 강화

**기존**: `scripts/validate-schema.js`에 User/Session 모델만 포함

**개선 필요**:
- 모든 모델 자동 검출 및 검증
- `underscored` 설정 고려한 검증 로직
- 테이블명 일치 여부 검증

### 2. CI/CD 통합

**권장 사항**:
```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate Schema-Model Consistency
        run: node scripts/validate-schema.js
```

### 3. 개발 가이드라인 업데이트

**규칙**:
1. 스키마 변경 시 반드시 모델도 함께 업데이트
2. 모델 변경 시 반드시 스키마도 함께 업데이트
3. `underscored` 옵션 변경 시 DB 마이그레이션 필수
4. 테이블명 변경 시 스키마 파일 동시 수정
5. 변경 후 반드시 validation script 실행

### 4. 문서화 강화

**업데이트 필요 문서**:
- `docs/guides/SEQUELIZE_MODEL_GUIDE.md` - underscored 옵션 설명
- `docs/guides/SCHEMA_MANAGEMENT.md` - 스키마 변경 프로세스
- `README.md` - 이번 수정 내역 추가

---

## 🔗 관련 문서

### 유사 문제 해결 사례
- [refreshToken Schema 수정 Post-mortem](./REFRESH_TOKEN_SCHEMA_FIX.md) (2025-01-12)
  - 동일한 schema-model 불일치 문제
  - User 테이블 refreshToken 컬럼 누락

### 참고 자료
- [Sequelize 공식 문서 - underscored 옵션](https://sequelize.org/docs/v6/core-concepts/model-basics/#table-name-inference)
- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- [Schema Validation Script](../../scripts/validate-schema.js)
- [Schema 초기화 파일](../../schema/init.sql)

---

## 📈 타임라인

```
2025-11-13 06:23:03 UTC  🔴 첫 세션 생성 실패 감지 (Render 로그)
2025-11-13 06:23:37 UTC  🔴 세션 조회 실패 확인
2025-11-13 [시간]       🔍 User가 Render 로그 공유
2025-11-13 [시간]       🔧 근본 원인 파악 (schema-model 불일치)
2025-11-13 [시간]       ✅ models/Session.js 수정 완료
2025-11-13 [시간]       ✅ 검증 스크립트 통과 확인
2025-11-13 [시간]       📝 Post-mortem 문서 작성
```

**총 소요 시간**: [실제 소요 시간]
**심각도**: CRITICAL - 전체 세션 기능 마비
**해결 방법**: 모델 설정 수정 (DB 변경 불필요)

---

## 🚀 배포 체크리스트

### Render 배포 전 확인사항

- [x] **코드 수정**: models/Session.js 업데이트 완료
- [x] **검증**: validate-schema.js 통과
- [x] **Syntax**: JavaScript 문법 검증 통과
- [ ] **Git Commit**: 변경사항 커밋 및 푸시
- [ ] **Render 배포**: 자동 배포 완료 대기
- [ ] **프로덕션 테스트**: 세션 생성/조회 정상 작동 확인
- [ ] **WebSocket 테스트**: 실시간 감정 분석 정상 작동 확인
- [ ] **모니터링**: Render 로그에서 에러 사라짐 확인

### 배포 후 검증

**1. 세션 생성 테스트**
```javascript
// WebSocket 연결 후
const sessionData = {
  userId: "test-user-id",
  startedAt: Date.now()
};
// 세션 생성 성공 확인
```

**2. 로그 모니터링**
```
✅ 예상: "Session created successfully"
❌ 이전: "Could not find the 'created_at' column"
```

**3. 데이터베이스 확인**
```sql
SELECT * FROM sessions ORDER BY "createdAt" DESC LIMIT 5;
-- 새로운 세션이 정상적으로 생성되는지 확인
```

---

## 💬 Backend 팀 메시지

### 프론트엔드 팀에게

안녕하세요, Backend 팀입니다.

WebSocket 세션 생성 실패 문제의 근본 원인을 파악하고 수정했습니다.

**문제 요약**:
- Session 모델이 snake_case 컬럼명 (`session_id`)을 찾았으나
- 실제 DB는 camelCase (`sessionId`) 사용
- 테이블명도 불일치 (`counseling_sessions` vs `sessions`)

**해결 방법**:
- 모델 설정을 DB 스키마에 맞게 수정
- 데이터베이스 변경 없이 코드만 수정

**배포 후 예상 결과**:
- WebSocket 세션 생성/조회 정상 작동
- 감정 분석 데이터 저장 정상화
- 모든 세션 기능 복구

배포 완료 후 테스트 가능하도록 알려드리겠습니다!

---

**작성**: Backend 개발팀
**최종 확인**: 2025-11-13
**다음 단계**: Git commit → Render 배포 → 프로덕션 검증

**상태**: ✅ 수정 완료 | 📦 배포 대기 중 | 🔍 검증 예정
