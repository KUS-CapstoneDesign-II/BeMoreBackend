# 🎯 Frontend Integration Guide - Emotion Timeline System

**Status**: ✅ **READY FOR INTEGRATION**
**Date**: 2025-10-26
**Target**: React Frontend Application
**API Version**: 1.0.0

---

## 📋 Quick Summary for Frontend

### What Changed
Backend now provides **comprehensive emotion analysis** at session end with real-time tracking and aggregation.

### Key Improvements
- ✅ Real-time emotion updates every 10 seconds
- ✅ Complete emotion timeline tracking throughout session
- ✅ Session-end emotion aggregation with statistics
- ✅ **CRITICAL FIX**: Database persistence now working in production (fixed module loading)
- ✅ Emotion summary in session end response

### What Frontend Needs to Do
1. Implement emotion update WebSocket handler
2. Display emotion timeline in UI
3. Show emotion summary at session end
4. Handle emotion aggregation response

---

## 🔌 WebSocket API - Real-time Emotion Updates

### Connection
```javascript
// Connect to landmarks WebSocket for emotion updates
const wsUrl = wsUrls.landmarks;  // From session start response
const ws = new WebSocket(wsUrl);
```

### Receiving Emotion Updates

**Message Type**: `emotion_update`

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'emotion_update') {
    const { emotion, timestamp, frameCount, sttSnippet, intervention } = message.data;

    console.log(`😊 Emotion detected: ${emotion}`);
    console.log(`   Frames: ${frameCount}, Text length: ${sttSnippet.length}`);

    // Store in state for timeline display
    updateEmotionTimeline({
      emotion,
      timestamp,
      frameCount,
      sttSnippet
    });

    // If CBT intervention detected
    if (intervention) {
      displayCBTIntervention(intervention);
    }
  }
};
```

### Emotion Update Payload

```json
{
  "type": "emotion_update",
  "data": {
    "emotion": "happy",
    "timestamp": 1761390981234,
    "frameCount": 240,
    "sttSnippet": "오늘 날씨가 정말 좋네요",
    "intervention": {
      "distortionType": "catastrophizing",
      "distortionName": "재앙화",
      "severity": "high",
      "urgency": "immediate",
      "questions": [
        "최악의 상황이 정말 일어날 가능성이 얼마나 될까요?",
        "이전에 비슷한 상황에서는 어떻게 되었나요?"
      ],
      "tasks": [
        {
          "title": "대안적 생각 찾기",
          "description": "현재 상황에 대해 더 균형잡힌 생각 3개 찾기",
          "difficulty": "medium",
          "duration": 10
        }
      ]
    }
  }
}
```

### Emotion Types (Enum)

```javascript
const EMOTIONS = {
  'happy': { ko: '행복', emoji: '😊', color: '#FFD700' },
  'sad': { ko: '슬픔', emoji: '😢', color: '#4169E1' },
  'angry': { ko: '분노', emoji: '😠', color: '#FF4500' },
  'anxious': { ko: '불안', emoji: '😰', color: '#FF6347' },
  'excited': { ko: '흥분', emoji: '🤩', color: '#FFB6C1' },
  'neutral': { ko: '중립', emoji: '😐', color: '#A9A9A9' }
};
```

---

## 🛑 HTTP API - Session End with Emotion Summary

### Endpoint
```
POST /api/session/{sessionId}/end
```

### Response (NEW - Includes Emotion Summary)

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1761390973946_a29aaeda",
    "status": "ended",
    "endedAt": 1761390974042,
    "duration": 3600,
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

### Response Fields Explained

| Field | Type | Description |
|-------|------|-------------|
| `emotionCount` | number | Total emotions detected during session |
| `emotionSummary` | object | Null if no emotions, object if emotions detected |
| `primaryEmotion` | object | Most frequent emotion with percentage |
| `emotionalState` | string | Korean description of overall emotional state |
| `trend` | string | How emotions changed over time |
| `positiveRatio` | number | % of positive emotions (happy, excited) |
| `negativeRatio` | number | % of negative emotions (sad, angry, anxious) |

### Emotional State Descriptions

```javascript
const EMOTIONAL_STATES = {
  '긍정적이고 활발한 상태': 'Positive and Active',
  '부정적이고 어려운 상태': 'Negative and Difficult',
  '불안감이 큰 상태': 'High Anxiety',
  '감정적으로 복합적인 상태': 'Emotionally Complex',
  '긍정적 감정이 부족한 상태': 'Lacking Positive Emotion'
};
```

### Trend Descriptions

```javascript
const TRENDS = {
  '안정적': 'Stable - Same emotion throughout session',
  '긍정적으로 개선됨': 'Improved - Negative to positive emotion progression',
  '부정적으로 변함': 'Worsened - Positive to negative emotion progression',
  '변화함': 'Changed - Various emotion changes'
};
```

---

## 🎨 Frontend Implementation Examples

### 1. Real-time Emotion Timeline Display

```javascript
import React, { useState, useEffect } from 'react';

