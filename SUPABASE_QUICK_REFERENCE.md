# 🎯 Supabase 설정 빠른 참조 가이드

**상태**: ✅ 준비 완료
**예상 소요 시간**: 30분
**문서 위치**: [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md)

---

## 📋 5가지 주요 단계

### Phase 1: Supabase 프로젝트 생성 (5분)
```
1. https://app.supabase.com 접속
2. "New project" 클릭
3. 프로젝트명: BeMore-EmotionAnalysis
4. 지역: Asia Pacific (ap-southeast-1) - 서울
5. ⏳ 2-3분 대기
6. ✅ SQL Editor 접속
```

---

### Phase 2: 스키마 설정 (15분)

**⚠️ 순서대로 하나씩 실행!**

| 순서 | 단계 | 내용 |
|------|------|------|
| 0 | Extension | pgcrypto 확장 설치 |
| 1 | ENUM | 6가지 열거형 정의 |
| 2 | Functions | 3가지 트리거 함수 |
| 3 | Users | 사용자 & 상담사 테이블 |
| 4 | Sessions | 세션 코어 테이블 |
| 5 | Emotions | 감정 & 메트릭 테이블 |
| 6 | Reports | 분석 & 리포트 테이블 |
| 7 | Feedback | 피드백 & 설정 테이블 |
| 8 | Summary | 월별 요약 & 감사 로그 |

---

### Phase 3: Row Level Security (5분)

| 단계 | 작업 |
|------|------|
| 9 | RLS 활성화 (모든 테이블) |
| 10 | RLS 정책 설정 |

---

### Phase 4: 검증 (5분)

| 확인사항 | 체크 |
|---------|------|
| 13개 테이블 생성 확인 | ✅ |
| 연결 문자열 복사 | ✅ |

---

### Phase 5-6: Backend & Render (5분)

| 단계 | 작업 | 파일 |
|------|------|------|
| 13 | .env 수정 | `.env` |
| 14 | Database 설정 확인 | `config/database.js` |
| 15 | 로컬 테스트 | `npm run dev` |
| 16 | API 테스트 | `curl` |
| 17-19 | Render 배포 | Dashboard |

---

## 🔗 테이블 구조 한눈에

```
BeMore Database (13 tables)

👤 사용자 관리
├─ bemore_users (핵심)
├─ bemore_user_profiles (프로필)
├─ bemore_user_preferences (설정)
└─ counselor_specialties (상담사 특문)

🎭 상담 관리
├─ bemore_counselors (상담사)
└─ bemore_sessions (세션) ⭐

📊 감정 분석
├─ bemore_emotions (타임라인)
├─ bemore_session_metrics (메트릭)
└─ bemore_emotion_monthly_summary (월별)

📈 분석 & 리포트
├─ bemore_reports (리포트)
├─ bemore_session_assessments (평가)
└─ bemore_feedback (피드백)

🔐 감사
└─ bemore_audit_log (감사 추적)
```

---

## ⚙️ 중요 설정

### ENUM Types (6가지)
```sql
emotion_type: happy, sad, angry, anxious, excited, neutral
session_status: active, paused, ended
counselor_status: active, inactive
language_type: ko, en
expertise_level_type: beginner, intermediate, expert
```

### Triggers (3가지)
```sql
set_updated_at()          -- updated_at 자동 갱신
forbid_update_session_id() -- session_id 불변성
audit_row()               -- 감사 로깅
```

### Indexes (성능)
- user_id, session_id, status, created_at
- GIN: emotions_data (JSONB)

---

## 🔐 RLS 정책 (자동 적용)

```
✅ 사용자는 자신의 정보만 접근 가능
✅ 상담사는 상담하는 사용자 정보만 접근
✅ 감정 데이터는 세션 소유자만 조회
✅ 감사 로그는 시스템만 기록
```

---

## 📝 필수 체크리스트

### Supabase
- [ ] 새 프로젝트 생성 완료
- [ ] Step 0-8 SQL 실행 완료
- [ ] 13개 테이블 확인
- [ ] RLS 정책 설정 완료
- [ ] 연결 문자열 복사

### Backend
- [ ] `.env` 파일 DATABASE_URL 설정
- [ ] `config/database.js` 확인
- [ ] `npm run dev` 테스트 성공
- [ ] API 테스트 성공

### Render
- [ ] DATABASE_URL 환경 변수 설정
- [ ] 코드 배포 완료
- [ ] `/health` 엔드포인트 응답 확인

---

## 🚨 트러블슈팅

### "Cannot connect to PostgreSQL"
```
1. DATABASE_URL 올바른지 확인
2. Supabase IP 화이트리스트 확인
3. 연결 문자열 복사해서 다시 붙여넣기
```

### "RLS policy denied"
```
1. auth_user_id가 올바른지 확인
2. RLS 정책이 제대로 설정되었는지 확인
3. 테스트: RLS 임시 비활성화 후 확인
```

### "Module not found"
```
1. config/database.js 경로 확인
2. 절대 경로 사용 (path.join 사용)
```

---

## 📞 주요 문서

| 문서 | 목적 | 길이 |
|------|------|------|
| [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md) | 완전한 설정 가이드 | 550줄 |
| [IMPROVED_SCHEMA_V2_1_FIXED.md](IMPROVED_SCHEMA_V2_1_FIXED.md) | ChatGPT 최종 수정 스키마 | 1100줄 |
| [DATABASE_SCHEMA_ANALYSIS.md](DATABASE_SCHEMA_ANALYSIS.md) | 스키마 분석 및 전략 | 386줄 |

---

## 🎯 다음 단계

### 즉시
1. [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md) 열기
2. Phase 1: Supabase 프로젝트 생성
3. Phase 2: SQL 단계별 실행

### 후속
1. Backend DATABASE_URL 설정
2. Render 배포
3. 프로덕션 테스트

---

**시작하기**: [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md)의 Phase 1부터 시작!

