-- Migration: Fix sessions table column naming convention
-- Date: 2025-01-11
-- Purpose: Align Supabase column names with code expectations (snake_case)
-- Impact: Resolves "column sessions.session_id does not exist" errors

-- Step 1: Rename camelCase columns to snake_case
ALTER TABLE sessions RENAME COLUMN "sessionId" TO session_id;
ALTER TABLE sessions RENAME COLUMN "userId" TO user_id;
ALTER TABLE sessions RENAME COLUMN "counselorId" TO counselor_id;
ALTER TABLE sessions RENAME COLUMN "startedAt" TO started_at;
ALTER TABLE sessions RENAME COLUMN "endedAt" TO ended_at;
ALTER TABLE sessions RENAME COLUMN "emotionsData" TO emotions_data;
ALTER TABLE sessions RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE sessions RENAME COLUMN "updatedAt" TO updated_at;

-- Step 2: Verify foreign key constraints are intact
-- conversations table references sessions.session_id
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'sessions' OR ccu.table_name = 'sessions');

-- Verification query (run after migration)
-- Expected output: All column names should be snake_case
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
