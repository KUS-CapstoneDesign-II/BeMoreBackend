-- ============================================================
-- BeMore Backend - 초기 스키마 생성 스크립트
-- ============================================================
-- 작성일: 2025-01-10
-- 용도: Supabase PostgreSQL 데이터베이스 초기화
-- 실행 위치: Supabase Dashboard → SQL Editor
-- ============================================================

-- 기존 테이블 삭제 (주의: 모든 데이터 삭제!)
DROP TABLE IF EXISTS "feedbacks" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "reports" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "counselings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- ============================================================
-- 1. Users 테이블
-- ============================================================
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "refreshToken" VARCHAR(500),
  "name" VARCHAR(100),
  "profileImage" VARCHAR(255),
  "role" VARCHAR(20) DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users 인덱스
CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE INDEX "idx_users_email" ON "users" ("email");
CREATE INDEX "idx_users_created_at" ON "users" ("createdAt");

-- ============================================================
-- 2. Counselings 테이블
-- ============================================================
CREATE TABLE "counselings" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(50),
  "status" VARCHAR(20) DEFAULT 'pending',
  "notes" TEXT,
  "scheduledAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Counselings 인덱스
CREATE INDEX "idx_counselings_user_id" ON "counselings" ("userId");
CREATE INDEX "idx_counselings_status" ON "counselings" ("status");
CREATE INDEX "idx_counselings_scheduled_at" ON "counselings" ("scheduledAt");

-- ============================================================
-- 3. Sessions 테이블
-- ============================================================
CREATE TABLE "sessions" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL UNIQUE,
  "userId" VARCHAR(64) NOT NULL,
  "counselorId" VARCHAR(64),
  "status" VARCHAR(20) DEFAULT 'active' CHECK ("status" IN ('active', 'paused', 'ended')),
  "startedAt" BIGINT NOT NULL,
  "endedAt" BIGINT,
  "duration" INTEGER,
  "counters" JSONB DEFAULT '{}',
  "emotionsData" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions 인덱스
CREATE UNIQUE INDEX "idx_sessions_session_id" ON "sessions" ("sessionId");
CREATE INDEX "idx_sessions_user_id" ON "sessions" ("userId");
CREATE INDEX "idx_sessions_created_at" ON "sessions" ("createdAt");
CREATE INDEX "idx_sessions_user_started" ON "sessions" ("userId", "startedAt");
CREATE INDEX "idx_sessions_user_ended" ON "sessions" ("userId", "endedAt");

-- ============================================================
-- 4. Reports 테이블
-- ============================================================
CREATE TABLE "reports" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" VARCHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "reportType" VARCHAR(50) DEFAULT 'session_summary',
  "emotionSummary" JSONB,
  "cbtSummary" JSONB,
  "recommendations" TEXT,
  "generatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports 인덱스
CREATE INDEX "idx_reports_session_id" ON "reports" ("sessionId");
CREATE INDEX "idx_reports_user_id" ON "reports" ("userId");
CREATE INDEX "idx_reports_generated_at" ON "reports" ("generatedAt");

-- ============================================================
-- 5. UserPreferences 테이블
-- ============================================================
CREATE TABLE "user_preferences" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "language" VARCHAR(10) DEFAULT 'ko',
  "theme" VARCHAR(20) DEFAULT 'light',
  "notifications" BOOLEAN DEFAULT true,
  "preferences" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- UserPreferences 인덱스
CREATE UNIQUE INDEX "idx_user_preferences_user_id" ON "user_preferences" ("userId");

-- ============================================================
-- 6. Feedbacks 테이블
-- ============================================================
CREATE TABLE "feedbacks" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "sessionId" VARCHAR(64),
  "rating" INTEGER CHECK ("rating" >= 1 AND "rating" <= 5),
  "comment" TEXT,
  "category" VARCHAR(50),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feedbacks 인덱스
CREATE INDEX "idx_feedbacks_user_id" ON "feedbacks" ("userId");
CREATE INDEX "idx_feedbacks_session_id" ON "feedbacks" ("sessionId");
CREATE INDEX "idx_feedbacks_created_at" ON "feedbacks" ("createdAt");

-- ============================================================
-- 완료 메시지
-- ============================================================
SELECT 'BeMore Backend 스키마 초기화 완료!' AS status;
