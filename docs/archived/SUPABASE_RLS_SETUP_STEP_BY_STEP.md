# 🔐 Supabase RLS 설정 - 단계별 실행 가이드

**현재 상태**: 모든 13개 테이블 생성 완료 ✅
**다음 단계**: RLS 활성화 및 정책 설정
**예상 시간**: 10분

---

## 📍 현재 Table Editor 상태

```
✅ bemore_audit_log (unrestricted)
✅ bemore_counselors
✅ bemore_emotion_monthly_summary (unrestricted)
✅ bemore_emotions
✅ bemore_feedback
✅ bemore_reports
✅ bemore_session_assessments (unrestricted)
✅ bemore_session_metrics
✅ bemore_sessions
✅ bemore_user_preferences
✅ bemore_user_profiles
✅ bemore_users
✅ counselor_specialties (unrestricted)
```

**해석**: `unrestricted` = RLS가 아직 활성화되지 않음 → 다음 단계에서 고정

---

## 🎯 Step-by-Step 실행

### Step 1: Supabase SQL Editor 열기

1. Supabase 대시보드 접속
2. 왼쪽 사이드바 → **SQL Editor**
3. **"+ New Query"** 클릭
4. 빈 에디터 준비

---

### Step 2: RLS 활성화 SQL 실행

다음 SQL을 **새로운 쿼리**에 붙여넣고 **"Run"** 클릭:

```sql
-- ============================================
-- Step 9: RLS 활성화 (모든 테이블)
-- ============================================
ALTER TABLE public.bemore_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_session_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotion_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counselor_specialties ENABLE ROW LEVEL SECURITY;
```

**✅ 예상 결과**:
```
(12 rows affected)
```

---

### Step 3: RLS 활성화 확인

다음 SQL을 **새로운 쿼리**에서 실행:

```sql
-- RLS 활성화 여부 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**✅ 예상 결과**: 모든 테이블에서 `rowsecurity = true`

```
tablename                      rowsecurity
─────────────────────────────  ────────────
bemore_audit_log               t
bemore_counselors              t
bemore_emotion_monthly_summary t
bemore_emotions                t
bemore_feedback                t
bemore_reports                 t
bemore_session_assessments     t
bemore_session_metrics         t
bemore_sessions                t
bemore_user_preferences        t
bemore_user_profiles           t
bemore_users                   t
counselor_specialties          t
```

---

### Step 4: RLS 정책 설정

다음 SQL을 **새로운 쿼리**에 붙여넣고 **"Run"** 클릭:

```sql
-- ============================================
-- Step 10: RLS 정책 설정 (타입 캐스팅 수정)
-- ============================================

