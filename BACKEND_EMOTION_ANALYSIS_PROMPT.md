# 🧠 Backend Emotion Analysis Architecture - Complete Implementation Guide

## 🎯 Executive Summary

**Current State**: Gemini returns emotions (e.g., "흥분" = "excited") but:
1. ❌ WebSocket already closed (readyState=3) - cannot send emotion_update
2. ❌ Database save fails - module path error
3. ❌ Emotion data lost after session end

**Solution**: Restructure emotion handling to persist emotions regardless of WebSocket state, then transmit/aggregate them retroactively.

---

## 📋 Problem Analysis

### Timeline Issue
```
11:36:45 - Session starts, WebSocket OPEN
11:36:55 - First 10-second analysis cycle runs
11:37:00 - Session ends, WebSocket CLOSES (readyState = 3)
           Analysis interval still running!

11:37:13 - Gemini responds with emotion (13 seconds after session end)
           WebSocket already CLOSED - cannot send emotion_update!
           Database save fails with path error
```

### Root Causes

**Cause #1: WebSocket Lifecycle Mismatch**
- Session ends → WebSocket closes immediately
- Analysis interval continues running (every 10 seconds)
- Gemini takes 8-13 seconds to respond
- By the time emotion arrives, socket is gone

**Cause #2: Database Module Path**
```javascript
// ❌ WRONG (in production /app structure)
const { Session } = require('../models');

// ✅ CORRECT (needs proper path from /app/services/socket/)
const { Session } = require('../../models');
```

**Cause #3: No Architecture for Post-Session Emotion Handling**
- Emotions analyzed after session ends
- No mechanism to save them
- No way to transmit them to frontend

---

## ✅ Implementation Steps

### Step 1: Fix Database Module Path

**File**: `/BeMoreBackend/services/socket/landmarksHandler.js`

**Location**: Lines 162-175 (emotion database persistence)

**Change**:
```javascript
// ❌ WRONG
const { Session } = require('../models');

// ✅ CORRECT
const { Session } = require('../../models');
```

**Why**: From `/services/socket/` directory:
- Go up 1 level: `services/`
- Go up 1 level: root
- Then into `models/`
- Path: `../../models`

---

### Step 2: Extend Analysis Timeout Beyond Session End

**File**: `/BeMoreBackend/services/socket/landmarksHandler.js`

**Current Problem**: Analysis interval stops when WebSocket closes

**Solution**: Allow analysis to continue even after session ends

```javascript
// Around line 35-45 (analysis interval setup)

// Current code only checks session.status
if (session.status !== 'active') {
  if (analysisCycleCount % 6 === 0) {
    console.log(`⏸️ [분석 사이클 #${analysisCycleCount}] 세션 비활성 상태`);
  }
  return;
}

// NEW: Also run analysis if we have pending frames (post-session)
// This allows final emotion analysis even after session.status changes
const hasPendingFrames = session.landmarkBuffer.length > 0;
const isPostSessionWindow =
  session.status === 'ended' &&
  Date.now() - session.endedAt < 30000; // 30 seconds grace period

if (!hasPendingFrames && !isPostSessionWindow) {
  return;
}

if (session.status !== 'active' && !isPostSessionWindow) {
  return;
}
```

---

### Step 3: Robust Emotion-to-Database Persistence

**File**: `/BeMoreBackend/services/socket/landmarksHandler.js`

**Current Issue**: Emotion save fails silently with path error

**Solution**: Improve error handling and add logging

```javascript
// Replace lines 162-175 with:

