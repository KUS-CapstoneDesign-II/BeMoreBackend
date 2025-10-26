# 🔧 Backend: Emotion Database Persistence - Critical Module Loading Bug

## 🚨 CRITICAL ISSUE

**Status**: ❌ BLOCKING emotion data persistence in production
**Environment**: Render cloud deployment
**Severity**: HIGH - Emotions analyzed successfully but cannot save to database

---

## 📋 Problem Summary

### Current Behavior
```
✅ Session creates, WebSocket opens
✅ Landmarks received (468 points, 178-240 frames per cycle)
✅ Gemini API analyzes emotions (13-17 second response time)
✅ Emotion detected successfully (e.g., "흥분" = "excited")
❌ Database save FAILS with: "Cannot read properties of undefined (reading 'constructor')"
❌ Emotion data is LOST (not persisted to database)
```

### Error Log Evidence
```
💾 [CRITICAL] Attempting to save emotion to database...
❌ [CRITICAL] Failed to save emotion to database:
   Error: Cannot read properties of undefined (reading 'constructor')
   Code: undefined
   Path attempted: ../../models
   Stack: at Function.keys (<anonymous>)
          at Timeout._onTimeout (/app/node_modules/sequelize/lib/model.js:83:34)
```

### Impact
- **Immediate**: Emotion timeline data lost after analysis
- **Session End**: `sessionController.js` falls back to in-memory emotions instead of database
- **Analytics**: Production can't track emotion history across sessions
- **Debugging**: Can't verify emotion analysis quality over time

---

## 🔍 Root Cause Analysis

### The Bug Location

**File**: `/services/socket/landmarksHandler.js`
**Lines**: 176-211 (fire-and-forget emotion persistence)

```javascript
// ❌ FAILING IN PRODUCTION
setImmediate(async () => {
  try {
    console.log(`💾 [CRITICAL] Attempting to save emotion to database...`);

    // Use proper require path from /services/socket/
    const models = require('../../models');  // ← RETURNS undefined in Render
    if (!models || !models.Session) {
      console.error(`❌ [CRITICAL] Models not found at ../../models`);
      console.error(`Available exports:`, Object.keys(models || {}));
      return;  // ← Early exit, emotion NOT saved
    }

    const { Session } = models;
    const sessionRecord = await Session.findOne({
      where: { sessionId: session.sessionId }
    });

    // ... save logic
  } catch (dbError) {
    console.error(`❌ [CRITICAL] Failed to save emotion to database:`);
    console.error(`   Error: ${dbError.message}`);
    // Error silently ignored
  }
});
```

### Path Analysis

**Expected Behavior**:
```
landmarksHandler location: /app/services/socket/landmarksHandler.js
Path resolution: /app/services/socket/ + ../../ = /app/
Target: /app/models ✅ (should work)
```

**But in Production**:
```
require('../../models') returns: undefined ❌
Why: ???  (Module loading context differs from sessionController)
```

### Why It Works in sessionController.js

**File**: `/controllers/sessionController.js`
**Line**: 106 (emotion database fetch)

```javascript
// ✅ WORKING IN PRODUCTION
const { Session } = require('../models');  // ← Works fine
const sessionRecord = await Session.findOne({ where: { sessionId } });
```

**Why this works**:
```
sessionController location: /app/controllers/sessionController.js
Path resolution: /app/controllers/ + ../ = /app/
Target: /app/models ✅ (works correctly)
```

### Hypotheses

1. **Module Circular Dependency**: landmarksHandler is required before models are fully initialized
2. **Path Context Difference**: Require cache or path resolution differs when called from WebSocket context
3. **Timing Issue**: setImmediate executes after models module is cleared/unloaded
4. **Environment Variable**: Render uses different NODE_PATH or module resolution strategy

---

## ✅ Debug Checklist

### Step 1: Verify Models Directory Structure
```bash
# SSH into Render and check:
ls -la /app/models/
# Should show: index.js, Session.js, ... other models

# Check if models/index.js exports Session:
grep -n "Session" /app/models/index.js
grep -n "module.exports" /app/models/index.js
```

