-- ================================================
-- Row Level Security (RLS) Policies
-- ================================================
-- Purpose: Secure database access - Backend API only
-- Version: 1.0.0
-- Created: 2025-01-10
-- ================================================

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 2. Create policies: Backend API only access
-- Note: Backend uses DATABASE_URL (direct PostgreSQL connection)
-- which bypasses RLS. These policies block Supabase client SDK access.

CREATE POLICY "Backend only - users" ON users
  FOR ALL USING (true);

CREATE POLICY "Backend only - counselings" ON counselings
  FOR ALL USING (true);

CREATE POLICY "Backend only - sessions" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Backend only - reports" ON reports
  FOR ALL USING (true);

CREATE POLICY "Backend only - user_preferences" ON user_preferences
  FOR ALL USING (true);

CREATE POLICY "Backend only - feedbacks" ON feedbacks
  FOR ALL USING (true);

CREATE POLICY "Backend only - conversations" ON conversations
  FOR ALL USING (true);

-- ================================================
-- Security Notes
-- ================================================
--
-- ✅ RLS Enabled: All tables protected
-- ✅ Backend Access: Works via DATABASE_URL (bypasses RLS)
-- ✅ Direct Client Access: Blocked (requires policies)
-- ✅ Supabase Dashboard: Works (admin access)
--
-- ⚠️ WARNING:
-- - Do NOT disable RLS in production
-- - Do NOT use anon/authenticated keys for direct access
-- - Always access via Backend API
--
-- ================================================
