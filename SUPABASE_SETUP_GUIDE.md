# 🚀 Supabase Integration Setup Guide

**Status**: 📋 Ready for Implementation
**Date**: 2025-10-26
**Target**: Connect BeMore Backend to Supabase PostgreSQL

---

## 📋 Overview

This guide provides step-by-step instructions to integrate your BeMore backend with Supabase, enabling centralized database storage and production-ready cloud infrastructure.

**Timeline**:
- **Phase 1**: Supabase Setup (5 min)
- **Phase 2**: Local Testing (10 min)
- **Phase 3**: Render Deployment (5 min)
- **Total**: ~20 minutes

---

## 🎯 Phase 1: Supabase Project Setup (5 minutes)

### Step 1.1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in details:
   - **Project Name**: `BeMoreEmotionAnalysis` (or your choice)
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users (e.g., `Asia Pacific (ap-southeast-1)` for Korea)
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### Step 1.2: Access SQL Editor

Once provisioned:
1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. You'll see a blank SQL editor

### Step 1.3: Copy and Execute Schema SQL

**IMPORTANT**: Execute each table creation separately to avoid errors.

**Copy the entire SQL schema below** and execute in Supabase SQL Editor:

```sql
-- ============================================
-- 1. BEMORE USERS TABLE
-- ============================================
CREATE TABLE public.bemore_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 2. BEMORE SESSIONS TABLE (CORE)
-- ============================================
CREATE TABLE public.bemore_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  counselor_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'ended')),
  started_at BIGINT NOT NULL,
  ended_at BIGINT,
  duration INTEGER,
  emotions_data JSONB DEFAULT '[]'::jsonb,
  counters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_bemore_sessions_user_id ON public.bemore_sessions(user_id);
CREATE INDEX idx_bemore_sessions_session_id ON public.bemore_sessions(session_id);
CREATE INDEX idx_bemore_sessions_status ON public.bemore_sessions(status);
CREATE INDEX idx_bemore_sessions_created_at ON public.bemore_sessions(created_at);

-- ============================================
-- 3. BEMORE EMOTIONS TABLE (Optional Normalization)
-- ============================================
CREATE TABLE public.bemore_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion TEXT NOT NULL,
  emotion_ko TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  frame_count INTEGER,
  stt_snippet TEXT,
  intensity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_emotions_session_id ON public.bemore_emotions(session_id);
CREATE INDEX idx_bemore_emotions_timestamp ON public.bemore_emotions(timestamp);

-- ============================================
-- 4. BEMORE REPORTS TABLE
-- ============================================
CREATE TABLE public.bemore_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion_count INTEGER,
  primary_emotion TEXT,
  emotional_state TEXT,
  trend TEXT,
  positive_ratio INTEGER,
  negative_ratio INTEGER,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_reports_session_id ON public.bemore_reports(session_id);

-- ============================================
-- 5. BEMORE FEEDBACK TABLE
-- ============================================
CREATE TABLE public.bemore_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_bemore_feedback_session_id ON public.bemore_feedback(session_id);

-- ============================================
-- 6. BEMORE USER PREFERENCES TABLE
-- ============================================
CREATE TABLE public.bemore_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT
  'bemore_users' as table_name, COUNT(*) as row_count
FROM public.bemore_users
UNION ALL
SELECT 'bemore_sessions', COUNT(*) FROM public.bemore_sessions
UNION ALL
SELECT 'bemore_emotions', COUNT(*) FROM public.bemore_emotions
UNION ALL
SELECT 'bemore_reports', COUNT(*) FROM public.bemore_reports
UNION ALL
SELECT 'bemore_feedback', COUNT(*) FROM public.bemore_feedback
UNION ALL
SELECT 'bemore_user_preferences', COUNT(*) FROM public.bemore_user_preferences;
```

**After running**:
- ✅ All tables created successfully
- ✅ Verification query shows 6 tables with 0 rows
- ✅ Indexes created for performance

### Step 1.4: Configure Row Level Security (RLS)

**Enable RLS** for data privacy:

