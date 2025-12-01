# Cheerio Web Scraping Guide

This guide provides a comprehensive overview of how web scraping is implemented using Cheerio in the Scan2Card project for contact information extraction.

## Table of Contents

1. [What is Cheerio?](#what-is-cheerio)
2. [Cheerio vs Puppeteer](#cheerio-vs-puppeteer)
3. [Scraping Architecture](#scraping-architecture)
4. [Data Flow Process](#data-flow-process)
5. [Input Format Detection](#input-format-detection)
6. [Extraction Methods](#extraction-methods)
7. [Contact Data Structure](#contact-data-structure)
8. [Code Implementation Details](#code-implementation-details)
9. [Error Handling](#error-handling)
10. [Performance Optimization](#performance-optimization)
11. [Usage Examples](#usage-examples)

---

## What is Cheerio?

**Cheerio** is a fast, flexible, and lean implementation of jQuery designed specifically for server-side HTML parsing. It's not a full web browser - just an HTML/XML parser that provides jQuery-like syntax for traversing and manipulating the document.

### Key Features
- ⚡ **Lightning Fast**: Parses HTML in milliseconds
- 💾 **Lightweight**: ~22KB minified, no browser dependencies
- 🎯 **jQuery Syntax**: Familiar selector API
- 🚀 **Server-Side**: Runs in Node.js without browser overhead
- 🔧 **Extensible**: Easy to add custom plugins

### Why Use Cheerio for Scraping?

```javascript
const cheerio = require('cheerio');

// Load HTML
const $ = cheerio.load('<h1>Hello World</h1>');

// Use jQuery-like selectors
console.log($('h1').text()); // "Hello World"
console.log($('h1').attr('class')); // undefined
```

---

## Cheerio vs Puppeteer

| Aspect | Cheerio | Puppeteer |
|--------|---------|-----------|
| **Speed** | ⚡ ~50-500ms | 🐌 3-15 seconds |
| **Resources** | 💾 ~20MB | 💾 ~300MB+ |
| **JavaScript** | ❌ No | ✅ Yes |
| **Dependencies** | 📦 cheerio only | 📦 puppeteer + Chromium |
| **Dynamic Content** | ❌ Static only | ✅ Handles React/SPA |
| **Use Case** | 📄 Static HTML scraping | 🌐 Full browser automation |

---

## Scraping Architecture

The Cheerio-based scraper uses a **pipeline architecture**:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input Data    │───▶│  Format Detect  │───▶│  Data Extract   │
│                 │    │                 │    │                 │
│ • URLs          │    │ • vCard         │    │ • Name          │
│ • vCard Strings │    │ • Contact URL   │    │ • Email         │
│ • Contact Links │    │ • Direct String │    │ • Phone         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                    │
                                                    ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Data Validate  │───▶│   Clean Data    │───▶│  Score/Rank     │
│                 │    │                 │    │                 │
│ • Regex Validate│    │ • Trim/Sanitize │    │ • Completeness  │
│ • Type Check    │    │ • Default Fill  │    │ • Quality       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Data Flow Process

### 1. Input Reception
The scraper accepts various input formats:

**QR Code Content Examples:**
- `https://example.com/business-card`
- `BEGIN:VCARD\nFN:John Doe\nEMAIL:john@example.com\nEND:VCARD`
- `mailto:contact@example.com?subject=Business Inquiry`
- `tel:+1234567890`
- `john@example.com`

### 2. Auto-Detection Pipeline

```typescript
async extractContactInfo(qrUrl: string, options?: ExtractorOptions) {
  // Check if input is vCard format
  if (qrUrl.startsWith('BEGIN:VCARD')) {
    return this.parseVCard(qrUrl, options);
  }

  // Check if input contains contact indicators
  if (this.isContactString(qrUrl)) {
    return this.parseContactString(qrUrl, options);
  }

  // Default: treat as URL and scrape
  return this.processUrlWithRetry(qrUrl, options);
}
```

### 3. Format Detection Rules

| Input Pattern | Detection Method | Processing Method |
|---------------|------------------|-------------------|
| Starts with `BEGIN:VCARD` | String prefix match | `parseVCard()` |
| Contains `@` (not in URL) | Regex `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b` | `parseContactString()` |
| Starts with `mailto:` | Protocol check | `parseContactString()` |
| Starts with `tel:` | Protocol check | `parseContactString()` |
| Contains URL patterns | Protocol validation | `processUrlWithRetry()` |

---

## Input Format Detection

### vCard Detection
```typescript
if (qrUrl.startsWith('BEGIN:VCARD')) {
  return this.parseVCard(qrUrl, opts);
}
```

### Contact String Detection
```typescript
isContactString(str: string): boolean {
  return str.includes('@') || str.includes('tel:') || str.includes('mailto:');
}
```

### URL Validation
```typescript
function isValidUrl(string: string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}
```

---

## Extraction Methods

### Method 1: parseVCard() - vCard Processing

**Input Example:**
```
BEGIN:VCARD
VERSION:3.0
FN:John Doe
ORG:Example Corp
TITLE:CEO
TEL:+1234567890
EMAIL:john@example.com
URL:https://example.com
ADR:;;123 Business St;City;State;12345;Country
END:VCARD
```

**Processing Logic:**
```typescript
private parseVCard(vCardData: string, opts: ExtractorOptions): QRResponse {
  const vcard: VCardData = {};
  const lines = vCardData.split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.includes(':'));

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    const key = line.substring(0, colonIndex).toUpperCase().split(';')[0];
    const value = line.substring(colonIndex + 1).trim();

    switch (key) {
      case 'FN': vcard.fn = value; break;
      case 'N': vcard.n = value; break;
      case 'ORG': vcard.org = value; break;
      case 'TITLE': vcard.title = value; break;
      case 'TEL': vcard.tel = [...(vcard.tel || []), value]; break;
      case 'EMAIL': vcard.email = value; break;
      case 'URL': vcard.url = value; break;
      case 'ADR': vcard.adr = value; break;
      case 'NOTE': vcard.note = value; break;
    }
  }

  return this.convertVCardToResponse(vcard, opts);
}
```

### Method 2: parseContactString() - Direct Contact Processing

**Input Examples:**
- `mailto:contact@example.com?subject=Business`
- `tel:+1-555-123-4567`
- `john.doe@example.com`

**Processing Logic:**
```typescript
private parseContactString(contactString: string, opts: ExtractorOptions): QRResponse {
  const details: Partial<ContactDetails> = {};

  if (contactString.startsWith('mailto:')) {
    const emailPart = contactString.replace('mailto:', '');
    const [email, queryString] = emailPart.split('?');
    details.email = email;

    if (queryString) {
      const params = new URLSearchParams(queryString);
      details.notes = params.get('subject') || params.get('body') || '';
    }
  } else if (contactString.startsWith('tel:')) {
    details.phoneNumber = contactString.replace('tel:', '').replace(/[^\d+\-\s()]/g, '');
    details.mobile = details.phoneNumber;
  } else if (contactString.includes('@')) {
    details.email = contactString;
  }

  return this.createResponseFromExtracted(details, opts);
}
```

### Method 3: processUrlWithRetry() - URL Scraping

**Processing Flow:**
```typescript
private async processUrlWithRetry(qrUrl: string, opts: ExtractorOptions) {
  // 1. Resolve shortened URLs
  if (this.isShortUrl(qrUrl)) {
    qrUrl = await this.resolveShortUrl(qrUrl, opts);
  }

  // 2. Fetch HTML content
  const response = await axios.get(qrUrl, {
    timeout: opts.timeout,
    headers: { 'User-Agent': opts.userAgent }
  });

  // 3. Detect content type
  if (response.headers['content-type']?.includes('text/html')) {
    return this.processHtmlResponse(response.data, qrUrl, opts);
  } else if (response.data.includes('BEGIN:VCARD')) {
    return this.parseVCard(response.data, opts);
  }

  return this.createDefaultResponse(qrUrl, opts);
}
```

### Method 4: processHtmlResponse() - HTML Content Extraction

**Business Card Detection:**
```typescript
private isBusinessCard($: cheerio.CheerioAPI): boolean {
  return CONSTANTS.businessCardSelectors.some(selector => $(selector).length > 0) ||
         $('title').text().toLowerCase().includes('contact') ||
         $('body').text().toLowerCase().includes('download vcard');
}
```

**HTML Selector Strategy:**
```typescript
const SELECTORS = {
  name: [
    'h1:first-of-type',
    'h2:first-of-type',
    '.vcard-name',
    '.business-card-name',
    '.contact-name',
    '[class*="name"]:not([class*="file"]):not([class*="user"])'
  ],
  position: [
    'h1 + h2',
    'h1 + h3',
    '[class*="title"]:not([class*="page"]):not([class*="head"])',
    '[class*="position"]',
    '[class*="job"]'
  ],
  company: [
    '.company',
    '.organization',
    '[class*="company"]',
    '[class*="org"]',
    'h3:not([class*="name"])'
  ]
};
```

### Method 5: Regex Pattern Matching

**Email Extraction:**
```typescript
private extractContactFromText(text: string): Partial<ContactDetails> {
  const details: Partial<ContactDetails> = {};

  // Email pattern
  const emailMatches = text.match(PATTERNS.email);
  if (emailMatches) {
    details.email = emailMatches[0];
  }

  // Phone patterns (multiple regex patterns)
  for (const pattern of PATTERNS.phone) {
    const matches = text.match(pattern);
    if (matches) {
      const validPhone = matches.find(phone =>
        phone.replace(/[^\d]/g, '').length >= 7 &&
        phone.replace(/[^\d]/g, '').length <= 15
      );
      if (validPhone) {
        details.phoneNumber = validPhone.trim();
        break;
      }
    }
  }

  return details;
}
```

---

## Contact Data Structure

The scraper extracts data into this TypeScript interface:

```typescript
interface ContactDetails {
  title: string;                    // Mr., Ms., Dr., etc.
  firstName: string;               // Primary first name
  lastName: string;                // Primary last name
  company: string;                 // Organization name
  position: string;                // Job title
  category: 'Visitor' | 'Exhibitor' | 'Press' | 'VIP' | 'Unknown' | 'Other';
  department: string;              // Department within company
  language: string;                // 'English', 'Spanish', etc.
  email: string;                   // Primary email
  phoneNumber: string;             // Primary phone
  mobile: string;                  // Mobile phone
  fax: string;                     // Fax number
  website: string;                 // Company/personal website
  streetName: string;              // Street address
  zipCode: string;                 // Postal code
  city: string;                    // City name
  country: string;                 // Country name
  attachedFiles: Array<{ url: string }>; // Business card images
  review: { rating: number };      // Quality score (1-5)
  notes: string;                   // Additional notes
}
```

### Rating Calculation

```typescript
private calculateRating(email?: string, phone?: string, defaultRating = 0): number {
  if (email && phone) return 4;        // Best: both contact methods
  if (email || phone) return 3;        // Good: one contact method
  return defaultRating || 2;           // Minimal data
}
```

---

## Code Implementation Details

### HTTP Request Configuration

```typescript
const response = await axios.get(url, {
  timeout: opts.timeout || 15000,
  maxRedirects: opts.maxRedirects || 10,
  headers: {
    'User-Agent': opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  },
  responseType: 'text'
});
```

### Error Handling Strategy

```typescript
async processUrlWithRetry(qrUrl: string, opts: ExtractorOptions) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < (opts.retryAttempts || 3); attempt++) {
    try {
      if (this.isShortUrl(qrUrl)) {
        qrUrl = await this.resolveShortUrl(qrUrl, opts);
      }

      return await this.extractFromUrl(qrUrl, opts);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < (opts.retryAttempts || 3) - 1) {
        await this.delay(opts.retryDelay || 1000);
      }
    }
  }

  return this.createDefaultResponse(qrUrl, opts, lastError?.message);
}
```

### Data Validation Rules

**Name Validation:**
```typescript
private isValidName(text: string): boolean {
  return PATTERNS.name.test(text) &&
         !text.toLowerCase().match(/(download|phone|email|address|website|contact|card|call|directions)/);
}
```

**Company Validation:**
```typescript
private isValidCompany(text: string): boolean {
  return text.length >= 2 && text.length <= 100 &&
         !text.includes('@') && !text.match(/^\+?\d/) &&
         !text.toLowerCase().match(/(director|manager|ceo|cto|engineer|download|phone|email)/);
}
```

**Position Validation:**
```typescript
private isValidPosition(text: string): boolean {
  return text.length > 2 && text.length < 100 &&
         CONSTANTS.positionKeywords.some(keyword => text.toLowerCase().includes(keyword));
}
```

---

## Performance Optimization

### 1. Selector Efficiency
- **Specific selectors first**: `h1:first-of-type` before generic `[class*="name"]`
- **Combine selectors**: `$('h1, h2, .name').first()` to find best match
- **Limit results**: `.first()` and `.slice(0,5)` to avoid over-processing

### 2. Regex Optimization
- **Anchored patterns**: `\b` word boundaries prevent false matches
- **Non-greedy**: Minimal matching to avoid over-capturing
- **Multiple patterns**: Fallback patterns for different formats

### 3. Memory Management
- **Stream processing**: No loading entire pages into memory
- **Selective extraction**: Only extract needed elements
- **Early returns**: Stop processing when data found

### 4. Network Optimization
- **Timeout handling**: 15-second default timeout
- **Retry logic**: 3 attempts with exponential backoff
- **User-Agent spoofing**: Headers to avoid bot detection

---

## Error Handling

### Network Error Handling
```typescript
try {
  const response = await axios.get(url, axiosConfig);
  return response;
} catch (error) {
  if (error.code === 'ENOTFOUND') {
    throw new Error(`Domain not found: ${url}`);
  } else if (error.code === 'ECONNREFUSED') {
    throw new Error(`Connection refused: ${url}`);
  } else if (error.response?.status === 404) {
    throw new Error(`Page not found: ${url}`);
  } else {
    throw new Error(`Network error: ${error.message}`);
  }
}
```

### Content Type Validation
```typescript
const contentType = response.headers['content-type'] || '';

if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
  return this.processHtmlResponse(response.data, url, opts);
} else if (contentType.includes('text/plain') && response.data.includes('BEGIN:VCARD')) {
  return this.parseVCard(response.data, opts);
} else {
  throw new Error(`Unsupported content type: ${contentType}`);
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { processQRContact } from './utils/cherrio/cherrio';

// Process a business card URL
const result = await processQRContact('https://example.com/business-card');

console.log(result.details);
// {
//   title: 'Mr.',
//   firstName: 'John',
//   lastName: 'Doe',
//   company: 'Example Corp',
//   position: 'CEO',
//   email: 'john@example.com',
//   phoneNumber: '+1234567890',
//   website: 'https://example.com',
//   review: { rating: 4 }
// }
```

### Advanced Usage with Options

```typescript
const result = await processQRContact('https://example.com/contact', {
  timeout: 10000,
  retryAttempts: 5,
  defaultCategory: 'VIP',
  defaultRating: 3,
  maxRedirects: 5
});
```

### Processing Different Input Types

```typescript
// URL
const urlResult = await processQRContact('https://example.com/vcard');

// vCard string
const vcardResult = await processQRContact(`BEGIN:VCARD
FN:Jane Smith
EMAIL:jane@example.com
END:VCARD`);

// Email link
const emailResult = await processQRContact('mailto:contact@example.com');

// Phone link
const phoneResult = await processQRContact('tel:+1234567890');
```

### Error Handling

```typescript
try {
  const result = await processQRContact('invalid-url');
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
  // Handle specific error types
  if (error.message.includes('timeout')) {
    // Retry with longer timeout
  } else if (error.message.includes('not found')) {
    // Handle 404
  }
}
```

---

## Integration with Your Project

### Adding to Package.json

```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12",
    "axios": "^1.6.0"
  }
}
```

### Basic Setup

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';

// Quick scraping function for your project
export async function scrapeContactFromUrl(url: string) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    return {
      name: $('h1').first().text().trim(),
      email: $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:', ''),
      phone: $('a[href^="tel:"]').first().attr('href')?.replace('tel:', ''),
      company: $('.company').first().text().trim()
    };
  } catch (error) {
    throw new Error(`Scraping failed: ${error.message}`);
  }
}
```

---

## Best Practices

### 1. Respect Robots.txt
Always check if scraping is allowed before implementing:
```bash
curl https://example.com/robots.txt
```

### 2. Rate Limiting
Implement delays between requests:
```typescript
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
```

### 3. User Agent Rotation
Use realistic user agents to avoid detection:
```typescript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];
```

### 4. Data Validation
Always validate extracted data:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (email && !emailRegex.test(email)) {
  // Invalid email, discard or flag
}
```

### 5. Caching
Cache results to avoid re-scraping:
```typescript
const cache = new Map();

if (cache.has(url)) {
  return cache.get(url);
}

// Scrape and cache
const result = await scrape(url);
cache.set(url, result);
```

---

*Last Updated: December 2025*
