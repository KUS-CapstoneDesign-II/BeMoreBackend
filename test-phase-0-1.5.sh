#!/bin/bash

# Phase 0-1.5 Quick Test Script
# Usage: ./test-phase-0-1.5.sh [base_url]
# Example: ./test-phase-0-1.5.sh https://bemorebackend.onrender.com

BASE_URL="${1:-https://bemorebackend.onrender.com}"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_USERNAME="testuser_$(date +%s)"
TEST_PASSWORD="testpass123"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

function print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

function print_test() {
    echo -e "${YELLOW}▶ $1${NC}"
}

function print_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

function print_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

function print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Install for better output formatting.${NC}"
    echo -e "${YELLOW}  macOS: brew install jq${NC}"
    echo -e "${YELLOW}  Linux: sudo apt-get install jq${NC}"
fi

print_header "🚀 Phase 0-1.5 Quick Test"
print_info "Base URL: $BASE_URL"
print_info "Test User: $TEST_EMAIL"

# ============================================================
# Setup: Create Test User
# ============================================================
print_header "📝 Setup: Creating Test User"

SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$TEST_USERNAME\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q '"success":true'; then
    print_pass "User created successfully"
    if command -v jq &> /dev/null; then
        ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.accessToken')
        REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.refreshToken')
        USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.user.id')
    else
        ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
        USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    fi
    print_info "User ID: $USER_ID"
    print_info "Access Token: ${ACCESS_TOKEN:0:30}..."
else
    print_fail "Failed to create user"
    echo "$SIGNUP_RESPONSE"
    exit 1
fi

# ============================================================
# Test 1: GET /api/auth/me (정상 조회)
# ============================================================
print_header "🧪 Test 1: GET /api/auth/me (정상 조회)"

print_test "TC1-1: Get current user info"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q '"success":true'; then
    if echo "$ME_RESPONSE" | grep -q "\"username\":\"$TEST_USERNAME\""; then
        if echo "$ME_RESPONSE" | grep -q '"profileImage":null'; then
            print_pass "User info retrieved correctly (profileImage is null)"
        else
            print_fail "profileImage should be null initially"
        fi
    else
        print_fail "Username mismatch"
    fi
else
    print_fail "Failed to get user info"
    echo "$ME_RESPONSE"
fi

# ============================================================
# Test 2: GET /api/auth/me (인증 오류)
# ============================================================
print_header "🧪 Test 2: GET /api/auth/me (인증 오류)"

print_test "TC1-2: No access token"
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me")

if echo "$NO_TOKEN_RESPONSE" | grep -q '"success":false'; then
    if echo "$NO_TOKEN_RESPONSE" | grep -q 'UNAUTHORIZED'; then
        print_pass "Correctly rejected request without token"
    else
        print_fail "Wrong error code"
    fi
else
    print_fail "Should return error without token"
fi

print_test "TC1-3: Invalid access token"
INVALID_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer invalid_token_here")

if echo "$INVALID_TOKEN_RESPONSE" | grep -q '"success":false'; then
    if echo "$INVALID_TOKEN_RESPONSE" | grep -q 'INVALID_ACCESS_TOKEN'; then
        print_pass "Correctly rejected invalid token"
    else
        print_fail "Wrong error code"
    fi
else
    print_fail "Should return error with invalid token"
fi

# ============================================================
# Test 3: PUT /api/auth/profile (username 변경)
# ============================================================
print_header "🧪 Test 3: PUT /api/auth/profile (username 변경)"

NEW_USERNAME="${TEST_USERNAME}_updated"

print_test "TC2-1: Update username"
UPDATE_USERNAME_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$NEW_USERNAME\"
  }")

if echo "$UPDATE_USERNAME_RESPONSE" | grep -q '"success":true'; then
    if echo "$UPDATE_USERNAME_RESPONSE" | grep -q "\"username\":\"$NEW_USERNAME\""; then
        print_pass "Username updated successfully"
    else
        print_fail "Username not updated in response"
    fi
else
    print_fail "Failed to update username"
    echo "$UPDATE_USERNAME_RESPONSE"
fi

# Verify with GET /me
print_test "Verify username change with GET /me"
VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$VERIFY_RESPONSE" | grep -q "\"username\":\"$NEW_USERNAME\""; then
    print_pass "Username change verified"
else
    print_fail "Username not reflected in GET /me"
fi

# ============================================================
# Test 4: PUT /api/auth/profile (profileImage 설정)
# ============================================================
print_header "🧪 Test 4: PUT /api/auth/profile (profileImage 설정)"

TEST_IMAGE_URL="https://example.com/avatar-$(date +%s).jpg"

print_test "TC2-2: Set profileImage"
UPDATE_IMAGE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"profileImage\": \"$TEST_IMAGE_URL\"
  }")

