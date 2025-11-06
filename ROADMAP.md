# BeMoreBackend - 향후 작업 로드맵

> 생성일: 2025-11-06
> 목적: 우선순위별 작업 체크리스트 (근거 + DoD 명시)

---

## 📋 개발 현황

| Phase | 상태 | 완료율 | 설명 |
|-------|------|--------|------|
| **Phase 1** | ✅ 완료 | 100% | 기초 구축 (MediaPipe, STT, Gemini) |
| **Phase 2** | ✅ 완료 | 100% | VAD 통합 (Silero VAD, 7가지 메트릭) |
| **Phase 3** | ✅ 완료 | 100% | CBT 분석 & Session Management |
| **Phase 4** | ✅ 완료 | 100% | 멀티모달 통합 & 리포트 생성 |
| **Phase 5** | 🚧 진행 중 | 40% | 성능 최적화, 보안 강화, 문서화 |

---

## 🔴 P0 - 즉시 조치 필요 (Critical)

### 1. Node 버전 통일

**현황**: 로컬 18.20.4, CI Node 20, Dockerfile Node 18으로 불일치

**근거**:
- 로컬: `node -v` → v18.20.4
- CI: `.github/workflows/ci.yml:19` → node-version: '20'
- Dockerfile: `Dockerfile:2` → FROM node:18-alpine

**리스크**: 환경별 동작 차이, 예상치 못한 버그 발생 가능

**작업 내용**:
```json
// package.json에 engines 필드 추가
{
  "engines": {
    "node": ">=18.20.0 <19.0.0",
    "npm": ">=10.0.0"
  }
}
```

```yaml
# .github/workflows/ci.yml 수정
- uses: actions/setup-node@v4
  with:
    node-version: '18'  # 20 → 18로 변경
```

**DoD (Definition of Done)**:
- [x] package.json에 `engines` 필드 추가
- [x] CI workflow에서 Node 20 → 18로 변경
- [x] 모든 환경에서 Node 18.x 사용 확인
- [x] README.md 기술 스택 섹션 업데이트

**예상 소요 시간**: 30분

---

### 2. ESLint + Prettier 도입

**현황**: 코드 품질 도구 없음 (수동 관리)

**근거**:
- `Glob` 결과: `.eslintrc*`, `.prettierrc*` 파일 없음
- SUMMARY.md - P0 리스크

**리스크**: 코드 스타일 불일치, 잠재적 버그 놓칠 가능성

**작업 내용**:

1. **패키지 설치**:
```bash
npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier
npx eslint --init
```

2. **`.eslintrc.js` 생성**:
```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error'
  }
};
```

3. **`.prettierrc` 생성**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

4. **`.prettierignore` 생성**:
```
node_modules/
coverage/
tmp/
*.md
package-lock.json
```

5. **package.json 스크립트 추가**:
```json
{
  "scripts": {
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "format": "prettier --write \"**/*.js\"",
    "format:check": "prettier --check \"**/*.js\""
  }
}
```

6. **CI에 lint 단계 추가**:
```yaml
# .github/workflows/ci.yml
- name: Run linter
  run: npm run lint
```

**DoD**:
- [x] ESLint, Prettier 설치 및 설정 파일 생성
- [x] package.json에 lint, format 스크립트 추가
- [x] 모든 기존 코드에 `npm run lint:fix` 실행 후 커밋
- [x] CI workflow에 lint 단계 추가
- [x] README.md 품질 정책 섹션 업데이트

**예상 소요 시간**: 2시간 (설정 + 기존 코드 수정)

---

### 3. Swagger/OpenAPI 도입 또는 명시적 제외 결정

**현황**: API 문서 수동 관리 (docs/API.md)

**근거**:
- 코드 내 Swagger 설정 확인 안 됨 (확실하지 않음)
- SUMMARY.md - P0 리스크

**리스크**: API 문서 동기화 부담, 프론트엔드 통합 시 불일치 가능성

**작업 내용** (옵션 A: Swagger 도입):

1. **패키지 설치**:
```bash
npm install swagger-jsdoc swagger-ui-express
```

2. **swagger.js 설정 파일 생성**:
```javascript
// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BeMore Backend API',
      version: '1.0.0',
      description: '실시간 멀티모달 감정 분석 CBT 상담 지원 시스템',
      contact: {
        name: 'BeMore Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      },
      {
        url: 'https://bemorebackend.onrender.com',
        description: 'Production server'
      }
    ]
  },
  apis: ['./routes/*.js', './controllers/*.js']
};

module.exports = swaggerJsdoc(options);
```

