# Scripts Directory

유틸리티 스크립트 모음

---

## 🔧 validate-schema.js

**목적**: Sequelize 모델과 `schema/init.sql` 파일 간 일치 여부 검증

**배경**:
- 2025-01-12: `refreshToken` 컬럼 누락으로 인한 프로덕션 장애 발생
- Schema-Model 불일치로 `column "refreshToken" does not exist` 에러
- 이 스크립트는 배포 전 검증을 통해 동일한 문제 재발 방지

### 사용 방법

```bash
# 스크립트 실행
node scripts/validate-schema.js

# 또는 실행 권한 부여 후
chmod +x scripts/validate-schema.js
./scripts/validate-schema.js
```

### 출력 예시

**✅ 성공 (일치)**:
```
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

**❌ 실패 (불일치)**:
```
============================================================
Schema Validation Tool
============================================================

📋 Validating User model...
  ❌ Schema missing columns: refreshToken

============================================================
❌ VALIDATION FAILED - Schema-Model mismatch detected!

Action Required:
  1. Update schema/init.sql to match model definitions
  2. OR update models to match schema
  3. Ensure production database is updated accordingly
```

### Exit Codes

- `0`: 검증 성공 (또는 경고만 존재)
- `1`: 검증 실패 (Schema-Model 불일치)

### CI/CD 통합 (권장)

**package.json**에 추가:
```json
{
  "scripts": {
    "validate:schema": "node scripts/validate-schema.js",
    "pretest": "npm run validate:schema",
    "predeploy": "npm run validate:schema"
  }
}
```

**GitHub Actions** 예시:
```yaml
- name: Validate Schema
  run: npm run validate:schema
```

### 검증 대상

현재 검증하는 모델:
- ✅ **User** (`models/User.js`)
- ✅ **Session** (`models/Session.js`)

### 제한사항

**현재 버전**:
- 기본 컬럼 존재 여부만 확인
- 컬럼 타입, 제약조건, 인덱스는 미검증

**향후 개선 (선택)**:
- 컬럼 타입 검증 (VARCHAR vs TEXT)
- 제약조건 검증 (NOT NULL, UNIQUE)
- 인덱스 검증
- 외래 키 검증

### 유지보수

**새 모델 추가 시**:

`validate-schema.js` 파일의 `modelFields` 객체에 추가:

```javascript
const modelFields = {
  User: { ... },
  Session: { ... },
  YourNewModel: {
    file: 'models/YourNewModel.js',
    fields: [
      'id',
      'field1',
      'field2',
      // ... 모든 필드 나열
      'createdAt',
      'updatedAt'
    ]
  }
};
```

---

## 향후 추가 예정 스크립트

- `migrate-db.js` - 데이터베이스 마이그레이션 자동화
- `seed-db.js` - 테스트 데이터 시딩
- `check-env.js` - 환경변수 검증
- `backup-db.js` - 데이터베이스 백업

---

**작성일**: 2025-01-12
**마지막 업데이트**: 2025-01-12
