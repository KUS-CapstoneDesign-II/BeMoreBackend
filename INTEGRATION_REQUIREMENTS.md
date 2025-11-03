# 🔗 Frontend Phase 9 × Backend Phase 4: Integration Requirements

**For**: Backend Development Team
**From**: Frontend Phase 9 Complete
**Date**: 2025-11-03
**Status**: 🟢 Ready for Integration

---

## Executive Summary

Frontend Phase 9 is **production-ready** and requires Backend support for one new API endpoint to complete the integration.

**Current Status**:
- ✅ Frontend: 109 unit tests passing, optimized for minimal API calls
- ✅ Backend: 20+ APIs implemented, Rate Limiting active
- 🟢 **Integration Ready**: Only 1 new endpoint needed

---

## What Frontend Needs from Backend

### Must-Have (Critical)

#### 1. `POST /api/session/batch-tick`
**Purpose**: Receive batched emotion analysis results from Frontend

```http
POST /api/session/batch-tick
Content-Type: application/json

{
  "sessionId": "sess_1737250800_abc123",
  "items": [
    {
      "minuteIndex": 0,
      "facialScore": 0.75,
      "vadScore": 0.82,
      "textScore": 0.68,
      "combinedScore": 0.75,
      "keywords": ["engaged", "confident"],
      "sentiment": "positive",
      "confidence": 0.94,
      "timestamp": "2025-11-03T10:30:00Z",
      "durationMs": 60000
    },
    {
      "minuteIndex": 1,
      "facialScore": 0.71,
      "vadScore": 0.79,
      "textScore": 0.65,
      "combinedScore": 0.72,
      "keywords": ["focused"],
      "sentiment": "neutral",
      "confidence": 0.91,
      "timestamp": "2025-11-03T10:31:00Z",
      "durationMs": 60000
    }
  ]
}
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "message": "2 items processed successfully"
}
```

**Key Requirements**:
- ✅ Accept 1-10 items per request (or up to 100)
- ✅ Each item must have: minuteIndex, facialScore, vadScore, textScore, combinedScore
- ✅ Optional metadata: keywords, sentiment, confidence, timestamp, durationMs
- ✅ Validate score ranges: 0.0 - 1.0
- ✅ Store results for later retrieval via `GET /api/session/:id/inferences`
- ✅ Return processed count for tracking

---

### Already Implemented (Use As-Is)

#### 2. `POST /api/session/start`
**Status**: ✅ Working | Frontend uses: Yes | Changes needed: None

#### 3. `POST /api/session/:id/end`
**Status**: ✅ Working | Frontend uses: Yes | Changes needed: None

#### 4. `GET /api/session/:id/inferences`
**Status**: ✅ Working | Frontend uses: Yes | Changes needed: None

#### Other APIs (15+ existing)
**Status**: ✅ All working | Frontend uses: Partially | Changes needed: None

---

## Integration Overview

### Current Data Flow

```
Frontend Session                    Backend Session
━━━━━━━━━━━━━━━━━━━                ━━━━━━━━━━━━━━━━━━

1. POST /start
   sessionId ←─────────────────────→ Create session
                                     Store startedAt

2. Collect Data (60 sec)
   ├─ Facial landmarks (webcam)
   ├─ Voice metrics (microphone)
   └─ Text transcripts (STT)

3. Analyze Local (60 sec)
   ├─ Process facial features
   ├─ Calculate voice metrics
   ├─ Analyze text sentiment
   └─ Create aggregated result

4. POST /batch-tick (EVERY 60 SEC)
   Batched results ──────────────→ Store inferences
                    ←─────────────  Count: 1

5. Repeat steps 2-4 until END

6. POST /end
   Session end ────────────────→ Finalize
                    ←─────────── Final report

```

### Request Volume Change

| Metric | Old Design | New Design | Reduction |
|--------|-----------|-----------|-----------|
| **Requests/Second** | 1-2 | 0.017 (1/60s) | **98% ↓** |
| **Requests/Minute** | 60-120 | 1 | **60x ↓** |
| **Requests/Session** | 180-360 | 3-5 | **60x ↓** |
| **Payload/Request** | 1 item | 1-10 items | **10x aggregation** |

**Impact**: Dramatically reduced load on Backend = Better scalability

---

## API Specification Details

### Endpoint: `POST /api/session/batch-tick`

**Request Body Schema**:
```typescript
{
  sessionId: string              // Required: session ID
  items: [
    {
      minuteIndex: number        // Required: 0-based minute index
      facialScore: 0.0-1.0       // Required: normalized score
      vadScore: 0.0-1.0          // Required: normalized score
      textScore: 0.0-1.0         // Required: normalized score
      combinedScore: 0.0-1.0     // Required: normalized score
      keywords?: string[]        // Optional: analysis keywords
      sentiment?: string         // Optional: "positive"|"neutral"|"negative"
      confidence?: 0.0-1.0       // Optional: 0.0-1.0
      timestamp?: string         // Optional: ISO8601 format
      durationMs?: number        // Optional: milliseconds
    }
  ]
}
```

