# AWS S3 File Upload - Implementation Guide

## Overview

This guide documents the improved AWS S3 file upload implementation with security, performance, and best practices.

## What Was Improved

### 1. **AWS SDK v3** (Modern & Tree-shakeable)
- ✅ Migrated from deprecated `aws-sdk` v2 to `@aws-sdk/client-s3` v3
- ✅ Smaller bundle size (~95% smaller)
- ✅ Better TypeScript support
- ✅ Modular imports

### 2. **Security Enhancements**
- ✅ **Private by default** - Files are NOT publicly accessible
- ✅ **Signed URLs** - Generate temporary access URLs (1 hour default)
- ✅ **File type validation** - Only allowed MIME types
- ✅ **File extension validation** - Prevents MIME type spoofing
- ✅ **Filename sanitization** - Prevents path traversal attacks
- ✅ **File size limits** - 10MB maximum

### 3. **Performance Improvements**
- ✅ **Direct buffer upload** - No temp files needed
- ✅ **Stream support** - For large files
- ✅ **Async operations** - Non-blocking
- ✅ **Metadata tracking** - Original filename + upload timestamp

### 4. **Better Error Handling**
- ✅ Environment variable validation at startup
- ✅ Detailed error messages
- ✅ Proper cleanup on failures

---

## Installation

### 1. Install Required Packages

```bash
cd Backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install --save-dev @types/uuid
```

### 2. Remove Old AWS SDK (if present)

```bash
npm uninstall aws-sdk
```

---

## Configuration

### 1. Update `.env` File

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=my-scan2card-bucket
```

### 2. AWS IAM Permissions

Your AWS IAM user needs these S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

---

## S3 Folder Organization

The S3 bucket is organized into specialized folders for different types of files:

### Folder Structure

```
your-bucket-name/
├── profile-images/      # User profile photos (single image per user)
├── lead-files/          # Lead-related files (cards, QR codes - max 3 per lead)
└── uploads/             # General uploads (backward compatibility)
```

### Folder Details

1. **profile-images/**
   - Purpose: Store user profile photos
   - File types: Images only (JPEG, PNG, GIF, WebP)
   - Limit: One active profile image per user
   - Expiry: 24 hours signed URL
   - Endpoint: `POST /api/upload/profile-image`

2. **lead-files/**
   - Purpose: Store lead-related images (business cards, QR codes)
   - File types: Images (JPEG, PNG, GIF, WebP) and PDF
   - Limit: Maximum 3 files per lead
   - Expiry: 24 hours signed URL
   - Endpoint: `POST /api/upload/lead-files`

3. **uploads/**
   - Purpose: General file uploads (backward compatibility)
   - File types: All allowed types
   - Limit: 10 files per request
   - Endpoint: `POST /api/upload/single` or `POST /api/upload/multiple`

---

## API Endpoints

### 1. Upload Profile Image (NEW)

```bash
POST /api/upload/profile-image

# Request
curl -X POST http://localhost:5000/api/upload/profile-image \
  -F "file=@my-photo.jpg"

# Response
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "key": "profile-images/my-photo-abc123.jpg",
    "url": "https://bucket.s3.region.amazonaws.com/...", // Signed URL (24h)
    "bucket": "my-bucket",
    "size": 51200,
    "contentType": "image/jpeg"
  }
}
```

### 2. Upload Lead Files (NEW - Max 3 files)

```bash
POST /api/upload/lead-files

# Request - Single file
curl -X POST http://localhost:5000/api/upload/lead-files \
  -F "files=@business-card.jpg"

# Request - Multiple files (max 3)
curl -X POST http://localhost:5000/api/upload/lead-files \
  -F "files=@card-front.jpg" \
  -F "files=@card-back.jpg" \
  -F "files=@qr-code.png"

# Response
{
  "success": true,
  "message": "3 lead files uploaded successfully",
  "data": [
    {
      "key": "lead-files/card-front-abc123.jpg",
      "url": "https://bucket.s3.region.amazonaws.com/...",
      "bucket": "my-bucket",
      "size": 102400,
      "contentType": "image/jpeg"
    },
    {
      "key": "lead-files/card-back-def456.jpg",
      "url": "https://bucket.s3.region.amazonaws.com/...",
      "bucket": "my-bucket",
      "size": 98304,
      "contentType": "image/jpeg"
    },
    {
      "key": "lead-files/qr-code-ghi789.png",
      "url": "https://bucket.s3.region.amazonaws.com/...",
      "bucket": "my-bucket",
      "size": 45056,
      "contentType": "image/png"
    }
  ]
}

# Error - Too many files
{
  "success": false,
  "message": "Maximum 3 files allowed per lead. You uploaded 4 files."
}
```

### 3. Upload Single File (Private)

```bash
POST /api/upload/single

# Request
curl -X POST http://localhost:5000/api/upload/single \
  -F "file=@document.pdf" \
  -F "folder=documents"

