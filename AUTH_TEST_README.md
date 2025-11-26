# Authentication Flow Test Scripts

This directory contains test scripts to verify the authentication flow for the Scan2Card Backend deployed on Render.

**Base URL:** `https://latest-scan2card-backend.onrender.com`

## Available Scripts

### 1. Node.js Test Script (Recommended)

**File:** `test-auth-flow.js`

A comprehensive, colorful test script that tests the complete authentication flow.

#### Requirements
- Node.js (v18 or higher)
- No additional dependencies required (uses built-in `fetch`)

#### Usage

```bash
# Run the complete auth flow test
node test-auth-flow.js
```

#### What it tests
1. ✅ User Registration
2. ✅ User Login (with/without 2FA)
3. ✅ OTP Verification (if 2FA is enabled)
4. ✅ Get User Profile (authenticated request)

#### Sample Output
```
╔════════════════════════════════════════════════════════════╗
║      SCAN2CARD AUTHENTICATION FLOW TEST SCRIPT            ║
╚════════════════════════════════════════════════════════════╝

Base URL: https://latest-scan2card-backend.onrender.com
Test User Email: test.user.1764133755028@example.com

============================================================
STEP 1: USER REGISTRATION
============================================================
✅ User registered successfully!

============================================================
STEP 2: USER LOGIN
============================================================
✅ Login successful!

============================================================
STEP 4: GET USER PROFILE (Authenticated)
============================================================
✅ Profile retrieved successfully!

============================================================
TEST SUMMARY
============================================================
✅ All authentication flow tests passed! 🎉

Authentication Token (save this for future requests):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2. Bash/cURL Test Script

**File:** `test-auth-flow.sh`

A shell script using curl commands for testing on Unix-like systems.

#### Requirements
- bash shell
- curl
- jq (for JSON formatting)

#### Install jq (if not installed)
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

#### Usage

```bash
# Make the script executable
chmod +x test-auth-flow.sh

# Run the script
./test-auth-flow.sh
```

---

## API Endpoints Tested

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "password": "Test@123456",
  "roleName": "ENDUSER",
  "companyName": "Test Company"
}
```

**Roles:** `SUPERADMIN`, `EXHIBITOR`, `TEAMMANAGER`, `ENDUSER`

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      ...
    }
  }
}
```

---

### 2. User Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Test@123456"
}
```

**Success Response (200) - Without 2FA:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      ...
    }
  }
}
```

**Success Response (200) - With 2FA:**
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "requires2FA": true,
    "userId": "...",
    "email": "user@example.com"
  }
}
```

**Note:** For testing, the OTP is always `000000`

---

### 3. Verify OTP (2FA)
**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "userId": "69268b7c80e08abd29c96e29",
  "otp": "000000"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}
```

---

### 4. Get Profile (Authenticated)
**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <your-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "user@example.com",
      "role": "ENDUSER",
      ...
    }
  }
}
```

---

## Manual Testing with cURL

### Register a new user
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "Test@123456",
    "roleName": "ENDUSER",
    "companyName": "Test Company"
  }'
```

### Login
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Test@123456"
  }'
```

### Get Profile (replace YOUR_TOKEN with actual token)
```bash
curl -X GET https://latest-scan2card-backend.onrender.com/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Programmatic Usage (Node.js)

You can also import and use the test functions programmatically:

```javascript
const { testRegistration, testLogin, makeRequest } = require('./test-auth-flow');

async function myTest() {
  // Register a user
  const user = await testRegistration();

  // Login
  const loginResult = await testLogin();

  // Make custom request
  const response = await makeRequest('/api/leads', 'GET', null, loginResult.token);
}
```

---

## Troubleshooting

### Error: "Email already exists"
Each test run creates a new user with a unique email (using timestamp). If you see this error when testing manually, change the email address.

### Error: "Cannot find module 'fetch'"
Make sure you're using Node.js v18 or higher which includes the fetch API natively.

### Error: "command not found: jq" (for bash script)
Install jq using the commands mentioned in the Bash script requirements section.

### Connection timeout
If the Render service is in sleep mode (free tier), the first request might take 30-60 seconds to wake up the service. Subsequent requests will be faster.

---

## Additional Endpoints

For a complete list of all available API endpoints, check the `POSTMAN_GUIDE.md` or the Postman collection in this directory.

---

## Support

If you encounter any issues:
1. Check the Render deployment logs
2. Verify environment variables are set correctly
3. Ensure MongoDB connection is working
4. Review the backend logs for detailed error messages
