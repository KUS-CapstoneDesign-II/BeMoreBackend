-- Migration: Create counseling_sessions table (avoiding auth.sessions conflict)
-- Date: 2025-01-11
-- Purpose: Replace sessions table with counseling_sessions to avoid Supabase Auth conflict
-- Impact: Resolves table schema conflicts and enables proper session management

-- Step 1: Drop existing conversations table (has FK to sessions)
DROP TABLE IF EXISTS conversations CASCADE;

-- Step 2: Drop existing sessions table (conflicting with auth.sessions)
DROP TABLE IF EXISTS sessions CASCADE;

-- Step 3: Create new counseling_sessions table
CREATE TABLE counseling_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  counselor_id INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  emotions_data JSONB,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'interrupted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_counseling_sessions_session_id ON counseling_sessions(session_id);
CREATE INDEX idx_counseling_sessions_user_id ON counseling_sessions(user_id);
CREATE INDEX idx_counseling_sessions_created_at ON counseling_sessions(created_at DESC);

-- Step 5: Add comments for documentation
COMMENT ON TABLE counseling_sessions IS 'AI counseling sessions (renamed from sessions to avoid auth.sessions conflict)';
COMMENT ON COLUMN counseling_sessions.id IS 'Primary key (auto-increment)';
COMMENT ON COLUMN counseling_sessions.session_id IS 'Unique session identifier (VARCHAR)';
COMMENT ON COLUMN counseling_sessions.user_id IS 'User ID (foreign key to users table)';
COMMENT ON COLUMN counseling_sessions.counselor_id IS 'Counselor ID (optional)';
COMMENT ON COLUMN counseling_sessions.started_at IS 'Session start time';
COMMENT ON COLUMN counseling_sessions.ended_at IS 'Session end time';
COMMENT ON COLUMN counseling_sessions.duration IS 'Session duration in seconds';
COMMENT ON COLUMN counseling_sessions.emotions_data IS 'Emotion analysis data (JSON)';
COMMENT ON COLUMN counseling_sessions.status IS 'Session status: active, ended, interrupted';
COMMENT ON COLUMN counseling_sessions.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN counseling_sessions.updated_at IS 'Record last update timestamp';

-- Step 6: Recreate conversations table with correct FK reference
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(64) NOT NULL REFERENCES counseling_sessions(session_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion VARCHAR(20) CHECK (emotion IN ('anxious', 'sad', 'angry', 'happy', 'neutral', 'fearful', 'disgusted', 'surprised')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create indexes for conversations
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Step 8: Add comments for conversations
COMMENT ON TABLE conversations IS 'AI counseling conversation history';
COMMENT ON COLUMN conversations.id IS 'Primary key (UUID)';
COMMENT ON COLUMN conversations.session_id IS 'Foreign key to counseling_sessions.session_id';
COMMENT ON COLUMN conversations.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN conversations.content IS 'Message content (user input or AI response)';
COMMENT ON COLUMN conversations.emotion IS 'Detected emotion: anxious, sad, angry, happy, neutral, fearful, disgusted, surprised';
COMMENT ON COLUMN conversations.created_at IS 'Message timestamp';

-- Verification query (run after migration)
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('counseling_sessions', 'conversations')
ORDER BY table_name, ordinal_position;
