# 🔔 User Preferences API 최적화 가이드

**작성일**: 2025-01-10
**대상**: BeMore Frontend 팀
**우선순위**: Medium (기능은 작동하지만 최적화 필요)

---

## 📋 요약

**현재 상황**: 프론트엔드가 로그인 여부와 관계없이 `/api/user/preferences` API를 항상 호출하고 있습니다.

**문제점**:
- 비로그인 사용자도 API 호출 → 불필요한 네트워크 트래픽
- 서버 부하 증가 (의미 없는 요청 처리)

**해결책**: 로그인 상태를 확인하고 조건부로 API 호출하기

---

## 🔍 현재 동작 분석

### 백엔드 현재 동작 (2025-01-10 수정 완료)

```javascript
// GET /api/user/preferences
// PUT /api/user/preferences

// ✅ 인증 없이도 200 OK 반환 (500 에러 방지)
// ⚠️ 하지만 DB에는 저장되지 않음

if (!req.user) {
  return res.json({
    success: true,
    data: { language: 'ko', theme: 'system', density: 'spacious', notifications: false },
    message: 'Unauthenticated user - returning defaults'
  });
}
```

**결과**:
- 500 에러는 없음 ✅
- 하지만 비로그인 사용자의 API 호출은 의미 없음 ⚠️

---

## 🎯 권장 수정 사항

### Option 1: 로컬 우선 + 백엔드 동기화 (권장 ⭐)

**개념**: 로컬 스토리지를 Primary로, 백엔드를 Sync용으로 사용

```javascript
// src/stores/preferencesStore.js (또는 해당 파일)

// ============================================================
// 1. Preferences 로드
// ============================================================
async function loadPreferences() {
  // Step 1: 인증 토큰 확인
  const token = localStorage.getItem('accessToken') ||
                 sessionStorage.getItem('accessToken');

  // Step 2: 비로그인 → 로컬만 사용
  if (!token) {
    console.log('[Preferences] Loading from localStorage (no auth)');
    const localPrefs = localStorage.getItem('preferences');
    return localPrefs ? JSON.parse(localPrefs) : getDefaultPreferences();
  }

  // Step 3: 로그인 → 백엔드에서 로드 시도
  try {
    console.log('[Preferences] Loading from backend (authenticated)');
    const response = await api.get('/api/user/preferences', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const prefs = response.data.data;

    // 로컬에도 캐시 저장
    localStorage.setItem('preferences', JSON.stringify(prefs));

    return prefs;
  } catch (error) {
    console.warn('[Preferences] Backend load failed, using local fallback:', error);

    // Step 4: 백엔드 실패 → 로컬 폴백
    const localPrefs = localStorage.getItem('preferences');
    return localPrefs ? JSON.parse(localPrefs) : getDefaultPreferences();
  }
}

// ============================================================
// 2. Preferences 저장
// ============================================================
async function savePreferences(preferences) {
  // Step 1: 로컬에 즉시 저장 (빠른 응답)
  console.log('[Preferences] Saving to localStorage');
  localStorage.setItem('preferences', JSON.stringify(preferences));

  // Step 2: 로그인 상태면 백엔드에도 동기화
  const token = localStorage.getItem('accessToken') ||
                 sessionStorage.getItem('accessToken');

  if (!token) {
    console.log('[Preferences] Skip backend sync (no auth)');
    return { success: true, source: 'local' };
  }

  // Step 3: 백엔드 동기화 (비동기, 실패해도 로컬은 이미 저장됨)
  try {
    console.log('[Preferences] Syncing to backend');
    await api.put('/api/user/preferences',
      { preferences },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('[Preferences] Backend sync successful');
    return { success: true, source: 'backend' };
  } catch (error) {
    console.warn('[Preferences] Backend sync failed (local saved):', error);
    return { success: true, source: 'local', syncFailed: true };
  }
}

// ============================================================
// 3. 기본값 정의
// ============================================================
function getDefaultPreferences() {
  return {
    language: 'ko',
    theme: 'system',
    density: 'spacious',
    notifications: false
  };
}

// ============================================================
// 4. 로그인 시 동기화 (선택 사항)
// ============================================================
async function syncPreferencesOnLogin() {
  console.log('[Preferences] Syncing on login');

  // 로컬에 있던 preferences를 백엔드로 전송
  const localPrefs = localStorage.getItem('preferences');

  if (localPrefs) {
    try {
      await savePreferences(JSON.parse(localPrefs));
      console.log('[Preferences] Login sync completed');
    } catch (error) {
      console.warn('[Preferences] Login sync failed:', error);
    }
  }
}

export { loadPreferences, savePreferences, syncPreferencesOnLogin };
```