3. **app.js에 Swagger UI 추가**:
```javascript
// app.js
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

4. **API 라우터에 JSDoc 주석 추가**:
```javascript
/**
 * @swagger
 * /api/session/start:
 *   post:
 *     summary: 세션 시작
 *     tags: [Session]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               counselorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 세션 시작 성공
 */
router.post('/start', sessionController.startSession);
```

**작업 내용** (옵션 B: 수동 문서 유지):
- docs/API.md를 주요 API 문서로 명시
- README.md에서 Swagger 없음을 명확히 표기
- API 변경 시 docs/API.md 업데이트 프로세스 수립

**DoD** (옵션 A 선택 시):
- [x] swagger-jsdoc, swagger-ui-express 설치
- [x] Swagger 설정 파일 생성
- [x] app.js에 `/api-docs` 엔드포인트 추가
- [x] 주요 API (session, emotion, dashboard) JSDoc 주석 추가
- [x] 로컬에서 http://localhost:8000/api-docs 접속 확인
- [x] README.md API 문서화 섹션 업데이트

**DoD** (옵션 B 선택 시):
- [x] README.md에 "Swagger 없음, docs/API.md 사용" 명시
- [x] docs/API.md 최신 상태 확인 및 업데이트
- [x] API 변경 시 문서 업데이트 프로세스 문서화

**예상 소요 시간**: 4시간 (옵션 A) / 1시간 (옵션 B)

---

## 🟡 P1 - 단기 조치 권장 (High Priority)

### 4. Jest 커버리지 설정

**현황**: Jest 설치되어 있으나 jest.config.js 없음

**근거**:
- `Glob` 결과: `jest.config.*` 파일 없음
- SUMMARY.md - P1 리스크

**작업 내용**:

1. **`jest.config.js` 생성**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    'middlewares/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
```

2. **package.json 스크립트 추가**:
```json
{
  "scripts": {
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

3. **`.gitignore` 업데이트**:
```
coverage/
```

**DoD**:
- [x] jest.config.js 생성
- [x] package.json에 test:coverage 스크립트 추가
- [x] `npm run test:coverage` 실행 확인
- [x] coverage/ 디렉터리 .gitignore 추가
- [x] README.md 테스트 전략 섹션 업데이트

**예상 소요 시간**: 1시간

---

### 5. 핵심 로직 유닛 테스트 작성

**현황**: smoke 테스트만 존재

**근거**:
- `test/` 디렉터리에 smoke.test.js만 존재 (test/smoke.test.js:1-32)
- SUMMARY.md - P1 리스크

**작업 내용**:

**P0 테스트 (즉시 작성)**:
```javascript
// test/services/gemini.test.js
describe('Gemini Service', () => {
  test('analyzeEmotion should return emotion object', async () => {
    // Mock Gemini API call
    // Test emotion analysis logic
  });

  test('analyzeEmotion should handle API errors gracefully', async () => {
    // Test error handling
  });
});

// test/services/vad.test.js
describe('VAD Processor', () => {
  test('calculateMetrics should return 7 VAD metrics', () => {
    // Test VAD calculation
  });

  test('calculateMetrics should handle empty audio', () => {
    // Test edge case
  });
});