**Validation Rules**:
- `sessionId`: Must exist in SessionManager
- `items`: Array with 1-100 elements
- `minuteIndex`: Non-negative integer
- All scores: Number between 0.0 and 1.0
- `sentiment`: One of "positive", "neutral", "negative"
- `confidence`: Number between 0.0 and 1.0

**Response Schema**:
```typescript
{
  success: boolean              // true if all items processed
  count: number                 // number of items processed
  message: string               // status message
  batchId?: string              // optional tracking ID
}
```

**Error Responses**:
- `400 Bad Request`: Validation error (detailed message)
- `404 Not Found`: Session doesn't exist
- `429 Too Many Requests`: Rate limit (Retry-After header)
- `500 Internal Server Error`: Server error (retry safe)

---

## Data Format Specifications

### Score Normalization
All scores are **0.0 to 1.0** normalized range:
- `0.0` = Minimum (negative emotion, low confidence)
- `0.5` = Neutral/middle state
- `1.0` = Maximum (positive emotion, high confidence)

**Examples**:
- High engagement: facialScore=0.85, vadScore=0.90, textScore=0.80, combined=0.85
- Neutral state: facialScore=0.50, vadScore=0.50, textScore=0.50, combined=0.50
- Low engagement: facialScore=0.25, vadScore=0.30, textScore=0.20, combined=0.25

### Sentiment Classification
```
"positive"  → Happiness, confidence, engagement
"neutral"   → Calm, focused, stable
"negative"  → Frustration, confusion, concern
```

### Timestamp Format
```
ISO8601: "2025-11-03T10:30:00Z"
        "2025-11-03T10:30:00.123Z"  (with milliseconds)
Always UTC timezone (Z suffix)
```

---

## Integration Checklist

### Backend Implementation
- [ ] Create `POST /api/session/batch-tick` endpoint
- [ ] Add Zod validation schema for request body
- [ ] Validate sessionId exists
- [ ] Validate score ranges (0.0-1.0)
- [ ] Validate sentiment enum
- [ ] Store items in DataStore/inferences
- [ ] Return proper HTTP status codes
- [ ] Include requestId/serverTs in response
- [ ] Handle partial failures (some items fail, others succeed)
- [ ] Test with provided demo scripts

### Testing
- [ ] Unit test: Valid request returns 200
- [ ] Unit test: Invalid scores return 400
- [ ] Unit test: Nonexistent session returns 404
- [ ] Integration test: Items stored correctly
- [ ] Load test: 100+ items per request
- [ ] Retry test: 429 + Retry-After header
- [ ] E2E test: Full session lifecycle (start → 5 batches → end)

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Enable monitoring/logging
- [ ] Deploy to production
- [ ] Monitor error rates

---

## Error Handling Examples

### Valid Request → 200 OK
```
POST /api/session/batch-tick
{ sessionId: "sess_123", items: [...] }
↓
200 OK
{ success: true, count: 2, message: "2 items processed" }
```

### Invalid Score → 400 Bad Request
```
POST /api/session/batch-tick
{ sessionId: "sess_123", items: [{ facialScore: 1.5, ... }] }
↓
400 Bad Request
{
  success: false,
  error: { code: "VALIDATION_ERROR", message: "facialScore must be between 0 and 1" }
}
```

### Session Not Found → 404 Not Found
```
POST /api/session/batch-tick
{ sessionId: "invalid_session", items: [...] }
↓
404 Not Found
{
  success: false,
  error: { code: "SESSION_NOT_FOUND", message: "Session not found: invalid_session" }
}
```

### Rate Limited → 429 Too Many Requests
```
POST /api/session/batch-tick
[...10th request in 10 seconds...]
↓
429 Too Many Requests
Retry-After: 45
{
  success: false,
  error: { code: "RATE_LIMIT", message: "Too many requests" }
}
```

---

## Implementation Examples

### Node.js / Express Implementation

