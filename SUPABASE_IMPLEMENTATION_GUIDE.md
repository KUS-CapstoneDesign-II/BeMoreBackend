# 🚀 Supabase 구현 가이드 - BeMore 프로젝트

**상태**: ✅ 준비 완료
**대상**: BeMore 감정 분석 시스템 전용 새 Supabase 프로젝트
**기반**: IMPROVED_SCHEMA_V2_1_FIXED.md (모든 ChatGPT 피드백 적용)
**예상 소요 시간**: ~30분 (모든 단계 포함)

---

## 📋 사전 준비사항

### 확인 사항
- [ ] Supabase 계정 생성 완료 (https://supabase.com)
- [ ] BeMore 전용 **새 프로젝트** 생성 준비 (기존 독서 앱 DB와 분리)
- [ ] 웹 브라우저에서 Supabase 대시보드 접속 가능

---

## 🎯 Phase 1: Supabase 프로젝트 생성 (5분)

### Step 1.1: 새 프로젝트 생성

1. **Supabase 대시보드** 접속: https://app.supabase.com
2. **"New project"** 클릭
3. 다음 정보 입력:
   ```
   Project Name: BeMore-EmotionAnalysis
   Database Password: [강력한 비밀번호 저장]
   Region: Asia Pacific (ap-southeast-1) - 서울
   ```
4. **"Create new project"** 클릭
5. ⏳ 2-3분 대기 (프로젝트 프로비저닝)

### Step 1.2: SQL Editor 접속

1. 프로젝트 대시보드 열기
2. 왼쪽 사이드바 → **SQL Editor**
3. **"+ New Query"** 클릭
4. 빈 SQL 에디터 준비

---

## 🔧 Phase 2: 스키마 설정 (15분)

### ⚠️ 중요: 단계별 실행 필수!

**다음 단계들을 순서대로 **하나씩** SQL Editor에서 실행하세요. 한 번에 모두 붙여넣으면 오류 발생!**

---

### Step 0: 확장 설치 (필수 먼저 실행)

**먼저 실행**하고 ✅ 성공 확인 후 다음 단계 진행

```sql
-- ============================================
-- 확장 설치 (필수)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**✅ 실행 후**: 메시지 확인
```
CREATE EXTENSION
```

---

### Step 1: ENUM 타입 정의

```sql
-- ============================================
-- ENUM 타입 정의 (열거형)
-- ============================================

CREATE TYPE emotion_type AS ENUM (
  'happy',
  'sad',
  'angry',
  'anxious',
  'excited',
  'neutral'
);

CREATE TYPE session_status AS ENUM (
  'active',
  'paused',
  'ended'
);

CREATE TYPE counselor_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE language_type AS ENUM (
  'ko',
  'en'
);

CREATE TYPE expertise_level_type AS ENUM (
  'beginner',
  'intermediate',
  'expert'
);
```

---

### Step 2: 공통 트리거 함수 정의

```sql
-- ============================================
-- 공통 트리거 함수: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 공통 트리거 함수: session_id 불변성 강제
-- ============================================
CREATE OR REPLACE FUNCTION forbid_update_session_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id THEN
    RAISE EXCEPTION 'session_id is immutable and cannot be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 공통 트리거 함수: 감사 로깅 (감사 추적)
-- ============================================
CREATE OR REPLACE FUNCTION audit_row()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.bemore_audit_log(
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW),
    COALESCE(auth.uid()::text, 'system'),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

### Step 3: 사용자 및 상담사 테이블

```sql
-- ============================================
-- 1. BeMore 사용자 테이블 (Supabase Auth 연동)
-- ============================================
CREATE TABLE public.bemore_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  phone_encrypted TEXT,  -- pgcrypto 암호화 가능
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_users_auth_user_id ON public.bemore_users(auth_user_id);
CREATE INDEX idx_bemore_users_user_id ON public.bemore_users(user_id);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER t_bemore_users_updated
BEFORE UPDATE ON public.bemore_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 2. 사용자 프로필 테이블 (개인 정보 분리)
-- ============================================
CREATE TABLE public.bemore_user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.bemore_users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  occupation TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_user_profiles_user_id ON public.bemore_user_profiles(user_id);

-- updated_at 트리거
CREATE TRIGGER t_bemore_user_profiles_updated
BEFORE UPDATE ON public.bemore_user_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 3. 상담사 테이블
-- ============================================
CREATE TABLE public.bemore_counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counselor_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  status counselor_status DEFAULT 'active',
  expertise_level expertise_level_type DEFAULT 'intermediate',
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_counselors_auth_user_id ON public.bemore_counselors(auth_user_id);
CREATE INDEX idx_bemore_counselors_counselor_id ON public.bemore_counselors(counselor_id);
CREATE INDEX idx_bemore_counselors_status ON public.bemore_counselors(status);

-- updated_at 트리거
CREATE TRIGGER t_bemore_counselors_updated
BEFORE UPDATE ON public.bemore_counselors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 감사 로깅 트리거
CREATE TRIGGER audit_bemore_counselors
AFTER INSERT OR UPDATE OR DELETE ON public.bemore_counselors
FOR EACH ROW EXECUTE FUNCTION audit_row();

-- ============================================
-- 4. 상담사 특문 분야 (다대다 관계)
-- ============================================
CREATE TABLE public.counselor_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES public.bemore_counselors(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  certification_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_counselor_specialties_counselor_id ON public.counselor_specialties(counselor_id);
```

---

### Step 4: 세션 코어 테이블

```sql
-- ============================================
-- 5. BeMore 세션 테이블 (핵심!)
-- ============================================
CREATE TABLE public.bemore_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.bemore_users(id) ON DELETE CASCADE,
  counselor_id UUID REFERENCES public.bemore_counselors(id) ON DELETE SET NULL,
  status session_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTERVAL GENERATED ALWAYS AS (ended_at - started_at) STORED,

  -- 데이터 저장
  emotions_data JSONB DEFAULT '[]'::jsonb,

  -- 메타데이터
  valid_frames INTEGER DEFAULT 0 CHECK (valid_frames >= 0),
  total_frames INTEGER DEFAULT 0 CHECK (total_frames >= 0),
  average_intensity NUMERIC(5, 2) CHECK (average_intensity BETWEEN 0 AND 100),
  speech_seconds NUMERIC(8, 2) CHECK (speech_seconds >= 0),
  silence_seconds NUMERIC(8, 2) CHECK (silence_seconds >= 0),
  words_count INTEGER CHECK (words_count >= 0),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_sessions_user_id ON public.bemore_sessions(user_id);
CREATE INDEX idx_bemore_sessions_counselor_id ON public.bemore_sessions(counselor_id);
CREATE INDEX idx_bemore_sessions_session_id ON public.bemore_sessions(session_id);
CREATE INDEX idx_bemore_sessions_status ON public.bemore_sessions(status);
CREATE INDEX idx_bemore_sessions_created_at ON public.bemore_sessions(created_at);
CREATE INDEX idx_bemore_sessions_emotions_data ON public.bemore_sessions USING GIN (emotions_data);

-- 트리거
CREATE TRIGGER t_bemore_sessions_updated
BEFORE UPDATE ON public.bemore_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER t_bemore_sessions_sessionid_ro
BEFORE UPDATE ON public.bemore_sessions
FOR EACH ROW EXECUTE FUNCTION forbid_update_session_id();

CREATE TRIGGER audit_bemore_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.bemore_sessions
FOR EACH ROW EXECUTE FUNCTION audit_row();
```

---

### Step 5: 감정 및 메트릭 테이블

```sql
-- ============================================
-- 6. 감정 타임라인 테이블
-- ============================================
CREATE TABLE public.bemore_emotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion emotion_type NOT NULL,
  emotion_ko TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  frame_count INTEGER,
  stt_snippet TEXT,
  intensity NUMERIC(5, 2) CHECK (intensity BETWEEN 0 AND 100),
  confidence_score NUMERIC(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
  vad_score NUMERIC(5, 4) CHECK (vad_score BETWEEN 0 AND 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_emotions_session_id ON public.bemore_emotions(session_id);
CREATE INDEX idx_bemore_emotions_timestamp ON public.bemore_emotions(timestamp);
CREATE INDEX idx_bemore_emotions_emotion ON public.bemore_emotions(emotion);

-- ============================================
-- 7. 세션 메트릭 테이블
-- ============================================
CREATE TABLE public.bemore_session_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  total_duration INTERVAL,
  speech_duration INTERVAL,
  silence_duration INTERVAL,
  total_frames INTEGER CHECK (total_frames >= 0),
  valid_frames INTEGER CHECK (valid_frames >= 0),
  face_detection_rate NUMERIC(5, 2) CHECK (face_detection_rate BETWEEN 0 AND 100),
  speech_ratio NUMERIC(5, 2) CHECK (speech_ratio BETWEEN 0 AND 100),
  words_detected INTEGER CHECK (words_detected >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_session_metrics_session_id ON public.bemore_session_metrics(session_id);

-- 트리거
CREATE TRIGGER t_bemore_session_metrics_updated
BEFORE UPDATE ON public.bemore_session_metrics
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### Step 6: 분석 및 리포트 테이블

```sql
-- ============================================
-- 8. 세션 리포트 테이블
-- ============================================
CREATE TABLE public.bemore_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  emotion_count INTEGER CHECK (emotion_count >= 0),
  primary_emotion emotion_type,
  emotional_state TEXT,
  trend TEXT,
  positive_ratio NUMERIC(5, 2) CHECK (positive_ratio BETWEEN 0 AND 100),
  negative_ratio NUMERIC(5, 2) CHECK (negative_ratio BETWEEN 0 AND 100),
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_reports_session_id ON public.bemore_reports(session_id);

-- 트리거
CREATE TRIGGER t_bemore_reports_updated
BEFORE UPDATE ON public.bemore_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 9. 세션 효과성 평가 테이블
-- ============================================
CREATE TABLE public.bemore_session_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  counselor_assessment TEXT,
  user_feedback TEXT,
  recommendation TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  assessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_session_assessments_session_id ON public.bemore_session_assessments(session_id);

-- 트리거
CREATE TRIGGER t_bemore_session_assessments_updated
BEFORE UPDATE ON public.bemore_session_assessments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### Step 7: 피드백 및 설정 테이블

```sql
-- ============================================
-- 10. 피드백 테이블
-- ============================================
CREATE TABLE public.bemore_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.bemore_sessions(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_feedback_session_id ON public.bemore_feedback(session_id);

-- 트리거
CREATE TRIGGER audit_bemore_feedback
AFTER INSERT ON public.bemore_feedback
FOR EACH ROW EXECUTE FUNCTION audit_row();

-- ============================================
-- 11. 사용자 설정 테이블
-- ============================================
CREATE TABLE public.bemore_user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.bemore_users(id) ON DELETE CASCADE,
  language language_type DEFAULT 'ko',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light',
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_user_preferences_user_id ON public.bemore_user_preferences(user_id);

-- 트리거
CREATE TRIGGER t_bemore_user_preferences_updated
BEFORE UPDATE ON public.bemore_user_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

### Step 8: 감정 월별 요약 및 감사 로그

```sql
-- ============================================
-- 12. 감정 월별 요약 테이블 (분석 최적화)
-- ============================================
CREATE TABLE public.bemore_emotion_monthly_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.bemore_users(id) ON DELETE CASCADE,
  year_month DATE NOT NULL,
  total_sessions INTEGER CHECK (total_sessions >= 0),
  total_emotions INTEGER CHECK (total_emotions >= 0),
  happy_count INTEGER CHECK (happy_count >= 0),
  sad_count INTEGER CHECK (sad_count >= 0),
  angry_count INTEGER CHECK (angry_count >= 0),
  anxious_count INTEGER CHECK (anxious_count >= 0),
  excited_count INTEGER CHECK (excited_count >= 0),
  neutral_count INTEGER CHECK (neutral_count >= 0),
  average_intensity NUMERIC(5, 2) CHECK (average_intensity BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, year_month)
);

