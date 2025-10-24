<!-- 563b22eb-3864-4267-a4f7-9fbf86c3f2fb e75552c5-082a-48a2-9d1c-a33bc6cc2158 -->
# Revised Automation Prompt (BeMore Integration)

[최상위 목표]

지금부터 내 로컬 환경에 있는 두 개의 프로젝트, BeMoreBackend와 BeMoreFrontend의 연동 작업을 시작한다. 백엔드 서버가 프론트엔드의 API 요청을 처리하고, WebSocket 실시간 통신이 가능하도록 아래 지시에 따라 정확하게 파일을 수정하고 명령어를 실행해 줘. (주의: 기존 구조/보안 미들웨어를 보존하고, 필요한 부분만 추가/수정한다.)

[프로젝트 절대 경로]

- 백엔드: /Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend
- 프론트엔드: /Users/_woo_s.j/Desktop/woo/workspace/BeMoreFrontend

---

## Part 1: BeMoreBackend 서버 수정 (포트: 8000)

[작업 1-1] CORS 화이트리스트 환경변수 설정 (이미 cors 사용 중)

1) 백엔드 루트로 이동

```bash
cd /Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend
```

2) `.env` 또는 배포 환경 변수에 다음을 설정 (쉼표 구분):

```
FRONTEND_URLS=http://localhost:5173,https://be-more-frontend.vercel.app
PORT=8000
NODE_ENV=development
```

[작업 1-2] app.js 라우팅/미들웨어 점검 및 emotion 라우터 연결

- 파일: `/Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend/app.js`
- 다음 사항이 누락 시에만 추가한다 (기존 구현 보존):
  - CORS: `FRONTEND_URLS` 화이트리스트 사용 (이미 구현됨)
  - 프리플라이트 처리: cors 미들웨어가 처리(Express v5-safe), `app.options('*', ...)` 사용 안 함
  - 요청 ID/액세스 로거: `requestId`, `morgan` (이미 구현됨)
  - 신규 라우터 연결: 아래 한 줄이 없다면 추가
```js
const emotionRouter = require("./routes/emotion");
app.use("/api/emotion", emotionRouter);
```

[작업 1-3] 감정 분석 API 라우터 생성 (완료됨)

1) 파일: `/Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend/routes/emotion.js`

[작업 1-4] Gemini 서비스에 analyzeEmotion 보강 (완료됨)

- 파일: `/Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend/services/gemini/gemini.js`
- `GEMINI_API_KEY` 가드 및 에러 핸들링 추가됨.

[작업 1-5] WebSocket 설정 확인 (이미 구성됨)

- 파일: `/Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend/app.js`
- `setupWebSockets(wss)` 호출 및 `/ws/landmarks|voice|session` 경로 지원. 쿼리/경로 세션ID 모두 파싱.

---

## Part 2: BeMoreFrontend 클라이언트 수정

[작업 2-1] API 서비스에 감정 분석 메서드 추가 (완료됨)

- 파일: `/Users/_woo_s.j/Desktop/woo/workspace/BeMoreFrontend/src/services/api.ts`

[작업 2-2] WebSocket 주소 설정 (개선)

- `VITE_API_URL` 하나만 설정하고, 코드에서 http→ws(https→wss)로 파생해 사용. 별도 `VITE_WS_URL` 불필요.

[작업 2-3] 프론트 환경 변수 (완료됨)

- `.env.development` / `.env.production` 작성:
```
VITE_API_URL=http://localhost:8000
# prod
VITE_API_URL=https://bemorebackend.onrender.com
```

---

## Part 3: 실행/검증

[로컬 실행]

1) 백엔드 실행

```bash
cd /Users/_woo_s.j/Desktop/woo/workspace/BeMoreBackend
npm start
```

2) 프론트 실행

```bash
cd /Users/_woo_s.j/Desktop/woo/workspace/BeMoreFrontend
npm run dev
```

3) 브라우저 콘솔/네트워크로 확인

- `POST /api/emotion` 호출 성공(200, `{ success:true, data:{ emotion }}`)
- 대시보드/세션 결과/CSV/PDF 동작 확인
- WebSocket 연결: `[WebSocket] 연결 시도:` 로그에 `wss://bemorebackend.onrender.com` 확인, Render 로그에 `🔌 WebSocket 연결 시도:` 확인

[배포 확인]

- Vercel 프론트: `VITE_API_URL` 설정 후 재배포
- 백엔드 CORS 화이트리스트(`FRONTEND_URLS`)에 프론트 도메인 포함

---

## 안전/유의사항

- 기존 `app.js` 보안 미들웨어(helmet, rate-limit), 요청 ID/morgan, 에러 포맷 유지
- ‘누락 시 추가’ 원칙으로 변경 최소화
- 실제 모델 연동 전 `analyzeEmotion`은 뉴트럴 폴백
- 포트/도메인 혼동 방지: 백엔드 8000, 프론트 5173(로컬)

### To-dos (Reconciled)

- [x] Create routes/emotion.js and wire it in app.js
- [x] Ensure analyzeEmotion is exported in services/gemini/gemini.js
- [x] Add emotionAPI.analyze(text) in src/services/api.ts
- [x] Set FRONTEND_URLS, VITE_API_URL for local and prod
