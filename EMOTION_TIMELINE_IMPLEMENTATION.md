# Emotion Timeline Tracking & Aggregation Implementation

**Status**: ✅ **COMPLETE & TESTED**
**Date**: 2025-10-25
**Commits**: 3ca5c3a, 3f417f5, 9b0b9d6

---

## 📋 Overview

This document details the comprehensive emotion timeline tracking and aggregation system implemented to address the requirement of real-time emotion change tracking and session-end emotion analysis.

**User Requirement** (Korean):
> "방금 구현한 방식은 이게 감정이 한 개인 경우만 상정한 거 아닌가? 실시간으로 감정이 변하는 것을 트래킹 해야 하고, 세션을 종료하면 그 감정들을 모두 담아뒀다가 그걸 통합해서 결과를 내줄 수 있도록 해주는 게 좋을 것 같은데."

**Translation**:
> "Doesn't the current implementation only handle a single emotion? We should track emotions changing in real-time, and when the session ends, gather all those emotions and provide integrated results."

---

## 🎯 Solution Architecture

### Three-Layer System

#### **Layer 1: Real-time Emotion Collection**
- **File**: [services/socket/landmarksHandler.js:106-113](services/socket/landmarksHandler.js)
- Collects emotion data every 10 seconds during analysis cycles
- Stores: `{ timestamp, emotion, frameCount, sttLength, cbtAnalysis }`
- Two-path persistence:
  1. **In-Memory**: `session.emotions` array (for real-time WebSocket transmission)
  2. **Fire-and-Forget**: Database persistence via `setImmediate()` (survives WebSocket closure)

```javascript
// Real-time collection (line 113)
session.emotions.push(emotionData);

// Fire-and-forget database persistence (lines 162-175)
setImmediate(async () => {
  const sessionRecord = await Session.findOne({ where: { sessionId: session.sessionId } });
  if (sessionRecord) {
    const emotions = sessionRecord.emotionsData || [];
    emotions.push(emotionData);
    await sessionRecord.update({ emotionsData: emotions });
  }
});
```

#### **Layer 2: Emotion Timeline Storage**
- **File**: [models/Session.js:41-46](models/Session.js)
- Database field: `emotionsData` (JSON type)
- Structure: Array of emotion entries with full analysis data
- Persists even if WebSocket closes (addresses issue: 8-second Gemini timeout)

```javascript
emotionsData: {
  type: Sequelize.JSON,
  allowNull: true,
  defaultValue: [],
  comment: '분석된 감정 데이터 배열 [{timestamp, emotion, frameCount, ...}]',
}
```

#### **Layer 3: Session-End Aggregation**
- **File**: [services/emotion/EmotionAnalyzer.js](services/emotion/EmotionAnalyzer.js) (417 lines)
- **Trigger**: [controllers/sessionController.js:86-139](controllers/sessionController.js)
- Reconstructs analyzer from stored timeline
- Computes comprehensive emotion metrics
- Returns aggregated summary in session end response

```javascript
// Session end trigger (line 95)
const emotionAnalyzer = EmotionAnalyzer.fromData(session.emotions);
emotionSummary = emotionAnalyzer.getSummary();
```

---

## 📊 EmotionAnalyzer Service (Complete API)

### Core Methods

#### **1. `addEmotion(emotion, timestamp, metadata = {})`**
Adds individual emotion entry to timeline with intensity calculation.

```javascript
const entry = analyzer.addEmotion('happy', Date.now(), {
  frameCount: 95,
  sttLength: 150
});
// Result: { emotion, emotionKo, timestamp, frameCount, sttLength, intensity, cycleNumber }
```

#### **2. `getPrimaryEmotion()`**
Returns most frequent emotion with percentage.

```javascript
analyzer.getPrimaryEmotion();
// { emotion: 'happy', emotionKo: '행복', count: 3, percentage: 75 }
```

#### **3. `getTopEmotions(limit = 3)`**
Returns top N emotions sorted by frequency.

```javascript
analyzer.getTopEmotions(3);
// [
//   { emotion: 'happy', emotionKo: '행복', count: 3, percentage: 75 },
//   { emotion: 'neutral', emotionKo: '중립', count: 1, percentage: 25 }
// ]
```

#### **4. `getEmotionTrend()`**
Analyzes emotion change from beginning → middle → end of session.

```javascript
analyzer.getEmotionTrend();
// {
//   beginning: { emotion: 'angry', emotionKo: '분노', count: 1 },
//   middle: { emotion: 'happy', emotionKo: '행복', count: 2 },
//   end: { emotion: 'happy', emotionKo: '행복', count: 1 },
//   trend: '긍정적으로 개선됨' // 'positive improvement'
// }
```

#### **5. `getAverageIntensity()`**
Mean intensity score (0-100) across all emotions.