# Response
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "key": "documents/document-abc123.pdf",
    "url": "https://bucket.s3.region.amazonaws.com/...", // Signed URL (1h)
    "bucket": "my-bucket",
    "size": 102400,
    "contentType": "application/pdf"
  }
}
```

### 2. Upload Single File (Public)

```bash
POST /api/upload/single

# Request
curl -X POST http://localhost:5000/api/upload/single \
  -F "file=@image.jpg" \
  -F "folder=public-images" \
  -F "makePublic=true"

# Response
{
  "success": true,
  "data": {
    "key": "public-images/image-xyz789.jpg",
    "url": "https://bucket.s3.region.amazonaws.com/public-images/image-xyz789.jpg",
    "publicUrl": "https://bucket.s3.region.amazonaws.com/public-images/image-xyz789.jpg"
  }
}
```

### 3. Upload Multiple Files

```bash
POST /api/upload/multiple

# Request
curl -X POST http://localhost:5000/api/upload/multiple \
  -F "files=@file1.pdf" \
  -F "files=@file2.jpg" \
  -F "files=@file3.png" \
  -F "folder=bulk-uploads"

# Response
{
  "success": true,
  "message": "3 files uploaded successfully",
  "data": [
    { "key": "bulk-uploads/file1-abc.pdf", "url": "..." },
    { "key": "bulk-uploads/file2-def.jpg", "url": "..." },
    { "key": "bulk-uploads/file3-ghi.png", "url": "..." }
  ]
}
```

### 4. Generate New Signed URL

```bash
GET /api/upload/signed-url/:key

# Request
curl http://localhost:5000/api/upload/signed-url/documents/report-123.pdf?expiresIn=7200

# Response
{
  "success": true,
  "message": "Signed URL generated successfully",
  "data": {
    "key": "documents/report-123.pdf",
    "url": "https://bucket.s3.amazonaws.com/...",
    "expiresIn": 7200
  }
}
```

---

## Allowed File Types

### Images
- ✅ JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ GIF (`.gif`)
- ✅ WebP (`.webp`)

### Documents
- ✅ PDF (`.pdf`)
- ✅ Word (`.doc`, `.docx`)
- ✅ Excel (`.xls`, `.xlsx`)

### Text
- ✅ Plain text (`.txt`)
- ✅ CSV (`.csv`)

### Limits
- **Max file size**: 10 MB
- **Max files per request**: 10

---

## Usage Examples

### From Frontend (JavaScript/React)

#### Upload Profile Image (Recommended Workflow)

```javascript
// Step 1: Upload profile image to S3
const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:5000/api/upload/profile-image', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result.data.url; // Returns S3 URL
};

// Step 2: Update user profile with S3 URL
const updateUserProfile = async (imageFile, firstName, lastName) => {
  try {
    // Upload image first
    const imageUrl = await uploadProfileImage(imageFile);

    // Update profile with image URL
    const response = await fetch('http://localhost:5000/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        profileImage: imageUrl, // S3 URL from upload
      }),
    });

    const result = await response.json();
    console.log('Profile updated:', result);
  } catch (error) {
    console.error('Error updating profile:', error);
  }
};
```

#### Upload Lead Files (Recommended Workflow)

```javascript
// Step 1: Upload lead images to S3 (max 3)
const uploadLeadImages = async (files) => {
  if (files.length > 3) {
    throw new Error('Maximum 3 images allowed per lead');
  }

  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const response = await fetch('http://localhost:5000/api/upload/lead-files', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  // Returns array of S3 URLs
  return result.data.map(file => file.url);
};

// Step 2: Create lead with image URLs
const createLead = async (imageFiles, leadDetails) => {
  try {
    // Upload images first
    const imageUrls = await uploadLeadImages(imageFiles);

    // Create lead with image URLs
    const response = await fetch('http://localhost:5000/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN',
      },
      body: JSON.stringify({
        leadType: 'full_scan',
        images: imageUrls, // Array of S3 URLs
        details: leadDetails,
        rating: 5,
      }),
    });

    const result = await response.json();
    console.log('Lead created:', result);
  } catch (error) {
    console.error('Error creating lead:', error);
  }
};

// Example usage
const handleLeadSubmit = async () => {
  const files = [cardFrontImage, cardBackImage, qrCodeImage]; // Max 3
  const details = {
    firstName: 'John',
    lastName: 'Doe',
    company: 'Tech Corp',
    email: 'john@example.com',
  };

  await createLead(files, details);
};
```

#### General File Upload (Legacy)

```javascript
// Single file upload
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'uploads');
  formData.append('makePublic', 'false'); // Private file
  formData.append('expiresIn', '3600'); // 1 hour

  const response = await fetch('http://localhost:5000/api/upload/single', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  console.log('Uploaded:', result.data.url);
};

