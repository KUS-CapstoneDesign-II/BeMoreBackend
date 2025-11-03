# BeMoreBackend Session Management System Analysis

## Executive Summary

The BeMore backend has a **hybrid architecture** for session management:
- **In-memory SessionManager** for real-time session state (active, paused, ended)
- **WebSocket handlers** for continuous data collection (10-second intervals)
- **Multimodal analysis** combining emotions, VAD, and CBT metrics
- **Report generation** at session end or on-demand
- **Partial database persistence** via Supabase for lightweight session tracking

### Current Implementation Status
- ✅ Session CRUD operations (create, pause, resume, end, delete)
- ✅ Real-time emotion analysis (10-second intervals)
- ✅ VAD (Voice Activity Detection) metrics
- ✅ CBT cognitive distortion detection
- ✅ Multimodal report generation
- ⚠️ **MISSING**: Explicit "tick" endpoint for batch emotion scoring
- ⚠️ **MISSING**: Combined emotion scoring logic (emotion + VAD + CBT)
- ⚠️ **MISSING**: 1-minute interval emotion aggregation endpoint
- ⚠️ **MISSING**: Persistent storage interface abstraction

---

## 1. SessionManager Implementation

**File**: `services/session/SessionManager.js`

### Data Structures
```javascript
session = {
  // Metadata
  sessionId: "sess_1737250800_abc123",
  userId: "user_001",
  counselorId: "counselor_001",
  status: "active|paused|ended",
  
  // Timing
  startedAt: 1737250800000,
  pausedAt: null,
  resumedAt: null,
  endedAt: null,
  
  // Data Buffers (in-memory only!)
  landmarkBuffer: [],      // Facial landmarks (faces, expressions)
  sttBuffer: [],           // Speech-to-Text transcriptions
  vadBuffer: [],           // Voice Activity Detection data
  emotions: [],            // Emotion analysis results
  
  // Analysis Objects
  interventionGenerator: InterventionGenerator,
  vadMetrics: VadMetrics,
  psychIndicators: PsychologicalIndicators,
  
  // WebSocket Connections
  wsConnections: {
    landmarks: WebSocket,
    voice: WebSocket,
    session: WebSocket
  }
}
```

### Key Methods
- `createSession()` - Creates new session with timestamp-based ID
- `pauseSession(sessionId)` - Transitions to "paused" state (idempotent)
- `resumeSession(sessionId)` - Resumes from "paused" state
- `endSession(sessionId)` - Closes WebSockets, marks as "ended"
- `deleteSession(sessionId)` - Removes from memory
- `getSessionDuration(sessionId)` - Calculates elapsed time

### Critical Gap
**SessionManager is purely in-memory.** No automatic persistence to database. Session data lost if server crashes.

---

## 2. Data Collection Current State

### 2.1 Facial Landmarks (WebSocket: `/ws/landmarks`)
**File**: `services/socket/landmarksHandler.js`

```javascript
ANALYSIS_INTERVAL_MS = 10 * 1000  // 10 seconds

Analysis Cycle:
1. Client sends face landmark data (coordinates, confidence)
2. Landmarks pushed to session.landmarkBuffer
3. Every 10 seconds: Trigger emotion analysis
4. Clear buffer, continue next cycle
```

**Data Accumulated Per 10-Second Cycle**:
- Array of face landmarks (variable frame count)
- Associated STT text from voice channel
- Frame count and metadata

### 2.2 Voice/Audio Data (WebSocket: `/ws/voice`)
**File**: `services/socket/voiceHandler.js`

```javascript
VAD_ANALYSIS_INTERVAL = 10 * 1000  // 10 seconds

Flow:
1. Client sends audio chunks
2. VAD (Voice Activity Detection) processes metrics:
   - speechRate (%)
   - energyVariance
   - interruptionRate
   - silenceRate
3. Metrics accumulated in session.vadAnalysisHistory
4. Every 10s: Compute psychological indicators
```

### 2.3 Speech-to-Text Data
**File**: `services/socket/voiceHandler.js`

```javascript
Flow:
1. Speech transcribed by client-side STT service
2. Text pushed to session.sttBuffer
3. Used alongside landmarks for emotion analysis
4. Cleared after each 10-second analysis cycle
```

