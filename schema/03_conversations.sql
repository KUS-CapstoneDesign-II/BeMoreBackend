-- ================================================
-- Conversations Table
-- ================================================
-- Purpose: Store AI counseling conversation history
-- Version: 1.0.0
-- Created: 2025-01-10
-- ================================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(64) NOT NULL REFERENCES sessions("sessionId") ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  emotion VARCHAR(20) CHECK (emotion IN ('anxious', 'sad', 'angry', 'happy', 'neutral', 'fearful', 'disgusted', 'surprised')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE conversations IS 'AI counseling conversation history';
COMMENT ON COLUMN conversations.id IS 'Primary key (UUID)';
COMMENT ON COLUMN conversations.session_id IS 'Foreign key to sessions table';
COMMENT ON COLUMN conversations.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN conversations.content IS 'Message content (user input or AI response)';
COMMENT ON COLUMN conversations.emotion IS 'Detected emotion for the message (optional)';
COMMENT ON COLUMN conversations.created_at IS 'Message timestamp';