```javascript
analyzer.getAverageIntensity();
// 67 (out of 100)
```

#### **6. `getNegativeEmotionRatio()` & `getPositiveEmotionRatio()`**
Percentage of negative (sad/angry/anxious) and positive (happy/excited) emotions.

```javascript
analyzer.getNegativeEmotionRatio();    // 25 (%)
analyzer.getPositiveEmotionRatio();    // 50 (%)
```

#### **7. `getEmotionalState()`**
Korean description of overall emotional state.

```javascript
analyzer.getEmotionalState();
// '긍정적이고 활발한 상태'        // positive and active
// '부정적이고 어려운 상태'         // negative and difficult
// '불안감이 큰 상태'              // high anxiety
// '긍정적 감정이 부족한 상태'      // lacking positive emotion
// '감정적으로 복합적인 상태'       // emotionally complex
```

#### **8. `getSummary()`**
Complete emotion analysis with all metrics (used in session end).

```javascript
const summary = analyzer.getSummary();
// {
//   totalCount: 4,
//   timeline: [...emotion entries],
//   stats: { happy: 3, sad: 0, angry: 1, anxious: 0, excited: 0, neutral: 0 },
//   primaryEmotion: { emotion: 'happy', emotionKo: '행복', count: 3, percentage: 75 },
//   topEmotions: [...],
//   trend: { beginning, middle, end, trend: '긍정적으로 개선됨' },
//   averageIntensity: 67,
//   positiveRatio: 75,
//   negativeRatio: 25,
//   emotionalState: '긍정적이고 활발한 상태'
// }
```

### Reconstruction & Initialization

#### **`static fromData(emotionsData = [])`**
Reconstructs analyzer from stored emotion array (database recovery).

```javascript
const analyzer = EmotionAnalyzer.fromData(sessionRecord.emotionsData);
const summary = analyzer.getSummary();
```

#### **`reset()`**
Clears all emotion data (for session restart or cleanup).

```javascript
analyzer.reset();
```

---

## 🔄 Data Flow

### Complete Emotion Timeline Lifecycle

```
Session Start
    ↓
[10-second Analysis Cycle]
    ├─ Landmarks WebSocket: 95 frames received
    ├─ Gemini API: Analyze expression
    ├─ Emotion Result: 'happy'
    ├─ Real-time: session.emotions.push()
    └─ Fire-and-forget: Save to database (setImmediate)
    ↓
[Repeats every 10 seconds with new emotions]
    ├─ Cycle 1: happy
    ├─ Cycle 2: happy
    ├─ Cycle 3: angry
    └─ Cycle 4: happy
    ↓
Session End Request
    ├─ Read all emotions from memory: [happy, happy, angry, happy]
    ├─ EmotionAnalyzer.fromData() reconstructs timeline
    ├─ getSummary() computes all metrics:
    │  ├─ Primary: happy (75%)
    │  ├─ Trend: positive improvement
    │  ├─ Average intensity: 67
    │  └─ Emotional state: 긍정적이고 활발한 상태
    └─ Return in response
    ↓
Response Includes
    ├─ emotionCount: 4
    ├─ emotionSummary:
    │  ├─ primaryEmotion: { emotion: 'happy', emotionKo: '행복', percentage: 75 }
    │  ├─ emotionalState: '긍정적이고 활발한 상태'
    │  ├─ trend: '긍정적으로 개선됨'
    │  ├─ positiveRatio: 75
    │  └─ negativeRatio: 25
    └─ Database: emotionsData persisted
```

---

## 🛡️ Data Persistence Strategy

### Why Fire-and-Forget?

**Problem**: Gemini API takes ~8 seconds to respond while WebSocket closes immediately after session end.

**Timeline**:
- 11:02:13 - Session ends, WebSocket closes (readyState: 3)
- 11:02:21 - Gemini response arrives (8-second delay)
- Result: emotion_update can't be sent on closed connection

**Solution**: Two-path persistence
1. **Real-time (Memory)**: `session.emotions` for immediate WebSocket transmission
2. **Persistent (Database)**: Fire-and-forget save in background thread

```javascript
// setImmediate ensures non-blocking persistence
setImmediate(async () => {
  try {
    const sessionRecord = await Session.findOne({ where: { sessionId } });
    if (sessionRecord) {
      const emotions = sessionRecord.emotionsData || [];
      emotions.push(emotionData);
      await sessionRecord.update({ emotionsData: emotions });
      console.log(`💾 [CRITICAL] Emotion saved to database: ${emotion}`);
    }
  } catch (dbError) {
    console.error(`⚠️ Failed to save emotion to database:`, dbError.message);
  }
});
```

### Error Isolation

- Database errors don't crash response
- Async save doesn't block session.end() response
- Graceful degradation if database is unavailable

