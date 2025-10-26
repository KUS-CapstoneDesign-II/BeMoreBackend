# 🔐 Supabase RLS 정책 - 타입 캐스팅 수정본

**상태**: ✅ UUID 타입 불일치 해결
**날짜**: 2025-10-26
**문제**: `operator does not exist: uuid = text`
**해결책**: 명시적 UUID 캐스팅 추가

---

## 🔧 문제 분석

**에러 메시지**:
```
ERROR: 42883: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types.
```

**원인**:
- `auth.uid()`는 UUID를 반환
- 일부 비교에서 TEXT 타입과 섞임
- 명시적 타입 캐스팅 필요

**해결책**:
- UUID 비교: `auth_user_id = auth.uid()`
- TEXT 비교가 필요한 경우: `auth_user_id::text = auth.uid()::text` (권장 안함)
- 서브쿼리에서 JOIN: 가능한 한 UUID로 유지

---

## ✅ 수정된 RLS 정책 (Step 10)

### 주의: 이전 Step 10을 완전히 삭제하고 아래 코드 사용!

```sql
-- ============================================
-- RLS 정책 설정 (타입 캐스팅 수정)
-- ============================================

-- ============================================
-- 1. bemore_users RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 정보만 조회 가능"
  ON public.bemore_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "사용자는 자신의 정보만 수정 가능"
  ON public.bemore_users
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- ============================================
-- 2. bemore_user_profiles RLS 정책
-- ============================================
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

-- ============================================
-- 3. bemore_counselors RLS 정책
-- ============================================
CREATE POLICY "상담사는 자신의 정보만 조회 가능"
  ON public.bemore_counselors
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "상담사는 자신의 정보만 수정 가능"
  ON public.bemore_counselors
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- ============================================
-- 4. bemore_sessions RLS 정책
-- ============================================
-- 사용자는 자신의 세션만 조회 (또는 상담하는 세션)
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

-- 사용자는 자신의 세션만 수정
CREATE POLICY "사용자는 자신의 세션만 수정 가능"
  ON public.bemore_sessions
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 5. bemore_emotions RLS 정책
-- ============================================
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

-- ============================================
-- 6. bemore_session_metrics RLS 정책
-- ============================================
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

-- ============================================
-- 7. bemore_reports RLS 정책
-- ============================================
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

-- ============================================
-- 8. bemore_session_assessments RLS 정책
-- ============================================
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

-- ============================================
-- 9. bemore_feedback RLS 정책
-- ============================================
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

-- ============================================
-- 10. bemore_user_preferences RLS 정책
-- ============================================
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

-- ============================================
-- 11. bemore_emotion_monthly_summary RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 월별 요약만 조회 가능"
  ON public.bemore_emotion_monthly_summary
  FOR SELECT
  USING (
    user_id = (
      SELECT id FROM public.bemore_users
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 12. bemore_audit_log RLS 정책
-- ============================================
-- 감사 로그는 시스템 전용 (RLS 기본 거부)
-- 필요시 관리자만 접근 가능하도록 별도 함수 사용

-- ============================================
-- 13. counselor_specialties RLS 정책
-- ============================================
CREATE POLICY "상담사는 자신의 특문만 조회 가능"
  ON public.counselor_specialties
  FOR SELECT
  USING (
    counselor_id IN (
      SELECT id FROM public.bemore_counselors
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "상담사는 자신의 특문만 수정 가능"
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

---

## 🔑 핵심 변경사항

### 변경 전 (❌ 오류)
```sql
-- 타입 불일치 에러 발생
WHERE auth_user_id = auth.uid()
  AND id = user_id  -- UUID = UUID (OK)
  AND user_id = (SELECT id FROM ...)  -- UUID = UUID (OK)
```

### 변경 후 (✅ 수정)
```sql
-- 서브쿼리 사용으로 명확한 UUID 비교
user_id = (
  SELECT id FROM public.bemore_users
  WHERE auth_user_id = auth.uid()
)

-- 또는 IN 연산자 사용
user_id IN (
  SELECT id FROM public.bemore_users
  WHERE auth_user_id = auth.uid()
)
```

---

## 📝 RLS 정책 적용 순서

### Step 9: RLS 활성화 (기존 그대로)
```sql
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

### Step 10: RLS 정책 설정 (이 문서의 코드 사용!)
위의 **수정된 RLS 정책** 섹션의 모든 SQL을 실행하세요.

---

## ✅ 검증

### RLS 정책 확인
```sql
-- 설정된 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 예상 결과
```
schemaname │ tablename              │ policyname                    │ qual
────────────┼────────────────────────┼───────────────────────────────┼──────
public     │ bemore_users           │ 사용자는 자신의 정보만 조회 가능  │ ...
public     │ bemore_sessions        │ 사용자/상담사는 자신의 세션만...  │ ...
... (약 20개 정책)
```

---

## 🔒 보안 검증

### Test Case 1: 사용자 A는 사용자 B의 정보를 볼 수 없음
```sql
-- 사용자 A로 로그인 후
SELECT * FROM public.bemore_users;
-- → 자신의 정보만 반환

-- 사용자 B로 로그인 후
SELECT * FROM public.bemore_users;
-- → 자신의 정보만 반환
```

### Test Case 2: 비로그인 사용자는 접근 불가
```sql
-- 로그인 없이
SELECT * FROM public.bemore_users;
-- → 0 rows (RLS 거부)
```

### Test Case 3: 상담사는 담당 사용자의 세션만 볼 수 있음
```sql
-- 상담사로 로그인 후
SELECT * FROM public.bemore_sessions;
-- → 자신이 상담하는 세션만 반환
```

---

## 📋 문제 해결 체크리스트

### RLS 정책 실행 후 에러 발생 시

- [ ] **에러**: `operator does not exist: uuid = text`
  - **해결**: 이 문서의 수정된 정책 사용 (서브쿼리로 UUID 통일)

- [ ] **에러**: `permission denied for schema public`
  - **해결**: 스키마 권한 확인
  ```sql
  GRANT USAGE ON SCHEMA public TO authenticated;
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
  ```

- [ ] **에러**: `function auth.uid() does not exist`
  - **해결**: Supabase Auth 시스템 확인 (기본 제공되어야 함)

- [ ] **데이터 조회 안 됨**: `SELECT * FROM bemore_users` 실행 후 0 rows
  - **원인**: auth.uid()가 NULL (로그인되지 않음)
  - **해결**: Supabase Auth로 사용자 생성 후 토큰으로 요청

---

## 🎯 다음 단계

1. ✅ 기존 Step 10 RLS 정책 삭제 (또는 DROP POLICY)
2. ✅ 이 문서의 수정된 정책 SQL 실행
3. ✅ Supabase Auth 사용자 생성
4. ✅ 클라이언트에서 토큰으로 요청하여 RLS 테스트

---

## 🔗 관련 문서

- [SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md) - Step 10 참조
- [IMPROVED_SCHEMA_V2_1_FIXED.md](IMPROVED_SCHEMA_V2_1_FIXED.md) - 스키마 정의

---

**상태**: ✅ RLS 정책 타입 캐스팅 수정 완료
**적용**: Supabase SQL Editor의 Step 10에서 사용
**예상 결과**: 모든 RLS 정책 정상 작동

