# 🚀 Render 배포 설정 가이드
**작성일**: 2025-11-04
**대상**: BeMore Backend Render 배포
**필수 작업**: DATABASE_URL 환경변수 설정

---

## 📋 상황 설명

**문제**: Render에서 다음과 같은 오류 발생
```
⚠️ [Dashboard] Query failed, using empty dataset: Report model unavailable
📊 [CRITICAL] 감정 통합 분석 완료 (총 undefined개)
502 Bad Gateway
```

**근본 원인**: Render 환경에 `DATABASE_URL` 환경변수가 설정되지 않음

**해결책**: 아래 단계를 따라 Render에 DATABASE_URL을 설정하기

---

## ✅ 3단계 설정 프로세스

### **Step 1: Supabase 비밀번호 확인** (2분)

```bash
# 1. Supabase 대시보드 접속
https://supabase.com/dashboard

# 2. Project 선택 → Settings → Database
# 3. Connection string 확인:
# Host: db.zyujxskhparxovpydjez.supabase.co
# Port: 5432
# Database: postgres
# User: postgres
# Password: [실제 비밀번호 확인]
```

**또는 연결 string 복사**:
```bash
# "Connection pooler" 또는 "Direct connection" 사용
# 일반적으로: postgresql://postgres:[password]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres
```

---

### **Step 2: Render 대시보드에서 환경변수 설정** (5분)

#### **2-1. Render 대시보드 접속**
```
https://dashboard.render.com
```

#### **2-2. BeMore Backend Service 선택**
```
Services → "bemorebackend" 클릭
```

#### **2-3. Environment 탭 이동**
```
Settings → Environment
```

#### **2-4. "Add Environment Variable" 클릭**

| 필드 | 값 |
|------|-----|
| **KEY** | `DATABASE_URL` |
| **VALUE** | `postgresql://postgres:[YOUR_PASSWORD]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres` |

**중요**: `[YOUR_PASSWORD]`를 실제 Supabase 비밀번호로 교체

#### **2-5. 환경변수 저장**
- "Save Changes" 또는 "Save Environment Variable" 클릭
- ✅ 환경변수 추가됨 확인

---

### **Step 3: Render Redeploy 실행** (2분)

#### **3-1. 서비스 페이지에서**
```
"Manual Deploy" → "Redeploy latest commit" 클릭
```

또는 "Redeploy" 버튼이 있으면 클릭

#### **3-2. 배포 로그 확인**
```
Logs 탭에서 배포 진행 상황 확인

예상 메시지:
✅ 데이터베이스 연결 성공
✅ SessionManager 초기화 완료
✅ WebSocket 3채널 라우터 설정 완료
🚀 서버 실행 중 (port): 8000
```

#### **3-3. 배포 완료 대기**
- 일반적으로 2-3분 소요
- Status: "Live" 또는 "Deployed" 확인

---

## 🧪 배포 후 검증

### **1단계: 헬스 체크 (30초)**

```bash
curl https://bemorebackend.onrender.com/health
```

**성공 응답** (JSON):
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T10:30:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

**실패 응답** (HTML):
```html
<html>
  <body>502 Bad Gateway</body>
</html>
```

### **2단계: Dashboard API 테스트** (1분)

```bash
curl https://bemorebackend.onrender.com/api/dashboard/summary \
  -H "Origin: https://be-more-frontend.vercel.app"
```

**성공 응답**:
```json
{
  "success": true,
  "data": {
    "todayAvg": {
      "valence": 0.45,
      "arousal": 0.55,
      "dominance": 0.40
    },
    "trend": {
      "dayOverDay": {
        "valence": 0.1,
        "arousal": -0.05,
        "dominance": 0.0
      }
    },
    "recommendations": [...]
  }
}
```

### **3단계: Frontend 통합 테스트** (5분)

**Frontend에서**:
```bash
# 1. 세션 시작
POST /api/session/start
{
  "userId": "test-user",
  "counselorId": "test-counselor"
}

# 2. WebSocket 연결 테스트
ws://bemorebackend.onrender.com/ws/landmarks
ws://bemorebackend.onrender.com/ws/voice
ws://bemorebackend.onrender.com/ws/session

# 3. 세션 종료
POST /api/session/{sessionId}/end

# 예상: emotionSummary 정상 반환
{
  "emotionCount": 7,
  "emotionSummary": {
    "primaryEmotion": {
      "emotion": "happy",
      "emotionKo": "행복",
      "percentage": 42
    },
    "emotionalState": "긍정적이고 활발한 상태"
  }
}
```

