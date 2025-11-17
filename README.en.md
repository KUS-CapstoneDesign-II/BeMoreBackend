# BeMore Backend

> Real-time multimodal emotion recognition and CBT-based reflection system backend API server

[![Version](https://img.shields.io/badge/version-1.2.3-blue.svg)](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.20.4-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](./LICENSE)

---

## Overview

BeMore Backend is a production-ready Node.js/Express server that provides real-time multimodal emotion analysis through facial landmarks (478 points), voice activity detection (16kHz), and natural language processing. The system integrates Cognitive Behavioral Therapy (CBT) methodologies to detect cognitive distortions and generate therapeutic interventions.

The backend serves as the core processing engine for the BeMore platform, managing WebSocket connections for real-time data streaming, coordinating AI-powered emotion analysis via Google Gemini API, and orchestrating CBT-based counseling workflows. It provides REST API endpoints for authentication, session management, report generation, and dashboard analytics.

**Tech Stack**: Node.js 18.20.4+, Express 5.1.0, PostgreSQL 14+ (Supabase), WebSocket (ws), Google Gemini 2.5 Flash, OpenAI Whisper API, Silero VAD

---

## Features

### Implemented ✅

- **3-Channel WebSocket System**
  - Landmarks channel: 478 3D facial landmarks (MediaPipe Face Mesh)
  - Voice channel: 16kHz PCM/WAV audio streaming
  - Session control channel: pause/resume/end commands
  - AI voice chat channel: Real-time counseling responses with emotion-based prompts

- **Multimodal Emotion Analysis**
  - Facial expression analysis (50% weight)
  - Voice activity detection with 7 psychological metrics (30% weight)
  - Text sentiment analysis (20% weight)
  - 8 emotion types: happy, sad, angry, anxious, neutral, surprised, disgusted, fearful

- **AI Voice Chat** (100% Complete)
  - Gemini 2.5 Flash streaming integration
  - 8 emotion-based counseling prompts
  - Conversation history tracking (PostgreSQL)
  - Real-time streaming protocol (begin → chunk → complete)

- **CBT Cognitive Distortion Detection**
  - 10 cognitive distortion patterns
  - Socratic questioning generation
  - Therapeutic intervention recommendations
  - Behavioral task suggestions

- **Session Lifecycle Management**
  - In-memory session buffering with 10-second aggregation
  - Database persistence (sessions + conversations tables)
  - Automatic report generation on session end
  - JSON report storage (tmp/analyses/)

- **JWT Authentication**
  - Access token (15-minute expiry) + Refresh token (7-day expiry)
  - bcrypt password hashing
  - Token rotation on refresh
  - Refresh token revocation on logout

- **Production Deployment**
  - Render.com deployment with auto-deploy on main branch
  - Supabase PostgreSQL integration (Session Pooler IPv4)
  - Health check endpoint
  - Rate limiting (600 requests per IP per 10 minutes)

### Partially Implemented ⚠️

- **Automated Testing**: Manual test scripts exist (`scripts/test-*.js`), but no comprehensive E2E test suite
- **Performance Monitoring**: Basic console logging only, no APM integration
- **Error Tracking**: Local error logging without external monitoring service

### Planned 📋

- TypeScript migration for type safety
- CI/CD pipeline setup (GitHub Actions)
- Comprehensive E2E test coverage with Jest
- ESLint + Prettier code quality tools
- APM integration (e.g., New Relic, Datadog)
- Security hardening enhancements

---

## Architecture

### System Components

```
┌─────────────────┐
│  Frontend       │
│  (React App)    │
└────────┬────────┘
         │
         ├─── REST API (Express 5.1.0)
         │    ├─ /api/auth/* (signup, login, refresh, logout)
         │    ├─ /api/session/* (CRUD, end)
         │    ├─ /api/dashboard (analytics)
         │    └─ /api/health (monitoring)
         │
         └─── WebSocket (ws 8.18.3)
              ├─ /ws/landmarks?sessionId={id}
              ├─ /ws/voice?sessionId={id}
              └─ /ws/session?sessionId={id}
                   │
                   ▼
         ┌────────────────────┐
         │  SessionManager    │ (In-memory buffer)
         └─────────┬──────────┘
                   │
         ┌─────────┼─────────────┐
         │         │             │
         ▼         ▼             ▼
   ┌─────────┐ ┌─────┐  ┌────────────┐
   │ Gemini  │ │ VAD │  │  Whisper   │
   │   API   │ │     │  │    API     │
   │(Emotion)│ │     │  │   (STT)    │
   └────┬────┘ └──┬──┘  └─────┬──────┘
        │         │           │
        └─────────┼───────────┘
                  │
         ┌────────▼────────────┐
         │   CBT Modules       │
         │ - Distortion Detect │
         │ - Socratic Question │
         │ - Intervention Gen  │
         └─────────┬───────────┘
                   │
         ┌─────────▼──────────┐
         │  Report Generator  │
         └─────────┬──────────┘
                   │
         ┌─────────┼──────────┐
         │         │          │
         ▼         ▼          ▼
    PostgreSQL   File    Conversations
    (Supabase)  System      Table
```

### External Integrations

- **Google Gemini API**: Emotion analysis + AI counseling (Gemini 2.5 Flash)
- **OpenAI Whisper API**: Speech-to-text conversion
- **Silero VAD**: Local voice activity detection (16kHz sample rate)

### Database

- **Provider**: Supabase PostgreSQL 14+
- **ORM**: Sequelize 6.37.7
- **Connection**: Session Pooler (IPv4, required for Render.com)
- **Tables**: 6 core tables (users, sessions, reports, conversations, counselings, user_preferences)

---

## Project Structure

```
BeMoreBackend/
├── app.js                          # Express + WebSocket server entry point (304 lines)
├── package.json                    # Dependencies & scripts
├── schema/                         # PostgreSQL DDL
│   ├── init.sql                    # 6 core tables
│   ├── 03_conversations.sql        # AI chat conversations table
│   └── 04_rls_policies.sql         # Row-level security policies
│
├── models/                         # Sequelize ORM models (7 models)
│   ├── index.js                    # Model loader with DATABASE_URL
│   ├── User.js                     # Authentication
│   ├── Session.js                  # Counseling sessions
│   ├── Report.js                   # Analysis reports
│   ├── Conversation.js             # AI chat history
│   ├── Counseling.js               # Counseling records
│   ├── Feedback.js                 # User feedback
│   └── UserPreferences.js          # User settings
│
├── routes/                         # REST API endpoints (10 routes)
│   ├── auth.js                     # Authentication (signup, login, refresh, logout)
│   ├── session.js                  # Session CRUD
│   ├── dashboard.js                # User dashboard data
│   ├── emotion.js                  # Emotion timeline
│   ├── analytics.js                # Analytics endpoints
│   ├── user.js                     # User management
│   ├── stt.js                      # Speech-to-text processing
│   ├── survey.js                   # Survey endpoints
│   ├── monitoring.js               # System monitoring
│   └── health.js                   # Health check
│
├── controllers/                    # Business logic (5 controllers)
│   ├── authController.js           # Auth operations
│   ├── sessionController.js        # Session management
│   ├── dashboardController.js      # Dashboard aggregation
│   ├── analyticsController.js      # Analytics processing
│   └── userController.js           # User operations
│
├── services/                       # Core services (16 modules)
│   ├── socket/                     # WebSocket handlers
│   │   ├── setupWebSockets.js      # 3-channel router
│   │   ├── landmarksHandler.js     # Facial landmarks processing
│   │   ├── voiceHandler.js         # Audio stream processing
│   │   └── sessionHandler.js       # Session control + AI chat
│   │
│   ├── session/
│   │   ├── SessionManager.js       # In-memory session buffer
│   │   └── sessionService.js       # Database session operations
│   │
│   ├── inference/
│   │   ├── InferenceService.js     # Multimodal emotion inference
│   │   └── DataStore.js            # Session data storage
│   │
│   ├── vad/
│   │   ├── VadAnalyzer.js          # Silero VAD processing
│   │   ├── VadMetrics.js           # 7 VAD psychological metrics
│   │   └── PsychologicalIndicators.js
│   │
│   ├── gemini/                     # Gemini API integration
│   │   ├── gemini.js               # API client + streaming
│   │   └── prompts.js              # 8 emotion-based prompts
│   │
│   ├── cbt/                        # CBT analysis modules
│   │   ├── CognitiveDistortionDetector.js  # 10 distortion types
│   │   ├── SocraticQuestioner.js           # Reflective questions
│   │   ├── InterventionGenerator.js        # Therapeutic interventions
│   │   └── BehavioralTaskRecommender.js    # Task recommendations
│   │
│   ├── report/                     # Report generation
│   │   ├── FinalReportService.js   # JSON report generator
│   │   ├── SessionReportGenerator.js
│   │   ├── PdfReportGenerator.js
│   │   └── csv.js                  # CSV export
│   │
│   ├── analysis/
│   │   ├── MultimodalAnalyzer.js   # Emotion fusion
│   │   └── EmotionVADVector.js     # VAD emotion mapping
│   │
│   ├── conversation/               # AI chat engine
│   │   └── ConversationEngine.js   # Chat orchestration
│   │
│   ├── auth/
│   │   └── authService.js          # JWT token management
│   │
│   ├── config/
│   │   └── validateEnv.js          # Environment validation
│   │
│   ├── system/
│   │   └── TempFileCleanup.js      # Automated file cleanup
│   │
│   ├── ErrorHandler.js             # Global error handler
│   ├── cache.js                    # Caching service
│   └── memory.js                   # Memory management
│
├── middlewares/                    # Express middleware
│   ├── auth.js                     # JWT authentication
│   ├── requestId.js                # Request ID tracking
│   └── zod.js                      # Schema validation (Zod)
│
├── docs/                           # Comprehensive documentation
│   ├── guides/
│   │   ├── API_ENDPOINT_REFERENCE.md
│   │   ├── AI_VOICE_CHAT_GUIDE.md
│   │   └── QUICK_START.md
│   │
│   ├── integration/
│   │   ├── BACKEND_IMPLEMENTATION_COMPLETE.md
│   │   ├── IMPLEMENTATION_STATUS.md
│   │   └── FRONTEND_AI_VOICE_INTEGRATION.md
│   │
│   ├── deployment/
│   │   └── RENDER_DEPLOYMENT_SETUP_2025-11-04.md
│   │
│   └── troubleshooting/
│       ├── SESSION_SCHEMA_MISMATCH_FIX.md
│       └── DB_RECONNECTION_GUIDE.md
│
└── tmp/analyses/                   # Generated report files (JSON)
```

### Directory Purposes

- **routes/**: REST API endpoint definitions and routing
- **controllers/**: Business logic layer handling request/response
- **services/**: Core services for emotion analysis, WebSocket handling, CBT processing, and report generation
- **models/**: Sequelize ORM models mapping to PostgreSQL tables
- **middlewares/**: Express middleware for authentication, logging, and validation
- **schema/**: PostgreSQL DDL scripts for database setup
- **docs/**: Comprehensive technical documentation and guides
- **tmp/**: Temporary storage for generated analysis reports

---

## Setup & Environment

### Prerequisites

- **Node.js**: ≥ 18.20.4
- **npm**: ≥ 9.0.0
- **PostgreSQL**: 14+ (Supabase recommended)
- **API Keys**: Google Gemini API, OpenAI API

### Installation

```bash
# Clone repository
git clone https://github.com/KUS-CapstoneDesign-II/BeMoreBackend.git
cd BeMoreBackend

# Install dependencies
npm install
```

### Environment Variables

Create `.env` file in project root:

```bash
# Server Configuration
NODE_ENV=development
PORT=8000

# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication (required)
AUTH_ENABLED=true
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# API Keys (required)
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
GEMINI_TIMEOUT_MS=45000

# CORS Configuration
FRONTEND_URLS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=debug
ENABLE_REQUEST_ID=true

# Cleanup Configuration
TEMP_FILE_MAX_AGE_DAYS=7
TEMP_FILE_MAX_SIZE_MB=500
TEMP_CLEANUP_INTERVAL_MIN=60

# Inference Weights
INFERENCE_FACIAL_WEIGHT=0.5
INFERENCE_VAD_WEIGHT=0.3
INFERENCE_TEXT_WEIGHT=0.2
INFERENCE_MODEL_VERSION=rules-v1.0
```

See `.env.example` for complete configuration template (108 lines).

### Database Setup

```bash
# Apply schema files in order
psql $DATABASE_URL -f schema/init.sql
psql $DATABASE_URL -f schema/03_conversations.sql
psql $DATABASE_URL -f schema/04_rls_policies.sql
```

For Supabase: Use SQL Editor to execute schema files.

### Running the Server

```bash
# Development mode (auto-restart with nodemon)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:8000`.

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | User registration | ❌ |
| POST | `/api/auth/login` | Login (returns access + refresh tokens) | ❌ |
| POST | `/api/auth/refresh` | Refresh access token | ❌ |
| POST | `/api/auth/logout` | Logout (invalidates refresh token) | ✅ |

### Session Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/session` | Create new session | ✅ |
| GET | `/api/session/:sessionId` | Get session details | ✅ |
| POST | `/api/session/:sessionId/end` | End session (triggers report generation) | ✅ |

### WebSocket Channels

**Landmarks Channel**: `ws://server:8000/ws/landmarks?sessionId={id}`
- Input: 478 3D facial landmarks (MediaPipe Face Mesh)
- Format: `{ type: "landmarks", timestamp: number, landmarks: Array<{x,y,z}> }`

**Voice Channel**: `ws://server:8000/ws/voice?sessionId={id}`
- Input: Binary audio stream (PCM/WAV, 16kHz)
- Processing: VAD analysis → Whisper STT

**Session Control Channel**: `ws://server:8000/ws/session?sessionId={id}`
- Commands: `{ action: "pause"|"resume"|"end" }`
- AI Chat: `{ type: "request_ai_response", data: { message: string, emotion: string } }`

For detailed API documentation, see [`docs/guides/API_ENDPOINT_REFERENCE.md`](./docs/guides/API_ENDPOINT_REFERENCE.md).

For AI voice chat protocol, see [`docs/guides/AI_VOICE_CHAT_GUIDE.md`](./docs/guides/AI_VOICE_CHAT_GUIDE.md).

---

## Running Tests

### Available Test Scripts

```bash
# Jest unit tests
npm test

# AI voice chat WebSocket test
node scripts/test-ai-chat.js

# Schema-model validation
node scripts/validate-schema.js

# Phase 0-1.5 integration tests
./test-phase-0-1.5.sh

# Supabase connection test
node test-supabase-integration.js
```

### Additional Test Scripts

- `test-websocket.js` - WebSocket connection test
- `test-vad-system.js` - VAD system test
- `test-cbt-system.js` - CBT analysis test
- `test-landmark-compression.js` - Landmark data compression test

**Note**: No comprehensive E2E test suite exists. Current testing relies primarily on manual testing and individual test scripts.

---

## Deployment

### Production Deployment (Render.com)

**Platform**: Render.com
**Production URL**: https://bemorebackend.onrender.com

**Build Configuration**:
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node
- Region: Singapore (or closest)

**Environment Variables** (Set in Render Dashboard):
```bash
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://user:password@aws-region.pooler.supabase.com:5432/postgres
JWT_SECRET=production-secret
GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
FRONTEND_URLS=https://your-frontend.vercel.app
```

**Important**: Use Supabase Session Pooler (IPv4) for Render compatibility. Direct Connection (IPv6) will not work.

### Health Check

```bash
curl https://bemorebackend.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-13T12:00:00.000Z",
  "version": "1.2.3",
  "database": "connected"
}
```

### Auto-Deploy

- Trigger: Push to `main` branch
- Platform: Automatic deployment via Render.com

For detailed deployment guide, see [`docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md`](./docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md).

---

## Limitations & Future Work

### Current Limitations

- **No TypeScript**: Pure JavaScript implementation, no compile-time type checking
- **Limited Test Coverage**: Manual testing primarily used, no comprehensive E2E test suite
- **No CI/CD Pipeline**: Manual deployment process, no automated testing on PR
- **Basic Logging**: Console logging only, no APM or external error tracking
- **Manual Deployment**: No automated deployment workflows beyond Render's auto-deploy

### Future Improvements

From [`ROADMAP.md`](./ROADMAP.md):

**Phase 5 Planned** (40% complete):
- TypeScript migration for type safety
- ESLint + Prettier for code quality standards
- Comprehensive E2E testing with Jest
- Performance monitoring with APM integration
- Security hardening enhancements (beyond current rate limiting)
- CI/CD pipeline setup (GitHub Actions)

---

## Documentation

### Quick Start
- **Quick Start Guide**: [`docs/guides/QUICK_START.md`](./docs/guides/QUICK_START.md)
- **API Reference**: [`docs/guides/API_ENDPOINT_REFERENCE.md`](./docs/guides/API_ENDPOINT_REFERENCE.md)
- **AI Voice Chat Guide**: [`docs/guides/AI_VOICE_CHAT_GUIDE.md`](./docs/guides/AI_VOICE_CHAT_GUIDE.md)

### Deployment
- **Render Deployment**: [`docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md`](./docs/deployment/RENDER_DEPLOYMENT_SETUP_2025-11-04.md)
- **Supabase Setup**: [`docs/database/SUPABASE_SETUP_GUIDE.md`](./docs/database/SUPABASE_SETUP_GUIDE.md)

### Implementation Status
- **Backend Implementation Complete**: [`docs/integration/BACKEND_IMPLEMENTATION_COMPLETE.md`](./docs/integration/BACKEND_IMPLEMENTATION_COMPLETE.md)
- **Implementation Status Matrix**: [`docs/integration/IMPLEMENTATION_STATUS.md`](./docs/integration/IMPLEMENTATION_STATUS.md)

### Troubleshooting
- **Session Schema Fix**: [`docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md`](./docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md)
- **Refresh Token Fix**: [`docs/troubleshooting/REFRESH_TOKEN_SCHEMA_FIX.md`](./docs/troubleshooting/REFRESH_TOKEN_SCHEMA_FIX.md)
- **DB Reconnection Guide**: [`docs/troubleshooting/DB_RECONNECTION_GUIDE.md`](./docs/troubleshooting/DB_RECONNECTION_GUIDE.md)

### Project Management
- **Repository Summary**: [`SUMMARY.md`](./SUMMARY.md)
- **Future Roadmap**: [`ROADMAP.md`](./ROADMAP.md)
- **Korean README**: [`README.ko.md`](./README.ko.md) (original Korean documentation)

---

## Version History

### v1.2.3 (2025-11-13) - Session Schema Fix
- **Critical Fix**: Session schema-model mismatch resolved
- Changed Sequelize model configuration: `underscored: false`, `tableName: 'sessions'`
- Impact: WebSocket session creation/retrieval restored
- Details: [`docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md`](./docs/troubleshooting/SESSION_SCHEMA_MISMATCH_FIX.md)

### v1.2.2 (2025-01-11~12) - Production Emergency Fix
- Supabase database connection restored (IPv4/IPv6 compatibility)
- Gemini API timeout increased (30s → 45s)
- Refresh token schema mismatch resolved

### v1.2.1 (2025-01-10) - Emotion Types Expansion
- Emotion types expanded (5 → 8 emotions)
- MediaPipe standard emotion set adopted

### v1.2.0 (2025-11-10) - Production Deployment
- First successful Render.com production deployment
- Supabase PostgreSQL integration

### v1.1.0 (2025-11-04) - Backend VAD Analysis
- VAD service performance validation completed

### v1.0.0 (2025-10-24) - Initial Release
- REST API basic structure
- WebSocket 3-channel implementation
- Multimodal emotion analysis pipeline

---

## Tech Stack Summary

**Backend Core**: Node.js 18.20.4+, Express 5.1.0, WebSocket (ws 8.18.3), Sequelize 6.37.7

**Database**: PostgreSQL 14+ (Supabase)

**AI/ML Services**: Google Gemini 2.5 Flash, OpenAI Whisper API, Silero VAD

**Security**: helmet 7.1.0, express-rate-limit 7.4.0, jsonwebtoken 9.0.2, bcrypt 6.0.0

**Development**: Jest 29.7.0, Supertest 7.0.0, nodemon 3.1.10

---

## License

ISC

---

## Contact

- **GitHub Issues**: [Project Issues](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend/issues)
- **Repository**: [BeMoreBackend](https://github.com/KUS-CapstoneDesign-II/BeMoreBackend)

---

## Acknowledgments

This project was built with the help of the following open-source projects:

- [MediaPipe](https://google.github.io/mediapipe/) - Facial landmark extraction (478 points)
- [OpenAI Whisper](https://openai.com/research/whisper) - Speech-to-text conversion
- [Google Gemini](https://ai.google.dev/) - Emotion analysis and AI counseling
- [Silero VAD](https://github.com/snakers4/silero-vad) - Voice activity detection (16kHz)

---

**Last Updated**: 2025-11-13
**Project Version**: 1.2.3
**Documentation Version**: 5.0.0 (English rewrite)