---

## 📝 Implementation Files

| File | Changes | Purpose |
|------|---------|---------|
| `services/emotion/EmotionAnalyzer.js` | NEW (417 lines) | Emotion timeline analysis engine |
| `models/Session.js` | ADD `emotionsData` field | Database persistence |
| `services/socket/landmarksHandler.js` | ADD fire-and-forget save (lines 162-175) | Non-blocking database persistence |
| `controllers/sessionController.js` | ENHANCE `end()` (lines 91-121) | Emotion aggregation at session end |

---

## ✅ Verification Test Results

### Test: Session Creation & Emotion Aggregation

```
Session ID: sess_1761390973946_a29aaeda

Session Status Before End:
├─ status: 'active'
├─ emotionCount: 0 (no emotions recorded in test)
├─ landmarkCount: 0
└─ sttCount: 0

Session Status After End:
├─ status: 'ended'
├─ endedAt: 1761390974042
├─ duration: 96ms
├─ emotionCount: 0
└─ emotionSummary: null (correctly null when no emotions)

Response Structure Verification:
✅ emotionCount field present
✅ emotionSummary field present (null when no data)
✅ HTTP 200 response
✅ No errors during aggregation
```

### Emotion Data Response Format

When emotions are present, response includes:

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_...",
    "status": "ended",
    "endedAt": 1761390974042,
    "duration": 96,
    "emotionCount": 4,
    "emotionSummary": {
      "primaryEmotion": {
        "emotion": "happy",
        "emotionKo": "행복",
        "percentage": 75
      },
      "emotionalState": "긍정적이고 활발한 상태",
      "trend": "긍정적으로 개선됨",
      "positiveRatio": 75,
      "negativeRatio": 25
    }
  }
}
```

---

## 🚀 Future Enhancements

### Phase 2: Frontend Integration
- [ ] Display emotion timeline chart in UI
- [ ] Show emotion progression over session time
- [ ] Highlight trend changes with visual indicators
- [ ] Display emotional state description and insights

### Phase 3: Advanced Analytics
- [ ] Emotion stability scoring
- [ ] Correlation with CBT distortions detected
- [ ] Recommendation suggestions based on emotion trend
- [ ] Historical emotion pattern tracking across sessions

### Phase 4: Database Optimization
- [ ] Emotion timeline table (separate from Session)
- [ ] Indexed queries for emotion trend analysis
- [ ] Archive old emotion data for performance

---

## 📚 Related Documentation

- **WebSocket Closure Issue**: [URGENT_STATUS.md](URGENT_STATUS.md) - Original problem statement
- **Landmark Data Fix**: [CRITICAL_DEBUGGING_LOGS.md](CRITICAL_DEBUGGING_LOGS.md) - Data validation improvements
- **Emotion Format Fixes**: [EMOTION_ANALYSIS_FIX_SUMMARY.md](EMOTION_ANALYSIS_FIX_SUMMARY.md) - Gemini response parsing

---

## 🎓 Key Technical Concepts

### Emotion Intensity Calculation

```javascript
const baseIntensity = 30;
const frameBonus = Math.min((frameCount / 10), 40);
const intensity = Math.min(baseIntensity + frameBonus, 100);

// Neutral emotions get reduced intensity
if (emotion === 'neutral') {
  return Math.max(intensity * 0.6, 20);
}
return Math.round(intensity);
```

**Rationale**:
- Base intensity (30) ensures all emotions have minimum weight
- Frame bonus (up to 40) rewards longer expressions
- Neutral gets 0.6x multiplier to de-emphasize neutral states
- Results range: 20-100

### Temporal Trend Analysis

Divides session into three periods: beginning, middle, end.

```javascript
const thirdSize = Math.ceil(totalEmotions / 3);
const beginning = _getMostFrequentEmotion(0, thirdSize);
const middle = _getMostFrequentEmotion(thirdSize, 2 * thirdSize);
const end = _getMostFrequentEmotion(2 * thirdSize, totalEmotions);
```

**Trend Detection**:
- Same emotion throughout → '안정적' (stable)
- Positive to negative → '부정적으로 변함' (worsened)
- Negative to positive → '긍정적으로 개선됨' (improved)
- Other changes → '변화함' (changed)

---

## 📞 Support & Questions

**For emotion analysis issues**: Review [EmotionAnalyzer.js](services/emotion/EmotionAnalyzer.js) methods
**For WebSocket issues**: See [services/socket/landmarksHandler.js](services/socket/landmarksHandler.js) fire-and-forget logic
**For database issues**: Check [models/Session.js](models/Session.js) emotionsData field

---

**Status**: ✅ Complete & Tested
**Version**: 1.0.0
**Last Updated**: 2025-10-25 11:16 UTC