```sql
-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE public.bemore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.bemore_sessions
  FOR SELECT
  USING (user_id = auth.uid()::text OR auth.role() = 'authenticated');

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions"
  ON public.bemore_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR auth.role() = 'authenticated');

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions"
  ON public.bemore_sessions
  FOR UPDATE
  USING (user_id = auth.uid()::text OR auth.role() = 'authenticated');

-- Apply similar policies to related tables
CREATE POLICY "Users can view emotions from their sessions"
  ON public.bemore_emotions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bemore_sessions
    WHERE id = session_id AND user_id = auth.uid()::text
  ));

CREATE POLICY "Users can view reports from their sessions"
  ON public.bemore_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bemore_sessions
    WHERE id = session_id AND user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert feedback for their sessions"
  ON public.bemore_feedback
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bemore_sessions
    WHERE id = session_id AND user_id = auth.uid()::text
  ));

CREATE POLICY "Users can view their preferences"
  ON public.bemore_user_preferences
  FOR SELECT
  USING (user_id = auth.uid()::text OR auth.role() = 'authenticated');

CREATE POLICY "Users can update their preferences"
  ON public.bemore_user_preferences
  FOR UPDATE
  USING (user_id = auth.uid()::text OR auth.role() = 'authenticated');
```

✅ **RLS Configured** - Data privacy enabled

### Step 1.5: Get Database Connection String

1. Go to **Project Settings** → **Database**
2. Copy the **Connection String** under "Connection pooling"
3. You'll see something like:
   ```
   postgresql://[user]:[password]@[host]:5432/postgres?schema=public
   ```
4. **Save this securely** - you'll need it in Phase 2

---

## 🧪 Phase 2: Local Testing (10 minutes)

### Step 2.1: Update .env File

Create or update `.env` file in project root:

```bash
# Database Configuration
DATABASE_URL="postgresql://[your-user]:[your-password]@[your-host]:5432/postgres?schema=public"

# Other existing config
NODE_ENV=development
PORT=8000
GOOGLE_API_KEY=your_gemini_api_key
# ... other vars
```

**Replace** `[your-user]`, `[your-password]`, `[your-host]` with actual values from Supabase

### Step 2.2: Update Sequelize Configuration

Edit `config/database.js` to use Supabase:

```javascript
module.exports = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://...',
    dialect: 'postgres',
    protocol: 'postgresql',
    logging: (msg) => console.log('📊 [SQL]', msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DATABASE_URL ? {
        require: true,
        rejectUnauthorized: false
      } : false,
    }
  },
  // ... other environments
};
```

### Step 2.3: Run Sequelize Migrations

```bash
# Create database migration
npm run sequelize db:migrate

# Or if using models directly, sync database
npm run sequelize db:seed:all
```

### Step 2.4: Start Local Server

```bash
# Kill any running server
pkill -9 -f "npm run dev" 2>/dev/null

# Start fresh
npm run dev
```

**Expected output**:
```
✅ Database connected
✅ Server running on http://localhost:8000
📊 [SQL] Connected to PostgreSQL via Supabase
```

### Step 2.5: Test Session API

**Create a test session**:
```bash
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_supabase",
    "counselorId": "test_counselor"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "sessionId": "sess_1761...",
  "wsUrls": { "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=..." },
  "startedAt": 1761390973946
}
```

### Step 2.6: Verify Data in Supabase

1. Go to Supabase **Table Editor**
2. Click **bemore_sessions** table
3. Verify your test session appears with:
   - ✅ session_id
   - ✅ user_id = "test_user_supabase"
   - ✅ status = "active"
   - ✅ emotionsData = [] (empty array)

### Step 2.7: End Session and Check Emotions

**End the test session**:
```bash
curl -X POST http://localhost:8000/api/session/[sessionId]/end
```

**Check emotionSummary** (if emotions were detected):
```bash
curl http://localhost:8000/api/session/[sessionId]/summary | python3 -m json.tool
```

**Verify in Supabase**:
- Check **bemore_sessions** table
- Row status should be "ended"
- emotionsData should contain emotion objects (if any were detected)

✅ **Local Testing Complete** - Data persisting to Supabase

---

## 🚀 Phase 3: Render Deployment (5 minutes)

### Step 3.1: Prepare Render Environment

1. Go to **Render Dashboard**
2. Select your **BeMore Backend** service
3. Go to **Environment** tab
4. Add new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: (Paste your Supabase connection string from Step 1.5)

### Step 3.2: Deploy to Render

**Option A: Via Render Dashboard**
1. Go to **Deploys** tab
2. Click **"Create Deploy"**
3. Wait for deployment to complete

