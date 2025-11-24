# Scan2Card API Documentation

## 🚀 Quick Start

### Base URL
```
http://localhost:5001
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📝 Test Users (Already Created)

Run `npm run seed` to create these test users:

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@scan2card.com | admin123 |
| **Exhibitor** | exhibitor@scan2card.com | exhibitor123 |
| **Team Manager** | manager@scan2card.com | manager123 |
| **End User** | enduser@scan2card.com | enduser123 |

---

## 🔐 Authentication Endpoints

### 1. Register User

**POST** `/api/auth/register`

Register a new user with one of the 4 roles.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "password": "password123",
  "roleName": "End User",
  "companyName": "Optional - for Exhibitors",
  "exhibitorId": "Optional - for Team Managers/End Users"
}
```

**Required Fields:**
- `firstName` (string)
- `lastName` (string)
- `email` (string, valid email)
- `password` (string, min 6 characters)
- `roleName` (string: "Super Admin" | "Exhibitor" | "Team Manager" | "End User")

**Optional Fields:**
- `phoneNumber` (string)
- `companyName` (string) - Required for Exhibitors
- `exhibitorId` (string) - Links Team Managers/End Users to an Exhibitor

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6543210...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "role": {
        "_id": "role_id",
        "name": "End User",
        "description": "Scans attendee cards using OCR and saves lead data."
      },
      "companyName": null
    }
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

---

### 2. Login

**POST** `/api/auth/login`

Login with email and password to get JWT token.

**Request Body:**
```json
{
  "email": "admin@scan2card.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6543210...",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@scan2card.com",
      "phoneNumber": "+1234567890",
      "role": {
        "_id": "role_id",
        "name": "Super Admin",
        "description": "Creates and manages exhibitors. Oversees overall system activity."
      },
      "companyName": null
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Get Profile

**GET** `/api/auth/profile`

Get current logged-in user's profile.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "6543210...",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@scan2card.com",
      "phoneNumber": "+1234567890",
      "role": {
        "_id": "role_id",
        "name": "Super Admin",
        "description": "Creates and manages exhibitors."
      },
      "companyName": null,
      "isActive": true
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access token is required"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## 🏥 Health Check Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

**Success Response (200):**
```json
{
  "status": "OK",
  "message": "Scan2Card Backend is running",
  "timestamp": "2024-11-19T06:00:00.000Z"
}
```

### Root

**GET** `/`

API welcome message.

**Success Response (200):**
```json
{
  "message": "Welcome to Scan2Card API",
  "version": "1.0.0"
}
```

---

## 🔑 JWT Token Structure

When you login, you receive a JWT token with this payload:

```json
{
  "userId": "user_id_here",
  "email": "user@example.com",
  "role": "Super Admin"
}
```

**Token Usage:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🧪 Testing with Postman

### Import Collection

1. Open Postman
2. Click **Import**
3. Select `Scan2Card_Postman_Collection.json`
4. Collection will be imported with all endpoints

### Collection Variables

The collection includes these variables:
- `base_url`: http://localhost:5001
- `access_token`: Auto-saved after login

### Testing Flow

1. **Login** using one of the test accounts
   - Token automatically saved to `access_token` variable
2. **Get Profile** to verify authentication
3. **Register** new users with different roles

---

## 🧪 Testing with cURL

### Register
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "test123",
    "roleName": "End User"
  }'
```

### Login
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@scan2card.com",
    "password": "admin123"
  }'
```

### Get Profile (replace <TOKEN> with actual token)
```bash
curl -X GET http://localhost:5001/api/auth/profile \
  -H "Authorization: Bearer <TOKEN>"
```

---

## ⚠️ Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid credentials or missing token) |
| 403 | Forbidden (invalid/expired token) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 📋 Common Error Messages

### Registration Errors
- "firstName, lastName, email, password, and roleName are required"
- "Invalid email format"
- "Password must be at least 6 characters long"
- "Invalid role. Must be one of: Super Admin, Exhibitor, Team Manager, End User"
- "User with this email already exists"

### Login Errors
- "Email and password are required"
- "Invalid email or password"
- "Your account has been deactivated"

### Authentication Errors
- "Access token is required"
- "Invalid or expired token"
- "Authentication required"
- "Invalid or inactive user"

---

## 🎯 Role-Based Access

### Super Admin
- Full system access
- Manages exhibitors
- Oversees all activities

### Exhibitor
- Creates and manages events
- Generates license keys
- Manages teams

### Team Manager
- Manages team members
- Coordinates scanning activities
- Views team leads

### End User
- Scans business cards
- Collects leads
- Can collect independent leads (without event)

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed test users
npm run seed
```

---

## 📦 Postman Collection Features

- ✅ Auto-saves JWT token after login
- ✅ Pre-configured test scripts
- ✅ Collection variables for easy configuration
- ✅ Request descriptions and examples
- ✅ All 4 test user credentials included

---

## 🌐 Environment Variables

Required in `.env`:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=scan2card_is_here
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📞 Support

For issues or questions, check:
- [README.md](README.md) - Project overview
- [MODELS_ADDED.md](MODELS_ADDED.md) - Database models documentation
- [CHANGES.md](CHANGES.md) - Architectural changes

---

**Happy Testing! 🚀**
