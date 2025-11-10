# 데이터베이스 스키마 관리

**작성일**: 2025-01-10
**관리 방식**: SQL 스크립트 기반

---

## 📋 개요

BeMore Backend는 **SQL 스크립트를 통한 명시적 스키마 관리**를 사용합니다.

**이유**:
- ✅ 명확한 스키마 버전 관리
- ✅ 안전한 배포 (자동 ALTER/DROP 방지)
- ✅ 팀원들이 쉽게 이해
- ✅ Git을 통한 변경 이력 추적
- ✅ 재현 가능한 환경 구축

---

## 🚀 초기 설정 (첫 배포)

### 1. Supabase SQL Editor 접속

1. **Supabase Dashboard** 접속
   - https://supabase.com/dashboard

2. **프로젝트 선택**
   - BeMore 프로젝트 클릭

3. **SQL Editor 이동**
   - 좌측 메뉴: SQL Editor (⚡ 아이콘)

### 2. 초기화 스크립트 실행

1. **New query** 클릭

2. **schema/init.sql 내용 복사**
   ```bash
   # 로컬에서 복사
   cat schema/init.sql | pbcopy
   ```

3. **SQL Editor에 붙여넣기**

4. **RUN** 버튼 클릭 (또는 Cmd/Ctrl + Enter)

5. **결과 확인**
   ```
   status: BeMore Backend 스키마 초기화 완료!
   ```

### 3. 테이블 생성 확인

1. **Table Editor** 탭 이동
2. 다음 테이블이 생성되었는지 확인:
   - ✅ users
   - ✅ counselings
   - ✅ sessions
   - ✅ reports
   - ✅ user_preferences
   - ✅ feedbacks

---

## 🔧 Backend 설정

**app.js**에서 자동 스키마 변경을 **비활성화**합니다:

```javascript
// ❌ 사용 안 함
// sequelize.sync({ force: true, alter: true })

// ✅ 사용 (연결 확인만)
sequelize.authenticate()
```

**장점**:
- 예기치 않은 스키마 변경 방지
- 프로덕션 데이터 보호
- 명시적 스키마 관리

---

## 🆕 최신 스키마 추가 (2025-01-10)

### Conversations Table (AI 상담 대화 히스토리)

**파일**: `schema/03_conversations.sql`

**실행 방법**:
1. Supabase SQL Editor 접속
2. `schema/03_conversations.sql` 내용 복사:
   ```bash
   cat schema/03_conversations.sql | pbcopy
   ```
3. SQL Editor에 붙여넣기 후 **RUN**
4. 테이블 생성 확인:
   - ✅ conversations (대화 히스토리)
   - ✅ idx_conversations_session_id (세션 ID 인덱스)
   - ✅ idx_conversations_created_at (생성일 인덱스)

**테이블 구조**:
- `id`: UUID (PK)
- `session_id`: VARCHAR(64) (FK → sessions.sessionId)
- `role`: VARCHAR(20) ('user' | 'assistant')
- `content`: TEXT (메시지 내용)
- `emotion`: VARCHAR(20) (감정: anxious, sad, angry, happy, neutral)
- `created_at`: TIMESTAMP

### Row Level Security (RLS) 정책

**파일**: `schema/04_rls_policies.sql`

**목적**: 데이터베이스 직접 접근 차단, Backend API 전용 접근

**실행 방법**:
1. Supabase SQL Editor 접속
2. `schema/04_rls_policies.sql` 내용 복사 후 실행
3. 모든 테이블에 RLS 활성화 확인

**보안 효과**:
- ✅ Supabase 클라이언트 SDK를 통한 직접 접근 차단
- ✅ Backend API (DATABASE_URL)만 접근 가능
- ✅ 모든 테이블: `unrestricted` → `enabled (1 policy)`
- ⚠️ 프로덕션 환경 필수 설정

**중요 사항**:
- Backend는 PostgreSQL 직접 연결 (RLS 우회)
- Supabase anon/authenticated 키로는 접근 불가
- 모든 데이터 접근은 Backend API를 통해서만 가능

---

## 📝 스키마 변경 워크플로우

### 새 컬럼 추가 예시

1. **SQL 파일 작성**
   ```bash
   # schema/migrations/001-add-user-phone.sql
   ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(20);
   ```

2. **Git 커밋**
   ```bash
   git add schema/migrations/001-add-user-phone.sql
   git commit -m "feat(db): add phone column to users"
   ```

3. **Supabase에서 실행**
   - SQL Editor → 파일 내용 복사 → RUN

4. **Model 업데이트**
   ```javascript
   // models/User.js
   phone: {
     type: Sequelize.STRING(20),
     allowNull: true,
   }
   ```

5. **배포**
   ```bash
   git push origin main
   ```

---

## 🗂️ 디렉토리 구조

```
schema/
├── README.md           # 이 파일
├── init.sql            # 초기 스키마 (전체 테이블 생성)
└── migrations/         # 스키마 변경 이력
    ├── 001-xxx.sql
    ├── 002-xxx.sql
    └── ...
```

---

## ⚠️ 주의사항

### DO ✅
- SQL 스크립트를 Git에 커밋
- 변경 사항을 문서화
- Supabase SQL Editor에서 실행
- 프로덕션 전 로컬/스테이징에서 테스트

### DON'T ❌
- `sequelize.sync({ force: true })` 사용
- `sequelize.sync({ alter: true })` 프로덕션 사용
- SQL 스크립트 없이 수동으로 테이블 변경
- 스키마 변경을 문서화하지 않음

---

## 🔍 문제 해결

### Q1. 테이블이 이미 존재하는 경우?

**증상**:
```
ERROR: relation "users" already exists
```

**해결**:
1. `init.sql` 맨 위 DROP TABLE 부분이 실행되었는지 확인
2. 또는 개별 테이블만 재생성:
   ```sql
   DROP TABLE IF EXISTS "users" CASCADE;
   -- 이후 CREATE TABLE "users" 부분만 실행
   ```

### Q2. Foreign Key 에러 발생?

**증상**:
```
ERROR: insert or update on table violates foreign key constraint
```

**해결**:
- 참조하는 테이블(users)이 먼저 생성되었는지 확인
- `init.sql`의 테이블 순서대로 실행

### Q3. Sequelize Model과 실제 스키마 불일치?

**증상**:
```
column "xxx" does not exist
```

**해결**:
1. SQL 스크립트 확인 및 업데이트
2. Supabase SQL Editor에서 실행
3. Backend 재배포

---

## 📚 참고 자료

- [Supabase SQL Documentation](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [Sequelize Models](https://sequelize.org/docs/v6/core-concepts/model-basics/)

---

**작성자**: Backend Team
**최종 수정**: 2025-01-10
