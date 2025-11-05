# 📋 Frontend 팀 요청사항 (2025-11-05)

**발신**: Frontend Team
**우선순위**: 🔴 BLOCKING (1번) + 🟡 NON-BLOCKING (2번)
**상태**: 접수 및 분석 완료

---

## 🔴 **[필수] 요청 1: CORS 헤더 설정 수정**

### 문제점
프로덕션 환경에서 모든 API 요청이 CORS 정책으로 인해 차단됨:

```
Access to XMLHttpRequest at 'https://bemorebackend.onrender.com/api/...'
has been blocked by CORS policy: Request header field 'x-request-id' is not allowed
by Access-Control-Allow-Headers in preflight response.
```

### 근본 원인
**app.js 라인 93**: `allowedHeaders`에 `x-request-id` 미포함
```javascript
// ❌ 문제 코드
allowedHeaders: ['Content-Type', 'Authorization']  // x-request-id 없음!
```

### 해결책 (✅ 이미 적용됨)
```javascript
// ✅ 수정 코드
allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
exposedHeaders: ['x-request-id']
```

**커밋**: 수정되었음
**상태**: ✅ **완료 (app.js 수정됨)**

### 영향도
- ✅ 모든 Frontend API 요청 차단 해제
- ✅ 프로덕션 환경 정상화
- ✅ 사용자 대시보드 정상 작동

### 검증 방법
```bash
# OPTIONS 프리플라이트 요청 테스트
curl -X OPTIONS https://bemorebackend.onrender.com/api/users/preferences \
  -H "Origin: https://be-more-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, x-request-id" \
  -v

# 응답 헤더 확인 사항:
# ✅ Access-Control-Allow-Headers: ...x-request-id...
# ✅ Access-Control-Allow-Origin: https://be-more-frontend.vercel.app
# ✅ HTTP 200
```

---

## 🟡 **[선택] 요청 2: Web Vitals 분석 엔드포인트**

### 상황
Frontend에서 웹 성능 지표 (Core Web Vitals)를 자동으로 수집 중:

```
📊 수집 중인 메트릭:
├─ LCP (Largest Contentful Paint)
├─ FID (First Input Delay)
├─ CLS (Cumulative Layout Shift)
├─ TTFB (Time to First Byte)
└─ FCP (First Contentful Paint)
```

### 현재 상태
- ❌ `GET /api/analytics/vitals` 엔드포인트 미구현 → 404 응답
- ⏳ Frontend에서 자동 재시도 중단됨 (비활성화 처리)
- 🟡 성능 모니터링 데이터 미수집

### 선택지

#### **옵션 A: 엔드포인트 구현** (권장 - 성능 모니터링)
**장점**:
- ✅ 실시간 사용자 성능 데이터 수집
- ✅ 성능 모니터링 대시보드 구축 가능
- ✅ 성능 퇴화 조기 감지
- ✅ 최적화 의사결정을 위한 데이터 확보

**단점**:
- ⏱️ 개발 시간 소요 (1-2시간)
- 💾 데이터베이스 테이블 추가 필요

**요청 스펙**:
```bash
POST /api/analytics/vitals
Content-Type: application/json
Authorization: Bearer {optional}

{
  "name": "LCP" | "FID" | "CLS" | "TTFB" | "FCP" | "INP",
  "value": number (밀리초 또는 점수),
  "rating": "good" | "needs-improvement" | "poor",
  "timestamp": "2025-11-05T09:37:00.000Z"
}

응답:
{
  "success": true,
  "vitalsId": "uuid"
}
```

#### **옵션 B: 비활성화 유지** (현재 상태)
**장점**:
- ✅ Backend 개발 시간 절감
- ✅ 데이터베이스 수정 불필요
- ✅ 즉시 적용 가능

**단점**:
- ❌ 성능 모니터링 데이터 미수집
- ❌ 사용자 체험 성능 측정 불가

**Frontend 구현**: 이미 완료됨
```javascript
// .env에서
VITE_ANALYTICS_ENABLED=false

// 자동 동작:
// - 웹 성능 지표 수집 중단
// - 분석 서버 요청 중지
// - 콘솔: "📊 Analytics disabled via VITE_ANALYTICS_ENABLED"
```

### 📋 백엔드 팀의 선택 필요
- [ ] **옵션 A 선택**: 엔드포인트 구현 (이 경우 구현 스펙 제공 예정)
- [ ] **옵션 B 선택**: 현재 상태 유지 (추후 필요 시 구현)

**현재 상태**: Frontend에서 자동으로 비활성화 처리 중 → 즉시 선택할 필요 없음

### 권장 일정
1. **초기 (즉시)**: 옵션 B 유지 (비활성화)
2. **안정화 후 (다음 스프린트)**: 옵션 A 구현 검토

---

## ✅ 완료 상태 정리

### 🔴 **필수 작업 (BLOCKING)**
- [x] **CORS 헤더 수정**
  - 상태: ✅ **완료**
  - 수정 파일: `app.js` (라인 93-94)
  - 변경: `x-request-id` 추가 + `exposedHeaders` 추가
  - 검증: 필요 (curl 명령어 참조)
  - 배포: Render 자동 재배포 필요 (git push → Render rebuild)

### 🟡 **선택 작업 (NON-BLOCKING)**
- [ ] **Web Vitals 엔드포인트**
  - 상태: ⏳ **대기 (선택사항)**
  - 옵션: A (구현) 또는 B (비활성화)
  - 우선순위: 낮음 (Frontend에서 이미 비활성화 처리)

---

## 📞 다음 단계

### Backend 팀의 작업

1. **CORS 수정 검증** (5분)
   ```bash
   # 코드 확인
   grep -A 5 "allowedHeaders" app.js

   # 결과: x-request-id 포함되어 있어야 함
   ```

2. **배포** (2-3분)
   ```bash
   git add app.js
   git commit -m "fix(cors): add x-request-id to allowedHeaders and exposedHeaders"
   git push origin woo

   # Render 자동 재배포 (2-3분)
   ```

3. **Web Vitals 검토** (선택사항)
   - 옵션 A 또는 B 중 선택
   - 이 문서에서 응답 메시지

### Frontend 팀의 기다림
- CORS 수정 후 자동으로 모든 API 요청 정상화됨
- 특별한 추가 작업 불필요

### 예상 효과
```
CORS 수정 후:
✅ 모든 API 요청 성공
✅ 프로덕션 환경 정상화
✅ 사용자 대시보드 모든 기능 정상화
✅ 에러 배너 자동 해제
```

---

## 📝 참고

### 기술 배경
- **CORS (Cross-Origin Resource Sharing)**: 브라우저 보안 정책
- **Preflight**: OPTIONS 요청으로 실제 요청이 허용되는지 사전 확인
- **x-request-id**: 요청 추적을 위한 고유 ID 헤더

### 관련 문서
- [CORS MDN 문서](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS 패키지](https://www.npmjs.com/package/cors)

---

**발신**: Frontend Team
**수신**: Backend Team
**날짜**: 2025-11-05
**상태**: ✅ 접수 및 분석 완료, 필수 작업 완료 대기 중

