# 📢 BeMore Backend - CBT API v1.3.0 배포 완료 알림

**배포 일시**: 2025-11-18 21:08 KST
**프로덕션 URL**: https://bemorebackend.onrender.com
**상태**: ✅ **배포 완료 및 운영 중**

---

## 🎯 배포 요약

프론트엔드 팀에서 요청하신 **CBT API 개선사항**이 프로덕션 환경에 성공적으로 배포되었습니다.

### 주요 개선사항
- ✅ **TypeScript 타입 100% 호환** (타입 캐스팅 불필요)
- ✅ **CBT 타임라인 데이터** (10초 단위 분석 결과)
- ✅ **한국어 응답 개선** (mostCommon 필드)
- ✅ **보안 강화** (사용자 격리 기능)

---

## 🔄 API 변경사항 상세

### 1. 새로운 필드: `cbtFindings[]` 배열

**용도**: 10초마다 수행된 CBT 분석 결과를 타임라인 형식으로 제공

**응답 예시**:
```json
{
  "success": true,
  "report": {
    "reportId": "report_1731921600000_abc123",
    "cbtFindings": [
      {
        "timestamp": 1731921600000,
        "hasDistortions": true,
        "detections": [
          {
            "type": "all_or_nothing",
            "name_ko": "흑백논리",
            "severity": "high",
            "confidence": 0.85,
            "examples": ["항상 실패할 것 같아요"]
          }
        ],
        "intervention": {
          "interventionId": "int_abc123",
          "distortionType": "all_or_nothing",
          "urgency": "immediate",
          "questions": ["..."],
          "tasks": [...]
        }
      }
    ]
  }
}
```

**TypeScript 인터페이스**:
```typescript
interface CBTFinding {
  timestamp: number;
  hasDistortions: boolean;
  detections: Array<{
    type: string;
    name_ko: string;
    severity: 'high' | 'medium' | 'low';
    confidence: number;
    examples: string[];  // ⚠️ 변경: text → examples[]
  }>;
  intervention: Intervention | null;
}
```

---

### 2. Urgency 필드 매핑 변경 ⚠️

**Breaking Change**: urgency 값이 변경되었습니다.

**변경 전** (v1.2.3):
```typescript
type Urgency = 'high' | 'medium' | 'low';
```

**변경 후** (v1.3.0):
```typescript
type Urgency = 'immediate' | 'soon' | 'routine';
```

**매핑 테이블**:
| 이전 값 | 새 값 | 의미 |
|---------|-------|------|
| high | immediate | 즉각 대응 필요 |
| medium | soon | 조만간 대응 필요 |
| low | routine | 일상적 대응 |

**마이그레이션 예시**:
```typescript
// 변경 전
if (intervention.urgency === 'high') {
  showUrgentAlert();
}

// 변경 후
if (intervention.urgency === 'immediate') {
  showUrgentAlert();
}
```

---

### 3. mostCommon 필드 간소화

**변경 사유**: 프론트엔드에서 한국어 텍스트만 필요

**변경 전** (v1.2.3):
```json
{
  "cbtSummary": {
    "mostCommonDistortion": {
      "type": "all_or_nothing",
      "name_ko": "흑백논리",
      "count": 3
    }
  }
}
```

**변경 후** (v1.3.0):
```json
{
  "cbtSummary": {
    "mostCommon": "흑백논리"
  }
}
```

**TypeScript 업데이트**:
```typescript
// 변경 전
interface CBTSummary {
  mostCommonDistortion: {
    type: string;
    name_ko: string;
    count: number;
  } | null;
}

// 변경 후
interface CBTSummary {
  mostCommon: string | null;
}
```

---

### 4. 보안 강화: 사용자 격리

**변경사항**: 인증된 사용자가 다른 사용자의 세션에 접근하려고 할 때 403 Forbidden 반환

**영향받는 엔드포인트**:
- `GET /api/session/:id/report`
- `GET /api/session/:id/summary`

