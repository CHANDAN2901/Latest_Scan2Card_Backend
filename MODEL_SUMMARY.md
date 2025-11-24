# Model Summary - Scan2Card Backend

## All Models (Schema-Only, No Business Logic)

### Core Models (5)

#### 1. **user.model.ts** - User Management
- 49 lines
- **Purpose**: Store user information for all 4 roles
- **Key Fields**:
  - `firstName`, `lastName`, `email`, `phoneNumber`
  - `password` (select: false for security)
  - `role` → References Role model
  - `companyName` → For Exhibitors
  - `exhibitorId` → For Team Managers/End Users (parent reference)
  - `team`, `events[]`, `profileImage`, `addedBy`
- **Pagination**: ✅ Enabled

#### 2. **role.model.ts** - Role-Based Access Control
- 26 lines
- **Purpose**: Define 4 fixed user roles
- **Roles**: Super Admin, Exhibitor, Team Manager, End User
- **Key Fields**: `name`, `description`, `isActive`, `isDeleted`
- **Note**: Roles are seeded on startup via `role.service.ts`

#### 3. **event.model.ts** - Event Management
- 70 lines
- **Purpose**: Manage events created by Exhibitors
- **Key Fields**:
  - `eventName`, `description`, `type` (Offline/Online/Hybrid)
  - `startDate`, `endDate`
  - `location` → { venue, address, city }
  - `licenseKeys[]` → Array of license keys with:
    - `key`, `stallName`, `expiresAt`, `isActive`
    - `maxActivations`, `usedCount`, `usedBy[]`
  - `exhibitorId` → Event owner
- **Pagination**: ✅ Enabled

#### 4. **leads.model.ts** - Lead Collection
- 66 lines
- **Purpose**: Store scanned business card data
- **Key Fields**:
  - `userId` → Who collected the lead
  - `eventId` → Optional (null for independent leads)
  - `isIndependentLead` → TRUE if collected without event
  - `scannedCardImage` → URL of the card image
  - `ocrText` → Raw OCR extracted text
  - `details` → { firstName, lastName, company, position, email, phoneNumber, website, address, city, country, notes }
  - `rating` → 1-5 (Cold: 1-2, Warm: 3, Hot: 4-5)
- **Pagination**: ✅ Enabled
- **Special**: Supports independent lead collection (PRD 3.5)

#### 5. **team.model.ts** - Team Management
- 35 lines
- **Purpose**: Manage teams within events
- **Key Fields**:
  - `teamName`, `description`
  - `teamManagerId` → Team Manager who created it
  - `eventId` → Event this team belongs to
  - `members[]` → Array of End User IDs
- **Pagination**: ✅ Enabled

---

### Authentication & Security Models (2)

#### 6. **verification.model.ts** - OTP Verification
- 37 lines
- **Purpose**: Handle email/phone OTP verification
- **Key Fields**:
  - `sentTo` → Email or phone number
  - `otp` → One-time password
  - `otpValidTill` → Timestamp for expiry
  - `source` → "email" or "phoneNumber"
  - `verificationCodeUsed` → Attempt counter
  - `status` → "pending" | "sent" | "failed"
  - `isVerified` → Verification status
- **Pagination**: ✅ Enabled
- **Use Cases**: Signup, Login, Password Reset

#### 7. **tokenBlacklist.model.ts** - JWT Security
- 33 lines
- **Purpose**: Blacklist invalidated JWT tokens
- **Key Fields**:
  - `token` → The JWT token (unique, indexed)
  - `userId` → User who owns the token
  - `expiresAt` → Token expiration (with TTL index)
  - `blacklistedAt` → When it was blacklisted
  - `reason` → "logout" | "password_change" | "account_deletion" | "admin_action"
  - `userAgent`, `ipAddress` → Audit trail
- **Features**:
  - TTL Index: Auto-deletes expired tokens
  - Indexed fields for fast lookup
- **Use Cases**: Logout, Password Change, Account Security

---

### Feature Models (1)

#### 8. **meeting.model.ts** - Meeting/Follow-up Scheduling
- 43 lines
- **Purpose**: Schedule follow-up meetings with leads
- **Key Fields**:
  - `userId` → Who created the meeting
  - `leadId` → Which lead it's for
  - `eventId` → Optional event context
  - `title`, `description`
  - `meetingMode` → "online" | "offline" | "phone"
  - `meetingStatus` → "scheduled" | "completed" | "cancelled" | "rescheduled"
  - `date`, `startTime`, `endTime`
  - `location` → Address or meeting link
  - `notifyAttendees` → Send notifications
- **Pagination**: ✅ Enabled
- **Use Cases**: Lead follow-ups, sales meetings

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Models** | 8 |
| **Core Models** | 5 |
| **Auth/Security Models** | 2 |
| **Feature Models** | 1 |
| **Total Lines** | ~359 lines |
| **Average per Model** | ~45 lines |
| **Business Logic Functions** | 0 (All in services layer) |
| **Models with Pagination** | 7 of 8 |

---

## Model Relationships

```
User
├── belongsTo: Role
├── belongsTo: Team
├── belongsTo: Exhibitor (via exhibitorId)
├── hasMany: Events (if Exhibitor)
├── hasMany: Leads
└── hasMany: Meetings

Event
├── belongsTo: User (Exhibitor)
├── hasMany: Teams
└── hasMany: Leads

Lead
├── belongsTo: User
└── belongsTo: Event (optional)

Team
├── belongsTo: User (Team Manager)
├── belongsTo: Event
└── hasMany: Users (members)

Meeting
├── belongsTo: User
├── belongsTo: Lead
└── belongsTo: Event (optional)

Verification
└── belongsTo: User (optional via addedBy)

TokenBlacklist
└── belongsTo: User
```

---

## Common Fields Across All Models

All models include:
- ✅ `createdAt`, `updatedAt` (timestamps: true)
- ✅ `isActive` (Boolean, default: true)
- ✅ `isDeleted` (Boolean, default: false) - For soft deletion

---

## What's NOT in Models

Following proper MVC architecture:
- ❌ No database connection logic
- ❌ No CRUD operations
- ❌ No business logic
- ❌ No query helpers
- ❌ No validation logic (beyond schema)

**All business logic should go in:**
- `src/services/` - Database operations
- `src/controllers/` - Request handling
- `src/middleware/` - Validation, authentication

---

## Models NOT Included (from old Backend)

These models were not migrated as they're not essential for MVP:
- ❌ `contactUs.model.ts` - Contact form (can add later)
- ❌ `feedback.model.ts` - User feedback (can add later)
- ❌ `report.model.ts` - Report generation (can add later)
- ❌ `module.model.ts` - Module permissions (not needed - we use fixed roles)
- ❌ `rsvp.model.ts` - Event RSVP (unclear use case in current PRD)

**These can be added later if needed!**

---

## Next Steps

To use these models, create services:

```typescript
// Example: src/services/verification.service.ts
import VerificationModel from "../models/verification.model";
import { connectToMongooseDatabase } from "../config/db.config";

export const createVerification = async (data) => {
  await connectToMongooseDatabase();
  return await VerificationModel.create(data);
};

export const verifyOTP = async (sentTo, otp) => {
  await connectToMongooseDatabase();
  const verification = await VerificationModel.findOne({
    sentTo,
    otp,
    isVerified: false,
    otpValidTill: { $gt: Date.now() }
  });

  if (verification) {
    verification.isVerified = true;
    await verification.save();
    return true;
  }
  return false;
};
```