export function EmotionTimeline({ sessionId, wsUrl }) {
  const [emotions, setEmotions] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'emotion_update') {
        setEmotions(prev => [...prev, {
          emotion: message.data.emotion,
          timestamp: message.data.timestamp,
          frameCount: message.data.frameCount
        }]);
      }
    };

    return () => ws.close();
  }, [wsUrl]);

  return (
    <div className="emotion-timeline">
      <h3>Emotion Timeline</h3>
      <div className="timeline-items">
        {emotions.map((item, idx) => (
          <div key={idx} className={`timeline-item emotion-${item.emotion}`}>
            <span className="emoji">{getEmotionEmoji(item.emotion)}</span>
            <span className="emotion-name">{getEmotionKo(item.emotion)}</span>
            <span className="frames">({item.frameCount} frames)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEmotionEmoji(emotion) {
  const emojis = {
    happy: '😊', sad: '😢', angry: '😠',
    anxious: '😰', excited: '🤩', neutral: '😐'
  };
  return emojis[emotion] || '😐';
}

function getEmotionKo(emotion) {
  const names = {
    happy: '행복', sad: '슬픔', angry: '분노',
    anxious: '불안', excited: '흥분', neutral: '중립'
  };
  return names[emotion] || '중립';
}
```

### 2. Emotion Summary Card (Session End)

```javascript
import React from 'react';

export function EmotionSummaryCard({ emotionSummary }) {
  if (!emotionSummary) {
    return <div className="summary-card">감정 데이터 없음</div>;
  }

  const { primaryEmotion, emotionalState, trend, positiveRatio, negativeRatio } = emotionSummary;

  return (
    <div className="emotion-summary-card">
      <h2>감정 분석 결과</h2>

      <div className="primary-emotion">
        <div className="emoji">{getEmotionEmoji(primaryEmotion.emotion)}</div>
        <div className="emotion-info">
          <h3>{primaryEmotion.emotionKo}</h3>
          <p>{primaryEmotion.percentage}% - 가장 자주 나타난 감정</p>
        </div>
      </div>

      <div className="emotional-state">
        <h4>감정 상태</h4>
        <p>{emotionalState}</p>
      </div>

      <div className="trend">
        <h4>감정 변화</h4>
        <p>{trend}</p>
      </div>

      <div className="ratios">
        <div className="ratio-item positive">
          <h5>긍정 감정</h5>
          <div className="bar">
            <div className="fill" style={{ width: `${positiveRatio}%` }}></div>
          </div>
          <p>{positiveRatio}%</p>
        </div>

        <div className="ratio-item negative">
          <h5>부정 감정</h5>
          <div className="bar">
            <div className="fill" style={{ width: `${negativeRatio}%` }}></div>
          </div>
          <p>{negativeRatio}%</p>
        </div>
      </div>
    </div>
  );
}
```

### 3. Session End Handler

```javascript
async function handleSessionEnd(sessionId) {
  try {
    const response = await fetch(`/api/session/${sessionId}/end`, {
      method: 'POST'
    });

    const result = await response.json();

    if (result.success) {
      const { emotionCount, emotionSummary } = result.data;

      console.log(`📊 Session ended with ${emotionCount} emotions`);

      if (emotionSummary) {
        console.log(`Primary emotion: ${emotionSummary.primaryEmotion.emotionKo}`);
        console.log(`Emotional state: ${emotionSummary.emotionalState}`);
        console.log(`Trend: ${emotionSummary.trend}`);

        // Display emotion summary to user
        displayEmotionSummary(emotionSummary);
      } else {
        console.log('No emotion data recorded during session');
      }

      // Redirect to results page
      router.push(`/results/${sessionId}`);
    }
  } catch (error) {
    console.error('❌ Failed to end session:', error);
  }
}
```

---

## 🎯 Integration Checklist

- [ ] **WebSocket Handler**: Implement `emotion_update` message handler
  - [ ] Extract emotion data
  - [ ] Handle intervention data
  - [ ] Update UI in real-time

- [ ] **Emotion Timeline Display**: Show emotions as they arrive
  - [ ] Emoji/color coding
  - [ ] Timestamp tracking
  - [ ] Frame count display

- [ ] **Session End**: Handle new emotion summary response
  - [ ] Parse emotionSummary object
  - [ ] Display primary emotion
  - [ ] Show emotional state
  - [ ] Visualize trend and ratios

- [ ] **Error Handling**: Handle edge cases
  - [ ] null emotionSummary (no emotions)
  - [ ] WebSocket connection loss
  - [ ] Emotion update failures

- [ ] **Styling**: Visual design
  - [ ] Emotion colors/emojis
  - [ ] Timeline layout
  - [ ] Summary card design
  - [ ] Progress bars for ratios

---

## 🚨 Known Issues & Solutions

### Issue 1: WebSocket Connection Drops
**Symptom**: Emotion updates stop arriving
**Solution**: Implement reconnection logic with exponential backoff

```javascript
function connectWithRetry(wsUrl, maxRetries = 5) {
  let retries = 0;

  function connect() {
    const ws = new WebSocket(wsUrl);

    ws.onerror = () => {
      if (retries < maxRetries) {
        retries++;
        const delay = Math.pow(2, retries) * 1000;
        setTimeout(() => connect(), delay);
      }
    };

    return ws;
  }

  return connect();
}
```

### Issue 2: Empty Emotion Summary
**Symptom**: emotionSummary is null even after long session
**Possible Cause**:
- No Gemini API responses received
- Landmarks/video feed not working
- Audio transcription failed

**Solution**: Show user message and recommend checking equipment

```javascript
if (!emotionSummary) {
  return (
    <div className="emotion-summary-empty">
      <p>⚠️ 이번 세션에서 감정 데이터를 분석할 수 없었습니다.</p>
      <p>다시 시도해주세요.</p>
    </div>
  );
}
```

### Issue 3: CBT Intervention Handling
**Symptom**: Intervention data arrives with emotion update
**Solution**: Display intervention modal or sidebar

```javascript
if (message.data.intervention) {
  displayInterventionModal({
    distortion: message.data.intervention.distortionName,
    questions: message.data.intervention.questions,
    tasks: message.data.intervention.tasks
  });
}
```

---

## 📊 Emotion Data Structure Reference

### WebSocket Emotion Update

```typescript
interface EmotionUpdateMessage {
  type: 'emotion_update';
  data: {
    emotion: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'neutral';
    timestamp: number;           // milliseconds since epoch
    frameCount: number;          // 178-240 facial landmarks per cycle
    sttSnippet: string;          // speech text preview (100 chars)
    intervention?: CBTIntervention;
  }
}
```

### Session End Emotion Summary

```typescript
interface EmotionSummary {
  primaryEmotion: {
    emotion: string;
    emotionKo: string;
    percentage: number;          // 0-100
  };
  emotionalState: string;        // Korean description
  trend: string;                 // '안정적', '긍정적으로 개선됨', etc
  positiveRatio: number;         // 0-100
  negativeRatio: number;         // 0-100
}
```

---

## 🔧 Debugging Tips

### Check Emotion Updates Arriving
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'emotion_update') {
    console.log('🎯 Emotion update:', message.data.emotion);
    // Should log: happy, sad, angry, anxious, excited, or neutral
  }
};
```

### Verify Session End Response
```javascript
// In browser console after session end:
fetch('/api/session/sess_xxx/end', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d.data.emotionSummary))
  // Should log emotion summary object
```

### Check Frame Count Variation
```javascript
// High frame count = more pronounced expression
// 178-240 frames per cycle is typical
// Lower = subtle expression, Higher = very clear emotion
```

---

## 📞 Backend Support

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/session/start` | POST | Create session & get WebSocket URLs |
| `ws://host/ws/landmarks` | WebSocket | Receive emotion_update messages |
| `/api/session/{id}/end` | POST | End session & get emotion summary |
| `/api/session/{id}/summary` | GET | Get session summary (includes emotions) |

### Response Headers
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "세션을 찾을 수 없습니다"
  }
}
```

---

## ✅ Production Readiness

### Backend Status
- ✅ Emotion analysis working (Gemini API)
- ✅ Real-time WebSocket updates every 10 seconds
- ✅ Database persistence fixed (commit: a0eda02)
- ✅ Session-end aggregation implemented
- ✅ CBT intervention detection integrated
- ✅ Production deployment ready (Render)

### Frontend Ready Checklist
- [ ] WebSocket message handler implemented
- [ ] Emotion update UI display
- [ ] Session end emotion summary card
- [ ] Error handling and edge cases
- [ ] Styling and responsive design
- [ ] User feedback and loading states
- [ ] Testing with real emotion data

---

## 🎓 Example: Complete Integration

```javascript
import React, { useState, useEffect } from 'react';

export function SessionView() {
  const [sessionId, setSessionId] = useState(null);
  const [emotions, setEmotions] = useState([]);
  const [emotionSummary, setEmotionSummary] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Start session
  useEffect(() => {
    const startSession = async () => {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          counselorId: 'counselor456'
        })
      });
      const data = await res.json();
      setSessionId(data.data.sessionId);

      // Connect to emotion WebSocket
      connectToEmotionUpdates(data.data.wsUrls.landmarks);
    };
    startSession();
  }, []);

  const connectToEmotionUpdates = (wsUrl) => {
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'emotion_update') {
        setEmotions(prev => [...prev, {
          emotion: message.data.emotion,
          timestamp: message.data.timestamp,
          frameCount: message.data.frameCount
        }]);
      }
    };

    ws.onerror = () => console.error('WebSocket error');
  };

  const endSession = async () => {
    const res = await fetch(`/api/session/${sessionId}/end`, {
      method: 'POST'
    });
    const data = await res.json();
    setEmotionSummary(data.data.emotionSummary);
    setSessionEnded(true);
  };

  if (sessionEnded && emotionSummary) {
    return (
      <div className="session-results">
        <h1>Session Results</h1>
        <EmotionSummaryCard emotionSummary={emotionSummary} />
        <EmotionTimeline emotions={emotions} />
      </div>
    );
  }

  return (
    <div className="session-active">
      <h1>Session {sessionId}</h1>
      <EmotionTimeline emotions={emotions} />
      <button onClick={endSession}>End Session</button>
    </div>
  );
}
```

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-26 | Initial release with emotion timeline system |
| 1.1.0 | TBD | Frontend integration examples |
| 2.0.0 | TBD | Advanced analytics and trend visualization |

---

**Status**: ✅ Ready for Frontend Integration
**Last Updated**: 2025-10-26 01:30 UTC
**Contact**: Backend Team for issues or questions
