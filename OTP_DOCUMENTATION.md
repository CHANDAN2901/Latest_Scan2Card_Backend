# OTP (One-Time Password) System Documentation

This document explains how the OTP system works in the Scan2Card/QuickLeads backend for user authentication and verification.

---

## Table of Contents

1. [Overview](#overview)
2. [SMS Provider Details](#sms-provider-details)
3. [Configuration](#configuration)
4. [OTP Flow](#otp-flow)
5. [API Endpoints](#api-endpoints)
6. [Code Implementation](#code-implementation)
7. [Database Schema](#database-schema)
8. [Testing Mode](#testing-mode)
9. [Security Considerations](#security-considerations)

---

## Overview

The OTP system is used for:
- **User Registration**: Verify phone number after new account creation
- **User Login**: Verify unverified phone numbers
- **Password Reset**: Authenticate user before allowing password change

---

## SMS Provider Details

### Provider: TextPe SMS Gateway (SmartPing)

| Property | Value |
|----------|-------|
| **API Endpoint** | `http://sms.textpe.in/api/mt/SendSMS` |
| **Provider Name** | TextPe / SmartPing |
| **Sender ID** | `CSPLSC` |
| **Channel** | `2` |
| **DCS** | `0` |
| **Flash SMS** | `0` |
| **Route** | `clickhere` |

### API Key

```env
SMARTPING_APIKEY=XOVZV5RCK0WBKcsmRvdnvQ
```

> ⚠️ **Important**: This API key should be kept confidential and stored securely in environment variables.

### SMS Message Template

```
Your OTP for verification with Colourstop Solutions is {OTP}. Do not share this code. It is valid for 10 minutes only.
```

---

## Configuration

### Environment Variables (`.env`)

```env
# SMS Gateway API Key
SMARTPING_APIKEY=XOVZV5RCK0WBKcsmRvdnvQ

# Testing Mode (Optional)
USE_DUMMY_OTP=false          # Set to "true" to skip actual SMS sending
DUMMY_OTP=0000               # Dummy OTP value for testing
```

### Config File (`src/config/config.ts`)

```typescript
export const config = {
  SMARTPING_API: process.env.SMARTPING_APIKEY || "",
  
  // Testing Configuration
  USE_DUMMY_OTP: process.env.USE_DUMMY_OTP === "true",
  DUMMY_OTP: process.env.DUMMY_OTP || "0000",
};
```

---

## OTP Flow

### 1. Send OTP Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Controller │────▶│  OTP Helper │────▶│  TextPe API │
│  (Mobile)   │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │
                           │                   ▼
                           │           ┌─────────────┐
                           │           │  MongoDB    │
                           │           │ (Store OTP) │
                           │           └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Response   │
                    │ (Token)     │
                    └─────────────┘
```

### 2. Verify OTP Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Controller │────▶│  OTP Helper │────▶│   MongoDB   │
│ (OTP + Token)│    │             │     │             │     │ (Verify OTP)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           │◀──────────────────────────────────────┘
                           │         (Success/Failure)
                           ▼
                    ┌─────────────┐
                    │  Response   │
                    │ (JWT Token) │
                    └─────────────┘
```

### Detailed Steps

#### Sending OTP:

1. User initiates action (register/login/forgot password)
2. System generates 6-digit OTP using `generateNumericString(6)`
3. OTP record created in `Verifications` collection with:
   - `otp`: The generated OTP
   - `otpValidTill`: Current timestamp + 180 seconds (3 minutes)
   - `sentTo`: User's phone number
   - `source`: "phoneNumber"
4. HTTP GET request sent to TextPe API with OTP in message
5. Verification token returned to client

#### Verifying OTP:

1. User submits OTP code with verification token
2. Token validated to get user ID
3. Latest verification record fetched from database
4. OTP compared:
   - Check if already verified
   - Check if OTP matches
   - Check if OTP is not expired (`otpValidTill > current timestamp`)
5. If valid, mark as verified and return JWT session token

---

## API Endpoints

### Send OTP

**Endpoint**: `POST /api/user/auth/send-otp`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "referral": "optional_referral_code"
}
```

**Response**:
```json
{
  "status": true,
  "message": "OTP Sent Successfully",
  "data": {
    "verification": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Verify Phone Number

**Endpoint**: `POST /api/user/auth/verify-phone`

**Request Body**:
```json
{
  "token": "verification_token_from_send_otp",
  "code": 123456
}
```

**Response (Success)**:
```json
{
  "status": true,
  "message": "Successfully verified",
  "data": {
    "token": "jwt_session_token",
    "createdAt": "2024-01-15T10:31:00.000Z"
  }
}
```

### Forgot Password

**Endpoint**: `POST /api/user/auth/forgot-password`

**Request Body**:
```json
{
  "phoneNumber": "9876543210"
}
```

### Verify Reset

**Endpoint**: `POST /api/user/auth/verify-reset`

**Request Body**:
```json
{
  "phoneNumber": "9876543210",
  "code": 123456,
  "source": "phoneNumber"
}
```

---

## Code Implementation

### OTP Helper (`src/helpers/otp.helper.ts`)

#### Send OTP via TextPe API

```typescript
const sendOtpWithNewApi = async (phoneNumber: string, otp: string) => {
  try {
    const apiKey = config.SMARTPING_API;
    const senderId = "CSPLSC";
    const channel = "2";
    const dcs = "0";
    const flashSms = "0";
    const route = "clickhere";
    const text = `Your OTP for verification with Colourstop Solutions is ${otp}. Do not share this code. It is valid for 10 minutes only.`;

    const url = `http://sms.textpe.in/api/mt/SendSMS?APIKey=${apiKey}&senderid=${senderId}&channel=${channel}&DCS=${dcs}&flashsms=${flashSms}&number=${phoneNumber}&text=${text}&route=${route}`;

    const response = await axios.get(url);
    return response.status >= 200 && response.status < 300;
  } catch (error: any) {
    console.error("Error sending OTP with new API:", error.message);
    return false;
  }
};
```

#### Handle Send Verification Code

```typescript
export const handleSendVerificationCode = async ({
  userId,
  source,
}: {
  userId: string;
  source: string;
}) => {
  // 1. Validate source (phoneNumber or email)
  // 2. Generate 6-digit OTP
  // 3. Fetch user details
  // 4. Create verification record in database
  // 5. Send OTP via SMS API
  // 6. Return verification ID
};
```

#### Handle Check Verification Code

```typescript
export const handleCheckVerificationCode = async ({
  userId,
  source,
  code,
}: {
  userId: string;
  source: string;
  code: number;
}) => {
  // 1. Fetch user and verification details
  // 2. Check if already verified
  // 3. Validate OTP:
  //    - Master code: 987651 (always valid)
  //    - Regular OTP: Check match and expiry
  // 4. Update verification status
  // 5. Return success/failure
};
```

---

## Database Schema

### Verification Model (`src/models/verification.model.ts`)

```typescript
interface IVerification {
  sentTo?: string;           // Phone number or email
  sentFrom?: string;         // Sender identifier
  otp?: number;              // 6-digit OTP code
  otpValidTill?: number;     // Unix timestamp (expiry)
  source?: string;           // "email" | "phoneNumber"
  verificationCodeUsed?: number;  // The code user entered
  addedBy?: ObjectId;        // User reference
  addedByModel?: string;     // "Users" | "Artists"
  status?: string;           // "pending" | "sent" | "failed"
  isVerified?: boolean;      // Verification completed
  isDeleted?: boolean;       // Soft delete flag
}
```

### Sample Verification Document

```json
{
  "_id": "ObjectId('...')",
  "sentTo": "9876543210",
  "otp": 123456,
  "otpValidTill": 1705318380,
  "source": "phoneNumber",
  "addedBy": "ObjectId('user_id')",
  "addedByModel": "Users",
  "status": "sent",
  "isVerified": false,
  "isDeleted": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing Mode

### Enable Testing Mode

Set in `.env`:
```env
USE_DUMMY_OTP=true
DUMMY_OTP=0000
```

When enabled:
- No actual SMS is sent
- OTP is logged to console
- Any code can be used for verification

### Master OTP Code

For development/testing, the system accepts a **master code**: `987651`

This code bypasses OTP validation and can be used without waiting for actual SMS.

```typescript
const masterCode = 987651;

if (normalizedCode === masterCode) {
  isValid = true;
  updateData = { isVerified: true };
}
```

### Testing with Dummy OTP

In testing mode:
```typescript
if (config.USE_DUMMY_OTP) {
  otp = parseInt(config.DUMMY_OTP);
  console.log("🔐 TESTING MODE: Using dummy OTP:", otp);
  // Skip actual SMS sending
  otpSentStatus = true;
}
```

---

## Security Considerations

### Current Implementation

1. **OTP Expiry**: 3 minutes (180 seconds) - stored as `otpValidTill`
2. **OTP Length**: 6 digits
3. **Master Password**: `@QuickLeads#2025` for login bypass
4. **Master OTP**: `987651` for OTP bypass

### Recommendations

1. **Remove Master Codes in Production**: The master password and OTP should be disabled in production
2. **Rate Limiting**: Implement rate limiting on OTP endpoints
3. **HTTPS**: Ensure TextPe API is called over HTTPS in production
4. **API Key Security**: Rotate API key periodically
5. **OTP Attempts**: Limit number of verification attempts
6. **Shorter Expiry**: Consider reducing OTP validity to 2 minutes

---

## File Structure

```
Backend/
├── src/
│   ├── config/
│   │   └── config.ts           # Configuration including SMARTPING_API
│   ├── helpers/
│   │   └── otp.helper.ts       # OTP send/verify logic
│   ├── models/
│   │   └── verification.model.ts  # Verification schema
│   └── user/
│       └── controller/
│           └── auth.controller.ts  # Auth endpoints using OTP
└── .env                         # Environment variables
```

---

## Quick Reference

| Item | Value |
|------|-------|
| SMS Provider | TextPe (sms.textpe.in) |
| API Key Env Var | `SMARTPING_APIKEY` |
| API Key Value | `XOVZV5RCK0WBKcsmRvdnvQ` |
| Sender ID | `CSPLSC` |
| OTP Validity | 3 minutes (180 seconds) |
| OTP Length | 6 digits |
| Master OTP | `987651` |
| Master Password | `@QuickLeads#2025` |

---

*Last Updated: July 2025*
