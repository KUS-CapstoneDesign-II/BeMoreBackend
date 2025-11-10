# BeMoreBackend Session Management - Implementation Roadmap

## Current State Summary

**Status**: ~70% Complete (Core functionality exists, integration gaps remain)

### Completed Features
- Session lifecycle management (create, pause, resume, end, delete)
- Real-time data collection via WebSocket (landmarks, voice, STT)
- 10-second emotion analysis cycle via Gemini API
- VAD (Voice Activity Detection) metrics collection
- CBT (Cognitive Behavioral Therapy) cognitive distortion detection
- Multimodal report generation (JSON, PDF, CSV)
- Supabase integration for lightweight persistence

### Missing Critical Features
1. **Tick Endpoint** - No periodic aggregation endpoint
2. **Combined Emotion Scoring** - No unified score across modalities
3. **Storage Interface** - No abstraction layer for persistence
4. **Real-time Sync** - No emotion updates to database during session

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT APPLICATION                              │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ Face Detection API   │  │ Voice/Mic Input │  │ Speech Recognition   │   │
│  └──────────┬───────────┘  └────────┬────────┘  └──────────┬───────────┘   │
└─────────────┼──────────────────────┼──────────────────────┼─────────────────┘
              │                      │                      │
              ├─ [30-60 fps] ────────┼─ [100ms windows] ────┼─ [Real-time]
              │                      │                      │
              ▼                      ▼                      ▼
       ┌────────────────────────────────────────────────────────┐
       │           WEBSOCKET SERVERS (Node.js)                 │
       ├────────────────────────────────────────────────────────┤
       │  /ws/landmarks ─────→ landmarksHandler.js              │
       │  /ws/voice ──────────→ voiceHandler.js                 │
       │  /ws/session ────────→ sessionHandler.js               │
       └────────────────────────────────────────────────────────┘
              │                      │                      │
              ▼ (frame buffer)        ▼ (metrics)            ▼ (text)
       ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
       │ landmarkBuffer[] │  │ vadMetrics       │  │ sttBuffer[]      │
       │ (accumulate)     │  │ (track)          │  │ (accumulate)     │
       └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘
                │ EVERY 10 SECONDS    │                     │
                └────────────┬────────┴─────────────────────┘
                             ▼
                    ┌────────────────────┐
                    │ Analysis Cycle     │
                    │ (10-sec window)    │
                    └────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │  GEMINI     │    │  VAD         │    │  CBT         │
   │  EMOTION    │    │  ANALYSIS    │    │  DETECTION   │
   │  API CALL   │    │  (7 metrics) │    │  (text)      │
   │             │    │              │    │              │
   │  Input:     │    │  Input:      │    │  Input:      │
   │  - frames   │    │  - audio     │    │  - STT text  │
   │  - STT txt  │    │  - patterns  │    │  - emotion   │
   │             │    │              │    │              │
   │  Output:    │    │  Output:     │    │  Output:     │
   │  - emotion  │    │  - valence   │    │  - distortion│
   │  - label    │    │  - arousal   │    │  - severity  │
   │             │    │  - dominance │    │              │
   └──────┬──────┘    └──────┬───────┘    └──────┬───────┘
          │                  │                    │
          └──────────────────┼────────────────────┘
                             ▼
                    ┌────────────────────┐
                    │  SESSION OBJECT    │
                    │  (In-Memory)       │
                    ├────────────────────┤
                    │ emotions[]         │ ← Timeline of emotion snapshots
                    │ vadAnalysisHistory │ ← Voice metrics history
                    │ interventionGener. │ ← CBT tracking state
                    │ wsConnections{}    │ ← Active WebSocket connections
                    └────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                │ (on request)            │ (on session end)
                ▼                         ▼
         ┌─────────────────┐      ┌────────────────────┐
         │  TICK ENDPOINT  │      │  SESSION END       │
         │  ❌ MISSING     │      │  WORKFLOW          │
         │                 │      │                    │
         │ Should return   │      │ 1. Generate Report │
         │ current emotion │      │ 2. Persist to DB   │
         │ + VAD + CBT     │      │ 3. Clean WebSockets│
         │ + combined score│      │ 4. Mark ended      │
         │                 │      │                    │
         │ Enables:        │      │ SessionReportGen   │
         │ - periodic poll │      │ → Full multimodal  │
         │ - dashboard UI  │      │    report          │
         │ - trend analysis│      │                    │
         └─────────────────┘      └────────┬───────────┘
                                           │
                             ┌─────────────┴─────────────┐
                             │ (async, with error-safe) │
                             ▼                         ▼
                    ┌──────────────────┐  ┌──────────────────┐
                    │  SUPABASE        │  │  SEQUELIZE       │
                    │  (Lightweight)   │  │  (Full DB)       │
                    │                  │  │                  │
                    │ - Session metadata  │ - Session summary │
                    │ - Emotion snapshots │ - Full report JSON
                    │   ❌ MISSING        │ - CBT details     │
                    │                  │  │                  │
                    └──────────────────┘  └──────────────────┘
                             │                     │
                             └─────────────┬───────┘
                                          ▼
                                 ┌──────────────────┐
                                 │  PERSISTENCE     │
                                 │  LAYER           │
                                 │                  │
                                 │ ❌ NO INTERFACE  │
                                 │    ABSTRACTION   │
                                 └──────────────────┘