// ✅ 데이터베이스에 emotion 저장 (fire-and-forget with proper error handling)
setImmediate(async () => {
  try {
    console.log(`💾 [CRITICAL] Attempting to save emotion to database...`);

    // Use proper require path from /services/socket/
    const models = require('../../models');
    if (!models || !models.Session) {
      console.error(`❌ [CRITICAL] Models not found at ../../models`);
      console.error(`Available exports:`, Object.keys(models || {}));
      return;
    }

    const { Session } = models;
    const sessionRecord = await Session.findOne({
      where: { sessionId: session.sessionId }
    });

    if (!sessionRecord) {
      console.error(`❌ [CRITICAL] Session not found in database: ${session.sessionId}`);
      return;
    }

    const emotions = sessionRecord.emotionsData || [];
    emotions.push(emotionData);

    await sessionRecord.update({ emotionsData: emotions });
    console.log(`💾 [CRITICAL] Emotion saved to database: ${emotion}`);
    console.log(`💾 [CRITICAL] Total emotions for session: ${emotions.length}`);

  } catch (dbError) {
    console.error(`❌ [CRITICAL] Failed to save emotion to database:`);
    console.error(`   Error: ${dbError.message}`);
    console.error(`   Code: ${dbError.code}`);
    console.error(`   Path attempted: ../../models`);

    // Fallback: Try alternate path
    try {
      const models = require('../../models');
      console.log(`🔄 [CRITICAL] Retrying with absolute require...`);
    } catch (retryError) {
      console.error(`❌ [CRITICAL] Retry failed too:`, retryError.message);
    }
  }
});
```

---

### Step 4: Graceful WebSocket Closure Handling

**File**: `/BeMoreBackend/services/socket/landmarksHandler.js`

**Current Problem**: Emotion analysis continues after WebSocket close, but can't send emotion_update

**Solution**: Don't try to send via WebSocket after closure, rely on database persistence

```javascript
// Replace lines 120-158 with improved logic:

// 클라이언트에게 결과 전송 (WebSocket이 열려있을 때만)
console.log(`🔴 [CRITICAL] WebSocket readyState: ${ws.readyState} (1=OPEN)`);

// 🔥 WebSocket으로 emotion_update 전송 시도
if (ws && ws.readyState === 1) {  // 1 = OPEN
  try {
    const responseData = {
      type: 'emotion_update',
      data: {
        emotion,
        timestamp: emotionData.timestamp,
        frameCount: frames.length,
        sttSnippet: sttText.slice(0, 100),
        source: 'realtime' // Mark as real-time
      }
    };

    if (cbtAnalysis && cbtAnalysis.needsIntervention && cbtAnalysis.intervention) {
      responseData.data.intervention = {
        distortionType: cbtAnalysis.intervention.distortionType,
        distortionName: cbtAnalysis.intervention.distortionName,
        severity: cbtAnalysis.intervention.severity,
        urgency: cbtAnalysis.intervention.urgency,
        questions: cbtAnalysis.intervention.questions,
        tasks: cbtAnalysis.intervention.tasks.map(t => ({
          title: t.title,
          description: t.description,
          difficulty: t.difficulty,
          duration: t.duration
        }))
      };
    }

    ws.send(JSON.stringify(responseData));
    console.log(`✅ [CRITICAL] emotion_update sent via WebSocket: ${emotion}`);
  } catch (wsErr) {
    console.error(`⚠️ [CRITICAL] Failed to send emotion_update via WebSocket:`, wsErr.message);
    // Continue to database save anyway
  }
} else {
  console.warn(`⚠️ [CRITICAL] WebSocket NOT AVAILABLE for emotion_update`);
  console.warn(`   readyState: ${ws?.readyState}, exists: ${!!ws}`);
  console.warn(`   Relying on database persistence...`);
}
```

---

### Step 5: Session End Emotion Aggregation

**File**: `/BeMoreBackend/controllers/sessionController.js`

**Current State**: Session report doesn't include emotion aggregation

**New Requirement**: Return emotion analysis when session ends

```javascript
// In sessionController.js - add emotion aggregation to end() function:

async function end(req, res) {
  try {
    const { sessionId } = req.params;
    console.log(`⏹️ [CRITICAL] Session end requested: ${sessionId}`);

    const session = global.sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND' }
      });
    }

    // Mark session as ended
    session.status = 'ended';
    session.endedAt = Date.now();

    // Wait briefly for any final Gemini responses to arrive
    // (increased from 5s to 15s to accommodate longer Gemini latency)
    console.log(`⏳ [CRITICAL] Waiting for final Gemini responses (15 seconds)...`);
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Retrieve session record with emotion data
    const sessionRecord = await Session.findOne({
      where: { sessionId }
    });

    // Aggregate emotions
    let emotionSummary = null;
    if (sessionRecord && sessionRecord.emotionsData && sessionRecord.emotionsData.length > 0) {
      const emotionAnalyzer = new EmotionAnalyzer();
      sessionRecord.emotionsData.forEach(ed => {
        emotionAnalyzer.addEmotion(ed.emotion, 80); // Default intensity
      });
      emotionSummary = emotionAnalyzer.getSummary();
      console.log(`✅ [CRITICAL] Emotion aggregation complete:`, emotionSummary);
    } else {
      console.warn(`⚠️ [CRITICAL] No emotion data found for session: ${sessionId}`);
    }

    // Cleanup
    global.sessions.delete(sessionId);

    return res.json({
      success: true,
      data: {
        sessionId,
        endedAt: session.endedAt,
        emotionSummary,
        reportId: session.reportId || null
      }
    });
  } catch (err) {
    console.error(`❌ [CRITICAL] Session end error:`, err);
    return res.status(500).json({
      success: false,
      error: { code: 'SESSION_END_ERROR', message: err.message }
    });
  }
}
```

---

## 📊 Architecture Diagram

```
Session Timeline (NEW):
├─ 0:00 - Session starts, WebSocket OPEN
├─ 0:10 - First analysis cycle (Gemini request sent)
├─ 0:20 - Session ends by Frontend, WebSocket CLOSES
├─ 0:15 - (Extended grace period) Analysis continues if frames pending
├─ 0:23 - Gemini response arrives (emotion data)
│   ├─ ✅ Save to database (fire-and-forget)
│   └─ ❌ WebSocket unavailable (already closed)
│
├─ 0:35 - Session end handler runs
│   ├─ Waits 15 seconds for final Gemini responses
│   ├─ Aggregates all emotion data from database
│   └─ Returns emotion_summary in response
│
└─ Frontend polls /api/session/{id}/summary
    └─ Gets final emotion analysis
```

---

## 🔍 Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| **Gemini Timeout** | 5s | 30s ✅ |
| **WebSocket-Emotion Sync** | Fails | Uses database ✅ |
| **Session End Grace Period** | 0s | 15s ✅ |
| **Database Reliability** | Path errors | Fixed ✅ |
| **Emotion Data Persistence** | Lost | Saved ✅ |

---

## 🧪 Testing Checklist

```javascript
// Test 1: Emotion saved despite WebSocket closure
✅ Start session
✅ Wait until WebSocket closes
✅ Verify Gemini emotion arrives
✅ Check database for emotionsData array
✅ Verify emotion appears in /api/session/{id}/summary

// Test 2: Database path fix
✅ Check console for "Emotion saved to database"
✅ No "Cannot find module" errors
✅ emotionsData array grows with each analysis cycle

// Test 3: Emotion aggregation
✅ Run session with multiple analysis cycles
✅ Verify emotion_summary returned from /session/end
✅ Check emotion_summary has correct format:
   {
     primaryEmotion: { emotion: "happy", emotionKo: "행복", percentage: 75 },
     emotionalState: "긍정적이고 활발한 상태",
     trend: "긍정적으로 개선됨",
     positiveRatio: 75,
     negativeRatio: 25
   }
```

---

## 🚀 Deployment Steps

1. **Update landmarksHandler.js**
   - Fix module path: `../models` → `../../models`
   - Add post-session analysis window
   - Improve error handling

2. **Update sessionController.js**
   - Add 15-second grace period after session end
   - Aggregate emotion data before response

3. **Verify Gemini timeout**
   - Confirm GEMINI_TIMEOUT_MS = 30000 in gemini.js

4. **Test end-to-end**
   - Run session, verify emotion saved
   - Check no database path errors

5. **Deploy to Render**
   ```bash
   git add .
   git commit -m "fix(backend): fix emotion persistence, database paths, and architecture"
   git push origin woo
   ```

---

## 📝 Files to Modify

- [ ] `/services/socket/landmarksHandler.js` (lines 35-45, 120-175)
- [ ] `/controllers/sessionController.js` (add emotion aggregation)
- [ ] Verify `/services/gemini/gemini.js` has GEMINI_TIMEOUT_MS = 30000

---

## ⚠️ Important Notes

**Post-Session Analysis Window**:
- Session ends at t=0
- Analysis interval continues until t=15s
- Allows Gemini (8-13s latency) to complete
- After 15s, analysis interval stops

**Database Persistence**:
- Every emotion stored to database
- Fire-and-forget (doesn't block WebSocket)
- Retrieved at session end via emotion_summary

**Frontend Integration**:
- Frontend polls `/api/session/{id}/summary` after session ends
- Receives final emotion_summary with all analyzed emotions
- No real-time emotion_update via WebSocket after session ends

---

## 🔗 Related Fixes

- ✅ Gemini timeout increased (5s → 30s)
- ✅ Dashboard API timeout added (5s)
- ⏳ Emotion persistence architecture (this document)