-- 인덱스
CREATE INDEX idx_bemore_emotion_monthly_summary_user_id ON public.bemore_emotion_monthly_summary(user_id);
CREATE INDEX idx_bemore_emotion_monthly_summary_year_month ON public.bemore_emotion_monthly_summary(year_month);

-- ============================================
-- 13. 감사 로그 테이블 (감시 추적)
-- ============================================
CREATE TABLE public.bemore_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_bemore_audit_log_table_name ON public.bemore_audit_log(table_name);
CREATE INDEX idx_bemore_audit_log_record_id ON public.bemore_audit_log(record_id);
CREATE INDEX idx_bemore_audit_log_changed_at ON public.bemore_audit_log(changed_at);
CREATE INDEX idx_bemore_audit_log_operation ON public.bemore_audit_log(operation);
```

---

## 🔐 Phase 3: Row Level Security (RLS) 설정 (5분)

### Step 9: RLS 활성화

```sql
-- ============================================
-- RLS 활성화 (모든 테이블)
-- ============================================
ALTER TABLE public.bemore_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_counselors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_session_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bemore_user_preferences ENABLE ROW LEVEL SECURITY;
```

---

### Step 10: RLS 정책 설정

```sql
-- ============================================
-- bemore_users RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 정보만 조회 가능"
  ON public.bemore_users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "사용자는 자신의 정보만 수정 가능"
  ON public.bemore_users
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- ============================================
-- bemore_user_profiles RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 프로필만 조회 가능"
  ON public.bemore_user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bemore_users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 프로필만 수정 가능"
  ON public.bemore_user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bemore_users
      WHERE id = user_id AND auth_user_id = auth.uid()
    )
  );

