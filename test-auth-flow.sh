#!/bin/bash

# Authentication Flow Test Script for Scan2Card Backend
# Base URL: https://latest-scan2card-backend.onrender.com

BASE_URL="https://latest-scan2card-backend.onrender.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Generate unique email
TIMESTAMP=$(date +%s)
EMAIL="test.user.${TIMESTAMP}@example.com"
PASSWORD="Test@123456"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      SCAN2CARD AUTHENTICATION FLOW TEST SCRIPT            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Base URL: ${BASE_URL}${NC}"
echo -e "${CYAN}Test User Email: ${EMAIL}${NC}"
echo ""

# Step 1: Register User
echo -e "${CYAN}============================================================${NC}"
echo -e "${YELLOW}STEP 1: USER REGISTRATION${NC}"
echo -e "${CYAN}============================================================${NC}"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"John\",
    \"lastName\": \"Doe\",
    \"email\": \"${EMAIL}\",
    \"phoneNumber\": \"+1234567890\",
    \"password\": \"${PASSWORD}\",
    \"roleName\": \"ENDUSER\",
    \"companyName\": \"Test Company\"
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_CODE" -eq 201 ]; then
  echo -e "${GREEN}✅ User registered successfully!${NC}"
else
  echo -e "${RED}❌ Registration failed!${NC}"
  exit 1
fi

# Step 2: Login User
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${YELLOW}STEP 2: USER LOGIN${NC}"
echo -e "${CYAN}============================================================${NC}"

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\"
  }")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Login successful!${NC}"

  # Check if 2FA is required
  REQUIRES_2FA=$(echo "$RESPONSE_BODY" | jq -r '.data.requires2FA // false')

  if [ "$REQUIRES_2FA" == "true" ]; then
    USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.userId')

    echo -e "${BLUE}ℹ️  2FA is enabled - OTP required${NC}"
    echo -e "${BLUE}ℹ️  Test OTP: 000000${NC}"

    # Step 3: Verify OTP
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${YELLOW}STEP 3: VERIFY OTP (2FA)${NC}"
    echo -e "${CYAN}============================================================${NC}"

    OTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/verify-otp" \
      -H "Content-Type: application/json" \
      -d "{
        \"userId\": \"${USER_ID}\",
        \"otp\": \"000000\"
      }")

    HTTP_CODE=$(echo "$OTP_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$OTP_RESPONSE" | sed '$d')

    echo "Response:"
    echo "$RESPONSE_BODY" | jq '.'

    if [ "$HTTP_CODE" -eq 200 ]; then
      echo -e "${GREEN}✅ OTP verified successfully!${NC}"
      TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.token')
    else
      echo -e "${RED}❌ OTP verification failed!${NC}"
      exit 1
    fi
  else
    TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.token')
  fi
else
  echo -e "${RED}❌ Login failed!${NC}"
  exit 1
fi

# Step 4: Get Profile
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${YELLOW}STEP 4: GET USER PROFILE (Authenticated)${NC}"
echo -e "${CYAN}============================================================${NC}"

PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/api/auth/profile" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$PROFILE_RESPONSE" | sed '$d')

echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Profile retrieved successfully!${NC}"

  FIRST_NAME=$(echo "$RESPONSE_BODY" | jq -r '.data.firstName')
  LAST_NAME=$(echo "$RESPONSE_BODY" | jq -r '.data.lastName')
  USER_EMAIL=$(echo "$RESPONSE_BODY" | jq -r '.data.email')
  ROLE=$(echo "$RESPONSE_BODY" | jq -r '.data.role.roleName')

  echo ""
  echo "User Details:"
  echo "  - Name: ${FIRST_NAME} ${LAST_NAME}"
  echo "  - Email: ${USER_EMAIL}"
  echo "  - Role: ${ROLE}"
else
  echo -e "${RED}❌ Failed to get profile!${NC}"
  exit 1
fi

# Final Summary
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}✅ All authentication flow tests passed! 🎉${NC}"
echo ""
echo -e "${YELLOW}Authentication Token (save this for future requests):${NC}"
echo -e "${GREEN}${TOKEN}${NC}"
echo ""
