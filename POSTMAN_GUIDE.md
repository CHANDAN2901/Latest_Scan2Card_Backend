# Scan2Card API - Postman Collection Guide

This guide will help you set up and use the Postman collection for testing the Scan2Card API.

## Files Included

1. **Scan2Card_API_Collection.postman_collection.json** - Complete API collection with all endpoints
2. **Scan2Card_Environment.postman_environment.json** - Environment variables for the collection

## Import Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Select `Scan2Card_API_Collection.postman_collection.json`
4. Click **Import**

### 2. Import Environment
1. Click **Import** button again
2. Select `Scan2Card_Environment.postman_environment.json`
3. Click **Import**
4. Select "Scan2Card Environment" from the environment dropdown (top right)

## Getting Started

### Step 1: Set Base URL
The environment is pre-configured with `baseUrl = http://localhost:5000/api`
- Change this if your server runs on a different port or domain

### Step 2: Health Check
Test the API is running:
- Send request: **Health Check** (root folder)
- You should get a 200 OK response

### Step 3: Authentication Flow

#### For Super Admin Access:
1. **Login** (Authentication → Login)
   ```json
   {
     "email": "admin@scan2card.com",
     "password": "your_admin_password"
   }
   ```
2. Copy the `token` from response
3. Set it in environment variable `authToken` OR manually in Authorization header

#### For New User:
1. **Register** (Authentication → Register)
   - Choose role: EXHIBITOR, ENDUSER, or TEAMMANAGER
2. **Login** with credentials
3. Save the token

### Step 4: Update Auth Token
After login, the token needs to be set in requests:
- **Option A (Recommended)**: Set `authToken` environment variable
  - Click eye icon (top right)
  - Edit `authToken` value
  - Paste your JWT token

- **Option B**: Each request uses `{{authToken}}` automatically if set in environment

## API Collections Overview

### 🔐 Authentication
- **Register** - Create new user account
- **Login** - Get JWT token
- **Verify OTP** - For 2FA enabled accounts
- **Get Profile** - Get current user details

### 👨‍💼 Admin (SUPERADMIN Only)
Manage exhibitors and view system-wide analytics:

#### Dashboard
- Get Dashboard Stats
- Get Events Trend (7/30/90/365 days)
- Get Leads Trend
- Get License Keys Trend

#### Exhibitors
- Create Exhibitor
- Get All Exhibitors (with pagination & search)
- Get Exhibitor by ID
- **Get Exhibitor Keys** - View all license keys with usage stats ⭐ NEW
- Update Exhibitor
- Delete Exhibitor (soft delete)
- Get Top Performers

### 🎪 Events (EXHIBITOR Only)
Manage events and license keys:

#### Dashboard
- Get Exhibitor Dashboard Stats
- Get Top Events by Leads
- Get Leads Trend

#### Event CRUD
- Create Event
- Get All Events
- Get Event by ID
- Update Event
- Delete Event

#### License Keys
- Generate License Key (single)
- Bulk Generate License Keys (from CSV)
- Get License Keys

### 🎟️ RSVP
User registration for events:
- Validate License Key
- Create RSVP (register with key)
- Get My RSVPs
- Get RSVP by ID
- Cancel RSVP
- Get Event RSVPs (Exhibitor only)

### 📊 Leads (ENDUSER or EXHIBITOR)
Lead capture and management:
- **Scan Business Card** - Extract data from business card image using AI ⭐ NEW
- Create Lead
- Get All Leads
- Get Lead Stats
- Get Lead by ID
- Update Lead
- Delete Lead

### 🤝 Meetings (ENDUSER Only)
Schedule and manage meetings:
- Create Meeting
- Get All Meetings
- Get Meeting by ID
- Update Meeting
- Delete Meeting

### 👤 Profile (All Users)
User profile management:
- Update Profile
- Change Password
- Toggle 2FA (Two-Factor Authentication)
- Submit Feedback
- Get My Feedback

### 💬 Feedback (SUPERADMIN Only)
Admin feedback management:
- Get All Feedback (with filters)
- Get Feedback Stats
- Update Feedback Status

### 👥 Team Manager (TEAMMANAGER Only)
Team performance and management:
- Get Dashboard Stats
- Get Leads Graph
- Get All Leads (team)
- Get Team Members
- Get Member Leads
- Get My Events
- Get Team Meetings

## Role-Based Access

| Role | Access |
|------|--------|
| **SUPERADMIN** | Full access to Admin endpoints, Feedback management |
| **EXHIBITOR** | Events, License Keys, Leads, Profile |
| **TEAMMANAGER** | Team management, Team leads, Events assigned |
| **ENDUSER** | Meetings, Leads, RSVP, Profile |

## Common Workflows

### Workflow 1: Create Event & Generate Keys (Exhibitor)
1. Login as EXHIBITOR
2. Create Event
3. Save `eventId` from response
4. Generate License Keys (single or bulk)
5. View keys using "Get License Keys"

### Workflow 2: User Event Registration
1. Login as ENDUSER
2. Validate License Key
3. Create RSVP with valid key
4. View "My RSVPs"