-- ============================================
-- bemore_sessions RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 세션만 조회 가능"
  ON public.bemore_sessions
  FOR SELECT
  USING (
    user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
    OR counselor_id = (SELECT id FROM public.bemore_counselors WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "사용자는 자신의 세션만 수정 가능"
  ON public.bemore_sessions
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
  );

-- ============================================
-- bemore_emotions RLS 정책 (자신의 세션 감정만)
-- ============================================
CREATE POLICY "사용자는 자신의 세션 감정만 조회 가능"
  ON public.bemore_emotions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bemore_sessions
      WHERE id = session_id AND (
        user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
        OR counselor_id = (SELECT id FROM public.bemore_counselors WHERE auth_user_id = auth.uid())
      )
    )
  );

-- ============================================
-- bemore_reports RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 리포트만 조회 가능"
  ON public.bemore_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bemore_sessions
      WHERE id = session_id AND (
        user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
        OR counselor_id = (SELECT id FROM public.bemore_counselors WHERE auth_user_id = auth.uid())
      )
    )
  );

-- ============================================
-- bemore_feedback RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 피드백만 삽입 가능"
  ON public.bemore_feedback
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bemore_sessions
      WHERE id = session_id AND user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "사용자는 자신의 피드백만 조회 가능"
  ON public.bemore_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bemore_sessions
      WHERE id = session_id AND user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
    )
  );