### Step 2: Test Require Path in Different Contexts
```javascript
// Add these debug logs to landmarksHandler.js BEFORE line 181:

console.log(`🔍 [DEBUG] Module path resolution test:`);
console.log(`  __dirname: ${__dirname}`);
console.log(`  __filename: ${__filename}`);
console.log(`  process.cwd(): ${process.cwd()}`);

// Try different paths and log results:
try {
  const m1 = require('../../models');
  console.log(`  require('../../models'): ${m1 ? 'SUCCESS' : 'UNDEFINED'}`);
  console.log(`    Keys: ${Object.keys(m1 || {}).join(', ')}`);
} catch (e) {
  console.log(`  require('../../models'): ERROR - ${e.message}`);
}

try {
  const m2 = require.resolve('../../models');
  console.log(`  require.resolve('../../models'): ${m2}`);
} catch (e) {
  console.log(`  require.resolve('../../models'): ERROR - ${e.message}`);
}

try {
  const path = require('path');
  const m3 = require(path.join(__dirname, '../../models'));
  console.log(`  require(path.join(__dirname, '../../models')): ${m3 ? 'SUCCESS' : 'UNDEFINED'}`);
} catch (e) {
  console.log(`  require(path.join(__dirname, '../../models')): ERROR - ${e.message}`);
}
```

### Step 3: Compare with Working sessionController Path
```javascript
// In sessionController.js (working), add debug log:
console.log(`🔍 [DEBUG] sessionController path resolution:`);
console.log(`  __dirname: ${__dirname}`);
try {
  const models = require('../models');
  console.log(`  require('../models'): ${models ? 'SUCCESS' : 'UNDEFINED'}`);
  console.log(`    Keys: ${Object.keys(models || {}).join(', ')}`);
} catch (e) {
  console.log(`  require('../models'): ERROR - ${e.message}`);
}
```

### Step 4: Check Models Export Format
```javascript
// In models/index.js, verify export format:
console.log('🔍 [DEBUG] models/index.js exports:');
console.log(`  module.exports: ${typeof module.exports}`);
console.log(`  Keys: ${Object.keys(module.exports || {}).join(', ')}`);
console.log(`  Session exported: ${module.exports?.Session ? 'YES' : 'NO'}`);
```

### Step 5: Verify Sequelize Model Initialization
```javascript
// Check if models are initialized before landmarksHandler is loaded:
// models/index.js should have initialization like:
const sequelize = new Sequelize(...);
const models = {
  Session: sequelize.define('Session', ...),
  // ... other models
};
module.exports = models;
```

---

## 🔧 Proposed Solutions

### Solution 1: Use Absolute Path (RECOMMENDED - Safest)

**File**: `/services/socket/landmarksHandler.js`
**Lines**: 181-186

**Change From**:
```javascript
const models = require('../../models');
```

**Change To**:
```javascript
const path = require('path');
const models = require(path.join(__dirname, '../../models'));
```

**Why**:
- Resolves path relative to current file location
- Works regardless of where process.cwd() points
- Consistent with Node.js best practices
- Production-safe in containerized environments

---

### Solution 2: Use Centralized Module Loader

**Create File**: `/models/loader.js`
```javascript
// Singleton pattern - loads models once and caches
let cachedModels = null;

function getModels() {
  if (cachedModels) return cachedModels;

  try {
    cachedModels = require('./index.js');
    if (!cachedModels || !cachedModels.Session) {
      throw new Error('Models not properly exported from index.js');
    }
    return cachedModels;
  } catch (err) {
    console.error('❌ Failed to load models:', err.message);
    throw err;
  }
}

module.exports = { getModels };
```

**Update**: `/services/socket/landmarksHandler.js`
**Lines**: 181-186
```javascript
const { getModels } = require('../models/loader');
const models = getModels();
```

**Why**:
- Single source of truth for module loading
- Prevents circular dependencies
- Easy to add error logging and retry logic
- Can add connection pooling checks

---

### Solution 3: Load Models at Handler Initialization

**Current Pattern** (Bad - loads on every save attempt):
```javascript
setImmediate(async () => {
  const models = require('../../models');  // ← Loaded every time
  // ...
});
```

**Better Pattern** (Cache at top of file):
```javascript
// At top of landmarksHandler.js, after other requires:
const path = require('path');
const models = require(path.join(__dirname, '../../models'));

// Then use it in setImmediate:
setImmediate(async () => {
  try {
    if (!models || !models.Session) {
      console.error('❌ Models not loaded');
      return;
    }
    const sessionRecord = await models.Session.findOne({
      where: { sessionId: session.sessionId }
    });
    // ...
  } catch (dbError) {
    // ...
  }
});
```

