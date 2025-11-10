# 긴급 스키마 마이그레이션 가이드

**날짜**: 2025-01-11
**우선순위**: 🚨 HIGH
**영향**: Session 생성, 대화 저장, AI 감정 분석

---

## 📋 문제 요약

### 증상
```
❌ Failed to create session in Supabase:
   Could not find the 'created_at' column of 'sessions' in the schema cache

❌ Failed to fetch session from Supabase:
   Error: column sessions.session_id does not exist
```

### 근본 원인
- **코드 기대값**: snake_case 컬럼명 (`session_id`, `created_at`)
- **Supabase 실제**: camelCase 컬럼명 (`sessionId`, `createdAt`)
- **발생 시점**: Render 배포 후 프로덕션 환경에서 발견

### 영향 범위
- ✅ 서버 실행: 정상
- ✅ WebSocket 연결: 정상 (3채널)
- ✅ AI 분석: 정상 (Gemini 감정 분석 성공)
- ❌ 세션 생성: **실패**
- ❌ 대화 저장: **실패** (conversations 테이블이 sessions 참조)
- ❌ 분석 결과 저장: **실패**

---

## 🔧 해결 방법

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
   cat schema/migrations/001-fix-sessions-column-names.sql | pbcopy
   ```

2. **SQL Editor에 붙여넣기**

3. **RUN 버튼 클릭** (또는 Cmd/Ctrl + Enter)

4. **예상 출력**
   ```
   ALTER TABLE
   ALTER TABLE
   ALTER TABLE
   ... (8개의 ALTER TABLE 성공 메시지)
   ```

### Step 3: 검증

1. **컬럼명 확인 쿼리 실행**
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'sessions'
   ORDER BY ordinal_position;
   ```

2. **예상 결과**
   | column_name | data_type | is_nullable |
   |-------------|-----------|-------------|
   | session_id | character varying | NO |
   | user_id | integer | NO |
   | counselor_id | integer | YES |
   | started_at | timestamp with time zone | YES |
   | ended_at | timestamp with time zone | YES |
   | emotions_data | jsonb | YES |
   | created_at | timestamp with time zone | YES |
   | updated_at | timestamp with time zone | YES |

3. **Render 로그 확인**
   - Render Dashboard → BeMore Backend → Logs
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

| Before (camelCase) | After (snake_case) |
|--------------------|--------------------|
| `sessionId` | `session_id` |
| `userId` | `user_id` |
| `counselorId` | `counselor_id` |
| `startedAt` | `started_at` |
| `endedAt` | `ended_at` |
| `emotionsData` | `emotions_data` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |

### 외래 키 영향
- `conversations.session_id` → `sessions.session_id` 참조 유지
- 마이그레이션 스크립트에 외래 키 검증 쿼리 포함

### 롤백 방법
만약 문제 발생 시:
```sql
-- 원래대로 되돌리기 (camelCase로 복원)
ALTER TABLE sessions RENAME COLUMN session_id TO "sessionId";
ALTER TABLE sessions RENAME COLUMN user_id TO "userId";
ALTER TABLE sessions RENAME COLUMN counselor_id TO "counselorId";
ALTER TABLE sessions RENAME COLUMN started_at TO "startedAt";
ALTER TABLE sessions RENAME COLUMN ended_at TO "endedAt";
ALTER TABLE sessions RENAME COLUMN emotions_data TO "emotionsData";
ALTER TABLE sessions RENAME COLUMN created_at TO "createdAt";
ALTER TABLE sessions RENAME COLUMN updated_at TO "updatedAt";
```

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
