# 🔧 BeMoreBackend 3가지 문제 해결 프롬프트

## 현재 상황
- **마지막 커밋**: `62c0b9c` - fix: improve null/undefined safety in report APIs
- **여전히 미해결**: GET /api/session/{id}/summary, GET /api/session/{id}/report에서 HTTP 000 에러
- **근본 원인**: "Cannot convert undefined or null to object" - 깊은 분석 체인의 미처리 Promise Rejection

---

## 🎯 3가지 문제 정의

### Problem #1: Summary/Report API HTTP 000 에러
```
시나리오:
1. POST /api/session/start → 세션 생성 (HTTP 201 ✅)
2. POST /api/session/{id}/end → 세션 종료 (HTTP 200 ✅)
3. GET /api/session/{id}/summary → 요약 조회 (HTTP 000 ❌ 서버 크래시)
4. GET /api/session/{id}/report → 상세 리포트 (HTTP 000 ❌ 서버 크래시)

에러 로그:
✅ 세션 리포트 생성 완료: report_1761313330250_mx0tn2b54
[ERROR] Cannot convert undefined or null to object
🚨 Uncaught Exception - 서버 종료 중...

문제점: 리포트 생성은 성공하지만, 이후 처리 중 unhandled promise rejection 발생
```

### Problem #2: 에러 메시지의 정확한 위치 파악 불가
```
현재 에러 로그:
[ERROR] Cannot convert undefined or null to object

문제점: 어느 파일, 어느 줄에서 발생하는지 명확하지 않음
→ Stack trace가 없어 근본 원인 파악 어려움
```

### Problem #3: 미처리 Promise Rejection 처리
```
감지된 패턴:
- setImmediate()의 sessionService.persistReportAndSession()
- MultimodalAnalyzer의 깊은 분석 체인
- 컨트롤러의 try-catch가 미처리 rejection을 잡지 못함

필요: 더 견고한 에러 처리 메커니즘
```

---

## 💡 해결 전략

### Step 1: Stack Trace 활성화
```javascript
// app.js에 추가
process.on('uncaughtException', (error) => {
  console.error('❌ [UNCAUGHT EXCEPTION]');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('File:', error.stack.split('\n')[1]);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED REJECTION]');
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack);
});
```

### Step 2: MultimodalAnalyzer 전수 점검
```javascript
검토 대상:
1. _analyzeEmotions() - emotions 배열 처리
2. _analyzeVAD() - vadAnalysisHistory 처리
3. _analyzeCBT() - interventionGenerator 처리
4. _generateOverallAssessment() - Object.entries() 처리
5. _generateRecommendations() - assessment 속성 접근

패턴:
- if (!array || array.length === 0) 체크 추가
- if (!object) return defaultValue 체크 추가
- Object.entries(obj || {}) 안전 처리
- string.includes() 호출 전 null 체크
```

### Step 3: SessionReportGenerator 단계별 try-catch
```javascript
generateReport(session) {
  try {
    // 1단계: 메타데이터
    const metadata = this._generateMetadata(safeSession);

    // 2단계: 멀티모달 분석 (여기서 주로 에러 발생)
    let analysis;
    try {
      analysis = this.analyzer.analyze(safeSession);
      if (!analysis) throw new Error('분석 결과가 없습니다');
    } catch (e) {
      console.error('❌ 멀티모달 분석 실패:', e.message, e.stack);
      // 안전한 기본값 반환
      analysis = this._getDefaultAnalysis();
    }

    // ... 나머지 단계
  } catch (e) {
    console.error('❌ 리포트 생성 실패:', e.stack);
    throw e;
  }
}
```

### Step 4: EmotionVADVector 입력값 검증
```javascript
compute({ emotions = [], vadHistory = [], cbtSummary = null }) {
  // 입력값 검증
  if (!Array.isArray(emotions)) {
    console.warn('⚠️ emotions이 배열이 아님:', typeof emotions);
    emotions = [];
  }
  if (!Array.isArray(vadHistory)) {
    console.warn('⚠️ vadHistory가 배열이 아님:', typeof vadHistory);
    vadHistory = [];
  }

  // 이후 처리 진행
}
```

### Step 5: 컨트롤러 강화
```javascript
async function summary(req, res) {
  try {
    const sessionId = req.params.id;
    const session = SessionManager.getSession(sessionId);

    if (!session) {
      return res.status(404).json({...});
    }

    let report;
    try {
      const gen = new SessionReportGenerator();
      report = gen.generateReport(session);

      // null 체크 강화
      if (!report?.analysis?.emotionSummary) {
        return res.status(500).json({
          success: false,
          error: { code: 'INVALID_REPORT', message: '유효하지 않은 리포트' }
        });
      }
    } catch (reportError) {
      console.error('❌ 리포트 생성 실패:', reportError.stack);
      return res.status(500).json({...});
    }

    // 페이로드 구성은 report가 유효한 후에만
    const payload = {
      sessionId: session.sessionId,
      // ...
    };

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('❌ Summary API 실패:', error.stack);
    return res.status(500).json({...});
  }
}
```

---

## 🧪 테스트 시나리오

```bash
# 1. 서버 시작
npm run dev

# 2. 세션 생성
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","counselorId":"test"}'
# 결과: sessionId 저장

# 3. 세션 종료
curl -X POST http://localhost:8000/api/session/{sessionId}/end

# 4. Summary 호출 (에러 발생 지점)
curl -w "\nHTTP: %{http_code}\n" http://localhost:8000/api/session/{sessionId}/summary

# 기대 결과:
# - HTTP 200 (또는 최소 정상 HTTP 코드)
# - 서버 크래시 없음
# - Stack trace가 있으면 근본 원인 파악 가능
```

---

## 📝 체크리스트

- [ ] app.js에 uncaughtException/unhandledRejection 핸들러 추가
- [ ] MultimodalAnalyzer의 모든 메서드에 null/undefined 체크 추가
- [ ] SessionReportGenerator의 단계별 try-catch 강화
- [ ] EmotionVADVector의 입력값 검증 추가
- [ ] sessionController.summary() 강화
- [ ] sessionController.report() 강화 (동일한 패턴)
- [ ] 로컬 테스트로 Stack trace 확인
- [ ] 에러 발생 지점 파악
- [ ] 근본 원인 수정
- [ ] 프로덕션 배포

---

## 🚀 예상 결과

✅ GET /api/session/{id}/summary → HTTP 200 (또는 500 with clear error)
✅ GET /api/session/{id}/report → HTTP 200 (또는 500 with clear error)
✅ 서버 크래시 없음
✅ Stack trace로 정확한 에러 위치 파악 가능
✅ 종료된 세션에도 안전하게 리포트 반환

---

## 🔗 관련 파일

- controllers/sessionController.js (lines 197-242)
- services/report/SessionReportGenerator.js (lines 36-85)
- services/analysis/MultimodalAnalyzer.js (lines 31-80)
- services/analysis/EmotionVADVector.js (lines 73-94)
- app.js (최상위 에러 핸들러 추가)