```javascript
// Validation schema
const batchTickSchema = z.object({
  sessionId: z.string().min(1),
  items: z.array(z.object({
    minuteIndex: z.number().min(0).int(),
    facialScore: z.number().min(0).max(1),
    vadScore: z.number().min(0).max(1),
    textScore: z.number().min(0).max(1),
    combinedScore: z.number().min(0).max(1),
    keywords: z.array(z.string()).optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
    confidence: z.number().min(0).max(1).optional(),
    timestamp: z.string().datetime().optional(),
    durationMs: z.number().min(0).optional()
  })).min(1).max(100)
});

// Route handler
router.post('/batch-tick', validateBody(batchTickSchema), (req, res) => {
  try {
    const { sessionId, items } = req.body;

    // 1. Verify session exists
    const session = SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'SESSION_NOT_FOUND' }
      });
    }

    // 2. Process items
    const dataStore = getDataStore();
    let processedCount = 0;

    for (const item of items) {
      try {
        dataStore.addInference(sessionId, item.minuteIndex, {
          facialScore: item.facialScore,
          vadScore: item.vadScore,
          textSentiment: item.textScore,
          combinedScore: item.combinedScore,
          keywords: item.keywords || [],
          sentiment: item.sentiment || 'neutral',
          confidence: item.confidence || 0,
          timestamp: item.timestamp || new Date().toISOString(),
          durationMs: item.durationMs || 0
        });
        processedCount++;
      } catch (error) {
        // Log but continue processing other items
        console.warn(`Error processing item ${item.minuteIndex}:`, error);
      }
    }

    // 3. Return result
    res.status(201).json({
      success: processedCount === items.length,
      count: processedCount,
      message: `${processedCount} items processed successfully`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_TICK_ERROR' }
    });
  }
});
```

---

## Testing with Frontend

### Test 1: Single Item
```bash
curl -X POST http://localhost:8000/api/session/batch-tick \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess_test_001",
    "items": [{
      "minuteIndex": 0,
      "facialScore": 0.75,
      "vadScore": 0.82,
      "textScore": 0.68,
      "combinedScore": 0.75
    }]
  }'
```

**Expected**:
```
201 Created
{ "success": true, "count": 1, "message": "1 items processed successfully" }
```

### Test 2: Multiple Items
```bash
# See scripts/demo.http for full example
# Run from VSCode with REST Client extension
```

### Test 3: E2E Session
```bash
bash scripts/demo.sh
```

---

## Frequently Asked Questions

### Q: How often does Frontend call batch-tick?
**A**: Approximately every 60 seconds (1x per minute) per active session.

### Q: What happens if batch-tick fails?
**A**: Frontend implements exponential backoff retry:
- Retry 1: 1 second
- Retry 2: 3 seconds
- Retry 3: 10 seconds
- Give up: After 10 seconds
Items are stored locally until successfully sent.

### Q: Can batch-tick receive concurrent requests?
**A**: No, Frontend sends sequentially. One request per minute per session.

### Q: What should happen to old inferences?
**A**: New batch-tick items with same `minuteIndex` should **overwrite** previous values (or store both with version tracking).

### Q: Do we need to calculate combined score on Backend?
**A**: No, Frontend provides pre-calculated combined score. Backend just stores it.

### Q: Should batch-tick block other requests?
**A**: No, it should be asynchronous and non-blocking. Return immediately after storing.

### Q: What's the difference between batch-tick and tick?
**A**:
- `tick`: Backend calculates from raw data (frames, audio, stt)
- `batch-tick`: Frontend provides pre-calculated results

Both can coexist. Use whichever is convenient.

---

## Timeline & Commitment

### Week 1: Implementation
- **Mon-Tue**: Design & implementation (2-4 hours)
- **Wed-Thu**: Testing & QA (2-4 hours)
- **Fri**: Deploy to staging

### Week 2: Integration Testing
- **Mon**: E2E testing with Frontend
- **Tue-Wed**: Load testing & optimization
- **Thu-Fri**: Monitoring & stability checks

### Week 3: Production Deployment
- **Mon-Tue**: Production deployment
- **Wed-Fri**: Monitoring & incident response

**Total Effort**: ~2 weeks from now

---

## Communication & Support

### Questions?
1. Check this document first
2. Review `FRONTEND_COMPATIBILITY_REPORT.md` for details
3. Look at `FRONTEND_QUICK_START.md` for quick reference
4. Review test scripts in `scripts/demo.*`

### Status Updates
- Share progress in team sync (weekly)
- Report blockers immediately
- Provide ETA for completion

### Success Metrics
- ✅ Unit tests passing (100%)
- ✅ Integration tests passing (100%)
- ✅ Load test: Handle 60+ requests/minute
- ✅ Error rate: <0.1% in staging
- ✅ Response time: <500ms p95

---

## Next Steps

1. **Backend Review**: Read this document thoroughly
2. **Plan**: Estimate effort and timeline
3. **Implement**: Create batch-tick endpoint
4. **Test**: Run provided test scripts
5. **Deploy**: Push to staging
6. **Coordinate**: Sync with Frontend team
7. **Go Live**: Deploy to production

---

## Related Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| [FRONTEND_QUICK_START.md](./FRONTEND_QUICK_START.md) | 2-page quick reference | All |
| [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md) | Detailed integration guide | Developers |
| [FRONTEND_COMPATIBILITY_REPORT.md](./FRONTEND_COMPATIBILITY_REPORT.md) | Technical specifications | Tech Leads |
| [BACKEND_SESSION_LIFECYCLE.md](./BACKEND_SESSION_LIFECYCLE.md) | Architecture overview | Architects |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Status**: Ready for Implementation

🚀 **Let's build this together!**