**에러 응답 예시**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "해당 세션에 대한 접근 권한이 없습니다"
  }
}
```

**프론트엔드 처리 권장사항**:
```typescript
try {
  const response = await fetch(`/api/session/${sessionId}/report`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 403) {
    // 권한 없음 처리
    showErrorMessage('접근 권한이 없는 세션입니다.');
    return;
  }

  const data = await response.json();
  // 정상 처리
} catch (error) {
  // 에러 처리
}
```

---

## 🔌 API 엔드포인트 사용 가이드

### 1. 세션 리포트 조회

**엔드포인트**: `GET /api/session/:id/report`

**요청 예시**:
```bash
curl -X GET "https://bemorebackend.onrender.com/api/session/sess_123456/report" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**응답 구조**:
```typescript
interface ReportResponse {
  success: true;
  report: {
    reportId: string;
    generatedAt: number;
    version: string;
    metadata: SessionMetadata;
    analysis: {
      emotionSummary: EmotionSummary;
      vadSummary: VADSummary;
      cbtSummary: {
        totalDistortions: number;
        totalInterventions: number;
        mostCommon: string | null;  // ⚠️ 변경됨
        distortionDistribution: Record<string, number>;
      };
      overallAssessment: OverallAssessment;
      recommendations: Recommendation[];
    };
    emotionTimeline: EmotionDataPoint[];
    vadTimeline: VADDataPoint[];
    vadVector: VADVector;
    cbtDetails: CBTDetails;
    cbtFindings: CBTFinding[];  // ⭐ 새 필드
    statistics: Statistics;
  };
}
```

---

### 2. 세션 요약 조회

**엔드포인트**: `GET /api/session/:id/summary`