### Current Data Flow
```
Client (WebSocket)
├─ /ws/landmarks → Face landmarks → landmarkBuffer
├─ /ws/voice     → Audio metrics  → vadAnalysisHistory + vadBuffer
└─ /ws/session   → STT text       → sttBuffer

Every 10 seconds:
├─ Emotion Analysis (Gemini API)
│  └─ Input: frames + STT text
│  └─ Output: emotion label (happy, sad, neutral, etc.)
│
├─ VAD Analysis
│  └─ Input: voice metrics history
│  └─ Output: psychological indicators
│
└─ CBT Analysis (if emotion detected)
   └─ Input: STT text + emotion
   └─ Output: cognitive distortion detections
```

---

## 3. Emotion/VAD Analysis Current State

### 3.1 Emotion Analysis
**File**: `services/emotion/EmotionAnalyzer.js`

```javascript
class EmotionAnalyzer {
  emotionTimeline: [],     // All emotions collected (10-second intervals)
  emotionStats: {          // Counters per emotion type
    happy: 0,
    sad: 0,
    angry: 0,
    anxious: 0,
    excited: 0,
    neutral: 0
  },
  totalEmotions: 0
}

Methods:
- addEmotion(emotion, timestamp, metadata) → Adds to timeline
- getPrimaryEmotion() → Most frequent emotion
- getTopEmotions(limit=3) → Sorted by frequency
- getEmotionTrend() → Beginning/Middle/End analysis
- getAverageIntensity() → 0-100 scale
- getNegativeEmotionRatio() → % of negative emotions
- getPositiveEmotionRatio() → % of positive emotions
- getSummary() → Complete analysis snapshot
```

### 3.2 VAD (Valence-Arousal-Dominance) Vector
**File**: `services/analysis/EmotionVADVector.js`

```javascript
VAD Vector (0.0 to 1.0 scale):
- Valence:  Positivity from emotion labels
  (happy/excited=0.8, neutral=0.5, sad/angry/anxious=0.2-0.3)
  
- Arousal:  Voice activity intensity
  0.5 * speechRate + 0.3 * energyVariance + 0.2 * interruptionRate
  
- Dominance: Control/confidence in speech
  0.6 * speechRate + 0.2 * (1 - silenceRate) + 0.2
  (Penalized if CBT distortions detected)
```

### 3.3 Current Gap: No Combined Scoring
**Missing Logic**:
- No endpoint to combine emotion + VAD + CBT into single score
- No "tick" mechanism to trigger periodic aggregation
- No batch emotion scoring at 1-minute intervals
- EmotionAnalyzer stores data but doesn't compute weighted scores

**Example of What's Missing**:
```javascript
// NOT IMPLEMENTED:
POST /api/session/:id/tick → {
  emotion: "happy" (from Gemini),
  emotionIntensity: 0.7 (from frame count),
  valence: 0.75 (from VAD),
  arousal: 0.55 (from voice metrics),
  dominance: 0.60 (from speech pattern),
  cbtDistortions: 2 (from CBT detector),
  combinedScore: WEIGHTED_AVERAGE (MISSING!)
}
```

---

## 4. Report Generation System

### 4.1 SessionReportGenerator
**File**: `services/report/SessionReportGenerator.js`

**Trigger**: Called when session ends or on-demand via API

**Components Generated**:
1. **Metadata**: Duration, timestamps, participant IDs
2. **Emotion Timeline**: 10-second snapshots with CBT info
3. **VAD Timeline**: Psychological risk scores over time
4. **CBT Details**: All cognitive distortions + interventions
5. **Statistics**: Summary counts and ratios
6. **MultimodalAnalyzer Results**: Integrated assessment

**Output Structure**:
```javascript
report = {
  reportId: "report_1737250800_abc123",
  generatedAt: 1737250800000,
  metadata: {
    sessionId, userId, counselorId, duration, status
  },
  analysis: {
    emotionSummary: { totalCount, distribution, dominantEmotion, trend },
    vadSummary: { totalAnalyses, averageMetrics, psychologicalTrends },
    cbtSummary: { totalDistortions, mostCommonDistortion },
    overallAssessment: { riskScore, riskLevel, emotionalState },
    recommendations: [...]
  },
  emotionTimeline: { dataPoints, emotionCategories, summary },
  vadTimeline: { dataPoints, summary },
  cbtDetails: { interventions, distortions },
  statistics: { session, emotion, vad, cbt, overall }
}
```

