# Backend Environment Setup Guide

This guide lists required and recommended environment variables for local development and deployment.

## Backend (.env)

Required
- PORT=8000

Recommended
- NODE_ENV=development
- FRONTEND_URLS=http://localhost:5173,https://be-more-frontend.vercel.app
- AUTH_ENABLED=false
- JWT_SECRET=change_this_in_production
- GEMINI_API_KEY=YOUR_KEY
- DB_DISABLED=true

Optional (if/when DB is enabled)
- DATABASE_URL=
- DB_HOST=
- DB_PORT=3306
- DB_NAME=bemore
- DB_USER=
- DB_PASSWORD=

## Render (Backend) Environment
- PORT=8000
- FRONTEND_URLS=https://be-more-frontend.vercel.app,http://localhost:5173
- DB_DISABLED=true (until DB is ready)
- AUTH_ENABLED=false (or true with JWT config)
- GEMINI_API_KEY=YOUR_KEY

## Frontend (Vercel) Environment
- VITE_API_URL=https://bemorebackend.onrender.com (prod) | http://localhost:8000 (local)
- VITE_WS_URL=wss://bemorebackend.onrender.com (prod) | ws://localhost:8000 (local)

## Local Quickstart
```bash
# Backend
cp .env.example .env  # then fill secrets
npm start

# Frontend
# in frontend project: create .env.local with
# VITE_API_URL=http://localhost:8000
# VITE_WS_URL=ws://localhost:8000
npm run dev
```

## Notes
- Express v5 preflight is handled by the CORS middleware. Do not add `app.options('*', ...)`.
- Keep `FRONTEND_URLS` in sync with your deployed frontend origins.
- If `DB_DISABLED=true`, the app runs without connecting to a database.
