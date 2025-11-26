# Password Management Documentation

## Overview
The Scan2Card backend provides two distinct password management flows:

1. **Forgot Password** - For users who forgot their password (OTP verification required)
2. **Change Password** - For logged-in users who want to update their password (current password verification required)

---

## 1. Forgot Password Flow (OTP-Based)

### Use Case
- User **forgot their password** and cannot log in
- User needs to **reset password** without knowing current password
- Requires OTP verification for security

### API Endpoints

#### Step 1: Request Password Reset OTP
**Endpoint:** `POST /api/auth/forgot-password`

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

**Test OTP:** `000000` (for development/testing)

---

#### Step 2: Reset Password with OTP
**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "userId": "69268b7c80e08abd29c96e29",
  "otp": "000000",
  "newPassword": "NewSecurePassword123"
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

### Complete Flow Diagram

```
┌─────────────────────┐
│   User Forgot       │
│   Password          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /forgot-       │
│  password           │
│ Body: { email }     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ OTP Sent            │
│ Returns: userId     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /reset-        │
│  password           │
│ Body: {userId, otp, │
│  newPassword}       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Password Reset      │
│ User can login      │
└─────────────────────┘
```

### Error Responses

**Invalid or Expired OTP:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

**User Not Found:**
```json
{
  "success": false,
  "message": "User with this email does not exist"
}
```

---

## 2. Change Password Flow (Authenticated)

### Use Case
- User is **logged in** and wants to change password
- User knows their **current password**
- Password update for **security improvement** or regular rotation
- **No OTP required** - uses current password verification instead

### API Endpoint

**Endpoint:** `POST /api/auth/change-password`

**Headers:**
```
Authorization: Bearer <YOUR_AUTH_TOKEN>
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "email": "user@example.com"
  }
}
```

### Complete Flow Diagram

```
┌─────────────────────┐
│   User Logged In    │
│   Wants to Update   │
│   Password          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /change-       │
│  password           │
│ Headers: Bearer     │
│  Token              │
│ Body: {             │
│  currentPassword,   │
│  newPassword        │
│ }                   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Verify Current      │
│ Password            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Password Changed    │
│ User stays logged   │
│ in                  │
└─────────────────────┘
```

### Validation Rules

1. **Current Password Verification**: System verifies the current password is correct
2. **New Password Must Differ**: New password cannot be the same as current password
3. **Password Length**: Minimum 6 characters required
4. **Authentication Required**: Must include valid JWT token

### Error Responses

**Current Password Incorrect:**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

**Same Password:**
```json
{
  "success": false,
  "message": "New password must be different from current password"
}
```

**Password Too Short:**
```json
{
  "success": false,
  "message": "New password must be at least 6 characters long"
}
```

**Not Authenticated:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## Comparison Table

| Feature | Forgot Password | Change Password |
|---------|----------------|-----------------|
| **User State** | Not logged in | Logged in |
| **Authentication** | None required | Bearer token required |
| **Verification Method** | OTP (SMS/Email) | Current password |
| **Use Case** | Cannot remember password | Wants to update password |
| **Steps** | 2 steps | 1 step |
| **Endpoints** | `/forgot-password` + `/reset-password` | `/change-password` |
| **Current Password** | Not needed | Required |
| **OTP** | Required (000000) | Not needed |
| **User Knows Password** | ❌ No | ✅ Yes |

---

## Testing with cURL

### Test Forgot Password Flow

```bash
# Step 1: Request OTP
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'

# Response will include userId

# Step 2: Reset Password with OTP
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_STEP_1",
    "otp": "000000",
    "newPassword": "NewPassword123"
  }'
```

### Test Change Password Flow

```bash
# Must be logged in first
curl -X POST https://latest-scan2card-backend.onrender.com/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "currentPassword": "CurrentPassword123",
    "newPassword": "NewPassword456"
  }'
```

---

## Security Considerations

### Forgot Password (OTP-Based)
1. **OTP Expiry**: OTPs expire after 10 minutes
2. **One-Time Use**: Each OTP can only be used once
3. **Rate Limiting**: Consider implementing rate limits on OTP requests (production)
4. **Email/SMS Delivery**: In production, replace dummy OTP with real SMS/Email service

### Change Password (Authenticated)
1. **Token Validation**: JWT token must be valid and not expired
2. **Password Verification**: Current password must match
3. **Password Strength**: Enforce minimum 6 characters (consider stronger rules in production)
4. **Session Management**: User remains logged in after password change
5. **Password History**: Consider preventing reuse of recent passwords (optional)

---

## Frontend Integration

### Forgot Password UI Flow

```javascript
// Step 1: User enters email
async function requestPasswordReset(email) {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await response.json();

  if (data.success) {
    // Show OTP input screen
    // Store userId for next step
    return data.data.userId;
  }
}

// Step 2: User enters OTP and new password
async function resetPassword(userId, otp, newPassword) {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, otp, newPassword })
  });
  const data = await response.json();

  if (data.success) {
    // Redirect to login page
    // Show success message
  }
}
```

### Change Password UI Flow

```javascript
// User settings page - change password
async function changePassword(currentPassword, newPassword, authToken) {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await response.json();

  if (data.success) {
    // Show success message
    // User stays logged in
  } else {
    // Show error (wrong current password, etc.)
  }
}
```

---

## Best Practices

### For Forgot Password
1. Always send OTP to verified contact method (email/phone)
2. Log password reset attempts for security auditing
3. Implement CAPTCHA to prevent abuse
4. Consider sending notification email when password is reset
5. Invalidate all active sessions after password reset (optional)

### For Change Password
1. Require re-authentication for sensitive operations
2. Log password change events
3. Send confirmation email after password change
4. Consider adding 2FA for password changes
5. Keep user logged in after password change for better UX

---

## Common Questions

### Q: Why two different flows?
**A:** Different security requirements:
- **Forgot Password**: User can't log in, needs OTP for identity verification
- **Change Password**: User is already authenticated, just needs current password

### Q: Can I use change-password if I forgot my password?
**A:** No, you must use the forgot-password flow. Change-password requires authentication and current password.

### Q: What happens to my active sessions after password change?
**A:** Currently, the user stays logged in. In production, you may want to invalidate all other sessions for security.

### Q: How long is the OTP valid?
**A:** 10 minutes from the time it's generated.

### Q: Can I reuse an OTP?
**A:** No, each OTP is single-use. Once used, it's marked as invalid.

---

## Production Checklist

Before deploying to production:

- [ ] Replace dummy OTP `000000` with real OTP generation
- [ ] Integrate SMS/Email service for OTP delivery
- [ ] Implement rate limiting on both endpoints
- [ ] Add CAPTCHA to forgot-password endpoint
- [ ] Set up password strength requirements
- [ ] Configure OTP expiry time (default: 10 minutes)
- [ ] Set up monitoring and alerts for password reset attempts
- [ ] Add logging for security audits
- [ ] Consider session invalidation strategy
- [ ] Test email/SMS delivery in all scenarios

---

## Support

For additional help:
- Check the main [NEW_FEATURES_README.md](NEW_FEATURES_README.md)
- Review [POSTMAN_GUIDE.md](POSTMAN_GUIDE.md)
- Import and test with Postman Collection
