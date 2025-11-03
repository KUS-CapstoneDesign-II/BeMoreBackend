# BeMore Frontend-Backend Integration: Quick Reference

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BEMORE SYSTEM ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  FRONTEND (React + TypeScript)                           │  │
│  │  Port: localhost:5173                                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Axios: API calls via /services/api.ts                  │  │
│  │  WebSocket: 3 channels via /services/websocket.ts       │  │
│  │  State: Zustand stores + React Context                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│           HTTP (REST)    /  WebSocket (bidirectional)            │
│                         ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BACKEND (Express + WebSocket)                           │  │
│  │  Port: 8000 (configurable)                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  REST APIs: /api/session, /api/stt, /api/emotion, ...   │  │
│  │  WebSocket: /ws/landmarks, /ws/voice, /ws/session       │  │
│  │  Database: Sequelize ORM (MySQL)                        │  │
│  │  External: Gemini, OpenAI APIs                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## API Communication Patterns

### Pattern 1: REST API Request → Response

```
Frontend (axios)              Backend (Express)
─────────────────────         ──────────────────
POST /api/session/start  ───→ Session Controller
  {                           │
    userId,                   ├─ Validate input (Zod)
    counselorId               ├─ Create session
  }                           ├─ Generate WebSocket URLs
                              └─ Return response
                         ←──  {
                              success: true,
                              data: {
                                sessionId,
                                wsUrls: {
                                  landmarks: ws://...?sessionId=xxx,
                                  voice: ws://...?sessionId=xxx,
                                  session: ws://...?sessionId=xxx
                                }
                              }
                            }
```

### Pattern 2: WebSocket Bidirectional Channel

```
Frontend (WebSocketManager)          Backend (setupWebSockets)
──────────────────────────           ──────────────────────────
Connect to /ws/landmarks ──────────→ Validate sessionId
  ?sessionId=xxx                     │
                                     ├─ Session exists?
                                     ├─ Register connection
                                     └─ Setup handlers
                                       │
Send message: {                       │
  type: 'process_landmarks',    ←──────── Receive
  data: {...}                   
}                               ───→ Process
                                     │
Listen for message         ←────────┘ Send response:
  {                         {
    type: 'landmarks_updated',  type: 'landmarks_processed',
    data: {...}               data: {...}
  }                           }
```

### Pattern 3: Multipart File Upload

```
Frontend (FormData)          Backend (multer + handler)
────────────────            ─────────────────────────
POST /api/stt/transcribe
  FormData {
    audio: Blob  ──────────→ Receive audio file
  }             │           │
               │           ├─ Store temporarily
               │           ├─ Validate (silence detect)
               │           ├─ Call Whisper API
               │           ├─ Filter results
               │           └─ Clean up file
               │
         ←──────────────── {
                           success: true,
                           data: {
                             text: "transcribed text"
                           }
                         }
```

## Environment Configuration

### Frontend (.env.development)
```bash
# Development
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Frontend (.env.production)
```bash
# Production
VITE_API_URL=https://bemorebackend.onrender.com
VITE_WS_URL=wss://bemorebackend.onrender.com
```

### Backend (.env)
```bash
# Required
PORT=8000
NODE_ENV=development

# CORS
FRONTEND_URLS=http://localhost:5173,https://be-more-frontend.vercel.app