```

---

## Data Flow Timeline

### Per-Session Timeline
```
T=0s          User starts session
  ├─ POST /api/session/start
  └─ SessionManager.createSession()
      ├─ Returns: sessionId, wsUrls
      └─ Async: Create session in Supabase

T=0-10s       Client connects WebSockets
  ├─ 30-60 landmarks/sec → /ws/landmarks
  ├─ Voice metrics → /ws/voice
  └─ STT text → /ws/session
      └─ All accumulated in session buffers

T=10s         First analysis cycle triggers
  ├─ Gemini analyzes frames + text → emotion_label
  ├─ VAD metrics computed → valence/arousal/dominance
  ├─ CBT detector runs → distortion list
  └─ session.emotions[].push({ emotion, timestamp, ... })

T=20s         Second analysis cycle
  └─ (Repeat every 10s)

T=N*10s       User pauses session
  └─ POST /api/session/:id/pause
      └─ session.status = 'paused'
         (Analysis continues if active, skips if paused)

T=M*10s       User resumes session
  └─ POST /api/session/:id/resume
      └─ session.status = 'active'
         (Analysis resumes)

T=X*10s       User ends session
  └─ POST /api/session/:id/end
      ├─ session.status = 'ended'
      ├─ Close WebSocket connections
      ├─ Continue analysis for 15s (grace period)
      └─ After 15s → Stop analysis cycle

T=X+2s        Report generation (async)
  ├─ SessionReportGenerator.generateReport(session)
  │  ├─ Emotion summary (timeline, trends)
  │  ├─ VAD summary (metrics, psychological)
  │  ├─ CBT summary (distortions, interventions)
  │  ├─ Multimodal assessment (risk score, recommendations)
  │  └─ Export formats (JSON, PDF, CSV)
  │
  ├─ Persist to database (with error suppression)
  └─ Respond to client: session ended successfully

T=X+3s        Data available for download
  ├─ GET /api/session/:id/report → Full JSON
  ├─ GET /api/session/:id/report/pdf → PDF
  ├─ GET /api/session/:id/report/csv → CSV
  └─ GET /api/session/:id/summary → Quick summary