---

## 🔍 Render 배포 상태 확인

### **배포 전**:
```
❌ DATABASE_URL: undefined
❌ db.Report = null
❌ Report model unavailable
❌ Dashboard 쿼리 실패
```

### **배포 후 (예상)**:
```
✅ DATABASE_URL: postgresql://postgres:***@...
✅ db.Report: Sequelize Model
✅ 데이터베이스 연결 성공
✅ Dashboard 쿼리 정상 작동
```

---

## 🆘 문제 해결

### **문제 1: "502 Bad Gateway" 계속 발생**

```bash
# 1. Render 로그 확인
Logs 탭에서 에러 메시지 확인

# 2. 확인 항목
- DATABASE_URL이 정확히 설정되었나?
- 비밀번호에 특수문자가 있나? (URL 인코딩 필요)
  @ → %40
  # → %23
  $ → %24

예시: password가 "pass@word#123"이면
DATABASE_URL=postgresql://postgres:pass%40word%23123@...
```

### **문제 2: "HostNotFoundError"**

```
HostNotFoundError: getaddrinfo ENOTFOUND db.zyujxskhparxovpydjez.supabase.co
```

**원인**: Supabase 호스트명이 잘못되었거나 네트워크 문제

**해결**:
- [ ] 호스트명 정확성 확인
- [ ] Supabase 프로젝트 활성 상태 확인
- [ ] 방화벽 설정 확인 (Render IP 허용되어 있나?)

### **문제 3: "password authentication failed"**

```
SequelizeAccessDeniedError: password authentication failed for user "postgres"
```

**원인**: 비밀번호가 틀렸음

**해결**:
- [ ] Supabase 대시보드에서 비밀번호 다시 확인
- [ ] 비밀번호에 공백이 없는지 확인
- [ ] 특수문자 URL 인코딩 확인

---

## 📊 Render 환경변수 최종 체크리스트

배포 전 확인:

- [ ] **DATABASE_URL** 설정됨
- [ ] 값: `postgresql://postgres:[password]@db.zyujxskhparxovpydjez.supabase.co:5432/postgres`
- [ ] 특수문자 URL 인코딩됨
- [ ] GEMINI_API_KEY 설정됨
- [ ] OPENAI_API_KEY 설정됨
- [ ] FRONTEND_URLS 설정됨
- [ ] NODE_ENV=production 또는 development 확인

배포 후 검증:

- [ ] 헬스 체크 성공
- [ ] Dashboard API 응답 정상
- [ ] 데이터베이스 연결 로그 확인
- [ ] Report 모델 로드됨
- [ ] Frontend에서 emotion 데이터 수신

---

## 🚀 배포 완료 후 다음 단계

### 1. Frontend 테스트
```bash
cd ../BeMoreFrontend
npm start

# 브라우저에서 http://localhost:5173 접속
# 세션 시작 → 음성 입력 → 감정 분석 확인
```

### 2. 전체 통합 테스트
- [ ] Frontend에서 세션 시작 가능
- [ ] WebSocket 연결 정상
- [ ] VAD 메트릭 실시간 수신
- [ ] Emotion 분석 작동
- [ ] Dashboard에 데이터 표시
- [ ] 세션 종료 시 리포트 생성

### 3. 프로덕션 체크
- [ ] CORS 설정 확인
- [ ] 에러 로깅 정상
- [ ] 성능 모니터링 설정

---

## 📞 지원

**참고 자료:**
- [INTEGRATION_DIAGNOSIS_2025-11-04.md](./INTEGRATION_DIAGNOSIS_2025-11-04.md) - 상세 진단 보고서
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Supabase 설정 가이드
- [.env.example](./.env.example) - 환경변수 샘플

**문제 발생 시:**
1. 먼저 Render 로그에서 에러 메시지 확인
2. [INTEGRATION_DIAGNOSIS_2025-11-04.md](./INTEGRATION_DIAGNOSIS_2025-11-04.md)의 문제 해결 섹션 참조
3. 위의 "문제 해결" 섹션 확인

---

**생성일**: 2025-11-04
**최종 수정**: 2025-11-04
**상태**: 🟢 Ready for Deployment
