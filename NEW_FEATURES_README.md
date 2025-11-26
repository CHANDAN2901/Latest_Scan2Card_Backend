# New Authentication Features - User Verification & Password Reset

## Overview
Added comprehensive user verification and password reset functionality to the Scan2Card backend API.

## New Features

### 1. **User Verification System**
- Users are now created with `isVerified: false` by default
- After registration, users must verify their account via OTP
- Once verified, `isVerified` is set to `true`
- The `isVerified` status is returned in registration, login, and profile responses

### 2. **Password Reset Flow**
- Users can request a password reset via email
- OTP is sent for verification
- Password can be reset securely with valid OTP

### 3. **Updated User Model**
- Added `isVerified` field (boolean, default: false)
- This field determines if a user can perform activities

### 4. **Updated OTP Model**
- Added new OTP purposes: `verification` and `forgot_password`
- All test OTPs use dummy value `000000`

---

## New API Endpoints

### 1. Send Verification OTP
**Endpoint:** `POST /api/auth/send-verification-otp`

**Description:** Send OTP to user's phone/email for account verification

**Request Body:**
```json
{
  "userId": "USER_ID_FROM_REGISTRATION",
  "phoneNumber": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification OTP sent successfully",
  "data": {
    "userId": "69268b7c80e08abd29c96e29",
    "phoneNumber": "+1234567890",
    "email": "user@example.com"
  }
}
```

**Test OTP:** `000000`

---

### 2. Verify User
**Endpoint:** `POST /api/auth/verify-user`

**Description:** Verify user account with OTP and set `isVerified` to true

**Request Body:**
```json
{
  "userId": "USER_ID_FROM_REGISTRATION",
  "otp": "000000"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User verified successfully",
  "data": {
    "userId": "69268b7c80e08abd29c96e29",
    "isVerified": true
  }
}
```

---

### 3. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset OTP

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset OTP sent successfully",
  "data": {
    "userId": "69268b7c80e08abd29c96e29",
    "email": "user@example.com"
  }
}
```

**Test OTP:** `000000`

---

### 4. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password with OTP

**Request Body:**
```json
{
  "userId": "USER_ID_FROM_FORGOT_PASSWORD",
  "otp": "000000",
  "newPassword": "NewPassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "email": "user@example.com"
  }
}
```

---

## Updated Existing Endpoints

### Registration Response
Now includes `isVerified` field:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "ENDUSER",
      "isVerified": false  // NEW FIELD
    }
  }
}
```

### Login Response
Now includes `isVerified` field:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "ENDUSER",
      "isVerified": true  // NEW FIELD
    }
  }
}
```

### Profile Response
Now includes `isVerified` field:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "ENDUSER",
      "isActive": true,
      "isVerified": true  // NEW FIELD
    }
  }
}
```

---

## Complete User Flow

### 1. Registration & Verification Flow
```
Step 1: Register User
POST /api/auth/register
└─> Returns: userId, isVerified: false

Step 2: Send Verification OTP
POST /api/auth/send-verification-otp
Body: { userId, phoneNumber }
└─> OTP sent (Test OTP: 000000)

Step 3: Verify User
POST /api/auth/verify-user
Body: { userId, otp: "000000" }
└─> Returns: isVerified: true

Step 4: Login
POST /api/auth/login
└─> Returns: token, user with isVerified: true
```

### 2. Forgot Password Flow
```
Step 1: Request Password Reset
POST /api/auth/forgot-password
Body: { email }
└─> Returns: userId (OTP sent - Test OTP: 000000)

Step 2: Reset Password
POST /api/auth/reset-password
Body: { userId, otp: "000000", newPassword }
└─> Password updated

Step 3: Login with New Password
POST /api/auth/login
Body: { email, password: newPassword }
└─> Success!
```

---

## Testing

### Run Complete Test Suite
```bash
node test-auth-complete.js
```

This will test:
1. ✅ User Registration (with isVerified: false)
2. ✅ Send Verification OTP
3. ✅ Verify User (sets isVerified: true)
4. ✅ Login (returns isVerified status)
5. ✅ Get Profile (includes isVerified)
6. ✅ Forgot Password
7. ✅ Reset Password
8. ✅ Login with new password

### Run Basic Auth Test
```bash
node test-auth-flow.js
```

### Manual Testing with cURL

**1. Register User:**
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Test@123456",
    "roleName": "ENDUSER",
    "phoneNumber": "+1234567890"
  }'
```

**2. Send Verification OTP:**
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/send-verification-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_STEP_1",
    "phoneNumber": "+1234567890"
  }'
```

**3. Verify User:**
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/verify-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_STEP_1",
    "otp": "000000"
  }'
```

**4. Login:**
```bash
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Test@123456"
  }'
```

---

## Postman Collection

The Postman collection has been updated with all new endpoints:
- Send Verification OTP
- Verify User
- Forgot Password
- Reset Password

Import `Scan2Card_API_Collection.postman_collection.json` to test all endpoints.

---

## Important Notes

### Test OTP
All OTPs in the system use the dummy value `000000` for testing purposes:
- User Verification OTP: `000000`
- Forgot Password OTP: `000000`
- 2FA Login OTP: `000000`

### OTP Expiry
All OTPs expire after **10 minutes**.

### isVerified Usage
The `isVerified` field can be used to:
- Restrict access to certain features until user is verified
- Display verification prompts in the UI
- Track user verification status
- Implement verification-based permissions

### Security Considerations
In production:
1. Replace dummy OTP `000000` with real OTP generation
2. Integrate SMS/Email service for OTP delivery
3. Add rate limiting for OTP requests
4. Implement account lockout after failed OTP attempts
5. Consider shorter OTP expiry times for sensitive operations

---

## Error Responses

### Already Verified
```json
{
  "success": false,
  "message": "User is already verified"
}
```

### Invalid OTP
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

### User Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

---

## Database Changes

### User Model
```typescript
interface IUser {
  // ... existing fields
  isVerified: boolean;  // NEW - default: false
}
```

### OTP Model
```typescript
interface IOTP {
  userId: Types.ObjectId;
  otp: string;
  purpose: "login" | "enable_2fa" | "disable_2fa" | "verification" | "forgot_password";  // UPDATED
  expiresAt: Date;
  isUsed: boolean;
}
```

---

## Migration Notes

Existing users in the database will have `isVerified: false` by default. To update existing users to verified status, run:

```javascript
// MongoDB update script
db.users.updateMany(
  { isVerified: { $exists: false } },
  { $set: { isVerified: true } }
)
```

---

## Support

For issues or questions:
- Check the test scripts for working examples
- Review the Postman collection for request/response formats
- Consult the main README and POSTMAN_GUIDE for additional documentation
