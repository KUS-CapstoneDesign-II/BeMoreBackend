# 🚀 Render 배포 가이드 - Supabase 환경변수 설정

**작성일**: 2025-11-03
**목적**: BeMore Backend를 Render에 배포하고 Supabase 폴백 기능을 활성화하는 단계별 가이드

---

## 📋 필수 사전 준비

### 1️⃣ Supabase 계정 및 프로젝트 준비

#### Step 1.1: Supabase 로그인
```
1. https://supabase.com 방문
2. 계정 로그인
3. Dashboard 접속
```

#### Step 1.2: 프로젝트 확인/생성
```
1. "New project" 또는 기존 프로젝트 선택
2. 프로젝트 설정 확인
   - 지역: 아시아-태평양 (Tokyo 권장)
   - 데이터베이스: PostgreSQL 14+
```

#### Step 1.3: API 키 복사
```
1. Settings > API
2. Project URL 복사 (SUPABASE_URL)
3. anon key (공개) 복사 (SUPABASE_ANON_KEY)

⚠️  주의: service_role key가 아닌 anon key 사용!
```

---

## 🔐 Render 환경변수 설정

### Step 2.1: Render 대시보드 접속

```
1. https://render.com 로그인
2. BeMore Backend 서비스 선택
3. "Environment" 탭 클릭
```

### Step 2.2: 환경변수 추가

| 변수명 | 값 | 예시 |
|--------|-----|------|
| `SUPABASE_URL` | 프로젝트 URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon Public Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### 추가 방법:

```
1. Render Dashboard > Environment
2. "Add Environment Variable" 클릭
3. 입력:
   - Name: SUPABASE_URL
   - Value: https://your-project.supabase.co
4. "Add" 클릭
5. 반복: SUPABASE_ANON_KEY 추가
6. "Save Changes" 클릭
```

### Step 2.3: 배포 트리거

```
1. "Deployments" 탭 이동
2. "Deploy latest commit" 클릭
3. 또는 git push:
   git push origin woo
   (자동 배포 시작)
```

---

## ✅ 배포 후 검증

### Phase 1: 기본 연결 확인 (5분)

```bash
# Render에 배포된 서버의 상태 확인
curl https://bemorebackend.onrender.com/health

# 예상 응답:
# {"status": "ok", "uptime": 123}
```

### Phase 2: Supabase 연결 테스트 (10분)

#### 2.1: 로그 확인

```
1. Render Dashboard > Logs 탭
2. 다음 메시지 확인:
   ✅ "Session created in Supabase"
   또는
   🔵 "[EMOTION_SAVE] Using Supabase (Production)"
```

#### 2.2: API 호출로 테스트

```bash
# 세션 생성 테스트
curl -X POST https://bemorebackend.onrender.com/api/session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_1",
    "counselorId": "test_counselor_1"
  }'

# 예상 응답 (201 Created):
# {
#   "success": true,
#   "data": {
#     "sessionId": "sess_xxx",
#     "wsUrls": {...},
#     "startedAt": 1762131499546
#   }
# }
```

#### 2.3: Supabase 콘솔에서 데이터 확인

```
1. Supabase Dashboard > SQL Editor
2. 또는 Table Editor > "sessions" 테이블 클릭
3. 새 행이 생성되었는지 확인
   - session_id: 위에서 생성한 sessionId
   - created_at: 현재 시간
   - emotions_data: [] (빈 배열)
```

### Phase 3: 감정 데이터 저장 테스트 (15분)

실제 세션을 진행하여 감정 데이터가 Supabase에 저장되는지 확인:

```
1. BeMore 클라이언트 앱 실행
2. 서버: https://bemorebackend.onrender.com 지정
3. 세션 시작
4. 최소 1-2분 진행 (Gemini 분석 1회 이상)
5. 세션 종료
6. Render 로그에서 다음 메시지 확인:
   ✅ "Emotion saved to Supabase"
   또는
   💾 "Loaded X emotions from Supabase"
```

#### 3.1: Supabase에서 데이터 확인

```
1. Supabase Dashboard > Table Editor > "sessions"
2. 위의 sessionId 행 클릭
3. emotions_data 열 확인:
   [
     {
       "timestamp": 1762131499546,
       "emotion": "happy",
       "frameCount": 120,
       "sttLength": 150
     },
     ...
   ]
```

---

## 📊 성공 기준 체크리스트

### ✅ 배포 성공 확인

- [ ] Render에서 배포 완료 상태
- [ ] 서버 상태: "Live"
- [ ] 자동 재시작 비활성화 (무한 루프 방지)

### ✅ 환경변수 설정 확인

- [ ] `SUPABASE_URL` 설정됨
- [ ] `SUPABASE_ANON_KEY` 설정됨
- [ ] Render 로그에서 Supabase 관련 에러 없음

### ✅ 연결 검증 확인

