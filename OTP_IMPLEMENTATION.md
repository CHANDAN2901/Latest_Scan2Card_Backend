# OTP Implementation Guide - Scan2Card

This document explains the OTP (One-Time Password) implementation in the Scan2Card backend.

## Overview

The OTP system has been implemented for:
1. **User Registration** - Automatic OTP verification after signup
2. **User Login (2FA)** - OTP verification when two-factor authentication is enabled
3. **Forgot Password** - OTP verification before password reset

---

## Files Added/Modified

### New Files Created:
1. **`src/config/config.ts`** - Configuration file for environment variables
2. **`src/helpers/otp.helper.ts`** - OTP helper functions with SMS integration

### Modified Files:
1. **`src/services/auth.service.ts`** - Updated to use OTP helpers
2. **`src/controllers/auth.controller.ts`** - Updated login controller for 2FA
3. **`.env.example`** - Added SMS and OTP configuration variables

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# SMS Gateway Configuration (TextPe/SmartPing)
SMARTPING_APIKEY=your_actual_api_key_here

# OTP Testing Configuration
USE_DUMMY_OTP=true        # Set to "true" for testing (no SMS sent)
DUMMY_OTP=000000          # OTP to use in testing mode
```

### Testing Mode

When `USE_DUMMY_OTP=true`:
- No actual SMS is sent
- The OTP value will always be `000000` (or whatever you set in `DUMMY_OTP`)
- OTP is logged to console for testing
- **Master OTP `987651` works in all modes** (for emergency access)

---

## API Flows

### 1. Registration Flow

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "9876543210",
  "password": "password123",
  "roleName": "ENDUSER"
}
```

**Response:**
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
      "phoneNumber": "9876543210",
      "role": "ENDUSER",
      "isVerified": false
    },
    "message": "Registration successful. Please verify your account with the OTP sent to your phoneNumber"
  }
}
```

**What Happens:**
1. User is created with `isVerified: false`
2. OTP is automatically sent to phone (if available) or email
3. User must verify with OTP before full access

**Next Step:** Call verify endpoint with OTP

---

### 2. Verify Registration OTP

**Endpoint:** `POST /api/auth/verify-user`

**Request:**
```json
{
  "userId": "user_id_from_registration",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User verified successfully",
  "data": {
    "userId": "...",
    "isVerified": true
  }
}
```

---

### 3. Login Flow (Without 2FA)

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (Normal Login):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "ENDUSER",
      "twoFactorEnabled": false,
      "isVerified": true
    }
  }
}
```

---

### 4. Login Flow (With 2FA Enabled)

**First Request:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "requires2FA": true,
  "message": "2FA required. OTP has been sent to your email.",
  "data": {
    "userId": "user_id_here",
    "email": "john@example.com"
  }
}
```

**Second Request:** `POST /api/auth/verify-otp`

**Request:**
```json
{
  "userId": "user_id_from_above",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA verification successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "_id": "...",
      "firstName": "John",
      "email": "john@example.com",
      "twoFactorEnabled": true,
      "isVerified": true
    }
  }
}
```

---

### 5. Forgot Password Flow

**Step 1: Request OTP**

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset OTP sent successfully",
  "data": {
    "userId": "user_id_here",
    "email": "john@example.com"
  }
}
```

**Step 2: Reset Password with OTP**

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```json
{
  "userId": "user_id_from_above",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "email": "john@example.com"
  }
}
```

---

## OTP Configuration

| Setting | Value |
|---------|-------|
| OTP Length | 6 digits |
| OTP Validity | 10 minutes |
| Master OTP (Testing) | `987651` |
| Dummy OTP (Testing Mode) | `000000` |
| SMS Provider | TextPe/SmartPing |
| Sender ID | `CSPLSC` |

---

## SMS Integration

### TextPe API Details

The OTP helper uses the TextPe SMS gateway to send OTPs via SMS.

**API Endpoint:** `http://sms.textpe.in/api/mt/SendSMS`

**Message Template:**
```
Your OTP for verification with Scan2Card is {OTP}. Do not share this code. It is valid for 10 minutes only.
```

### Email Integration (Placeholder)

Currently, email OTP sending is a placeholder. You need to implement your own email service:

```typescript
// In src/helpers/otp.helper.ts
const sendOTPViaEmail = async (email: string, otp: string): Promise<boolean> => {
  // TODO: Implement your email service (SendGrid, Nodemailer, etc.)
  console.log(`📧 EMAIL OTP for ${email}: ${otp}`);
  return true;
};
```

---

## Security Features

### Master OTP Code

For testing and emergency access, the system accepts a master OTP: **`987651`**

This code:
- Works in all environments (dev, staging, production)
- Bypasses OTP validation
- Should be **removed or changed in production**

### OTP Expiry

- OTPs expire after **10 minutes**
- Expired OTPs cannot be used
- Users must request a new OTP

### One-Time Use

- Each OTP can only be used **once**
- After verification, the OTP is marked as `isUsed: true`
- Cannot reuse the same OTP

### Automatic Cleanup

The OTP model has TTL (Time To Live) index that automatically deletes expired OTPs from the database:

```typescript
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

---

## Testing

### Test Registration with OTP

1. Register a new user
2. Check console for OTP (if `USE_DUMMY_OTP=true`, it will be `000000`)
3. Verify with the OTP

### Test 2FA Login

1. Enable 2FA for a user (update `twoFactorEnabled: true` in database)
2. Try to login - you'll get `requires2FA: true` response
3. Check console for OTP
4. Verify with OTP endpoint

### Test Forgot Password

1. Request forgot password OTP
2. Check console for OTP
3. Reset password with OTP

### Using Master OTP

You can always use **`987651`** as the OTP in any flow without waiting for SMS/email.

---

## Production Checklist

Before deploying to production:

- [ ] Set `USE_DUMMY_OTP=false`
- [ ] Add actual `SMARTPING_APIKEY` in `.env`
- [ ] Remove or change the master OTP (`987651`)
- [ ] Implement proper email service for email OTPs
- [ ] Add rate limiting on OTP endpoints
- [ ] Monitor SMS costs
- [ ] Consider OTP attempt limits (e.g., max 3 attempts)
- [ ] Use HTTPS for SMS API calls
- [ ] Add logging for OTP events

---

## Troubleshooting

### OTP Not Received

1. Check if `USE_DUMMY_OTP=true` - if yes, OTP won't be sent
2. Check console logs for OTP value
3. Verify SMS API key is correct
4. Check phone number format (must be valid 10-digit number)

### OTP Expired

- OTPs expire in 10 minutes
- Request a new OTP

### Invalid OTP

- Check for typos
- Ensure OTP hasn't been used already
- Try master OTP `987651` for testing

---

## Database Schema

### OTP Model

```typescript
{
  userId: ObjectId,           // Reference to User
  otp: String,                // 6-digit OTP
  purpose: String,            // "login" | "verification" | "forgot_password"
  expiresAt: Date,           // Expiry timestamp
  isUsed: Boolean,           // One-time use flag
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

---

## Support

For issues or questions about the OTP implementation, check:
1. Console logs for OTP values (in testing mode)
2. Database OTP collection for OTP records
3. User model for `isVerified` and `twoFactorEnabled` fields

---

**Last Updated:** December 2025