// Multiple files
const uploadMultiple = async (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('folder', 'documents');

  const response = await fetch('http://localhost:5000/api/upload/multiple', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  console.log('Uploaded:', result.data.length, 'files');
};
```

### From Postman

1. **Upload Profile Image** (NEW)
   - Method: `POST`
   - URL: `http://localhost:5000/api/upload/profile-image`
   - Body: `form-data`
     - Key: `file` (Type: File) - Select an image file

2. **Upload Lead Files** (NEW - Max 3)
   - Method: `POST`
   - URL: `http://localhost:5000/api/upload/lead-files`
   - Body: `form-data`
     - Key: `files` (Type: File) - Select 1-3 image/PDF files

3. **Upload Single File** (General)
   - Method: `POST`
   - URL: `http://localhost:5000/api/upload/single`
   - Body: `form-data`
     - Key: `file` (Type: File)
     - Key: `folder` (Type: Text) - Value: `uploads`
     - Key: `makePublic` (Type: Text) - Value: `false`

4. **Upload Multiple Files** (General)
   - Method: `POST`
   - URL: `http://localhost:5000/api/upload/multiple`
   - Body: `form-data`
     - Key: `files` (Type: File) - Select multiple files
     - Key: `folder` (Type: Text) - Value: `bulk`

---

## Security Best Practices

### 1. **Private Files by Default**
```javascript
// Good: Private by default
await uploadFileToS3(file, { makePublic: false });

// Bad: Making everything public
await uploadFileToS3(file, { makePublic: true });
```

### 2. **Use Signed URLs**
```javascript
// Generate temporary access URL
const signedUrl = await generateSignedUrl('uploads/file.pdf', 3600); // 1 hour
```

### 3. **Validate on Server**
```javascript
// File validation happens automatically in validateFile()
// - File size check
// - MIME type check
// - Extension check
```

### 4. **Sanitize Filenames**
```javascript
// Automatically sanitized in uploadFileToS3()
// "../../etc/passwd" → "etc_passwd"
// "my file!@#$.pdf" → "my_file____.pdf"
```

---

## Error Handling

### Common Errors

#### 1. Missing Environment Variables
```
Error: Missing required AWS environment variables: AWS_ACCESS_KEY_ID, AWS_REGION
```
**Solution**: Add missing variables to `.env` file

#### 2. File Too Large
```
Error: File size exceeds maximum allowed size of 10MB
```
**Solution**: Reduce file size or increase `MAX_FILE_SIZE` in service

#### 3. Invalid File Type
```
Error: File type 'application/exe' is not allowed
```
**Solution**: Only upload allowed file types

#### 4. AWS Credentials Invalid
```
Error: Failed to upload file to S3: The security token included in the request is invalid
```
**Solution**: Check AWS credentials in `.env`

---

## Testing

### Test File Upload

```bash
# Test single file upload
curl -X POST http://localhost:5000/api/upload/single \
  -F "file=@test.pdf" \
  -F "folder=test"

# Test with invalid file type
curl -X POST http://localhost:5000/api/upload/single \
  -F "file=@malware.exe" \
  -F "folder=test"
# Expected: Error - File type not allowed

# Test with large file (>10MB)
curl -X POST http://localhost:5000/api/upload/single \
  -F "file=@large-file.zip" \
  -F "folder=test"
# Expected: Error - File size exceeds limit
```

---

## Migration from Old Code

### Old Code (Problematic)
```typescript
// ❌ Old: Blocking operations, temp files, public by default
const tempPath = path.join(__dirname, '../../tmp', req.file.originalname);
fs.writeFileSync(tempPath, req.file.buffer); // Blocks event loop
const fileUrl = await uploadFileToS3(tempPath);
fs.unlinkSync(tempPath); // Manual cleanup
```

### New Code (Improved)
```typescript
// ✅ New: Direct upload, no temp files, private by default
const result = await uploadFileToS3(req.file, {
  folder: 'uploads',
  makePublic: false,
  expiresIn: 3600
});
```

---

## Troubleshooting

### 1. TypeScript Errors
```bash
# Install type definitions
npm install --save-dev @types/uuid @types/multer
```

### 2. S3 Bucket Policy
Ensure your bucket allows your IAM user to upload:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowUpload",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/YOUR_USER"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

### 3. CORS Configuration
If uploading from browser, add CORS to S3 bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["http://localhost:3000"],
    "ExposeHeaders": []
  }
]
```

---

## Files Changed

1. ✅ **src/services/awsS3.service.ts** - Complete rewrite with AWS SDK v3
2. ✅ **src/controllers/fileUpload.controller.ts** - Updated controller with new service
3. ✅ **src/routes/fileUpload.routes.ts** - Added new endpoints + file limits
4. ✅ **.env.example** - Added AWS configuration variables

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| **AWS SDK** | v2 (deprecated) | v3 (modern) |
| **File Access** | Public by default | Private by default |
| **Temp Files** | Yes (blocking) | No (direct upload) |
| **File Validation** | None | Size + Type + Extension |
| **Filename Security** | None | Sanitized |
| **Error Handling** | Basic | Comprehensive |
| **TypeScript** | Partial | Full types |
| **Performance** | Blocking I/O | Async/streams |
| **Security** | 🔴 Low | 🟢 High |

---

**Last Updated**: December 2025