### 4.2 Report Output Formats
- **JSON** (in-memory): `GET /api/session/:id/report`
- **Text Summary**: `GET /api/session/:id/report/summary`
- **PDF**: `GET /api/session/:id/report/pdf` (via PdfReportGenerator)
- **CSV**: `GET /api/session/:id/report/csv?kind=vad|emotion`

### 4.3 Data Persistence
**File**: `services/session/sessionService.js`

```javascript
persistReportAndSession(session) {
  // Generates report from in-memory session
  // Attempts to save to database (with error suppression):
  
  reportRepo.create({
    reportId, sessionId, vadVector, cbtSummary, 
    statistics, metadata, analysis
  })
  
  sessionRepo.upsertSummary({
    sessionId, userId, counselorId, status,
    startedAt, endedAt, duration,
    counters: { emotionCount }
  })
}
```

**Note**: Called asynchronously at session end. Errors are silently suppressed.

---

## 5. API Endpoints - Current State

### Session Management
```
POST   /api/session/start                    ✅ Create session
GET    /api/session/:id                      ✅ Get session details
POST   /api/session/:id/pause                ✅ Pause session
POST   /api/session/:id/resume               ✅ Resume session
POST   /api/session/:id/end                  ✅ End session
DELETE /api/session/:id                      ✅ Delete session
GET    /api/session/stats/summary            ✅ Session statistics
GET    /api/session/user/:userId             ✅ User's sessions
```

### Analysis & Reporting
```
GET    /api/session/:id/vad-analysis         ✅ Current VAD metrics
GET    /api/session/:id/report               ✅ Full JSON report
GET    /api/session/:id/report/summary       ✅ Text summary
GET    /api/session/:id/report/pdf           ✅ PDF export
GET    /api/session/:id/report/csv           ✅ CSV export
GET    /api/session/:id/summary              ✅ Quick summary card
```

### Feedback
```
POST   /api/session/:id/feedback             ✅ Save session feedback
```

### MISSING Critical Endpoint
```
POST   /api/session/:id/tick                 ❌ NOT IMPLEMENTED
       Body: (empty or control message)
       Response: {
         sessionId, timestamp,
         emotionData: { emotion, intensity, timestamp },
         vadVector: { valence, arousal, dominance },
         cbtMetrics: { distortionCount, severity },
         combinedScore: 0.0-1.0,
         riskLevel: "low|medium|high|critical"
       }
```

---

## 6. Implementation Gaps vs Backend Prompt Requirements

### Gap Analysis Table

| Feature | Requirement | Current State | Gap |
|---------|-------------|---------------|-----|
| **Session CRUD** | Create/read/pause/resume/end/delete | ✅ Fully implemented | None |
| **Data Collection** | Facial landmarks, audio, STT | ✅ WebSocket handlers | None |
| **Emotion Analysis** | 10-second emotion updates | ✅ Via Gemini API | None |
| **VAD Metrics** | Voice activity metrics | ✅ 7 metrics collected | None |
| **CBT Detection** | Cognitive distortion detection | ✅ InterventionGenerator | None |
| **Batch Emotion Tick** | 1-minute aggregation endpoint | ❌ Not implemented | **CRITICAL** |
| **Combined Scoring** | Weighted emotion+VAD+CBT score | ❌ Not implemented | **CRITICAL** |
| **Storage Interface** | Abstracted persistence layer | ⚠️ Direct DB calls | **MEDIUM** |
| **Grace Period Handling** | Post-session analysis window | ✅ 15-second window | None |
| **Error Isolation** | Prevent crashes from missing data | ✅ Try-catch + defaults | None |

### Critical Missing Pieces

#### 1. Tick Endpoint (`POST /api/session/:id/tick`)
**What's Missing**: 
- No mechanism to trigger batch emotion collection
- No 1-minute interval aggregation endpoint
- No response structure for emotion snapshots