**Option B: Via Git (automatic)**
```bash
# Push to main branch to trigger auto-deploy
git add .
git commit -m "feat: deploy with Supabase integration"
git push origin main
```

### Step 3.3: Verify Production Deployment

**Check server health** (after 2 minutes):
```bash
curl https://bemore-backend.onrender.com/health | python3 -m json.tool
```

**Expected response**:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

### Step 3.4: Monitor Production Logs

1. Go to Render Dashboard
2. Click **Logs** tab
3. Look for messages:
   ```
   ✅ [DATABASE] Connected to PostgreSQL via Supabase
   ✅ [SERVER] Running on https://bemore-backend.onrender.com
   ```

### Step 3.5: Test Production API

**Create a production session**:
```bash
curl -X POST https://bemore-backend.onrender.com/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "prod_test_user",
    "counselorId": "prod_test_counselor"
  }'
```

**Verify in Supabase**:
- Check **bemore_sessions** table
- New session should appear with production data

✅ **Production Deployment Complete** - Live on Render with Supabase backend

---

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] 6 tables created successfully
- [ ] Indexes created for performance
- [ ] RLS policies configured
- [ ] DATABASE_URL copied
- [ ] .env file updated locally
- [ ] Server started locally with `npm run dev`
- [ ] Test session created and verified in Supabase
- [ ] Local emotions persisting to database
- [ ] Render environment variable added
- [ ] Deployed to Render
- [ ] Production health check passing
- [ ] Production session created and verified in Supabase

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to PostgreSQL"

**Solution**:
1. Verify DATABASE_URL is correct
2. Check if Supabase has whitelisted your IP (go to Database Settings → Connection pooling)
3. Add your public IP to Supabase firewall

```bash
# Find your IP
curl https://api.ipify.org
```

### Issue: "RLS policy denied access"

**Solution**:
1. Verify user_id matches auth.uid()
2. For testing, temporarily disable RLS:
   ```sql
   ALTER TABLE public.bemore_sessions DISABLE ROW LEVEL SECURITY;
   ```
3. Re-enable after testing

### Issue: "Module not found: models"

**Solution** (already applied in critical fix a0eda02):
```javascript
// Use absolute path instead of relative
const models = require(path.join(__dirname, '../../models'));
```

### Issue: "HTTP 000 error"

**Solution**:
1. Check Render logs for actual error
2. Verify DATABASE_URL environment variable set
3. Restart service on Render

---

## 📊 Database Architecture

```
┌─────────────────────────────────────────┐
│     BeMore Frontend (React)              │
└────────────────────┬────────────────────┘
                     │
            HTTP / WebSocket
                     │
                     ▼
┌─────────────────────────────────────────┐
│  BeMore Backend (Node.js/Express)       │
│  - Session Manager                      │
│  - WebSocket Handler                    │
│  - Gemini Integration                   │
│  - EmotionAnalyzer                      │
└────────────────────┬────────────────────┘
                     │
           DATABASE_URL Connection
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Supabase PostgreSQL Database         │
│                                         │
│  📚 Existing (독서 추적):               │
│  ├─ profiles, books, notes              │
│  └─ tags, entities, links               │
│                                         │
│  🎭 New (감정 분석):                    │
│  ├─ bemore_sessions (core)              │
│  ├─ bemore_emotions (timeline)          │
│  ├─ bemore_reports (aggregated)         │
│  ├─ bemore_feedback (ratings)           │
│  ├─ bemore_user_preferences (settings)  │
│  └─ bemore_users (management)           │
│                                         │
│  🔐 Security: RLS + Auth Integration   │
└─────────────────────────────────────────┘
```

---

## 📈 Next Steps

1. ✅ **Complete Phase 1-3** above
2. **Frontend Integration** - Connect frontend to Render backend
3. **Monitor Production** - Watch Render logs for errors
4. **Scale Database** - If needed, upgrade Supabase plan
5. **Backup Strategy** - Enable Supabase automated backups

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html
- **Sequelize Docs**: https://sequelize.org/docs/
- **Render Docs**: https://render.com/docs

---

**Status**: ✅ Ready for Implementation
**Estimated Time**: ~20 minutes (all 3 phases)
**Target**: Production-ready emotion analysis system with Supabase backend