if echo "$UPDATE_IMAGE_RESPONSE" | grep -q '"success":true'; then
    if echo "$UPDATE_IMAGE_RESPONSE" | grep -q "\"profileImage\":\"$TEST_IMAGE_URL\""; then
        print_pass "profileImage set successfully"
    else
        print_fail "profileImage not set in response"
    fi
else
    print_fail "Failed to set profileImage"
    echo "$UPDATE_IMAGE_RESPONSE"
fi

# ============================================================
# Test 5: PUT /api/auth/profile (동시 변경)
# ============================================================
print_header "🧪 Test 5: PUT /api/auth/profile (동시 변경)"

FINAL_USERNAME="${TEST_USERNAME}_final"
FINAL_IMAGE_URL="https://example.com/final-avatar.jpg"

print_test "TC2-3: Update both username and profileImage"
UPDATE_BOTH_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$FINAL_USERNAME\",
    \"profileImage\": \"$FINAL_IMAGE_URL\"
  }")

if echo "$UPDATE_BOTH_RESPONSE" | grep -q '"success":true'; then
    if echo "$UPDATE_BOTH_RESPONSE" | grep -q "\"username\":\"$FINAL_USERNAME\""; then
        if echo "$UPDATE_BOTH_RESPONSE" | grep -q "\"profileImage\":\"$FINAL_IMAGE_URL\""; then
            print_pass "Both fields updated successfully"
        else
            print_fail "profileImage not updated"
        fi
    else
        print_fail "username not updated"
    fi
else
    print_fail "Failed to update both fields"
    echo "$UPDATE_BOTH_RESPONSE"
fi

# ============================================================
# Test 6: PUT /api/auth/profile (profileImage null)
# ============================================================
print_header "🧪 Test 6: PUT /api/auth/profile (profileImage null)"

print_test "TC2-4: Set profileImage to null"
UPDATE_NULL_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": null
  }')

if echo "$UPDATE_NULL_RESPONSE" | grep -q '"success":true'; then
    if echo "$UPDATE_NULL_RESPONSE" | grep -q '"profileImage":null'; then
        print_pass "profileImage set to null successfully"
    else
        print_fail "profileImage not null in response"
    fi
else
    print_fail "Failed to set profileImage to null"
    echo "$UPDATE_NULL_RESPONSE"
fi

# ============================================================
# Test 7: PUT /api/auth/profile (인증 오류)
# ============================================================
print_header "🧪 Test 7: PUT /api/auth/profile (인증 오류)"

print_test "TC2-5: No access token"
NO_TOKEN_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hacker"
  }')

if echo "$NO_TOKEN_UPDATE_RESPONSE" | grep -q '"success":false'; then
    if echo "$NO_TOKEN_UPDATE_RESPONSE" | grep -q 'UNAUTHORIZED'; then
        print_pass "Correctly rejected update without token"
    else
        print_fail "Wrong error code"
    fi
else
    print_fail "Should return error without token"
fi

# ============================================================
# Test 8: PUT /api/auth/profile (검증 오류)
# ============================================================
print_header "🧪 Test 8: PUT /api/auth/profile (검증 오류)"

print_test "TC2-7: Invalid username (too short)"
INVALID_USERNAME_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab"
  }')

if echo "$INVALID_USERNAME_RESPONSE" | grep -q '"success":false'; then
    if echo "$INVALID_USERNAME_RESPONSE" | grep -q 'VALIDATION_ERROR'; then
        print_pass "Correctly rejected invalid username"
    else
        print_fail "Wrong error code"
    fi
else
    print_fail "Should return validation error"
fi

print_test "TC2-8: Invalid profileImage URL"
INVALID_URL_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileImage": "not-a-url"
  }')

if echo "$INVALID_URL_RESPONSE" | grep -q '"success":false'; then
    if echo "$INVALID_URL_RESPONSE" | grep -q 'VALIDATION_ERROR'; then
        print_pass "Correctly rejected invalid URL"
    else
        print_fail "Wrong error code"
    fi
else
    print_fail "Should return validation error"
fi

# ============================================================
# Test 9: PUT /api/auth/profile (빈 body)
# ============================================================
print_header "🧪 Test 9: PUT /api/auth/profile (빈 body)"

print_test "TC2-9: Empty body"
EMPTY_BODY_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/auth/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$EMPTY_BODY_RESPONSE" | grep -q '"success":true'; then
    print_pass "Empty body accepted (optional fields)"
else
    print_fail "Should accept empty body"
    echo "$EMPTY_BODY_RESPONSE"
fi

# ============================================================
# Cleanup: Logout
# ============================================================
print_header "🧹 Cleanup: Logout"

LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    print_pass "Logged out successfully"
else
    print_fail "Logout failed"
fi

# ============================================================
# Test Summary
# ============================================================
print_header "📊 Test Summary"

TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")

echo -e "${BLUE}Total Tests:${NC} $TOTAL"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${BLUE}Success Rate:${NC} $SUCCESS_RATE%"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! Phase 0-1.5 implementation is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the results above.${NC}"
    exit 1
fi
