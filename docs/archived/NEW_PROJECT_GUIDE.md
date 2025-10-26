# 🆕 BeMore - 새로운 Supabase 프로젝트 가이드

**상태**: 🚀 새로 시작합니다
**소요 시간**: 약 30분
**문서**: [SUPABASE_NEW_PROJECT_SETUP.md](SUPABASE_NEW_PROJECT_SETUP.md) ← 상세 가이드

---

## 📋 빠른 요약

기존 독서 앱 DB는 **무시하고**, BeMore 감정 분석 시스템 전용으로 **완전히 새로운** Supabase 프로젝트를 생성합니다.

```
❌ 기존 Supabase (독서 앱) - 사용 안 함
✅ 새로운 Supabase (BeMore) - 이것을 만들 예정
```

---

## 🎯 6가지 단계 (약 30분)

### Phase 1: 새 프로젝트 생성 (5분)
```
1. https://supabase.com 접속
2. "New Project" 클릭
3. 설정:
   - Project Name: BeMore-Emotion-Analysis
   - Password: 강력한 비밀번호 저장
   - Region: ap-southeast-1 (싱가포르)
4. 2-3분 기다리기
```

### Phase 2: 데이터베이스 테이블 생성 (10분)
```
1. SQL Editor 열기
2. 아래 SQL 복사-붙여넣기
3. "RUN" 클릭
4. 7개 테이블 생성 확인
```

**생성될 테이블**:
```sql
-- 복사해서 실행할 SQL
CREATE TABLE public.bemore_users (...)
CREATE TABLE public.bemore_sessions (...)
CREATE TABLE public.bemore_emotions (...)
CREATE TABLE public.bemore_reports (...)
CREATE TABLE public.bemore_feedback (...)
CREATE TABLE public.bemore_user_preferences (...)
CREATE TABLE public.bemore_counselors (...)
```

👉 **[전체 SQL은 여기에](SUPABASE_NEW_PROJECT_SETUP.md#step-22-전체-sql-스크립트-복사)**

### Phase 3: 보안 설정 - RLS (5분)
```
1. SQL Editor에서 RLS 정책 SQL 실행
2. 데이터 보안 활성화
```

### Phase 4: 연결 정보 복사 (2분)
```
1. Project Settings → Database
2. Connection String 복사
3. 안전한 장소에 저장
```

### Phase 5: 로컬 테스트 (8분)
```bash
# 1. .env 파일 업데이트
DATABASE_URL="postgresql://..."

# 2. 서버 실행
npm run dev

# 3. API 테스트
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","counselorId":"test"}'

# 4. Supabase에서 데이터 확인
# Table Editor → bemore_sessions → 데이터 있는지 확인
```

### Phase 6: Render 배포 (5분)
```bash
# 1. Render 환경 변수 설정
# DATABASE_URL을 Render 대시보드에 추가

# 2. Git 푸시 (자동 배포)
git push origin main

# 3. 배포 확인
curl https://bemore-backend.onrender.com/health
```

---

## 📊 생성될 테이블 구조

```
BeMore Supabase Database
├─ bemore_sessions (핵심!)
│  └─ emotions_data: JSONB (감정 배열 저장)
├─ bemore_emotions (감정 타임라인)
├─ bemore_reports (감정 분석 보고서)
├─ bemore_feedback (사용자 평가)
├─ bemore_users (사용자 관리)
├─ bemore_user_preferences (설정)
└─ bemore_counselors (상담사 정보)
```

---

## ✅ 완료 확인 체크리스트

- [ ] Phase 1: Supabase 프로젝트 생성
- [ ] Phase 2: 7개 테이블 생성 완료
- [ ] Phase 3: RLS 정책 설정
- [ ] Phase 4: DATABASE_URL 복사
- [ ] Phase 5: 로컬 테스트 성공
- [ ] Phase 6: Render 배포 완료

---

## 📚 상세 가이드

**모든 단계의 상세한 설명은 여기에 있습니다:**

👉 **[SUPABASE_NEW_PROJECT_SETUP.md](SUPABASE_NEW_PROJECT_SETUP.md)**

이 문서에 포함된 내용:
- 📸 스크린샷 및 예시
- 🔍 각 단계의 상세 설명
- ✅ 검증 방법
- 🔧 트러블슈팅
- 📋 완전한 SQL 코드

---

## 🆘 문제가 생겼나요?

**[SUPABASE_NEW_PROJECT_SETUP.md - 트러블슈팅](SUPABASE_NEW_PROJECT_SETUP.md#🔧-트러블슈팅)** 섹션을 확인하세요.

```
문제: Cannot connect to database
→ DATABASE_URL 확인, Supabase 프로젝트 상태 확인

문제: RLS policy denied access
→ RLS 임시 비활성화해서 테스트

문제: HTTP 000 error in production
→ Render 환경 변수 확인, 로그 확인
```

---

## 🎉 준비 완료!

모든 필요한 가이드가 준비되었습니다:

1. **지금 이 파일** - 빠른 요약
2. **[SUPABASE_NEW_PROJECT_SETUP.md](SUPABASE_NEW_PROJECT_SETUP.md)** - 상세 단계별 가이드
3. **기존 모든 문서** - 아키텍처, 기술 상세 등

---

## 🚀 시작하기

**지금 바로**:
1. [SUPABASE_NEW_PROJECT_SETUP.md](SUPABASE_NEW_PROJECT_SETUP.md) 열기
2. Phase 1부터 차례대로 진행
3. 약 30분 후 완료!

---

**상태**: ✅ 새로운 Supabase 프로젝트 설정 준비 완료
**다음 단계**: [상세 가이드](SUPABASE_NEW_PROJECT_SETUP.md)로 이동