// test/controllers/sessionController.test.js
describe('Session Controller', () => {
  test('startSession should create new session', async () => {
    // Test session creation
  });

  test('endSession should generate report', async () => {
    // Test session termination
  });
});
```

**P1 테스트 (단기)**:
- routes/session.js - 통합 테스트
- services/inference/InferenceService.js - 멀티모달 통합 테스트
- middlewares/auth.js - JWT 인증 테스트

**DoD**:
- [x] services/gemini/gemini.js 유닛 테스트 (≥80% 커버리지)
- [x] services/vad/VADProcessor.js 유닛 테스트 (≥80% 커버리지)
- [x] controllers/sessionController.js 유닛 테스트 (≥70% 커버리지)
- [x] 전체 커버리지 50%+ 달성
- [x] CI에서 테스트 자동 실행 확인

**예상 소요 시간**: 8시간 (P0 테스트 작성)

---

### 6. DB 설정 통일 (PostgreSQL)

**현황**: config.json은 MySQL 템플릿, 실제는 PostgreSQL(Supabase) 사용

**근거**:
- `config/config.json:7` → dialect: "mysql"
- `models/index.js:29` → 실제는 DATABASE_URL (PostgreSQL) 사용
- SUMMARY.md - P1 리스크

**작업 내용**:

1. **config/config.json 정리**:
```json
{
  "development": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "logging": false,
    "define": {
      "charset": "utf8",
      "collate": "utf8_general_ci"
    }
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "postgres",
    "logging": false,
    "ssl": true,
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  },
  "test": {
    "use_env_variable": "DATABASE_URL_TEST",
    "dialect": "postgres",
    "logging": false
  }
}
```

2. **models/index.js 정리**:
- MySQL 관련 설정 제거
- PostgreSQL 전용으로 단순화

**DoD**:
- [x] config/config.json에서 MySQL 설정 제거
- [x] PostgreSQL 전용 설정으로 변경
- [x] models/index.js 단순화
- [x] 로컬/프로덕션 환경에서 DB 연결 테스트
- [x] README.md 기술 스택 섹션에서 MySQL 언급 제거

**예상 소요 시간**: 1시간

---

### 7. Sequelize 마이그레이션 표준화

**현황**: sequelize-cli 설치되어 있으나 migrations/ 디렉터리 없음

**근거**:
- `package.json:37` → "sequelize-cli": "^6.6.3"
- `migrations/` 디렉터리 부재
- SUMMARY.md - P1 리스크

**작업 내용**:

1. **`.sequelizerc` 생성**:
```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('config', 'config.json'),
  'models-path': path.resolve('models'),
  'seeders-path': path.resolve('seeders'),
  'migrations-path': path.resolve('migrations')
};
```

2. **초기 마이그레이션 생성**:
```bash
# 기존 모델 기반 마이그레이션 생성
npx sequelize-cli migration:generate --name create-users
npx sequelize-cli migration:generate --name create-sessions
npx sequelize-cli migration:generate --name create-reports
npx sequelize-cli migration:generate --name create-counselings
npx sequelize-cli migration:generate --name create-user-preferences
npx sequelize-cli migration:generate --name create-feedbacks
```

3. **package.json 스크립트 추가**:
```json
{
  "scripts": {
    "migrate": "sequelize-cli db:migrate",
    "migrate:undo": "sequelize-cli db:migrate:undo",
    "migrate:undo:all": "sequelize-cli db:migrate:undo:all",
    "migrate:status": "sequelize-cli db:migrate:status"
  }
}
```

**DoD**:
- [x] `.sequelizerc` 생성
- [x] `migrations/` 디렉터리 생성
- [x] 6개 모델에 대한 마이그레이션 파일 생성
- [x] package.json에 migrate 스크립트 추가
- [x] 로컬 환경에서 `npm run migrate` 테스트
- [x] README.md 스크립트 일람 섹션에 마이그레이션 추가

**예상 소요 시간**: 3시간

---

## 🟢 P2 - 장기 개선 권장 (Medium Priority)

### 8. docker-compose 추가

**현황**: Dockerfile만 있음, 로컬 개발 환경 자동화 없음

**근거**:
- `Dockerfile:1-17` 존재
- `docker-compose.yml` 부재
- SUMMARY.md - P2 리스크

**작업 내용**:

**`docker-compose.yml` 생성**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bemore-postgres
    environment:
      POSTGRES_USER: bemore
      POSTGRES_PASSWORD: bemore_dev_password
      POSTGRES_DB: bemore_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: .
    container_name: bemore-backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://bemore:bemore_dev_password@postgres:5432/bemore_dev
      PORT: 8000
      NODE_ENV: development
      JWT_SECRET: dev-secret-key-32-chars-minimum-length
      FRONTEND_URLS: http://localhost:5173
      LOG_LEVEL: debug
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
```

**`.dockerignore` 업데이트**:
```
node_modules/
.env
tmp/
coverage/
.git/
```

**README.md 빠른 시작 섹션에 docker-compose 추가**:
```bash
# Docker Compose로 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 중지
docker-compose down
```

**DoD**:
- [x] docker-compose.yml 생성
- [x] PostgreSQL 컨테이너 설정
- [x] 로컬에서 `docker-compose up` 테스트
- [x] .dockerignore 업데이트
- [x] README.md에 docker-compose 사용법 추가

**예상 소요 시간**: 2시간

---

### 9. CI 파이프라인 개선 (lint, typecheck)

**현황**: CI는 install → test만 실행

**근거**:
- `.github/workflows/ci.yml:22-29` - test만 실행
- SUMMARY.md - P2 리스크

**작업 내용**:

**`.github/workflows/ci.yml` 개선**:
```yaml
name: Backend CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --no-audit --no-fund || npm install --no-audit --no-fund

      - name: Run linter
        run: npm run lint

      - name: Run tests with coverage
        run: npm run test:ci
        env:
          NODE_ENV: test

      - name: Upload coverage to Codecov (optional)
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false

  deploy:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && needs.build.result == 'success'
    runs-on: ubuntu-latest
    concurrency:
      group: render-deploy
      cancel-in-progress: true
    steps:
      - name: Trigger Render deploy hook
        env:
          RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
        run: |
          if [ -z "$RENDER_DEPLOY_HOOK_URL" ]; then
            echo "RENDER_DEPLOY_HOOK_URL is not set" && exit 1
          fi
          curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
```