- [ ] Render health check 통과
- [ ] API 세션 생성 성공
- [ ] Supabase 콘솔에서 세션 데이터 확인

### ✅ 데이터 저장 검증 확인

- [ ] 감정 데이터가 Supabase에 저장됨
- [ ] emotions_data 배열에 여러 항목 저장됨
- [ ] 타임스탐프가 정확함

---

## 🔍 문제 해결

### 문제 1: "SUPABASE_URL is not configured"

```
원인: 환경변수가 설정되지 않음
해결:
1. Render Dashboard > Environment 확인
2. SUPABASE_URL이 정확히 입력되었는지 확인
3. 앞뒤 공백 없음 확인
4. 배포 재시작: "Deploy latest commit"
```

### 문제 2: "Supabase connection timeout"

```
원인: 프로젝트 URL이 잘못되었거나 요청 시간 초과
해결:
1. Supabase 프로젝트 URL 다시 확인
2. SUPABASE_URL이 https://로 시작하는지 확인
3. Render 로그에서 정확한 에러 메시지 확인
4. Supabase 프로젝트 상태 확인 (일시중단되지 않았는지)
```

### 문제 3: "anon key is invalid"

```
원인: 잘못된 API 키 사용
해결:
1. Supabase > Settings > API에서 anon key 다시 확인
2. service_role key가 아닌지 확인 (public이어야 함)
3. 전체 키가 복사되었는지 확인 (중간에 잘려 있지 않음)
4. 환경변수에 정확히 입력
```

### 문제 4: "감정 데이터가 저장되지 않음"

```
원인: Sequelize를 사용 중 또는 감정 분석 실패
해결:
1. Render 로그 확인:
   - "[EMOTION_SAVE] Using Supabase (Production)" 확인
   - 또는 "[EMOTION_SAVE] Using Sequelize (Local Development)"
2. Gemini 분석 에러 확인
3. WebSocket 연결 상태 확인
4. 세션을 최소 30초 이상 진행 (분석 주기: 10초)
```

### 문제 5: "세션 종료 후 감정 데이터를 찾을 수 없음"

```
원인: 3중 폴백이 모두 실패
해결:
1. Render 로그에서 다음 메시지 확인:
   "Loaded X emotions from Sequelize"
   "Loaded X emotions from Supabase"
   "Using X in-memory emotions"
2. Supabase와 Sequelize 모두 데이터 확인
3. 감정 분석이 실행되었는지 확인 (최소 1회)
```

---

## 📚 관련 명령어

### Git 배포

```bash
# 변경사항 커밋
git add .
git commit -m "feat: enable Supabase integration for production"

# Render에 푸시 (자동 배포)
git push origin woo

# 또는 main으로 PR 생성 후 merge
git push origin woo:main
```

### Render 로그 확인

```bash
# Render CLI 설치 (선택사항)
npm install -g @render/cli

# 로그 확인
render logs --service bemorebackend

# 또는 웹 대시보드에서: Render > Logs 탭
```

### Supabase 데이터 확인

```bash
# Supabase CLI (선택사항)
npx supabase-cli projects list
npx supabase-cli db export --file backup.sql
```

---

## 🔐 보안 체크리스트

- [ ] **anon key 사용** (service_role key 아님)
- [ ] **환경변수 노출 방지** (코드에 hardcode 금지)
- [ ] **HTTPS 전용** (모든 API 호출)
- [ ] **RLS (Row Level Security) 고려**
  - Supabase의 실제 프로덕션 사용 시 권장
  - 현재는 개발 단계이므로 선택사항

---

## 📞 지원 및 문서

### 공식 문서

- [Supabase 문서](https://supabase.com/docs)
- [Render 문서](https://render.com/docs)
- [Node.js + Supabase 가이드](https://supabase.com/docs/guides/realtime/quickstarts/nodejs)

### BeMore 문서

- `SUPABASE_IMPLEMENTATION_GUIDE.md` - 상세 구현 가이드
- `SUPABASE_VERIFICATION_REPORT.md` - 검증 결과 보고서
- `PROJECT_STATUS.md` - 전체 프로젝트 현황

---

## ✨ 배포 후 다음 단계

### 즉시 (배포 후 1시간)

- [ ] Render 로그 모니터링
- [ ] 기본 API 테스트
- [ ] Supabase 콘솔에서 데이터 확인

### 단기 (1-2일)

- [ ] 실제 세션 테스트
- [ ] 감정 데이터 저장 검증
- [ ] 성능 메트릭 수집

### 중기 (1주)

- [ ] 모니터링 대시보드 설정
- [ ] 자동 백업 구성
- [ ] 성능 최적화

---

**문서 작성일**: 2025-11-03
**마지막 업데이트**: 2025-11-03
**관련 버전**: BeMore Backend v1.0.0 with Supabase fallback
