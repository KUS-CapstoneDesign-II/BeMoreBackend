#!/bin/bash

# BeMore 세션 관리 시스템 테스트 스크립트

echo "========================================="
echo "🧪 BeMore 세션 관리 시스템 테스트"
echo "========================================="
echo ""

BASE_URL="http://localhost:8000"

# 색상 코드
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 세션 시작 테스트
echo "1️⃣  세션 시작 테스트"
echo "-------------------"
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "counselorId": "test_counselor_001"
  }')

echo "$RESPONSE" | jq '.'

# sessionId 추출
SESSION_ID=$(echo "$RESPONSE" | jq -r '.data.sessionId')

if [ "$SESSION_ID" != "null" ]; then
  echo -e "${GREEN}✅ 세션 생성 성공: $SESSION_ID${NC}"
else
  echo -e "${RED}❌ 세션 생성 실패${NC}"
  exit 1
fi

echo ""
sleep 1

# 2. 세션 조회 테스트
echo "2️⃣  세션 조회 테스트"
echo "-------------------"
curl -s ${BASE_URL}/api/session/${SESSION_ID} | jq '.'
echo -e "${GREEN}✅ 세션 조회 성공${NC}"
echo ""
sleep 1

# 3. 세션 일시정지 테스트
echo "3️⃣  세션 일시정지 테스트"
echo "-------------------"
curl -s -X POST ${BASE_URL}/api/session/${SESSION_ID}/pause | jq '.'
echo -e "${YELLOW}⏸️  세션 일시정지 성공${NC}"
echo ""
sleep 2

# 4. 세션 재개 테스트
echo "4️⃣  세션 재개 테스트"
echo "-------------------"
curl -s -X POST ${BASE_URL}/api/session/${SESSION_ID}/resume | jq '.'
echo -e "${GREEN}▶️  세션 재개 성공${NC}"
echo ""
sleep 1

# 5. 세션 통계 조회
echo "5️⃣  세션 통계 조회"
echo "-------------------"
curl -s ${BASE_URL}/api/session/stats/summary | jq '.'
echo -e "${GREEN}✅ 통계 조회 성공${NC}"
echo ""
sleep 1

# 6. 세션 종료 테스트
echo "6️⃣  세션 종료 테스트"
echo "-------------------"
curl -s -X POST ${BASE_URL}/api/session/${SESSION_ID}/end | jq '.'
echo -e "${GREEN}✅ 세션 종료 성공${NC}"
echo ""
sleep 1

# 7. 종료된 세션 재조회
echo "7️⃣  종료된 세션 확인"
echo "-------------------"
curl -s ${BASE_URL}/api/session/${SESSION_ID} | jq '.'
echo ""

# 8. 에러 케이스 테스트
echo "8️⃣  에러 케이스 테스트"
echo "-------------------"
echo "8-1. 잘못된 입력 (userId 누락)"
curl -s -X POST ${BASE_URL}/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"counselorId": "test"}' | jq '.'
echo ""

echo "8-2. 존재하지 않는 세션 조회"
curl -s ${BASE_URL}/api/session/invalid_session_id | jq '.'
echo ""

echo "8-3. 종료된 세션 일시정지 시도"
curl -s -X POST ${BASE_URL}/api/session/${SESSION_ID}/pause | jq '.'
echo ""

echo "========================================="
echo -e "${GREEN}✅ 모든 테스트 완료!${NC}"
echo "========================================="
