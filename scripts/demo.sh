#!/bin/bash

################################################################################
# 🎯 BeMore Backend - 멀티모달 세션 라이프사이클 데모 테스트 (Bash)
#
# 이 스크립트는 다음을 시연합니다:
# 1. 세션 생성
# 2. 멀티모달 데이터 배치 업로드
# 3. 1분 주기 멀티모달 결합 분석
# 4. 결과 조회
# 5. 세션 종료
#
# 사용법: bash scripts/demo.sh [--short|--long]
#   --short: 5분 세션 (기본값)
#   --long: 30분 세션 (더 많은 데이터)
################################################################################

set -e

# 설정
BASE_URL="http://localhost:8000"
USER_ID="user_demo_001"
COUNSELOR_ID="counselor_demo_001"
SESSION_DURATION="${1:---short}"

# 색상 출력 함수
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_step() {
  echo -e "${BLUE}📌 $1${NC}"
}

################################################################################
# 1️⃣ 세션 생성
################################################################################

log_step "Step 1: 세션 생성"

SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"counselorId\": \"$COUNSELOR_ID\"
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
SESSION_STARTED_AT=$(echo "$SESSION_RESPONSE" | grep -o '"startedAt":[0-9]*' | cut -d':' -f2)

if [ -z "$SESSION_ID" ]; then
  log_error "세션 생성 실패"
  echo "$SESSION_RESPONSE"
  exit 1
fi

log_info "세션 생성 완료: $SESSION_ID"
echo "  시작 시간: $SESSION_STARTED_AT"

################################################################################
# 2️⃣ 멀티모달 데이터 배치 업로드
################################################################################

log_step "Step 2: 멀티모달 데이터 업로드"

# 표정 프레임 업로드
log_info "표정 프레임 업로드..."
FRAMES_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/$SESSION_ID/frames" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"ts": 1000, "faceLandmarksCompressed": "landmarks_001", "qualityScore": 0.92},
      {"ts": 2000, "faceLandmarksCompressed": "landmarks_002", "qualityScore": 0.88},
      {"ts": 3000, "faceLandmarksCompressed": "landmarks_003", "qualityScore": 0.95},
      {"ts": 4000, "faceLandmarksCompressed": "landmarks_004", "qualityScore": 0.87},
      {"ts": 5000, "faceLandmarksCompressed": "landmarks_005", "qualityScore": 0.90},
      {"ts": 6000, "faceLandmarksCompressed": "landmarks_006", "qualityScore": 0.91},
      {"ts": 7000, "faceLandmarksCompressed": "landmarks_007", "qualityScore": 0.89},
      {"ts": 8000, "faceLandmarksCompressed": "landmarks_008", "qualityScore": 0.93},
      {"ts": 9000, "faceLandmarksCompressed": "landmarks_009", "qualityScore": 0.85},
      {"ts": 10000, "faceLandmarksCompressed": "landmarks_010", "qualityScore": 0.88}
    ]
  }')

FRAME_COUNT=$(echo "$FRAMES_RESPONSE" | grep -o '"frameCount":[0-9]*' | cut -d':' -f2)
log_info "프레임 업로드: $FRAME_COUNT개"

# 음성 청크 업로드
log_info "음성 청크 업로드..."
AUDIO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/$SESSION_ID/audio" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"tsStart": 1000, "tsEnd": 2000, "vad": true, "rms": 0.65, "pitch": 120.5},
      {"tsStart": 2000, "tsEnd": 3000, "vad": true, "rms": 0.70, "pitch": 125.0},
      {"tsStart": 3000, "tsEnd": 4000, "vad": false, "rms": 0.15, "pitch": null},
      {"tsStart": 4000, "tsEnd": 5000, "vad": true, "rms": 0.68, "pitch": 118.5},
      {"tsStart": 5000, "tsEnd": 6000, "vad": true, "rms": 0.72, "pitch": 128.0},
      {"tsStart": 6000, "tsEnd": 7000, "vad": false, "rms": 0.10, "pitch": null},
      {"tsStart": 7000, "tsEnd": 8000, "vad": true, "rms": 0.66, "pitch": 122.5},
      {"tsStart": 8000, "tsEnd": 9000, "vad": true, "rms": 0.71, "pitch": 126.0},
      {"tsStart": 9000, "tsEnd": 10000, "vad": true, "rms": 0.69, "pitch": 124.0},
      {"tsStart": 10000, "tsEnd": 11000, "vad": false, "rms": 0.12, "pitch": null}
    ]
  }')

AUDIO_COUNT=$(echo "$AUDIO_RESPONSE" | grep -o '"audioChunkCount":[0-9]*' | cut -d':' -f2)
log_info "음성 청크 업로드: $AUDIO_COUNT개"

# STT 스니펫 업로드
log_info "STT 스니펫 업로드..."
STT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/$SESSION_ID/stt" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"tsStart": 1000, "tsEnd": 2500, "text": "안녕하세요, 오늘 어떻게 지내세요?", "lang": "ko"},
      {"tsStart": 4000, "tsEnd": 5500, "text": "좋은 하루였어요", "lang": "ko"},
      {"tsStart": 7000, "tsEnd": 8500, "text": "감사합니다, 정말 도움이 되었어요", "lang": "ko"},
      {"tsStart": 9000, "tsEnd": 10000, "text": "네, 알겠습니다", "lang": "ko"},
      {"tsStart": 11000, "tsEnd": 12000, "text": "또 뵐게요", "lang": "ko"}
    ]
  }')

