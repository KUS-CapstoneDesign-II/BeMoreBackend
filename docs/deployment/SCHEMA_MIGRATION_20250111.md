# 긴급 스키마 마이그레이션 가이드 v2

**날짜**: 2025-01-11
**우선순위**: 🚨 CRITICAL
**영향**: Session 생성, 대화 저장, AI 감정 분석

---

## 📋 문제 요약 (Updated)

### 증상
```
❌ Failed to create session in Supabase:
   Could not find the 'created_at' column of 'sessions' in the schema cache

❌ Failed to fetch session from Supabase:
   Error: column sessions.session_id does not exist
```

### 근본 원인 (Critical Discovery)
- **테이블 충돌**: `sessions` 테이블이 Supabase Auth의 `auth.sessions`와 충돌
- **컬럼 혼재**: 우리 애플리케이션 컬럼 + Supabase Auth 컬럼이 섞여 있음
- **중복 컬럼**: `id`, `user_id`, `created_at`, `updated_at`가 각각 2개씩 존재
- **발생 시점**: 테이블 생성 시점부터 충돌 발생

### 발견된 컬럼들
**우리 애플리케이션 컬럼**:
- `session_id`, `counselor_id`, `started_at`, `ended_at`, `emotions_data`, `status`, `duration`

**Supabase Auth 컬럼**:
- `factor_id`, `aal`, `not_after`, `refreshed_at`, `user_agent`, `ip`, `tag`, `oauth_client_id`, `refresh_token_hmac_key`

**중복 컬럼** (각 2개씩):
- `id` (integer, uuid)
- `user_id` (uuid, varchar)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 영향 범위
- ✅ 서버 실행: 정상
- ✅ WebSocket 연결: 정상 (3채널)
- ✅ AI 분석: 정상 (Gemini 감정 분석 성공)
- ❌ 세션 생성: **실패**
- ❌ 대화 저장: **실패** (conversations 테이블이 sessions 참조)
- ❌ 분석 결과 저장: **실패**

---

## 🔧 해결 방법 (Updated Solution)

### 해결 전략
테이블명을 변경하여 Supabase Auth 테이블과의 충돌을 완전히 회피:
- `sessions` → `counseling_sessions` (새 이름)
- `conversations` 테이블도 외래 키 참조 업데이트
- 코드: camelCase 사용 (JavaScript), DB: snake_case 사용 (PostgreSQL)
- Sequelize의 `underscored: true` 옵션으로 자동 변환

### Step 1: Supabase SQL Editor 접속

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - BeMore 프로젝트 선택

2. **SQL Editor 이동**
   - 좌측 메뉴: SQL Editor (⚡ 아이콘)
   - "New query" 클릭

### Step 2: 마이그레이션 스크립트 실행

1. **로컬에서 스크립트 복사**
   ```bash
   cd /Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend
   cat schema/migrations/002-create-counseling-sessions.sql | pbcopy
   ```

2. **SQL Editor에 붙여넣기**

3. **RUN 버튼 클릭** (또는 Cmd/Ctrl + Enter)

4. **예상 출력**
   ```
   DROP TABLE
   DROP TABLE
   CREATE TABLE
   CREATE INDEX
   CREATE INDEX
   CREATE INDEX
   ... (테이블 생성 및 인덱스 생성 메시지)
   ```

⚠️ **주의**: 이 마이그레이션은 기존 sessions 및 conversations 테이블을 삭제합니다. 프로덕션 데이터가 있다면 백업을 먼저 수행하세요.

### Step 3: 검증

1. **테이블 생성 확인 쿼리 실행**
   ```sql
   SELECT table_name, column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name IN ('counseling_sessions', 'conversations')
   ORDER BY table_name, ordinal_position;
   ```

2. **예상 결과 - counseling_sessions**
   | column_name | data_type | is_nullable |
   |-------------|-----------|-------------|
   | id | integer | NO |
   | session_id | character varying | NO |
   | user_id | integer | NO |
   | counselor_id | integer | YES |
   | started_at | timestamp with time zone | YES |
   | ended_at | timestamp with time zone | YES |
   | duration | integer | YES |
   | emotions_data | jsonb | YES |
   | status | character varying | YES |
   | created_at | timestamp with time zone | YES |
   | updated_at | timestamp with time zone | YES |

3. **예상 결과 - conversations**
   | column_name | data_type | is_nullable |
   |-------------|-----------|-------------|
   | id | uuid | NO |
   | session_id | character varying | NO |
   | role | character varying | NO |
   | content | text | NO |
   | emotion | character varying | YES |
   | created_at | timestamp with time zone | YES |

4. **Render 로그 확인**
   - Render Dashboard → BeMore Backend → Logs
   - 자동 재배포 대기 (git push 후)
   - 새로운 요청 시도 후 에러 없는지 확인