**Why It Matters**:
- Frontend needs periodic updates without WebSocket overhead
- Dashboard requires regular checkpoints for historical tracking
- Report generation needs consistent time-indexed snapshots

**Implementation Effort**: ~2 hours
- Create endpoint in sessionController
- Add aggregation logic to SessionManager
- Define response schema

#### 2. Combined Emotion Scoring Logic
**What's Missing**:
- No unified emotion score combining:
  - Raw emotion label (from Gemini)
  - Emotion intensity (from frame count)
  - Valence/arousal/dominance (from VAD)
  - CBT distortion severity
  - Time weighting

**Why It Matters**:
- Risk assessment requires composite scoring
- Single score better than fragmented data for frontend
- Enables meaningful trend analysis

**Implementation Effort**: ~3 hours
- Create `EmotionScoringEngine` class
- Implement weighting algorithm
- Integrate into MultimodalAnalyzer
- Add to tick endpoint response

#### 3. Persistent Storage Interface
**What's Missing**:
- SessionManager stores to memory only
- Report persistence is ad-hoc
- No abstraction layer for swapping storage backends
- Supabase integration is scattered

**Why It Matters**:
- Server restart loses all active sessions
- No audit trail for counselor decisions
- Database schema coupling makes testing hard

**Implementation Effort**: ~4 hours
- Create ISessionStorage interface
- Implement SupabaseSessionStorage adapter
- Implement InMemorySessionStorage (current behavior)
- Refactor SessionManager to use interface

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (WebSocket)                          │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│  │ Face Landmarks   │ │ Voice Metrics    │ │ Speech-to-Text   │   │
│  └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘   │
└───────────┼────────────────────┼──────────────────────┼─────────────┘
            │                    │                      │
            ▼                    ▼                      ▼
      /ws/landmarks         /ws/voice              /ws/session
         (Landmarks)          (Voice)              (STT + Control)
            │                    │                      │
            ▼                    ▼                      ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
    │ Landmark     │    │ VAD          │    │ STT Buffer       │
    │ Buffer       │    │ Metrics      │    │ (Speech Text)    │
    │ (10s)        │    │ History      │    │ (10s)            │
    └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘
           │                   │                     │
           └───────────────────┼─────────────────────┘
                               │
                    ┌──────────▼─────────┐
                    │  EVERY 10 SECONDS  │
                    └──────────┬─────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────────┐      ┌──────────────���      ┌─────────────┐
   │   Gemini    │      │  VAD         │      │   CBT       │
   │   Emotion   │      │  Analysis    │      │  Detection  │
   │   Analysis  │      │  (7 metrics) │      │  (10 types) │
   └──────┬──────┘      └──────┬───────┘      └──────┬──────┘
          │                    │                     │
          ▼                    ▼                     ▼
    ┌────────────────────────────────────────────────────┐
    │  Session Object (In-Memory)                        │
    │  - emotions[]: emotion data with timestamp         │
    │  - vadAnalysisHistory[]: voice metrics timeline    │
    │  - interventionGenerator: CBT state                │
    │  - vadMetrics, psychIndicators: live scores        │
    └────────────┬─────────────────────────────────────┬─┘
                 │ (Optional)                          │ (On Request)
                 │                                     │
          ┌──────▼──────┐                    ┌────────▼────────┐
          │  setImmediate                    │ API Endpoints   │
          │  Supabase Upsert                 │                 │
          │  (async)                         ├─────────────────┤
          │                                  │ GET /report     │
          │                                  │ GET /summary    │
          │                                  │ GET /vad-analysis
          └─────────────┘                    │ ❌ POST /tick   │ (MISSING)
                                             └────────────────┘
