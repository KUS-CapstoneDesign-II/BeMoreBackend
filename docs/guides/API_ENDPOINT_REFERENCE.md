# BeMore API Endpoint Reference

## Full API Documentation with Request/Response Examples

### Authentication

All endpoints support optional JWT authentication via Authorization header:
```
Authorization: Bearer <token>
```

The `optionalJwtAuth` middleware validates tokens if present but allows requests without tokens for most endpoints.

---

## Session Management APIs

### 1. POST /api/session/start
**Create a new session**

Request:
```json
{
  "userId": "user_001",
  "counselorId": "counselor_001"
}
```

Response (201 Created):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "wsUrls": {
      "landmarks": "ws://localhost:8000/ws/landmarks?sessionId=sess_1730626800000_abc123",
      "voice": "ws://localhost:8000/ws/voice?sessionId=sess_1730626800000_abc123",
      "session": "ws://localhost:8000/ws/session?sessionId=sess_1730626800000_abc123"
    },
    "startedAt": 1730626800000,
    "status": "active",
    "userId": "user_001",
    "counselorId": "counselor_001"
  },
  "error": null
}
```

Frontend Integration:
```typescript
const response = await sessionAPI.start('user_001', 'counselor_001');
const { sessionId, wsUrls } = response;
```

---

### 2. GET /api/session/:id
**Retrieve session details**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "userId": "user_001",
    "counselorId": "counselor_001",
    "status": "active",
    "startedAt": 1730626800000,
    "endedAt": null,
    "duration": 3600000,
    "dataCollected": {
      "landmarks": 1200,
      "voiceChunks": 45,
      "transcriptions": 12
    }
  },
  "error": null
}
```

Frontend Integration:
```typescript
const session = await sessionAPI.get('sess_1730626800000_abc123');
```

---

### 3. POST /api/session/:id/pause
**Pause an active session**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "status": "paused",
    "pausedAt": 1730626900000
  },
  "error": null
}
```

Frontend Integration:
```typescript
await sessionAPI.pause('sess_1730626800000_abc123');
```

---

### 4. POST /api/session/:id/resume
**Resume a paused session**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "status": "active",
    "resumedAt": 1730627000000
  },
  "error": null
}
```

Frontend Integration:
```typescript
await sessionAPI.resume('sess_1730626800000_abc123');
```

---

### 5. POST /api/session/:id/end
**End an active or paused session**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "status": "ended",
    "endedAt": 1730627200000,
    "duration": 400000,
    "dataPoints": {
      "landmarks": 1200,
      "voiceChunks": 50,
      "transcriptions": 15
    }
  },
  "error": null
}
```

Frontend Integration:
```typescript
await sessionAPI.end('sess_1730626800000_abc123');
```

---

### 6. GET /api/session/stats/summary
**Get session statistics**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "totalSessions": 45,
    "activeSessions": 2,
    "totalDuration": 18000000,
    "averageDuration": 400000,
    "totalDataPoints": 54000,
    "lastSessionId": "sess_1730627000000_xyz789",
    "lastSessionDate": "2024-11-03T10:30:00Z"
  },
  "error": null
}
```

Frontend Integration:
```typescript
const stats = await sessionAPI.getStats();
```

---

## Session Report APIs

### 7. GET /api/session/:id/report
**Get full session report**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "duration": 400000,
    "startedAt": "2024-11-03T10:00:00Z",
    "endedAt": "2024-11-03T10:06:40Z",
    "emotionHistory": [
      {
        "timestamp": "2024-11-03T10:00:05Z",
        "emotion": "neutral",
        "confidence": 0.92
      },
      {
        "timestamp": "2024-11-03T10:00:10Z",
        "emotion": "sad",
        "confidence": 0.87
      }
    ],
    "vadMetrics": {
      "totalSpeechFrames": 300,
      "totalSilenceFrames": 200,
      "speechPercentage": 60
    },
    "transcriptions": [
      {
        "timestamp": "2024-11-03T10:00:05Z",
        "text": "I've been feeling stressed lately",
        "confidence": 0.95
      }
    ],
    "summary": "Patient discussed stress and anxiety..."
  },
  "error": null
}
```

Frontend Integration:
```typescript
const report = await sessionAPI.getReport('sess_1730626800000_abc123');
```

---

### 8. GET /api/session/:id/report/summary
**Get condensed report summary**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1730626800000_abc123",
    "duration": 400000,
    "dominantEmotion": "sad",
    "emotionDistribution": {
      "neutral": 30,
      "sad": 45,
      "happy": 15,
      "angry": 10
    },
    "keyPhrases": [
      "stress",
      "anxiety",
      "overwhelmed"
    ],
    "sentiment": "negative",
    "recommendations": [
      "Follow up on stress management",
      "Discuss coping strategies"
    ]
  },
  "error": null
}
```

Frontend Integration:
```typescript
const summary = await sessionAPI.getReportSummary('sess_1730626800000_abc123');
```

