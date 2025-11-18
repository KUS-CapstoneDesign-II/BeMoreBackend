-- ============================================================
-- Database Schema Verification for CBT API v1.3.0
-- ============================================================
-- Purpose: Verify cbtSummary column exists in reports table
-- Execute in: Supabase Dashboard → SQL Editor
-- Date: 2025-11-18
-- ============================================================

-- 1. Verify cbtSummary column exists
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reports'
  AND column_name = 'cbtSummary';

-- Expected Output:
-- column_name  | data_type | is_nullable | column_default
-- -------------+-----------+-------------+----------------
-- cbtSummary   | jsonb     | YES         | NULL

-- ============================================================

-- 2. Check if any reports have cbtSummary data
SELECT
  COUNT(*) as total_reports,
  COUNT("cbtSummary") as reports_with_cbt_data,
  ROUND(
    (COUNT("cbtSummary")::numeric / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as percentage_with_data
FROM reports;

-- Expected Output:
-- total_reports | reports_with_cbt_data | percentage_with_data
-- --------------+-----------------------+---------------------
-- (varies)      | (varies)              | (varies)

-- ============================================================

-- 3. Sample recent reports with CBT data
SELECT
  id,
  "sessionId",
  "reportType",
  "generatedAt",
  CASE
    WHEN "cbtSummary" IS NOT NULL THEN 'Has CBT Data'
    ELSE 'No CBT Data'
  END as cbt_status,
  jsonb_typeof("cbtSummary") as cbt_data_type,
  (
    SELECT COUNT(*)
    FROM jsonb_object_keys("cbtSummary")
  ) as cbt_field_count
FROM reports
ORDER BY "generatedAt" DESC
LIMIT 10;

-- Expected Output: Recent reports with 'Has CBT Data' status

-- ============================================================

-- 4. Verify CBT data structure (if data exists)
SELECT
  "sessionId",
  "cbtSummary" -> 'totalDistortions' as total_distortions,
  "cbtSummary" -> 'totalInterventions' as total_interventions,
  "cbtSummary" -> 'mostCommonDistortion' as most_common,
  "generatedAt"
FROM reports
WHERE "cbtSummary" IS NOT NULL
ORDER BY "generatedAt" DESC
LIMIT 5;

-- Expected Output: CBT summary data with totalDistortions, totalInterventions, mostCommonDistortion

-- ============================================================

-- 5. Full table schema for reports
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reports'
ORDER BY ordinal_position;

-- Expected Output: All columns including cbtSummary

-- ============================================================
-- Verification Summary
-- ============================================================
-- ✅ cbtSummary column should exist with type 'jsonb'
-- ✅ New reports (after deployment) should have cbtSummary data
-- ✅ CBT data structure should match:
--    {
--      "totalDistortions": number,
--      "totalInterventions": number,
--      "mostCommonDistortion": {
--        "type": string,
--        "name_ko": string,
--        "count": number
--      } | null,
--      "distortionDistribution": object
--    }
-- ============================================================