-- ============================================
-- bemore_user_preferences RLS 정책
-- ============================================
CREATE POLICY "사용자는 자신의 설정만 조회 가능"
  ON public.bemore_user_preferences
  FOR SELECT
  USING (
    user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "사용자는 자신의 설정만 수정 가능"
  ON public.bemore_user_preferences
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM public.bemore_users WHERE auth_user_id = auth.uid())
  );
```

---

## ✅ Phase 4: 검증 및 테스트 (5분)

### Step 11: 테이블 생성 확인

Supabase 대시보드의 **Table Editor**에서 다음 테이블 확인:

```
✅ bemore_users
✅ bemore_user_profiles
✅ bemore_counselors
✅ counselor_specialties
✅ bemore_sessions
✅ bemore_emotions
✅ bemore_session_metrics
✅ bemore_reports
✅ bemore_session_assessments
✅ bemore_feedback
✅ bemore_user_preferences
✅ bemore_emotion_monthly_summary
✅ bemore_audit_log
```

### Step 12: 연결 문자열 복사

1. **Project Settings** → **Database**
2. **Connection pooling** 섹션 찾기
3. 연결 문자열 복사:
   ```
   postgresql://[user]:[password]@[host]:5432/postgres?schema=public
   ```
4. 안전한 곳에 저장 (다음 단계에서 필요)

---

## 🔌 Phase 5: Backend 연동 (5분)

### Step 13: 로컬 .env 파일 업데이트

프로젝트 루트에 `.env` 파일 수정:

```bash
# Database Configuration
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/postgres?schema=public"