```

---

## Current Implementation Status by Component

### SessionManager (100% Complete)
```javascript
✅ createSession()      - Creates new session with UUID
✅ getSession()         - Retrieves session by ID
✅ pauseSession()       - Idempotent pause
✅ resumeSession()      - Idempotent resume
✅ endSession()         - Closes connections, marks ended
✅ deleteSession()      - Removes from memory
✅ getSessionDuration() - Calculates elapsed time
✅ getStats()           - Returns session statistics
```

### Data Collection (100% Complete)
```javascript
✅ landmarksHandler.js  - 10-second facial analysis cycles
✅ voiceHandler.js      - 10-second VAD metrics collection
✅ sessionHandler.js    - STT text and control messages
✅ Grace period (15s)   - Post-session analysis window
✅ WebSocket cleanup    - Proper connection closing
```

### Analysis (95% Complete)
```javascript
✅ EmotionAnalyzer     - Emotion timeline + statistics
✅ EmotionVADVector    - Valence/arousal/dominance computation
✅ MultimodalAnalyzer  - Integration of all modalities
✅ InterventionGener.  - CBT distortion detection + tracking
❌ EmotionScoring      - NO COMBINED SCORE LOGIC
❌ Tick mechanism      - NO PERIODIC AGGREGATION ENDPOINT
```

### Reporting (90% Complete)
```javascript
✅ SessionReportGenerator - Full report generation
✅ PdfReportGenerator     - PDF export
✅ CSV export             - Emotion/VAD timelines
✅ Text summary           - Human-readable format
✅ JSON structure         - Complete analysis
⚠️ Persistence            - Async, error-suppressed
```

### API Endpoints (85% Complete)
```javascript
✅ POST   /api/session/start
✅ GET    /api/session/:id
✅ POST   /api/session/:id/pause
✅ POST   /api/session/:id/resume
✅ POST   /api/session/:id/end
✅ DELETE /api/session/:id
✅ GET    /api/session/:id/report
✅ GET    /api/session/:id/report/pdf
✅ GET    /api/session/:id/report/csv
✅ GET    /api/session/:id/vad-analysis
❌ POST   /api/session/:id/tick (CRITICAL MISSING)
❌ GET    /api/session/:id/emotion-score (MISSING)
```

### Database Integration (60% Complete)
```javascript
✅ Session creation in Supabase
⚠️ Report persistence (async, silent failures)
⚠️ Metadata upsert (async, silent failures)
❌ Real-time emotion sync (NOT IMPLEMENTED)
❌ Storage abstraction (NO INTERFACE)
```

---

## Implementation Plan (4 Phases)

### Phase 1: Tick Endpoint (2 hours) - HIGH PRIORITY
**Goal**: Enable periodic frontend polling without WebSocket dependency

**Changes Required**:
1. `routes/session.js` - Add route:
   ```javascript
   router.post('/:id/tick', validateParams(...), ctrl.tick);
   ```

2. `controllers/sessionController.js` - Add controller:
   ```javascript
   async function tick(req, res) {
     // Return current emotion snapshot + VAD + CBT
     // No state modifications
   }
   ```

3. `services/emotion/EmotionAnalyzer.js` - Add method:
   ```javascript
   getLastEmotion() {
     return this.emotionTimeline[this.emotionTimeline.length - 1];
   }
   ```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_...",
    "timestamp": 1737251000000,
    "emotionSnapshot": {
      "emotion": "happy",
      "intensity": 0.75,
      "frameCount": 45,
      "timestamp": 1737250990000
    },
    "vadVector": {
      "valence": 0.75,
      "arousal": 0.55,
      "dominance": 0.60
    },
    "cbtMetrics": {
      "distortionCount": 2,
      "severity": "medium"
    }
  }
}
```

---

### Phase 2: Combined Emotion Scoring (3 hours) - HIGH PRIORITY
**Goal**: Compute unified emotion score for risk assessment

**New File**: `services/emotion/EmotionScoringEngine.js`
```javascript
class EmotionScoringEngine {
  computeScore(emotionData, vadVector, cbtMetrics, timeWeight = 1.0) {
    // Weighted formula:
    // score = 0.40*valence + 0.30*intensity + 
    //         0.15*arousal + 0.10*timeWeight - 
    //         0.05*cbtDistortionPenalty
    
    return score; // 0.0 to 1.0
  }
  
  getRiskLevel(score) {
    // score < 0.3  → "low"
    // 0.3-0.5      → "medium"
    // 0.5-0.7      → "high"
    // > 0.7        → "critical"
  }
}
```