### Workflow 3: Admin View Exhibitor Keys ⭐ NEW
1. Login as SUPERADMIN
2. Get All Exhibitors
3. Note the exhibitor's `_id` and `keyCount`
4. Use "Get Exhibitor Keys" with exhibitor ID
5. View detailed usage statistics for all keys

### Workflow 4: Business Card Scanning & Lead Creation ⭐ NEW
1. Login as ENDUSER or EXHIBITOR
2. Convert business card image to base64
3. Use "Scan Business Card" endpoint
4. Review extracted data from response
5. Use "Create Lead" with the extracted data
6. Optionally create meeting linked to lead

### Workflow 5: Lead Capture & Meeting
1. Login as ENDUSER
2. Create Lead (capture contact info)
3. Save `leadId`
4. Create Meeting linked to lead
5. Manage meetings through Meetings endpoints

## Query Parameters

### Pagination
Most list endpoints support:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `search` - Search term (where applicable)

Example:
```
GET {{baseUrl}}/admin/exhibitors?page=1&limit=20&search=tech
```

### Date Ranges
Dashboard trend endpoints:
- `days` - Number of days (7, 30, 90, 365)

Example:
```
GET {{baseUrl}}/admin/dashboard/trends/events?days=30
```

## Testing Tips

### 1. Use Collection Variables
Store commonly used IDs in environment:
- `exhibitorId`
- `eventId`
- `leadId`
- `meetingId`
- `rsvpId`

### 2. Test Sequences
Create a test sequence folder for complete workflows:
1. Register → Login → Create Event → Generate Keys → Create RSVP

### 3. Save Responses
Use Postman's "Save Response" feature to keep example responses

### 4. Pre-request Scripts
Add scripts to auto-extract IDs from responses:
```javascript
// In Tests tab
const response = pm.response.json();
pm.environment.set("eventId", response.data._id);
```

### 5. Status Codes
Expected responses:
- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

## Troubleshooting

### Token Expired
- Re-login to get new token
- Update `authToken` environment variable

### 403 Forbidden
- Check if your role has access to this endpoint
- Verify you're using the correct user account

### 404 Not Found
- Verify the ID exists in database
- Check if resource was soft-deleted

### Connection Refused
- Ensure backend server is running: `npm run dev`
- Check PORT in .env file matches baseUrl

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:5000/api` |
| `authToken` | JWT authentication token | Set after login |
| `superAdminEmail` | Admin email | `admin@scan2card.com` |
| `exhibitorId` | Current exhibitor ID | Auto-set from responses |
| `eventId` | Current event ID | Auto-set from responses |
| `leadId` | Current lead ID | Auto-set from responses |
| `meetingId` | Current meeting ID | Auto-set from responses |
| `rsvpId` | Current RSVP ID | Auto-set from responses |

## 🎯 Business Card Scanning Feature ⭐ NEW

### Overview
The business card scanning feature uses OpenAI Vision API to automatically extract contact information from business card images.

### Setup Requirements
1. Add `OPENAI_API_KEY` to your `.env` file
2. Get your API key from: https://platform.openai.com/api-keys

### How to Test

#### Step 1: Convert Image to Base64
```javascript
// Using JavaScript/Node.js
const fs = require('fs');
const imageBuffer = fs.readFileSync('business-card.jpg');
const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
```

Or use online tools:
- https://base64.guru/converter/encode/image
- https://www.base64-image.de/

#### Step 2: Test Scan Endpoint
**Request:**
```
POST http://localhost:5000/api/leads/scan-card
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business card scanned successfully",
  "data": {
    "scannedCardImage": "data:image/jpeg;base64,...",
    "ocrText": "Raw extracted text",
    "details": {
      "firstName": "John",
      "lastName": "Doe",
      "company": "Tech Corp",
      "position": "CEO",
      "email": "john@techcorp.com",
      "phoneNumber": "+1234567890",
      "website": "https://techcorp.com",
      "address": "123 Tech St",
      "city": "San Francisco",
      "country": "USA"
    },
    "confidence": 0.95
  }
}
```

#### Step 3: Create Lead with Extracted Data
Copy the extracted data and use it in the "Create Lead" endpoint.

### Image Requirements
- **Formats:** JPEG, PNG, WebP
- **Max Size:** 20MB
- **Recommended:** Under 5MB, resolution 800x600+
- **Quality:** Clear text, good lighting

### Cost
- ~$0.01-0.03 per scan
- 100 scans ≈ $2
- See: https://openai.com/pricing

### Troubleshooting
- **Missing API Key:** Add to `.env` and restart server
- **Low Confidence:** Use higher quality images
- **Rate Limits:** Wait before retrying or upgrade plan

### Full Documentation
See `BUSINESS_CARD_SCANNING.md` for complete documentation.

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify request body matches expected schema
3. Ensure all required fields are provided
4. Check authentication token is valid and not expired

## Version History

### v1.1.0 (Latest)
- **NEW: Business Card Scanning with AI** - OpenAI Vision API integration
- **NEW: Scan Business Card endpoint** - Extract contact info from images
- Complete API collection with 80+ endpoints
- Get Exhibitor Keys endpoint with usage statistics
- Role-based access control
- Dashboard analytics for Admin, Exhibitor, and Team Manager
- RSVP and license key management
- Lead capture and meeting scheduling
- Profile and feedback management