```

---

## 8. Recommendations for Phased Implementation

### Phase 1: Tick Endpoint (Priority: HIGH)
**Duration**: 2 hours  
**Deliverables**:
- `POST /api/session/:id/tick` endpoint
- Returns current emotion snapshot + VAD vector
- No state changes to session
- Enable periodic frontend polling

**Files to Modify**:
1. `controllers/sessionController.js` → Add `tick()` method
2. `routes/session.js` → Add route
3. `services/emotion/EmotionAnalyzer.js` → Add `getLastEmotion()` method

**Example Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_...",
    "timestamp": 1737251000000,
    "emotionSnapshot": {
      "emotion": "happy",
      "intensity": 0.75,
      "timestamp": 1737250990000,
      "frameCount": 45
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

### Phase 2: Combined Emotion Scoring (Priority: HIGH)
**Duration**: 3 hours  
**Deliverables**:
- `EmotionScoringEngine` class
- Weighted scoring algorithm
- Integration with MultimodalAnalyzer
- Update tick endpoint response

**Scoring Algorithm**:
```javascript
Score = 
  0.40 * emotionValence (0-1 from emotion label) +
  0.30 * emotionIntensity (0-1 from frame count/10) +
  0.15 * vadArousal (0-1 from voice metrics) +
  0.10 * timeWeighting (recent=1.0, older=0.5) +
  (-0.05) * cbtDistortionPenalty (per distortion)
```

**Files to Create/Modify**:
1. `services/emotion/EmotionScoringEngine.js` (NEW)
2. `services/analysis/MultimodalAnalyzer.js` → Integrate scoring
3. `controllers/sessionController.js` → Add score to tick response

### Phase 3: Storage Interface Abstraction (Priority: MEDIUM)
**Duration**: 4 hours  
**Deliverables**:
- `ISessionStorage` interface
- `SupabaseSessionStorage` implementation
- `InMemorySessionStorage` implementation
- SessionManager refactored to use interface

**Files to Create/Modify**:
1. `services/storage/ISessionStorage.js` (NEW)
2. `services/storage/SupabaseSessionStorage.js` (NEW)
3. `services/storage/InMemorySessionStorage.js` (NEW)
4. `services/session/SessionManager.js` → Use interface
5. `config/storage.js` (NEW) → Storage factory

**Benefits**:
- Easy switching between memory/database
- Better testability
- Preparation for multi-instance deployment

### Phase 4: Supabase Real-Time Sync (Priority: MEDIUM)
**Duration**: 3 hours  
**Deliverables**:
- Real-time emotion updates to Supabase
- Batch inserts for emotion snapshots
- Session state sync on pause/resume

**Implementation**:
- Modify `landmarksHandler.js` to publish emotion to Supabase
- Add Supabase subscription in dashboard
- Debounce updates to 30-second intervals

---

## 9. Current Data Flow Summary

### What Works
✅ Real-time facial expression → emotion analysis (10s)  
✅ Real-time voice → VAD metrics (10s)  
✅ Speech transcription captured alongside emotions  
✅ CBT cognitive distortion detection from speech  
✅ Multimodal report generation at session end  
✅ Multiple export formats (JSON, PDF, CSV)  

### What's Missing
❌ Periodic emotion aggregation endpoint (tick)  
❌ Combined emotion scoring logic  
❌ Persistent session state across server restarts  
❌ 1-minute interval emotion snapshots  
❌ Abstracted storage interface  

### What's Partially Done
⚠️ Error handling (good in handlers, weak in SessionManager)  
⚠️ Supabase integration (session creation only, no emotion sync)  
⚠️ WebSocket cleanup (15s grace period, but no session memory cleanup)  

---

## 10. Key Implementation Notes

### Thread Safety
- SessionManager uses Map (JavaScript is single-threaded, no locking needed)
- WebSocket handlers are async-safe with proper cleanup
- No race conditions in current 10-second analysis cycle

### Memory Footprint
- Per session: ~50KB for metadata + buffers
- Per emotion entry: ~500 bytes
- Per 60-minute session (~360 emotions): ~180KB
- Recommend session cleanup after 24 hours or explicit deletion

### Error Handling Strategy
- SessionManager: Throws on invalid transitions (callers must handle)
- WebSocket handlers: Errors logged, don't break cycle
- Report generation: Try-catch with defaults for missing data
- Supabase: Errors silently suppressed (don't block session end)

### Timing Assumptions
- Landmarking: 30-60 fps (aggregated to 10s cycles)
- Voice metrics: 100ms windows (aggregated to 10s)
- Analysis cycle: 10s (changeable via ANALYSIS_INTERVAL_MS)
- Grace period: 15s after session end (for pending Gemini responses)

---