---

## 🧪 테스트 시나리오

### Test 1: 세션 생성
```bash
curl -X POST https://bemorebackend.onrender.com/api/session/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": 1,
    "counselorId": 1
  }'
```

**예상 결과**:
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "status": "active"
}
```

### Test 2: AI 감정 분석 및 저장
WebSocket 연결 후:
```json
{
  "type": "request_ai_response",
  "data": {
    "message": "오늘 기분이 좋아요",
    "emotion": "happy"
  }
}
```

**예상 결과**:
- ✅ Gemini 분석 성공
- ✅ 대화 DB 저장 성공
- ✅ AI 응답 반환 성공

### Test 3: 대화 히스토리 조회
```bash
curl https://bemorebackend.onrender.com/api/conversations/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**예상 결과**:
```json
{
  "success": true,
  "conversations": [
    {
      "role": "user",
      "content": "오늘 기분이 좋아요",
      "emotion": "happy",
      "created_at": "2025-01-11T..."
    },
    {
      "role": "assistant",
      "content": "...",
      "created_at": "2025-01-11T..."
    }
  ]
}
```

---

## 📊 마이그레이션 상세

### 변경 내역

| 구분 | Before | After | 이유 |
|------|--------|-------|------|
| **테이블명** | `sessions` | `counseling_sessions` | auth.sessions 충돌 회피 |
| **컬럼 규칙** | camelCase (혼재) | snake_case (일관) | PostgreSQL 표준 |
| **코드 규칙** | 혼재 | camelCase (JS) | JavaScript 표준 |
| **자동 변환** | 없음 | `underscored: true` | Sequelize 설정 |

### 변경된 컬럼명 (counseling_sessions)

| 코드 (camelCase) | DB (snake_case) | 타입 |
|------------------|-----------------|------|
| `sessionId` | `session_id` | VARCHAR(64) UNIQUE |
| `userId` | `user_id` | INTEGER |
| `counselorId` | `counselor_id` | INTEGER |
| `startedAt` | `started_at` | TIMESTAMP |
| `endedAt` | `ended_at` | TIMESTAMP |
| `emotionsData` | `emotions_data` | JSONB |
| `createdAt` | `created_at` | TIMESTAMP |
| `updatedAt` | `updated_at` | TIMESTAMP |

### 코드 변경 사항

**models/Session.js**:
- `tableName: 'sessions'` → `tableName: 'counseling_sessions'`
- `underscored: false` → `underscored: true`
- 인덱스 필드명: camelCase → snake_case

**models/Conversation.js**:
- `session_id` 필드 → `sessionId` (코드), `field: 'session_id'` (DB)
- `where: { session_id }` → `where: { sessionId }`
- 외래 키 참조: `sessions.sessionId` → `counseling_sessions.session_id`

### 외래 키 영향
- `conversations.session_id` → `counseling_sessions.session_id` (새 참조)
- CASCADE DELETE 유지: 세션 삭제 시 대화도 자동 삭제
- 마이그레이션 스크립트에 자동으로 포함됨

### 롤백 방법
만약 문제 발생 시 (⚠️ 데이터 손실 발생):
```sql
-- 코드 변경 전 버전으로 Git revert 후 실행
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS counseling_sessions CASCADE;

-- schema/init.sql의 sessions 테이블 재생성
-- (init.sql 참조)
```

**권장**: 프로덕션 데이터가 있다면 백업 후 마이그레이션 실행

---

## ✅ 완료 체크리스트

- [ ] Supabase SQL Editor에서 마이그레이션 스크립트 실행
- [ ] 검증 쿼리로 컬럼명 변경 확인
- [ ] Render 로그에서 에러 사라짐 확인
- [ ] Test 1: 세션 생성 성공
- [ ] Test 2: AI 감정 분석 및 저장 성공
- [ ] Test 3: 대화 히스토리 조회 성공
- [ ] Frontend 팀에 마이그레이션 완료 공지
- [ ] 8가지 감정 통합 테스트 진행

---

## 📞 문제 발생 시

1. **Supabase 스크립트 실행 실패**
   - 에러 메시지 확인
   - 컬럼명이 이미 snake_case인지 확인
   - 기존 데이터 백업 후 재시도

2. **외래 키 제약 조건 에러**
   - conversations 테이블 확인
   - 외래 키 임시 비활성화 후 마이그레이션
   - 재활성화

3. **Render에서 여전히 에러**
   - 캐시 클리어 (Render Dashboard → Manual Deploy)
   - 환경 변수 확인 (DATABASE_URL)
   - 로그 상세 분석

---

**작성자**: Backend Team
**검토자**: (검토 후 이름 추가)
**실행 일시**: (실행 후 기록)
**실행 결과**: (성공/실패 기록)