**요청 예시**:
```bash
curl -X GET "https://bemorebackend.onrender.com/api/session/sess_123456/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**응답 구조**:
```typescript
interface SummaryResponse {
  success: true;
  summary: {
    sessionId: string;
    userId: string;
    duration: number;
    emotionCount: number;
    dominantEmotion: string;
    vad: {
      averageValence: number;
      averageArousal: number;
      averageDominance: number;
    };
    cbt: {
      totalDistortions: number;
      mostCommon: string | null;  // ⚠️ 변경됨
    };
  };
}
```

---

## ✅ 프론트엔드 통합 체크리스트

### Phase 1: TypeScript 타입 업데이트
- [ ] `CBTFinding` 인터페이스 추가
- [ ] `Urgency` 타입 업데이트 (`immediate | soon | routine`)
- [ ] `CBTSummary.mostCommon` 타입 변경 (object → string)
- [ ] `detections[].examples` 배열 타입 확인
- [ ] 타입 체크 통과 확인 (`npm run type-check` 또는 `tsc --noEmit`)

### Phase 2: API 클라이언트 업데이트
- [ ] 리포트 조회 함수에 `cbtFindings` 필드 추가
- [ ] 요약 조회 함수에 `mostCommon` 필드 업데이트
- [ ] 403 Forbidden 에러 처리 추가

### Phase 3: UI 컴포넌트 업데이트
- [ ] CBT 타임라인 차트 컴포넌트 구현 (cbtFindings 사용)
- [ ] Urgency 표시 로직 업데이트 (high/medium/low → immediate/soon/routine)
- [ ] mostCommon 표시 로직 간소화 (객체 → 문자열)
- [ ] 권한 없음 에러 메시지 UI 추가

### Phase 4: 테스트
- [ ] 세션 리포트 조회 테스트 (200 OK, cbtFindings 확인)
- [ ] 세션 요약 조회 테스트 (200 OK, mostCommon 확인)
- [ ] 타인 세션 접근 테스트 (403 Forbidden 확인)
- [ ] urgency 값 표시 테스트 (immediate/soon/routine)
- [ ] CBT 타임라인 차트 렌더링 테스트

---

## 🎨 UI 구현 가이드

### CBT 타임라인 차트 예시

**데이터 구조 활용**:
```typescript
function CBTTimelineChart({ cbtFindings }: { cbtFindings: CBTFinding[] }) {
  return (
    <div className="cbt-timeline">
      {cbtFindings.map((finding, index) => (
        <div key={index} className="timeline-item">
          <div className="timestamp">
            {new Date(finding.timestamp).toLocaleTimeString('ko-KR')}
          </div>

          {finding.hasDistortions && (
            <div className="distortions">
              {finding.detections.map((detection, i) => (
                <div key={i} className={`distortion severity-${detection.severity}`}>
                  <span className="type">{detection.name_ko}</span>
                  <span className="confidence">{(detection.confidence * 100).toFixed(0)}%</span>
                  <div className="examples">
                    {detection.examples.map((example, j) => (
                      <p key={j}>{example}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {finding.intervention && (
            <InterventionCard intervention={finding.intervention} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Urgency 배지 컴포넌트

```typescript
function UrgencyBadge({ urgency }: { urgency: 'immediate' | 'soon' | 'routine' }) {
  const config = {
    immediate: { color: 'red', text: '즉시', icon: '🚨' },
    soon: { color: 'orange', text: '조만간', icon: '⚠️' },
    routine: { color: 'blue', text: '일상적', icon: 'ℹ️' }
  };

  const { color, text, icon } = config[urgency];

  return (
    <span className={`urgency-badge urgency-${color}`}>
      {icon} {text}
    </span>
  );
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 리포트 조회
```typescript
describe('CBT API v1.3.0', () => {
  test('세션 리포트에 cbtFindings 배열이 포함되어야 함', async () => {
    const response = await fetch(`${API_BASE}/session/${sessionId}/report`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.report.cbtFindings)).toBe(true);

    // cbtFindings 구조 검증
    if (data.report.cbtFindings.length > 0) {
      const finding = data.report.cbtFindings[0];
      expect(finding).toHaveProperty('timestamp');
      expect(finding).toHaveProperty('hasDistortions');
      expect(finding).toHaveProperty('detections');
      expect(finding).toHaveProperty('intervention');

      // detections 구조 검증
      if (finding.detections.length > 0) {
        const detection = finding.detections[0];
        expect(detection).toHaveProperty('type');
        expect(detection).toHaveProperty('name_ko');
        expect(detection).toHaveProperty('severity');
        expect(detection).toHaveProperty('confidence');
        expect(Array.isArray(detection.examples)).toBe(true);
      }
    }
  });

  test('urgency 값이 새로운 형식이어야 함', async () => {
    const response = await fetch(`${API_BASE}/session/${sessionId}/report`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    const interventions = data.report.cbtDetails.interventions;

    interventions.forEach(intervention => {
      expect(['immediate', 'soon', 'routine']).toContain(intervention.urgency);
    });
  });

  test('mostCommon이 문자열이어야 함', async () => {
    const response = await fetch(`${API_BASE}/session/${sessionId}/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    const mostCommon = data.summary.cbt.mostCommon;

    expect(typeof mostCommon === 'string' || mostCommon === null).toBe(true);
  });
});
```

### 시나리오 2: 권한 없음 에러
```typescript
test('다른 사용자 세션 접근 시 403 반환', async () => {
  const response = await fetch(`${API_BASE}/session/${otherUserSessionId}/report`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  expect(response.status).toBe(403);

  const data = await response.json();
  expect(data.success).toBe(false);
  expect(data.error.code).toBe('FORBIDDEN');
});
```

---

## ⚠️ Breaking Changes 및 마이그레이션

### 필수 변경사항

1. **Urgency Enum 업데이트**
   ```typescript
   // AS-IS
   type Urgency = 'high' | 'medium' | 'low';

   // TO-BE
   type Urgency = 'immediate' | 'soon' | 'routine';
   ```

2. **mostCommon 타입 변경**
   ```typescript
   // AS-IS
   interface CBTSummary {
     mostCommonDistortion: {
       type: string;
       name_ko: string;
       count: number;
     } | null;
   }

   // TO-BE
   interface CBTSummary {
     mostCommon: string | null;
   }
   ```

3. **Detection Examples 배열**
   ```typescript
   // AS-IS
   interface Detection {
     text: string;
   }

   // TO-BE
   interface Detection {
     examples: string[];
   }
   ```

### 하위 호환성

대부분의 기존 필드는 그대로 유지됩니다:
- ✅ `emotionTimeline`, `vadTimeline` - 변경 없음
- ✅ `cbtDetails.interventions` - urgency만 변경
- ✅ `cbtDetails.distortions` - 변경 없음
- ✅ `statistics` - 변경 없음

---

## 📊 예상 영향 범위

### 변경 필요 (High Priority)
- Urgency 표시 로직 (immediate/soon/routine)
- mostCommon 렌더링 로직
- TypeScript 인터페이스

### 새로 구현 (Medium Priority)
- CBT 타임라인 차트 (cbtFindings)
- 403 에러 처리

### 선택 사항 (Low Priority)
- CBT 타임라인 시각화 개선
- Examples 배열 활용 UI

---

## 🆘 문제 해결 가이드

### Q1. TypeScript 컴파일 에러 발생
**증상**: `Property 'cbtFindings' does not exist on type 'Report'`

**해결**:
```typescript
// types/api.ts 파일에 추가
interface Report {
  // ... 기존 필드
  cbtFindings: CBTFinding[];  // 추가
}

interface CBTFinding {
  timestamp: number;
  hasDistortions: boolean;
  detections: Array<{
    type: string;
    name_ko: string;
    severity: string;
    confidence: number;
    examples: string[];
  }>;
  intervention: Intervention | null;
}
```

---

### Q2. Urgency 값 매핑 에러
**증상**: `'high' is not assignable to type 'immediate' | 'soon' | 'routine'`

**해결**:
```typescript
// 마이그레이션 헬퍼 함수
function migrateUrgency(oldUrgency: string): 'immediate' | 'soon' | 'routine' {
  const map = {
    'high': 'immediate',
    'medium': 'soon',
    'low': 'routine'
  };
  return map[oldUrgency] || 'routine';
}
```

---

### Q3. 403 Forbidden 에러 처리
**증상**: 정상적인 세션 요청인데 403 반환

**확인사항**:
1. Authorization 헤더가 올바른지 확인
2. 세션 ID가 현재 로그인한 사용자의 것인지 확인
3. 토큰이 만료되지 않았는지 확인

**디버깅**:
```typescript
console.log('Session ID:', sessionId);
console.log('User ID from token:', decodedToken.userId);
console.log('Authorization header:', headers.authorization);
```

---

## 📞 지원 및 문의

### 백엔드 팀 연락처
- **이슈 발생 시**: GitHub Issues 등록 또는 백엔드 팀 담당자에게 연락
- **긴급 문제**: 프로덕션 장애 시 즉시 연락

### 추가 문서
- **전체 배포 검증 가이드**: [DEPLOYMENT_VERIFICATION_v1.3.0.md](./DEPLOYMENT_VERIFICATION_v1.3.0.md)
- **배포 완료 요약**: [CBT_v1.3.0_DEPLOYMENT_COMPLETE.md](./CBT_v1.3.0_DEPLOYMENT_COMPLETE.md)
- **데이터베이스 검증**: [docs/verify_database_schema.sql](./docs/verify_database_schema.sql)

### 프로덕션 모니터링
- **Health Check**: https://bemorebackend.onrender.com/health
- **API 문서**: README.md 참조
- **버전 정보**: v1.3.0 (2025-11-18 배포)

---

## 🎯 다음 단계

### 즉시 진행 (이번 주)
1. [ ] TypeScript 인터페이스 업데이트
2. [ ] API 클라이언트 코드 수정
3. [ ] 로컬 환경에서 테스트
4. [ ] 프로덕션 연동 테스트

### 다음 스프린트
1. [ ] CBT 타임라인 차트 UI 구현
2. [ ] 사용자 피드백 수집
3. [ ] 성능 최적화

---

## ✅ 배포 완료 확인

**프로덕션 서버 상태**:
```json
{
  "status": "ok",
  "commit": "542c72f427a22e72a02bffe3c570d852967ea433",
  "version": "1.0.0",
  "timestamp": "2025-11-18T12:08:48.017Z"
}
```

**배포 상세**:
- ✅ 프로덕션 배포 완료
- ✅ 데이터베이스 마이그레이션 완료
- ✅ 헬스 체크 정상
- ✅ API 엔드포인트 정상 작동

---

**질문이나 문제가 있으시면 백엔드 팀에 언제든지 연락 주세요!**

**배포 일시**: 2025-11-18 21:08 KST
**문서 버전**: 1.0.0
**담당**: BeMore Backend Team