**Why**:
- Loads only once when handler is created
- Fails fast if models not available
- Better for WebSocket performance (fire-and-forget shouldn't load modules)

---

### Solution 4: Add Try-Catch with Fallback

If models still fail to load, preserve emotion data in memory:

```javascript
setImmediate(async () => {
  try {
    const models = require('../../models');
    if (!models || !models.Session) {
      console.warn('⚠️ Models unavailable, storing in session memory');
      session.emotionsData = session.emotionsData || [];
      session.emotionsData.push(emotionData);
      return;
    }

    // Normal database save
    const sessionRecord = await models.Session.findOne({
      where: { sessionId: session.sessionId }
    });

    if (!sessionRecord) {
      console.warn('⚠️ Session not found in DB, storing in session memory');
      session.emotionsData = session.emotionsData || [];
      session.emotionsData.push(emotionData);
      return;
    }

    const emotions = sessionRecord.emotionsData || [];
    emotions.push(emotionData);
    await sessionRecord.update({ emotionsData: emotions });

  } catch (dbError) {
    console.warn('⚠️ Database save failed, storing in session memory');
    session.emotionsData = session.emotionsData || [];
    session.emotionsData.push(emotionData);
  }
});
```

Then in `sessionController.js`, check memory before database:
```javascript
// Try database first
let allEmotions = [];
if (sessionRecord?.emotionsData?.length > 0) {
  allEmotions = sessionRecord.emotionsData;
} else if (session.emotionsData?.length > 0) {  // ← Add fallback
  allEmotions = session.emotionsData;
} else if (session.emotions?.length > 0) {
  allEmotions = session.emotions;
}
```

---

## 📝 Implementation Steps

### Immediate Fix (5 mins)
1. Apply **Solution 1** (absolute path) - lowest risk
2. Deploy and test with production logs
3. Verify "Emotion saved to database" appears in logs

### Follow-up Improvements (optional)
1. Add **Solution 2** (centralized loader) for maintainability
2. Add **Solution 4** (fallback) as safety net
3. Remove old require path once stable

---

## 🧪 Verification Steps

After implementing fix:

### 1. Check Logs for Success Messages
```
✅ [CRITICAL] Emotion saved to database: excited
✅ [CRITICAL] Total emotions for session: 1
```

### 2. Verify Database Data
```javascript
// In sessionController.js after session end:
console.log(`📊 Emotions from database:`, sessionRecord.emotionsData);
// Should show array like: [{ emotion: 'excited', timestamp: 1234567890 }, ...]
```

### 3. Verify Session End Response
```json
{
  "success": true,
  "data": {
    "emotionSummary": {
      "primaryEmotion": {
        "emotion": "excited",
        "emotionKo": "흥분",
        "percentage": 100
      },
      "emotionalState": "활발한 상태",
      "trend": "긍정적",
      "positiveRatio": 100,
      "negativeRatio": 0
    }
  }
}
```

### 4. Test End-to-End
```bash
# 1. Start session
# 2. Let analysis run for 2-3 cycles
# 3. Wait for final Gemini response (15s grace period)
# 4. End session
# 5. Check logs for "Emotion saved to database"
# 6. Query: SELECT emotionsData FROM Sessions WHERE sessionId = 'xxx'
# 7. Verify emotionsData array is populated
```

---

## 🔗 Related Code References

**Files to Update**:
- [landmarksHandler.js:181](https://github.com/your-repo/services/socket/landmarksHandler.js#L181) - Module loading
- [sessionController.js:106](https://github.com/your-repo/controllers/sessionController.js#L106) - Reference working pattern
- [models/index.js](https://github.com/your-repo/models/index.js) - Verify exports

**Working Pattern** (Reference):
- `sessionController.js:106` uses `require('../models')` successfully

**Problem Pattern** (Fix Required):
- `landmarksHandler.js:181` uses `require('../../models')` failing with undefined

---

## 📞 Questions for Backend Team

1. Does `require('../../models')` work in other files besides landmarksHandler?
2. Is there a centralized models loader or initialization pattern used elsewhere?
3. Does `/app/models/index.js` export Session correctly?
4. Are there any circular dependencies between models and socket handlers?
5. Has the models directory structure changed recently?

---

## 🚀 Priority

**URGENT**: Fix before next production deployment
This is blocking the core emotion persistence feature. All analysis work is lost without database persistence.

---

**Created**: 2025-10-26
**Status**: Requires backend team action
**Blocking**: Emotion data persistence in production
