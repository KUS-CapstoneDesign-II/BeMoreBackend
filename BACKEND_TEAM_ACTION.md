# 🔧 백엔드팀 - 긴급 수정 사항

**상태**: 🔴 **긴급 - 모듈 로딩 버그**
**영향**: 감정 데이터 데이터베이스 저장 실패
**예상 수정 시간**: 1-2시간
**우선순위**: **CRITICAL**

---

## 📋 상황 요약

### ✅ 작동하는 것
```
✅ Gemini API 감정 분석 (13-17초 응답시간)
✅ WebSocket 실시간 감정 업데이트 전송
✅ 감정 집계 로직 (세션 종료 시)
✅ 프론트엔드 → 백엔드 데이터 전송
```

### ❌ 실패하는 것
```
❌ 감정 데이터 데이터베이스 저장
   Error: Cannot read properties of undefined (reading 'constructor')
   Location: services/socket/landmarksHandler.js:181
   Cause: require('../../models') returns undefined in Render environment
```

---

## 🎯 할 일 (3단계)

### **Step 1: 버그 확인** (5분)

파일 열기:
```
services/socket/landmarksHandler.js
```

181번 줄 확인:
```javascript
const models = require('../../models');  // ❌ 여기서 undefined 반환됨
if (!models || !models.Session) {
  console.error(`❌ [CRITICAL] Models not found at ../../models`);
  return;
}
```

---

### **Step 2: 해결책 적용** (5분)

**가장 간단하고 안전한 방법 (권장):**

181번 줄을 다음과 같이 변경:

```javascript
// ❌ 기존 코드
const models = require('../../models');

// ✅ 변경 후
const path = require('path');
const models = require(path.join(__dirname, '../../models'));
```

**그게 안 되면 시도할 2번째 방법:**

파일 맨 위에 (다른 require 들 아래에):
```javascript
const path = require('path');
const models = require(path.join(__dirname, '../../models'));
```

이것을 한 번만 정의하고, 176번 줄의 setImmediate 내부에서 재사용

---

### **Step 3: 검증** (10분)

**로컬 테스트:**
```bash
# 로컬 개발 환경에서 테스트
npm run dev

# 또는 프로덕션 환경 시뮬레이션
NODE_ENV=production npm start
```

**Render에 배포 후:**
```
1. 프론트엔드에서 세션 시작
2. 5-10초 대기
3. 로그 확인: "💾 Emotion saved to database: [감정]"
4. 데이터베이스 쿼리로 확인:
   SELECT emotionsData FROM Sessions
   WHERE sessionId = 'your_session_id';
```

---

## 🔍 디버깅 팁

**만약 여전히 안 된다면:**

**Step 1: 모듈이 제대로 로드되는지 확인**

181번 줄 앞에 추가:
```javascript
console.log(`🔍 [DEBUG] Attempting to load models...`);
console.log(`  __dirname: ${__dirname}`);
console.log(`  Resolved path: ${path.join(__dirname, '../../models')}`);

try {
  const models = require(path.join(__dirname, '../../models'));
  console.log(`  ✅ Models loaded successfully`);
  console.log(`  Keys: ${Object.keys(models || {}).join(', ')}`);
  if (!models?.Session) {
    console.log(`  ❌ Session not in exports!`);
  }
} catch (e) {
  console.log(`  ❌ Failed to load: ${e.message}`);
}
```

**Step 2: models/index.js 검증**

다음 내용 확인:
```javascript
// models/index.js 맨 아래
module.exports = {
  Session,
  // ... 다른 모델들
};

console.log('🔍 models/index.js loaded, exports:', Object.keys(module.exports));
```

**Step 3: Render에서 직접 확인**

Render 대시보드 → Logs에서:
```
"🔍 [DEBUG]" 로그 확인
"💾 Emotion saved to database" 로그 확인
```

---

## 📞 완료 체크리스트

- [ ] landmarksHandler.js 181번 줄 수정
- [ ] 로컬 환경에서 테스트 (npm run dev)
- [ ] "Emotion saved to database" 로그 확인
- [ ] Render에 배포
- [ ] Render 로그에서 "Emotion saved to database" 확인
- [ ] 데이터베이스 쿼리로 emotions 데이터 확인

---

## 🎯 성공 기준

수정이 완료되면 로그에 다음이 보여야 함:

```
💾 [CRITICAL] Attempting to save emotion to database...
✅ [CRITICAL] Emotion saved to database: happy
✅ [CRITICAL] Total emotions for session: 1
```

---

## 📝 예상 타임라인

```
지금: 이 지침 읽기 (5분)
+5분: 코드 수정 및 로컬 테스트
+10분: Render 배포
+10분: 로그 확인 및 검증
= 총 30분
```

---

## ⚠️ 주의사항

- `require()` 경로는 **상대 경로에서 절대 경로로** 변경하세요
- `path.join(__dirname, ...)` 사용이 가장 안정적입니다
- Render에서 배포 후 최소 2-3분 대기 후 로그 확인

---

## 🆘 문제 발생 시

이 파일 참고:
→ [BACKEND_DEBUG_EMOTION_PERSISTENCE.md](BACKEND_DEBUG_EMOTION_PERSISTENCE.md)

더 자세한 원인 분석과 4가지 해결책이 있습니다.

---

**완료되면**: 프론트엔드팀에게 알려주세요! 🎉