---

### 9. GET /api/session/:id/report/pdf
**Download session report as PDF**

Response (200 OK - binary):
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="session_report_sess_xxx.pdf"
[PDF binary data]
```

Frontend Integration:
```typescript
const pdfBlob = await sessionAPI.downloadPdf('sess_1730626800000_abc123');
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'session_report.pdf';
a.click();
```

---

### 10. GET /api/session/:id/report/csv
**Download session data as CSV**

Query Parameters:
- `kind`: 'vad' or 'emotion' (optional, default: 'vad')

Response (200 OK - text/csv):
```
Content-Type: text/csv
Content-Disposition: attachment; filename="session_data_sess_xxx.csv"

timestamp,emotion,confidence,transcription
2024-11-03T10:00:05Z,neutral,0.92,
2024-11-03T10:00:10Z,sad,0.87,
2024-11-03T10:00:15Z,sad,0.89,"I've been stressed"
```

Frontend Integration:
```typescript
const csvBlob = await sessionAPI.downloadCsv('sess_1730626800000_abc123', 'emotion');
```

---

### 11. POST /api/session/:id/feedback
**Submit session feedback**

Request:
```json
{
  "rating": 4,
  "note": "Very helpful session"
}
```

Response (201 Created):
```json
{
  "success": true,
  "data": {
    "feedbackId": "fb_1730627200000",
    "sessionId": "sess_1730626800000_abc123",
    "rating": 4,
    "note": "Very helpful session",
    "submittedAt": "2024-11-03T10:07:00Z"
  },
  "error": null
}
```

Frontend Integration:
```typescript
await sessionAPI.submitFeedback('sess_1730626800000_abc123', {
  rating: 4,
  note: "Very helpful session"
});
```

---

## Speech-to-Text API

### 12. POST /api/stt/transcribe
**Transcribe audio to text**

Request:
```
Content-Type: multipart/form-data
audio: [Blob - WebM audio file]
```

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "text": "I'm feeling anxious about the upcoming presentation"
  },
  "error": null
}
```

Frontend Integration:
```typescript
const audioBlob = new Blob([audioData], { type: 'audio/webm' });
const result = await sttAPI.transcribe(audioBlob);
console.log(result.text); // "I'm feeling anxious..."
```

Error Handling:
```json
{
  "success": true,
  "data": {
    "text": ""
  }
}
```
(Returns empty string for silence, invalid audio, or processing errors)

---

## Emotion Analysis API

### 13. POST /api/emotion
**Analyze emotion from text**

Request:
```json
{
  "text": "I'm feeling really sad today"
}
```

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "emotion": "sad"
  },
  "error": null
}
```

Possible Emotions:
- neutral
- sad
- happy
- angry
- surprised
- fearful
- disgusted
- anxious
- calm
- excited

Frontend Integration:
```typescript
const result = await emotionAPI.analyze("I'm feeling really sad");
console.log(result.emotion); // "sad"
```

---

## Dashboard API

### 14. GET /api/dashboard/summary
**Get dashboard summary data**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "totalSessions": 45,
    "activeSessions": 2,
    "totalUsers": 28,
    "averageSessionDuration": 400000,
    "dominantEmotions": {
      "neutral": 30,
      "sad": 35,
      "happy": 20,
      "anxious": 15
    },
    "recentSessions": [
      {
        "sessionId": "sess_1730627000000_xyz",
        "userId": "user_001",
        "startedAt": "2024-11-03T10:00:00Z",
        "duration": 400000,
        "emotion": "sad"
      }
    ]
  },
  "error": null
}
```

Frontend Integration:
```typescript
const summary = await dashboardAPI.summary();
```

---

## User Preferences API

### 15. GET /api/user/preferences
**Get user preferences**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "user_001",
    "theme": "dark",
    "language": "ko",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "privacy": {
      "dataRetention": 30,
      "shareAnonymous": true
    }
  },
  "error": null
}
```

Frontend Integration:
```typescript
const prefs = await userAPI.getPreferences();
```

---

### 16. PUT /api/user/preferences
**Update user preferences**

Request:
```json
{
  "preferences": {
    "theme": "light",
    "language": "en",
    "notifications": {
      "email": false,
      "push": true,
      "sms": false
    }
  }
}
```

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "updated": true,
    "preferences": {
      "theme": "light",
      "language": "en",
      "notifications": {
        "email": false,
        "push": true,
        "sms": false
      }
    }
  },
  "error": null
}
```

Frontend Integration:
```typescript
await userAPI.setPreferences({
  theme: 'light',
  language: 'en',
  notifications: { email: false, push: true }
});
```

---

## Infrastructure & Monitoring APIs

### 17. GET /
**API status check**

Response (200 OK):
```json
{
  "status": "ok",
  "message": "BeMore Backend API server is running successfully!"
}
```

---

### 18. GET /health
**Health check with system info**

