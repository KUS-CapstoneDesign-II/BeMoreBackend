# 🔧 RLS 정책 타입 캐스팅 오류 해결

**상태**: ✅ 수정 완료
**오류**: `ERROR: 42883: operator does not exist: uuid = text`
**해결책**: [RLS_POLICIES_FIXED.md](RLS_POLICIES_FIXED.md) 사용

---

## 🎯 빠른 해결

### 문제 상황
Supabase SQL Editor에서 Step 10 RLS 정책 실행 시:

```
ERROR: 42883: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types.
```

### 해결 방법

**Step 1**: [RLS_POLICIES_FIXED.md](RLS_POLICIES_FIXED.md) 파일 열기

**Step 2**: **수정된 RLS 정책** 섹션의 모든 SQL 복사

**Step 3**: Supabase SQL Editor에 붙여넣고 실행

---

## 📝 변경사항 요약

### 변경 전 (❌ 오류)
```sql
EXISTS (
  SELECT 1 FROM public.bemore_users
  WHERE id = user_id AND auth_user_id = auth.uid()
  -- ↑ UUID = UUID 비교는 OK
  -- 하지만 전체 문맥에서 타입 불일치 발생
)
```

### 변경 후 (✅ OK)
```sql
user_id = (
  SELECT id FROM public.bemore_users
  WHERE auth_user_id = auth.uid()
)
-- ↑ 서브쿼리로 명확한 UUID 대 UUID 비교
```

---

## 🔗 관련 문서

- **[RLS_POLICIES_FIXED.md](RLS_POLICIES_FIXED.md)** - 전체 수정된 RLS 코드
- **[SUPABASE_IMPLEMENTATION_GUIDE.md](SUPABASE_IMPLEMENTATION_GUIDE.md)** - Step 10 업데이트
- **[SUPABASE_IMPLEMENTATION_GUIDE.md#step-10](SUPABASE_IMPLEMENTATION_GUIDE.md)** - Step 10 링크

---

**해결 방법**: [RLS_POLICIES_FIXED.md](RLS_POLICIES_FIXED.md)의 모든 SQL을 Step 10에서 실행

