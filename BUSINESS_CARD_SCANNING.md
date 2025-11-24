# Business Card Scanning Feature

This document explains how to use the business card scanning feature powered by OpenAI Vision API.

## 🎯 Overview

The business card scanning feature automatically extracts contact information from business card images using AI. It supports single-sided cards and returns structured data that can be used to create leads.

## 🔧 Setup

### 1. Install Dependencies

The OpenAI SDK is already installed. If needed, reinstall:

```bash
npm install openai
```

### 2. Configure OpenAI API Key

Add your OpenAI API key to the `.env` file:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

**Get your API key from:** https://platform.openai.com/api-keys

### 3. Verify Configuration

The API key is validated when making scan requests. If missing, you'll get an error response.

## 📡 API Endpoint

### Scan Business Card

**Endpoint:** `POST /api/leads/scan-card`

**Authentication:** Required (Bearer token)

**Roles:** ENDUSER, EXHIBITOR

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // base64 encoded image
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Business card scanned successfully",
  "data": {
    "scannedCardImage": "data:image/jpeg;base64,...",
    "ocrText": "Raw text extracted from the card",
    "details": {
      "firstName": "John",
      "lastName": "Doe",
      "company": "Tech Corp",
      "position": "CEO",
      "email": "john.doe@techcorp.com",
      "phoneNumber": "+1234567890",
      "website": "https://www.techcorp.com",
      "address": "123 Tech Street",
      "city": "San Francisco",
      "country": "USA"
    },
    "confidence": 0.95
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Error message here"
}
```

## 🖼️ Image Requirements

### Supported Formats
- JPEG / JPG
- PNG
- WebP

### Size Limits
- Maximum: 20MB (OpenAI API limit)
- Recommended: Under 5MB for faster processing

### Image Quality
- **Resolution:** Minimum 800x600px recommended
- **Text Clarity:** Text should be clearly readable
- **Lighting:** Good lighting, minimal shadows
- **Orientation:** Card should be upright and centered

### Base64 Encoding

The API accepts images in two formats:

1. **With Data URL prefix:**
   ```
   data:image/jpeg;base64,/9j/4AAQSkZJRg...
   ```

2. **Without prefix (pure base64):**
   ```
   /9j/4AAQSkZJRg...
   ```

## 🔄 Workflow

### Frontend Integration

```javascript
// 1. Capture or upload image
const fileInput = document.getElementById('cardImage');
const file = fileInput.files[0];

// 2. Convert to base64
const reader = new FileReader();
reader.onload = async (e) => {
  const base64Image = e.target.result; // includes data URL prefix

  // 3. Send to API
  const response = await fetch('/api/leads/scan-card', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image: base64Image })
  });

  const result = await response.json();

  if (result.success) {
    // 4. Display extracted data in form
    populateLeadForm(result.data.details);
  }
};
reader.readAsDataURL(file);
```

### Complete Flow

```
User Uploads Image
       ↓
Convert to Base64
       ↓
POST /api/leads/scan-card
       ↓
OpenAI Vision API Processing
       ↓
Data Extraction & Validation
       ↓
Return Structured Data
       ↓
Display in Form (User Review)
       ↓