# 기존 설정 유지
NODE_ENV=development
PORT=8000
GOOGLE_API_KEY=your_gemini_api_key
```

### Step 14: Sequelize 설정 확인

[config/database.js](config/database.js) 확인:

```javascript
module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    protocol: 'postgresql',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
```

### Step 15: 로컬 테스트

```bash
# 기존 서버 종료
pkill -f "npm run dev"

# 새 DATABASE_URL 환경 적용
export DATABASE_URL="postgresql://..."

# 서버 시작
npm run dev
```

**예상 결과**:
```
✅ [DATABASE] Connected to Supabase PostgreSQL
✅ [SERVER] Running on http://localhost:8000
```

### Step 16: API 테스트

```bash
# 세션 생성 테스트
curl -X POST http://localhost:8000/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","counselorId":"test_counselor"}'

# 응답 예시
{
  "success": true,
  "sessionId": "sess_...",
  "startedAt": 1761390973946
}
```

---

## 🚀 Phase 6: Render 배포 (5분)

### Step 17: Render 환경 변수 설정

1. **Render Dashboard** 접속
2. BeMore Backend 서비스 선택
3. **Environment** 탭
4. 새 환경 변수 추가:
   ```
   Key: DATABASE_URL
   Value: [Supabase 연결 문자열]
   ```
5. **Save** 클릭

### Step 18: Render 배포

**방법 A: 자동 배포**
```bash
git add .
git commit -m "chore: update database to Supabase"
git push origin main
```

**방법 B: 수동 배포**
1. Render Dashboard
2. **Deploys** 탭
3. **Create Deploy** 클릭

### Step 19: 프로덕션 검증

2분 대기 후:

```bash
# 서버 상태 확인
curl https://bemore-backend.onrender.com/health | python3 -m json.tool

# 예상 결과
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

---

## 📋 최종 체크리스트

### Supabase 설정
- [ ] 새 프로젝트 생성 완료
- [ ] Step 0-8 모든 SQL 실행 완료
- [ ] 13개 테이블 생성 확인
- [ ] RLS 활성화 및 정책 설정 완료
- [ ] 연결 문자열 복사 완료

### Backend 연동
- [ ] .env 파일 DATABASE_URL 설정
- [ ] [config/database.js](config/database.js) 확인
- [ ] 로컬 `npm run dev` 테스트 성공
- [ ] 세션 생성 API 테스트 성공

### Render 배포
- [ ] DATABASE_URL 환경 변수 설정
- [ ] 코드 배포 완료
- [ ] `/health` 엔드포인트 응답 확인
- [ ] 프로덕션 세션 생성 테스트 성공

---

## 🎯 다음 단계

### 즉시 진행
1. ✅ Supabase 프로젝트 생성 및 스키마 설정
2. ✅ Backend DATABASE_URL 연동
3. ✅ Render 환경 변수 설정 및 배포

### 향후 작업
- Frontend Supabase 설정 (별도 가이드)
- 모니터링 및 백업 설정
- 성능 최적화 (인덱스, 캐싱)
- 프로덕션 데이터 마이그레이션

---

**Status**: ✅ 모든 단계 준비 완료
**예상 소요 시간**: 30분 (모든 Phase 포함)
**다음**: Supabase 프로젝트 생성 시작!