Response (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-11-03T10:07:30Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "commit": "abc123def456"
}
```

Frontend Integration:
```typescript
const health = await monitoringAPI.healthCheck();
```

---

### 19. GET /api/monitoring/error-stats
**Get error statistics**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "totalErrors": 12,
    "last24h": 3,
    "byModule": {
      "session": 5,
      "stt": 3,
      "emotion": 2,
      "database": 2
    },
    "bySeverity": {
      "error": 8,
      "warn": 4
    },
    "recentErrors": [
      {
        "timestamp": "2024-11-03T09:50:00Z",
        "module": "stt",
        "message": "Whisper API timeout",
        "level": "error"
      }
    ]
  },
  "error": null
}
```

Frontend Integration:
```typescript
const stats = await monitoringAPI.getErrorStats();
```

---

### 20. GET /api/system/temp-cleanup-stats
**Get temporary file cleanup statistics**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "tmpDir": "/app/tmp",
    "maxAgeDays": 7,
    "maxSizeMB": 500,
    "checkIntervalMinutes": 60,
    "status": "running",
    "lastCheck": "2024-11-03T10:00:00Z",
    "filesDeleted": 145,
    "spaceSaved": 250,
    "currentSize": 128.5,
    "nextCheck": "2024-11-03T11:00:00Z"
  }
}
```

---

## WebSocket Channels

### Channel 1: /ws/landmarks
**Facial expression and landmark data**

Frame Structure:
```json
{
  "type": "landmarks_frame",
  "data": {
    "timestamp": 1730626805123,
    "landmarks": [
      { "x": 0.5, "y": 0.3, "z": -0.1 },
      // ... 467 more landmarks (MediaPipe Face Mesh)
    ],
    "faceDetection": {
      "confidence": 0.95,
      "boundingBox": {
        "x": 0.2,
        "y": 0.1,
        "width": 0.6,
        "height": 0.8
      }
    }
  }
}
```

Response from Server:
```json
{
  "type": "landmarks_processed",
  "data": {
    "frameId": 1,
    "success": true,
    "timestamp": 1730626805123
  }
}
```

---

### Channel 2: /ws/voice
**Audio data streaming**

Frame Structure:
```json
{
  "type": "audio_chunk",
  "data": {
    "timestamp": 1730626805123,
    "samples": [0.1, 0.2, -0.1, 0.05, ...],
    "sampleRate": 16000,
    "channels": 1
  }
}
```

Response from Server:
```json
{
  "type": "audio_processed",
  "data": {
    "chunkId": 1,
    "vad": {
      "isSpeech": true,
      "confidence": 0.87
    },
    "timestamp": 1730626805123
  }
}
```

---

### Channel 3: /ws/session
**Session control and status**

Control Messages (Frontend to Backend):
```json
{
  "type": "pause_request",
  "data": {}
}
```

```json
{
  "type": "resume_request",
  "data": {}
}
```

```json
{
  "type": "end_request",
  "data": {}
}
```

Status Updates (Backend to Frontend):
```json
{
  "type": "session_paused",
  "data": {
    "timestamp": 1730626900000,
    "reason": "user_requested"
  }
}
```

```json
{
  "type": "session_resumed",
  "data": {
    "timestamp": 1730626960000
  }
}
```

```json
{
  "type": "session_ended",
  "data": {
    "timestamp": 1730627200000,
    "duration": 400000,
    "dataCollected": {
      "landmarks": 1200,
      "voiceChunks": 50
    }
  }
}
```

---

## Error Responses

All errors follow standardized format:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "requestId": "req-12345-67890-abcde"
  }
}
```

Common Error Codes:
- `INVALID_INPUT` - Input validation failed
- `NOT_FOUND` - Resource not found
- `SESSION_ENDED` - Session has ended
- `INVALID_SESSION` - Invalid session ID
- `UNAUTHORIZED` - Authentication failed
- `RATE_LIMITED` - Rate limit exceeded
- `INTERNAL_ERROR` - Server error
- `TIMEOUT` - Operation timeout

---

## Rate Limits

- General: 600 requests per 10 minutes per IP
- Write operations (POST, PUT, DELETE): 300 requests per 10 minutes per IP

Response Headers:
```
RateLimit-Limit: 600
RateLimit-Remaining: 599
RateLimit-Reset: 1730627400
```

---

## CORS Headers

Request:
```
Origin: http://localhost:5173
```

Response:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Timeouts

- Axios timeout: 20 seconds
- WebSocket heartbeat: 30 seconds (server), 15s/30s (client)
- STT processing: typically 2-5 seconds
- Emotion analysis: typically <1 second
- Report generation: typically 5-10 seconds
- PDF export: typically 10-30 seconds

---

## Content Types

Requests:
- `application/json` - For JSON bodies
- `multipart/form-data` - For file uploads (STT)

Responses:
- `application/json` - For API responses
- `application/pdf` - For PDF exports
- `text/csv` - For CSV exports
- `text/plain` - For plain text