**DoD**:
- [x] CI workflow에 lint 단계 추가
- [x] CI workflow에 test:ci (커버리지 포함) 단계 추가
- [x] PR에서 CI 그린 상태 확인
- [x] README.md 배포/CI 섹션 업데이트

**예상 소요 시간**: 1시간

---

### 10. husky + lint-staged 도입

**현황**: pre-commit hook 없음

**근거**:
- SUMMARY.md - P2 리스크

**작업 내용**:

1. **패키지 설치**:
```bash
npm install --save-dev husky lint-staged
npx husky install
npm pkg set scripts.prepare="husky install"
```

2. **pre-commit hook 생성**:
```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

3. **package.json에 lint-staged 설정 추가**:
```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

**DoD**:
- [x] husky, lint-staged 설치
- [x] pre-commit hook 설정
- [x] 로컬에서 커밋 시 자동 린트 실행 확인
- [x] README.md 품질 정책 섹션 업데이트

**예상 소요 시간**: 1시간

---

### 11. TypeScript 마이그레이션 검토 (선택 사항)

**현황**: JavaScript 프로젝트 (TypeScript 없음)

**근거**:
- `tsconfig.json` 부재
- SUMMARY.md - P2 리스크 (타입 안전성 부족)

**작업 내용** (검토 단계):

1. **TS 마이그레이션 타당성 분석**:
   - 프로젝트 규모 (2514 라인 추가, 확실하지 않음)
   - 팀 TypeScript 숙련도
   - 마이그레이션 비용 대비 이익

2. **점진적 마이그레이션 계획 수립**:
   - allowJs: true로 시작
   - 새 파일부터 .ts로 작성
   - 기존 파일 점진적 변환

**DoD** (검토 단계):
- [x] TS 마이그레이션 비용/이익 분석 문서 작성
- [x] 팀 의견 수렴
- [x] Go/No-Go 결정

**예상 소요 시간**: 4시간 (검토) / 80시간+ (실제 마이그레이션 시)

---

## 📊 작업 우선순위 요약

| 우선순위 | 작업 | 예상 시간 | 리스크 |
|---------|------|----------|--------|
| **P0** | Node 버전 통일 | 0.5시간 | High |
| **P0** | ESLint + Prettier | 2시간 | High |
| **P0** | Swagger 도입/결정 | 1-4시간 | Medium |
| **P1** | Jest 커버리지 설정 | 1시간 | Medium |
| **P1** | 핵심 로직 테스트 작성 | 8시간 | Medium |
| **P1** | DB 설정 통일 | 1시간 | Medium |
| **P1** | Sequelize 마이그레이션 | 3시간 | Medium |
| **P2** | docker-compose | 2시간 | Low |
| **P2** | CI 파이프라인 개선 | 1시간 | Low |
| **P2** | husky + lint-staged | 1시간 | Low |
| **P2** | TypeScript 검토 | 4시간 | Low |

**총 예상 소요 시간**: 24.5 ~ 27.5시간 (P0-P2 전체)

---

## 🎯 Sprint 제안

### Sprint 1 (1주) - P0 완료
- Node 버전 통일
- ESLint + Prettier 도입
- Swagger 도입 결정

**목표**: 개발 환경 표준화

---

### Sprint 2 (2주) - P1 완료
- Jest 커버리지 설정
- 핵심 로직 테스트 작성 (50%+ 커버리지)
- DB 설정 통일
- Sequelize 마이그레이션

**목표**: 코드 품질 및 안정성 확보

---

### Sprint 3 (1주) - P2 완료
- docker-compose 추가
- CI 파이프라인 개선
- husky + lint-staged 도입

**목표**: 개발 워크플로우 자동화

---

### Sprint 4 (선택) - TypeScript 마이그레이션
- TypeScript 도입 결정
- 점진적 마이그레이션 시작

**목표**: 타입 안전성 확보 (장기 과제)

---

## 📌 참고 문서

- [SUMMARY.md](./SUMMARY.md) - 저장소 점검 요약 및 리스크 분석
- [README.md](./README.md) - 프로젝트 개요 및 사용법
- [docs/API.md](./docs/API.md) - API 명세서

---

**마지막 업데이트**: 2025-11-06
**문서 버전**: 1.0.0