STT_COUNT=$(echo "$STT_RESPONSE" | grep -o '"sttSnippetCount":[0-9]*' | cut -d':' -f2)
log_info "STT 스니펫 업로드: $STT_COUNT개"

################################################################################
# 3️⃣ 1분 주기 멀티모달 결합 분석 (tick)
################################################################################

log_step "Step 3: 1분 주기 분석 (tick)"

log_info "분석 실행: minute 0 (0-60초)..."
INFERENCE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/$SESSION_ID/tick" \
  -H "Content-Type: application/json" \
  -d '{
    "minuteIndex": 0
  }')

FACIAL_SCORE=$(echo "$INFERENCE_RESPONSE" | grep -o '"facialScore":[0-9.]*' | cut -d':' -f2)
VAD_SCORE=$(echo "$INFERENCE_RESPONSE" | grep -o '"vadScore":[0-9.]*' | cut -d':' -f2)
TEXT_SENTIMENT=$(echo "$INFERENCE_RESPONSE" | grep -o '"textSentiment":[0-9.]*' | cut -d':' -f2)
COMBINED_SCORE=$(echo "$INFERENCE_RESPONSE" | grep -o '"combinedScore":[0-9.]*' | cut -d':' -f2)

log_info "분석 완료 (minute 0):"
echo "  - Facial Score:   $FACIAL_SCORE"
echo "  - VAD Score:      $VAD_SCORE"
echo "  - Text Sentiment: $TEXT_SENTIMENT"
echo "  - Combined Score: $COMBINED_SCORE"

################################################################################
# 4️⃣ 추론 결과 조회
################################################################################

log_step "Step 4: 추론 결과 및 통계 조회"

INFERENCES=$(curl -s -X GET "$BASE_URL/api/session/$SESSION_ID/inferences" \
  -H "Content-Type: application/json")

TOTAL_MINUTES=$(echo "$INFERENCES" | grep -o '"totalMinutes":[0-9]*' | cut -d':' -f2)
AVG_COMBINED=$(echo "$INFERENCES" | grep -o '"avgCombinedScore":[0-9.]*' | cut -d':' -f2)
AVG_FACIAL=$(echo "$INFERENCES" | grep -o '"avgFacialScore":[0-9.]*' | cut -d':' -f2)
AVG_VAD=$(echo "$INFERENCES" | grep -o '"avgVadScore":[0-9.]*' | cut -d':' -f2)
AVG_TEXT=$(echo "$INFERENCES" | grep -o '"avgTextSentiment":[0-9.]*' | cut -d':' -f2)

log_info "통계:"
echo "  - Total Minutes:     $TOTAL_MINUTES"
echo "  - Avg Combined:      $AVG_COMBINED"
echo "  - Avg Facial:        $AVG_FACIAL"
echo "  - Avg VAD:           $AVG_VAD"
echo "  - Avg Text:          $AVG_TEXT"

################################################################################
# 5️⃣ 세션 종료 및 최종 리포트
################################################################################

log_step "Step 5: 세션 종료 (30초 대기)"
log_warning "최종 감정 데이터 수집을 위해 30초 대기 중..."

END_RESPONSE=$(curl -s -X POST "$BASE_URL/api/session/$SESSION_ID/end" \
  -H "Content-Type: application/json")

END_STATUS=$(echo "$END_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
FINAL_EMOTION_COUNT=$(echo "$END_RESPONSE" | grep -o '"emotionCount":[0-9]*' | cut -d':' -f2)
FINAL_DURATION=$(echo "$END_RESPONSE" | grep -o '"duration":[0-9]*' | cut -d':' -f2)

log_info "세션 종료 완료:"
echo "  - Status:        $END_STATUS"
echo "  - Duration:      ${FINAL_DURATION}ms"
echo "  - Emotion Count: $FINAL_EMOTION_COUNT"

################################################################################
# 📊 최종 요약
################################################################################

echo ""
echo "================================================================================"
log_info "테스트 완료!"
echo "================================================================================"
echo ""
echo "📊 최종 결과:"
echo "  ✓ Session ID:     $SESSION_ID"
echo "  ✓ Frames:         $FRAME_COUNT개 업로드"
echo "  ✓ Audio Chunks:   $AUDIO_COUNT개 업로드"
echo "  ✓ STT Snippets:   $STT_COUNT개 업로드"
echo "  ✓ Inferences:     $TOTAL_MINUTES분 분석"
echo "  ✓ Combined Score: $AVG_COMBINED (평균)"
echo "  ✓ Final Status:   $END_STATUS"
echo ""
echo "📌 세션 데이터 조회:"
echo "  curl http://localhost:8000/api/session/$SESSION_ID"
echo ""
echo "📋 최종 리포트 조회:"
echo "  curl http://localhost:8000/api/session/$SESSION_ID/report"
echo ""
echo "================================================================================"