---

### Option 2: 조건부 API 호출만 추가 (최소 변경)

기존 코드에 인증 체크만 추가:

```javascript
// 기존 코드
async function loadPreferences() {
  const response = await api.get('/api/user/preferences');  // ❌ 항상 호출
  return response.data.data;
}

// 수정 코드
async function loadPreferences() {
  const token = localStorage.getItem('accessToken');

  // ✅ 로그인한 경우만 API 호출
  if (token) {
    try {
      const response = await api.get('/api/user/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      console.warn('Failed to load preferences from backend:', error);
    }
  }

  // 비로그인 또는 실패 시 로컬 사용
  const local = localStorage.getItem('preferences');
  return local ? JSON.parse(local) : getDefaultPreferences();
}

async function savePreferences(prefs) {
  // 로컬에 항상 저장
  localStorage.setItem('preferences', JSON.stringify(prefs));

  // 로그인한 경우만 백엔드 동기화
  const token = localStorage.getItem('accessToken');
  if (token) {
    try {
      await api.put('/api/user/preferences',
        { preferences: prefs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.warn('Failed to sync preferences to backend:', error);
    }
  }
}
```

---

## 📊 예상 효과

| 지표 | 현재 | 수정 후 | 개선율 |
|------|------|---------|--------|
| **비로그인 API 호출** | 매번 | 0회 | -100% |
| **네트워크 트래픽** | 100% | ~50% | -50% |
| **로드 속도** | ~200ms | ~10ms | +95% |
| **서버 부하** | 높음 | 낮음 | -50% |

---

## 🔌 API 명세

### GET /api/user/preferences

**인증**: Optional (Authorization 헤더 권장)

**요청 예시**:
```bash
# 인증 있음
curl -X GET https://bemorebackend.onrender.com/api/user/preferences \
  -H "Authorization: Bearer eyJhbGci..."

# 인증 없음 (동작하지만 비권장)
curl -X GET https://bemorebackend.onrender.com/api/user/preferences
```

**응답**:

```json
// 인증 있음 + DB에 데이터 있음
{
  "success": true,
  "data": {
    "language": "en",
    "theme": "dark",
    "density": "compact",
    "notifications": true
  }
}

// 인증 없음
{
  "success": true,
  "data": {
    "language": "ko",
    "theme": "system",
    "density": "spacious",
    "notifications": false
  },
  "message": "Unauthenticated user - returning defaults"
}
```

### PUT /api/user/preferences

**인증**: Optional (Authorization 헤더 권장)

**요청 예시**:
```bash
curl -X PUT https://bemorebackend.onrender.com/api/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGci..." \
  -d '{"preferences": {"language": "en", "theme": "dark"}}'
```

**응답**:

```json
// 인증 있음 (DB에 저장됨)
{
  "success": true,
  "data": {
    "userId": 2,
    "preferences": {
      "language": "en",
      "theme": "dark"
    }
  }
}

// 인증 없음 (DB에 저장 안 됨)
{
  "success": true,
  "data": {
    "preferences": {
      "language": "en",
      "theme": "dark"
    }
  },
  "message": "Unauthenticated user - preferences not persisted to database"
}
```

---

## 🧪 테스트 방법

### 1. 비로그인 상태 테스트

```javascript
// 1. 로그아웃 또는 토큰 삭제
localStorage.removeItem('accessToken');

// 2. Preferences 변경
await savePreferences({ language: 'en', theme: 'dark' });

// 3. 개발자 도구 → Network 탭 확인
// ✅ 예상: /api/user/preferences 호출 없음 (Option 1)
// ⚠️ 현재: /api/user/preferences PUT 호출됨

// 4. 페이지 새로고침 후 값 유지 확인
const prefs = await loadPreferences();
console.log(prefs);  // { language: 'en', theme: 'dark' }
```

