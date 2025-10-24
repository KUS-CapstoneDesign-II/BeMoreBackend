# Deployment Runbook

## Branch Strategy
- Develop on `woo`; merge into `main` to deploy.

## CI/CD
- GitHub Actions runs build/tests on push/PR.
- On `main`, CI triggers Render via `RENDER_DEPLOY_HOOK_URL`.

## Smoke Checks
```bash
curl -s https://bemorebackend.onrender.com/health | jq .
curl -s -X POST https://bemorebackend.onrender.com/api/emotion \
  -H 'Content-Type: application/json' -d '{}' | jq .
curl -s https://bemorebackend.onrender.com/api/errors/stats | jq .
```
Expect `/health` includes `version` and `commit`.

## Troubleshooting
- If deploy not triggered: verify Actions logs (deploy job), and secret `RENDER_DEPLOY_HOOK_URL`.
- Force trigger:
```bash
git checkout main
git commit --allow-empty -m "chore: trigger deploy"
git push origin main
```

# Backend Deployment Guide

이 문서는 DB 연결 없이 기능 검증용 배포를 목표로 합니다. (WS/PDF/분석 포함)

## 환경 변수
- `PORT` = 8000
- `NODE_ENV` = production
- `FRONTEND_URLS` = https://be-more-frontend.vercel.app
- `AUTH_ENABLED` = false (옵션)
- `JWT_SECRET` = (AUTH_ENABLED=true 시 설정)

## Railway 배포(예시)
1) New Project → Deploy from GitHub → `BeMoreBackend`
2) Settings
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - Expose Port: `8000`
   - Env Vars: 위 환경 변수 설정
3) 배포 후 발급 도메인 확인 → 프론트 `VITE_API_URL` 갱신

## Render 배포(예시)
- Web Service → GitHub 연결 → Build: `npm install`, Start: `npm start`
- Health Check: `/health`, Env Vars 설정

## Cloud Run(Docker)
1) Build
```bash
docker build -t bemore-backend:prod .
```
2) Run(local)
```bash
docker run -p 8000:8000 -e NODE_ENV=production -e FRONTEND_URLS=https://be-more-frontend.vercel.app bemore-backend:prod
```
3) Deploy(예시)
```bash
gcloud run deploy bemore-backend \
  --source . \
  --region=<REGION> \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production,PORT=8000,FRONTEND_URLS=https://be-more-frontend.vercel.app
```

## 프론트 설정(Vercel)
- `VITE_API_URL` = `https://<백엔드도메인>`
- CSP(connect-src)에 백엔드 도메인 추가(서버 헤더 권장)

## 배포 후 체크리스트
- GET `/health` 200
- GET `/api/dashboard/summary` 200
- GET `/api/user/preferences` 200, PUT 동일
- POST `/api/session/start` → WS 연결, /end → 리포트/요약 API 200
- PDF: GET `/api/session/:id/report/pdf` 다운로드
- CORS: `Access-Control-Allow-Origin: https://be-more-frontend.vercel.app`

## 주의사항
- Cloud Run 요청 타임아웃 최대 60분 (긴 동기 작업은 비동기 분해 필요)
- onnx/pdfkit 등 네이티브 의존 패키지는 컨테이너 배포가 안정적