**Integration Points**:
1. MultimodalAnalyzer - Use in analysis
2. SessionController.tick - Include in response
3. Report generation - Add to statistics

---

### Phase 3: Storage Interface Abstraction (4 hours) - MEDIUM PRIORITY
**Goal**: Enable flexible persistence backend switching

**New Files**:
1. `services/storage/ISessionStorage.js` - Interface definition
2. `services/storage/SupabaseSessionStorage.js` - Implementation
3. `services/storage/InMemorySessionStorage.js` - In-memory adapter
4. `config/storage.js` - Factory pattern

**Benefits**:
- Easy testing (swap to in-memory)
- Easy scaling (swap to distributed cache)
- Easy backend switching (swap to different database)

---

### Phase 4: Real-time Supabase Sync (3 hours) - MEDIUM PRIORITY
**Goal**: Push emotion updates to database during session

**Changes**:
1. Modify `landmarksHandler.js`:
   ```javascript
   // After each emotion analysis:
   await supabase.from('emotions').insert({
     session_id, emotion, timestamp, metrics
   });
   ```

2. Debounce to 30-second intervals to avoid overload

3. Dashboard subscribes to real-time updates:
   ```javascript
   supabase
     .from('emotions')
     .on('INSERT', payload => updateChart(payload))
     .subscribe();
   ```

---

## Risk Assessment

### High Risk Areas
1. **Memory Growth** - No cleanup for long-running sessions
   - Mitigation: Implement 24-hour automatic cleanup
   
2. **Async Persistence** - Silent failures in database writes
   - Mitigation: Add retry logic with exponential backoff
   
3. **WebSocket Leaks** - Connections not properly cleaned
   - Mitigation: Add cleanup on disconnect, 60-second timeout

### Medium Risk Areas
1. **API Rate Limiting** - Gemini API call frequency
   - Current: 1 call per 10 seconds
   - Acceptable for <100 concurrent sessions
   
2. **Database Consistency** - Session state vs database state
   - Current: Eventual consistency (async writes)
   - Acceptable for reporting use case

### Low Risk Areas
1. **Thread Safety** - Single-threaded JavaScript
2. **Data Validation** - Comprehensive input validation
3. **Error Handling** - Good try-catch coverage

---

## Success Metrics

After implementation, validate:
- Tick endpoint responds within 100ms
- Combined score correctly reflects emotion + VAD + CBT
- Storage swapping works without code changes
- Real-time updates appear in dashboard within 1 second
- No WebSocket memory leaks over 8+ hour sessions
- Database sync achieves >99% reliability

---

## Key Files Reference

**Critical Path** (must-read):
1. `/services/session/SessionManager.js` - Core session state
2. `/services/socket/landmarksHandler.js` - Data collection & analysis
3. `/services/analysis/MultimodalAnalyzer.js` - Integration logic
4. `/services/report/SessionReportGenerator.js` - Report generation

**Supporting** (context):
1. `/routes/session.js` - API routing
2. `/controllers/sessionController.js` - Request handlers
3. `/models/Session.js` - Database schema
4. `/services/emotion/EmotionAnalyzer.js` - Emotion statistics

---

## Questions & Clarifications

**Q: Why no persistent session state?**
A: SessionManager is in-memory by design for simplicity. Phase 3 adds abstraction layer.

**Q: Why combine emotion scoring?**
A: Frontend needs single metric for risk assessment, trend visualization, alerting.

**Q: Why the 15-second grace period?**
A: Gemini API has 8-13 second latency. Grace period ensures final analysis completes.

**Q: Can we support multiple concurrent sessions?**
A: Yes. SessionManager.sessions is a Map. Scales to ~100 sessions per server.

**Q: What about WebSocket reconnection?**
A: Currently manual. Could add automatic reconnection logic in Phase 2.

---