### 2. 로그인 상태 테스트

```javascript
// 1. 로그인
await login({ email: 'test@example.com', password: 'password' });

// 2. Preferences 변경
await savePreferences({ language: 'ko', theme: 'light' });

// 3. Network 탭 확인
// ✅ 예상: PUT /api/user/preferences 호출됨

// 4. 다른 기기나 시크릿 모드에서 같은 계정 로그인
// ✅ 예상: 동일한 preferences 로드됨
```

### 3. 백엔드 실패 테스트

```javascript
// 1. 네트워크를 끄거나 잘못된 토큰 사용
localStorage.setItem('accessToken', 'invalid-token');

// 2. Preferences 로드 시도
const prefs = await loadPreferences();

// 3. 예상 결과
// ✅ 에러 없이 로컬 스토리지 값 반환
console.log(prefs);  // localStorage에 저장된 값
```

---

## 📝 구현 체크리스트

### Phase 1: 기본 구현
- [ ] `loadPreferences()` 함수에 인증 체크 추가
- [ ] `savePreferences()` 함수에 조건부 API 호출 추가
- [ ] `getDefaultPreferences()` 함수 정의
- [ ] 로컬 스토리지 읽기/쓰기 구현

### Phase 2: 에러 처리
- [ ] API 실패 시 로컬 폴백 처리
- [ ] 네트워크 에러 로깅
- [ ] 사용자에게 동기화 실패 알림 (선택 사항)

### Phase 3: 동기화 (선택 사항)
- [ ] 로그인 시 로컬 → 백엔드 동기화
- [ ] 충돌 해결 전략 (예: 백엔드 우선)
- [ ] 동기화 상태 UI 표시

### Phase 4: 테스트
- [ ] 비로그인 상태 테스트
- [ ] 로그인 상태 테스트
- [ ] 백엔드 실패 테스트
- [ ] 네트워크 탭에서 API 호출 확인

---

## 🤔 FAQ

### Q1: 백엔드 수정 없이 프론트만 수정해도 되나요?

**A**: 네, 가능합니다. 백엔드는 이미 인증 없이도 200 OK를 반환하도록 수정되었습니다. 프론트엔드에서 불필요한 API 호출만 제거하면 됩니다.

### Q2: 로그인 후에도 로컬 스토리지를 사용해야 하나요?

**A**: 네, 권장합니다. 로컬 우선 저장으로:
- 빠른 응답 속도 (10ms vs 200ms)
- 오프라인 지원 가능
- 백엔드 장애 시에도 동작

### Q3: 로컬과 백엔드 데이터가 다르면 어떻게 하나요?

**A**: 권장 전략:
1. **로그인 시**: 백엔드 데이터 우선 (서버가 최신)
2. **수정 시**: 로컬 즉시 저장 + 백엔드 비동기 동기화
3. **충돌 시**: 타임스탬프 비교 또는 백엔드 우선

### Q4: 현재 코드를 수정하지 않으면 어떻게 되나요?

**A**:
- ✅ **기능적으로는 문제 없음** (500 에러 수정됨)
- ⚠️ **비효율적**: 불필요한 API 호출로 네트워크/서버 부하
- 📊 **비로그인 사용자가 많으면** 트래픽 낭비 증가

### Q5: 언제까지 수정해야 하나요?

**A**:
- **긴급도**: Medium (기능은 작동함)
- **권장 시기**: 다음 스프린트에 포함
- **예상 작업 시간**: 2-4시간

---

## 💬 문의사항

백엔드 관련 질문이나 API 동작 확인이 필요하면:
- **Slack**: #backend-team
- **GitHub Issues**: BeMoreBackend 레포지토리
- **테스트 서버**: https://bemorebackend.onrender.com

---

**작성자**: Backend Team
**최종 수정**: 2025-01-10
**관련 커밋**: `06fd20d` - fix(user-preferences): handle unauthenticated users gracefully