-- 1. bemore_users
CREATE POLICY "사용자는 자신의 정보만 조회 가능"
  ON public.bemore_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "사용자는 자신의 정보만 수정 가능"
  ON public.bemore_users
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- 2. bemore_user_profiles
CREATE POLICY "사용자는 자신의 프로필만 조회 가능"
  ON public.bemore_user_profiles
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 프로필만 수정 가능"
  ON public.bemore_user_profiles
  FOR UPDATE
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 3. bemore_counselors
CREATE POLICY "상담사는 자신의 정보만 조회 가능"
  ON public.bemore_counselors
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "상담사는 자신의 정보만 수정 가능"
  ON public.bemore_counselors
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- 4. bemore_sessions
CREATE POLICY "사용자/상담사는 자신의 세션만 조회 가능"
  ON public.bemore_sessions
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
    OR
    counselor_id IN (
      SELECT id FROM public.bemore_counselors
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 세션만 수정 가능"
  ON public.bemore_sessions
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 5. bemore_emotions
CREATE POLICY "사용자는 자신의 세션 감정만 조회 가능"
  ON public.bemore_emotions
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
        OR
        counselor_id IN (
          SELECT id FROM public.bemore_counselors
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 6. bemore_session_metrics
CREATE POLICY "사용자는 자신의 세션 메트릭만 조회 가능"
  ON public.bemore_session_metrics
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
        OR
        counselor_id IN (
          SELECT id FROM public.bemore_counselors
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 7. bemore_reports
CREATE POLICY "사용자는 자신의 리포트만 조회 가능"
  ON public.bemore_reports
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
        OR
        counselor_id IN (
          SELECT id FROM public.bemore_counselors
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 8. bemore_session_assessments
CREATE POLICY "사용자/상담사는 자신의 평가만 조회 가능"
  ON public.bemore_session_assessments
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
        OR
        counselor_id IN (
          SELECT id FROM public.bemore_counselors
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 9. bemore_feedback
CREATE POLICY "사용자는 자신의 피드백만 삽입 가능"
  ON public.bemore_feedback
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "사용자는 자신의 피드백만 조회 가능"
  ON public.bemore_feedback
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.bemore_sessions
      WHERE
        user_id IN (
          SELECT id FROM public.bemore_users
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 10. bemore_user_preferences
CREATE POLICY "사용자는 자신의 설정만 조회 가능"
  ON public.bemore_user_preferences
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 설정만 수정 가능"
  ON public.bemore_user_preferences
  FOR UPDATE
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 11. bemore_emotion_monthly_summary
CREATE POLICY "사용자는 자신의 월별 요약만 조회 가능"
  ON public.bemore_emotion_monthly_summary
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- 12. counselor_specialties
CREATE POLICY "상담사는 자신의 특문만 조회 가능"
  ON public.counselor_specialties
  FOR SELECT
  USING (
    counselor_id IN (
      SELECT id FROM public.bemore_counselors
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "상담사는 자신의 특문을 수정 가능"
  ON public.counselor_specialties
  FOR UPDATE
  USING (
    counselor_id IN (
      SELECT id FROM public.bemore_counselors
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "상담사는 자신의 특문을 삽입 가능"
  ON public.counselor_specialties
  FOR INSERT
  WITH CHECK (
    counselor_id IN (
      SELECT id FROM public.bemore_counselors
      WHERE auth_user_id = auth.uid()
    )
  );
```

**✅ 예상 결과**:
```
(22 rows affected)
```

---

### Step 5: RLS 정책 확인

다음 SQL을 **새로운 쿼리**에서 실행:

```sql
-- RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**✅ 예상 결과**: 22개 정책이 모두 표시됨

```
schemaname │ tablename              │ policyname                  │ permissive
────────────┼────────────────────────┼─────────────────────────────┼────────────
public     │ bemore_counselors      │ 상담사는 자신의 정보만 수정 가능 │ t
public     │ bemore_counselors      │ 상담사는 자신의 정보만 조회 가능 │ t
public     │ bemore_emotions        │ 사용자는 자신의 세션 감정만 조회... │ t
public     │ bemore_feedback        │ 사용자는 자신의 피드백만 삽입 가능 │ t
public     │ bemore_feedback        │ 사용자는 자신의 피드백만 조회 가능 │ t
... (16 more policies)
```

---

### Step 6: Table Editor에서 확인

1. Supabase 대시보드 → **Table Editor**
2. 각 테이블 이름 옆 RLS 상태 확인

**변경 전**:
```
bemore_users: no policies
bemore_sessions: no policies
```

**변경 후**:
```
bemore_users: 2 policies
bemore_sessions: 2 policies
bemore_emotions: 1 policy
... (모든 테이블에 정책 표시)
```

---

## ✅ 완료 체크리스트

### RLS 설정 완료
- [ ] Step 2: RLS 활성화 SQL 실행 (12 rows affected)
- [ ] Step 3: RLS 활성화 확인 (rowsecurity = true)
- [ ] Step 4: RLS 정책 SQL 실행 (22 rows affected)
- [ ] Step 5: RLS 정책 확인 (22개 정책 표시)
- [ ] Step 6: Table Editor에서 정책 개수 확인

### 다음 단계
- [ ] Step 11: 13개 테이블 생성 확인 (완료!)
- [ ] Step 12: 연결 문자열 (DATABASE_URL) 복사

---

## 🎯 이제 할 일

1. ✅ 위의 Step 2-5를 Supabase SQL Editor에서 순서대로 실행
2. ✅ Step 6에서 Table Editor 확인
3. ⏳ Step 12: DATABASE_URL 복사

---

## 🔗 관련 문서

- [RLS_POLICIES_FIXED.md](RLS_POLICIES_FIXED.md) - 전체 정책 설명
- [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md) - 전체 가이드
- [RLS_FIX_QUICK_REFERENCE.md](RLS_FIX_QUICK_REFERENCE.md) - 빠른 참조

---

**상태**: 🎯 RLS 설정 준비 완료
**다음**: Supabase SQL Editor에서 위의 SQL 실행!