# External APIs
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Maintenance
TEMP_FILE_MAX_AGE_DAYS=7
TEMP_FILE_MAX_SIZE_MB=500
TEMP_CLEANUP_INTERVAL_MIN=60
```

## Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    SESSION LIFECYCLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  START                                                      │
│   ├─ User initiates session                                │
│   ├─ Frontend: POST /api/session/start                     │
│   │   → Backend creates session & returns wsUrls           │
│   └─ Frontend: Connect 3 WebSocket channels                │
│                                                             │
│  ACTIVE                                                     │
│   ├─ Real-time data streaming via WebSocket                │
│   │   · /ws/landmarks → Face tracking data                 │
│   │   · /ws/voice → Audio stream processing                │
│   │   · /ws/session → Control messages                     │
│   │                                                         │
│   ├─ Optional: Pause/Resume                                │
│   │   · POST /api/session/:id/pause                        │
│   │   · POST /api/session/:id/resume                       │
│   │                                                         │
│   └─ Data collection continues                             │
│                                                             │
│  END                                                        │
│   ├─ User or timeout triggers session end                  │
│   ├─ Frontend: POST /api/session/:id/end                   │
│   ├─ Backend: Mark session as ended                        │
│   ├─ Frontend: Suppress reconnect & close WebSockets       │
│   └─ Backend: Cleanup after 60 seconds grace period        │
│                                                             │
│  RESULTS                                                    │
│   ├─ Frontend: GET /api/session/:id/report                 │
│   ├─ Frontend: GET /api/session/:id/report/pdf             │
│   ├─ Frontend: GET /api/session/:id/report/csv             │
│   └─ Display results to user                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## All API Endpoints

### Session Management
```
POST   /api/session/start              Create new session
GET    /api/session/:id                Get session details
POST   /api/session/:id/pause          Pause session
POST   /api/session/:id/resume         Resume session
POST   /api/session/:id/end            End session
GET    /api/session/stats/summary      Session statistics
```

### Session Reports
```
GET    /api/session/:id/report         Full session report
GET    /api/session/:id/report/summary Report summary
GET    /api/session/:id/report/pdf     Export as PDF
GET    /api/session/:id/report/csv     Export as CSV
POST   /api/session/:id/feedback       Submit feedback
```

### Processing APIs
```
POST   /api/stt/transcribe             Speech-to-text
POST   /api/emotion                    Emotion analysis
GET    /api/dashboard/summary          Dashboard summary
GET    /api/user/preferences           Get preferences
PUT    /api/user/preferences           Set preferences
```

### Infrastructure
```
GET    /                                API status
GET    /health                         Health check
GET    /api/monitoring/error-stats     Error statistics
GET    /api/system/temp-cleanup-stats  Cleanup info
```

### WebSocket Channels
```
ws://host/ws/landmarks?sessionId=xxx   Face expression data
ws://host/ws/voice?sessionId=xxx       Audio data stream
ws://host/ws/session?sessionId=xxx     Session control
```

## Common Issues & Solutions

### CORS Errors
**Symptom**: Browser console shows "CORS policy: No 'Access-Control-Allow-Origin' header"
```
Solution:
1. Verify FRONTEND_URLS in backend .env includes your frontend origin
2. Restart backend after changing FRONTEND_URLS
3. Check browser DevTools Network tab for preflight (OPTIONS) request
4. Ensure origin format matches exactly (http vs https, www, etc.)
```

### WebSocket Connection Fails
**Symptom**: WebSocket connections fail to establish or drop immediately
```
Solution:
1. Verify backend is running on correct port
2. Check VITE_API_URL and VITE_WS_URL in frontend .env
3. Ensure protocol matches: http→ws, https→wss
4. Check SessionManager has valid sessionId from /api/session/start
5. Look for firewall blocking WebSocket traffic
```

### Timeout Errors
**Symptom**: API calls fail with timeout error after 20 seconds
```
Solution:
1. Check backend logs for slow operations
2. Monitor CPU/memory usage on backend
3. Verify database connections are healthy
4. For large files: increase axios timeout in frontend/src/services/api.ts
5. Consider adding request queuing for high-traffic periods
```

### Session Not Found
**Symptom**: WebSocket connection closes with "Invalid sessionId"
```
Solution:
1. Verify sessionId from /api/session/start response
2. Check if sessionId was copied correctly
3. Ensure session was created BEFORE connecting WebSocket
4. Check SessionManager.getSession(sessionId) in backend logs
5. Verify session hasn't been deleted (cleanup occurs 60s after end)
```

## Performance Checklist

- [ ] API timeout set to 20 seconds (frontend)
- [ ] WebSocket heartbeat intervals aligned (15s visible, 30s hidden)
- [ ] Exponential backoff configured (1s → 30s)
- [ ] Request ID correlation enabled in logs
- [ ] Morgan logging captures all requests
- [ ] Rate limiting: 600 req/10min general, 300 req/10min writes
- [ ] Database connection pooling configured
- [ ] Temporary file cleanup running (7 days, 500MB max)
- [ ] Error handler logging all failures with context
- [ ] API monitoring enabled in development (window.__apiMonitoring)

## Security Checklist

- [ ] HTTPS/WSS in production deployment
- [ ] Auth tokens stored securely (localStorage with HttpOnly consideration)
- [ ] CORS origins whitelist maintained
- [ ] Rate limiting per IP and optionally per session
- [ ] Input validation via Zod schemas on all endpoints
- [ ] File upload size limits enforced (1MB JSON)
- [ ] Sensitive data not logged (API keys, tokens, PII)
- [ ] HELMET security headers enabled
- [ ] CSRF protection considered for form submissions
- [ ] Dependencies kept up-to-date (npm audit)

## Testing Integration Locally

### Step 1: Start Backend
```bash
cd BeMoreBackend
npm install
npm run dev
# Should output: 🚀 서버 실행 중 (port): 8000
```

### Step 2: Start Frontend
```bash
cd BeMoreFrontend
npm install
npm run dev
# Should output: VITE v5.x.x  ready in XXX ms
```

### Step 3: Test Session Flow
```bash
# In browser console:
await fetch('http://localhost:8000/api/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'test_user', counselorId: 'test_counselor' })
}).then(r => r.json()).then(console.log)
```

### Step 4: Check WebSocket URLs
```
Look for wsUrls in response:
{
  "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_...",
  "voice": "ws://localhost:8000/ws/voice?sessionId=sess_...",
  "session": "ws://localhost:8000/ws/session?sessionId=sess_..."
}
```

### Step 5: Test WebSocket Connection
```javascript
// In browser console:
const ws = new WebSocket('ws://localhost:8000/ws/landmarks?sessionId=<SESSION_ID>');
ws.onopen = () => console.log('Connected!');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = () => console.log('Closed');
```

## Useful Debugging Commands

### Frontend API Monitoring
```javascript
// In browser console:
window.__apiMonitoring.getStats()
window.__apiMonitoring.getEndpointStats()
window.__apiMonitoring.getMetrics()
```

### Backend Health Check
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/monitoring/error-stats
curl http://localhost:8000/api/system/temp-cleanup-stats
```

### Check Logs
```bash
# Backend logs show: Morgan HTTP logs, WebSocket events, Sequelize queries
# Look for: request IDs, session lifecycle, error stacks
```

## Summary

**Current Status**: ✅ FULLY COMPATIBLE

Both projects are production-ready and fully integrated. Just ensure:
1. Environment variables are correctly configured
2. Ports are available and accessible
3. External API keys (Gemini, OpenAI) are set
4. Database is initialized
5. CORS origins match your deployment

All API endpoints have corresponding frontend methods, WebSocket channels are properly routed, and session lifecycle is well-managed. No code changes needed, just configuration!