POST /api/leads (Create Lead)
```

## 📊 Extracted Data Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `firstName` | string | First name | "John" |
| `lastName` | string | Last name | "Doe" |
| `company` | string | Company/Organization | "Tech Corp" |
| `position` | string | Job title | "CEO" |
| `email` | string | Email address (validated) | "john@techcorp.com" |
| `phoneNumber` | string | Phone with country code | "+1234567890" |
| `website` | string | Website URL | "https://techcorp.com" |
| `address` | string | Street address | "123 Tech St" |
| `city` | string | City name | "San Francisco" |
| `country` | string | Country name | "USA" |

## 🎯 Data Validation

The service automatically:

1. **Email Validation:** Checks email format
2. **Phone Formatting:** Cleans and formats phone numbers
3. **URL Formatting:** Adds https:// prefix if missing
4. **Text Cleaning:** Trims whitespace, removes invalid characters

## 📈 Confidence Score

The API returns a confidence score (0-1) based on:
- Number of fields successfully extracted
- Quality of extracted data
- OCR clarity

**Confidence Levels:**
- `0.9 - 1.0`: Excellent (most fields extracted)
- `0.7 - 0.9`: Good (key fields extracted)
- `0.5 - 0.7`: Fair (some fields missing)
- `< 0.5`: Poor (many fields missing)

## 🚨 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `OPENAI_API_KEY not configured` | Missing API key | Add key to .env file |
| `Invalid image format` | Unsupported format | Use JPEG/PNG/WebP |
| `Image size exceeds 20MB` | File too large | Compress image |
| `Rate limit exceeded` | Too many requests | Wait and retry |
| `Invalid API key` | Wrong/expired key | Check API key |
| `Insufficient quota` | OpenAI quota exhausted | Add billing to OpenAI account |

### Error Response Example

```json
{
  "success": false,
  "message": "OpenAI API rate limit exceeded. Please try again later."
}
```

## 💰 Cost Estimation

**OpenAI GPT-4 Vision Pricing:**
- Input: ~$0.01 per image (varies by resolution)
- Typical scan: $0.01 - $0.03

**Monthly Estimates:**
- 100 scans: ~$2
- 1,000 scans: ~$20
- 10,000 scans: ~$200

## 🔐 Security

### Best Practices

1. **API Key Security:**
   - Store in environment variables only
   - Never commit to version control
   - Rotate keys regularly

2. **Image Storage:**
   - Images are not stored by OpenAI after processing
   - Consider implementing your own storage if needed

3. **Rate Limiting:**
   - Implement rate limiting per user
   - Set daily/monthly quotas

4. **Data Privacy:**
   - Inform users about AI processing
   - Comply with GDPR/privacy regulations
   - Don't send sensitive documents

## 🧪 Testing

### Test with cURL

```bash
curl -X POST http://localhost:5000/api/leads/scan-card \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQ..."
  }'
```

### Test with Postman

1. Set method to `POST`
2. URL: `http://localhost:5000/api/leads/scan-card`
3. Headers:
   - `Authorization: Bearer <token>`
   - `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "image": "data:image/jpeg;base64,..."
   }
   ```

### Sample Test Images

For testing, you can:
1. Use real business cards (with permission)
2. Create mock business cards with text editors
3. Use online business card generators

## 📝 Implementation Checklist

- [x] Install OpenAI SDK
- [x] Create business card scanner service
- [x] Add scan endpoint to lead controller
- [x] Update lead routes
- [x] Create image validation utility
- [x] Update environment variables

**Next Steps:**
- [ ] Add OPENAI_API_KEY to your `.env` file
- [ ] Test the endpoint with a business card image
- [ ] Integrate with frontend UI

## 🎨 Frontend Example

### React Component

```jsx
import { useState } from 'react';

function BusinessCardScanner() {
  const [scanning, setScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target.result;

      setScanning(true);
      try {
        const response = await fetch('/api/leads/scan-card', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64Image })
        });

        const result = await response.json();

        if (result.success) {
          setExtractedData(result.data.details);
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error('Scan error:', error);
        alert('Failed to scan business card');
      } finally {
        setScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div>
      <h2>Scan Business Card</h2>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleImageUpload}
        disabled={scanning}
      />

      {scanning && <p>Scanning business card...</p>}

      {extractedData && (
        <div>
          <h3>Extracted Information:</h3>
          <p>Name: {extractedData.firstName} {extractedData.lastName}</p>
          <p>Company: {extractedData.company}</p>
          <p>Position: {extractedData.position}</p>
          <p>Email: {extractedData.email}</p>
          <p>Phone: {extractedData.phoneNumber}</p>
        </div>
      )}
    </div>
  );
}
```

## 🔧 Troubleshooting

### Issue: "OPENAI_API_KEY not configured"
**Solution:** Add the API key to your `.env` file and restart the server.

### Issue: Low confidence scores
**Solutions:**
- Use higher resolution images
- Ensure good lighting
- Make sure text is clearly readable
- Avoid blurry or skewed images

### Issue: Missing fields
**Solutions:**
- Check if information exists on the card
- Try rescanning with better image quality
- Manually fill in missing fields

### Issue: Rate limit errors
**Solutions:**
- Wait before retrying
- Implement request queuing
- Upgrade OpenAI plan if needed

## 📚 Additional Resources

- [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [OpenAI API Pricing](https://openai.com/pricing)
- [Best Practices for Image Processing](https://platform.openai.com/docs/guides/vision/best-practices)

## 🤝 Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify OpenAI API key is valid
3. Test with different images
4. Check OpenAI API status page

## 📄 License

This feature is part of the Scan2Card application.
