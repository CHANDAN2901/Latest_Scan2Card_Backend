import VCard from "vcard-parser";
import axios from "axios";
// Uncomment and configure if you want LLM fallback
// import OpenAI from "openai";

// Crawler service URL
const CRAWLER_SERVICE_URL = 'https://scan2card-crawler.onrender.com';

// Interface for extracted contact data
export interface QRContactData {
  title?: string; // Mr., Ms., Dr., etc.
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  department?: string; // Department within company
  email?: string;
  phoneNumber?: string;
  mobile?: string; // Mobile phone (separate from phoneNumber)
  website?: string;
  address?: string;
  streetName?: string; // Street address (alias for address)
  city?: string;
  country?: string;
  uniqueCode?: string; // Optional entry/unique code (9-15 chars)
}

/**
 * Normalizes contact data to ensure all required fields are present with empty strings
 */
const normalizeContactData = (data: QRContactData): QRContactData => {
  const normalized = {
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    company: data.company || '',
    position: data.position || '',
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    website: data.website || '',
    address: data.address || '',
    city: data.city || '',
    country: data.country || '',
    ...data, // Preserve other fields like title, department, etc.
  };

  // Remove uniqueCode from the response
  // (uniqueCode is already passed separately as entryCode)
  delete normalized.uniqueCode;

  return normalized;
};

// Interface for QR processing result
export interface QRProcessResult {
  success: boolean;
  type: "url" | "vcard" | "plaintext" | "entry_code" | "mailto" | "tel";
  data?: {
    details?: QRContactData;
    entryCode?: string;
    rawData: string;
    confidence: number;
  };
  error?: string;
}

/**
 * Detects if text is a URL
 */
const isURL = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Detects if text is a vCard
 */
const isVCard = (text: string): boolean => {
  return text.trim().startsWith("BEGIN:VCARD") && text.includes("END:VCARD");
};

/**
 * Detects if text is just an entry code (short alphanumeric code)
 * Entry codes are typically short (3-30 chars), alphanumeric, and don't contain contact info
 */
const isEntryCode = (text: string): boolean => {
  const trimmed = text.trim();

  // Must be between 3 and 30 characters
  if (trimmed.length < 3 || trimmed.length > 30) {
    return false;
  }

  // Should not contain spaces, newlines, or special characters except hyphen/underscore
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmed)) {
    return false;
  }

  // Should not look like a URL, email, or phone number
  if (trimmed.includes('.') || trimmed.includes('@') || trimmed.includes('/')) {
    return false;
  }

  // If it matches these criteria, it's likely an entry code
  return true;
};

/**
 * Extracts email from text using regex
 */
const extractEmail = (text: string): string | undefined => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : undefined;
};

/**
 * Extracts phone number from text using regex
 */
const extractPhone = (text: string): string | undefined => {
  // Multiple phone regex patterns to catch various formats
  const phonePatterns = [
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,5}/, // US/Canada format with extensions
    /(\+?\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{0,4})/, // International format
    /\+?\d{10,15}/, // Simple international
    /(\(\d{3}\)\s?\d{3}[-.\s]\d{4})/, // (123) 456-7890
    /(\d{3}[-.\s]\d{3}[-.\s]\d{4})/, // 123-456-7890 or 123 456 7890
  ];

  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Clean up the phone number
      const cleaned = match[0].replace(/[^\d+\-\s()]/g, '').trim();
      // Validate: should have at least 7 digits, at most 15
      const digitCount = cleaned.replace(/[^\d]/g, '').length;
      if (digitCount >= 7 && digitCount <= 15) {
        return cleaned;
      }
    }
  }
  return undefined;
};

/**
 * Extracts unique code (9-15 alphanumeric characters) from text
 * Looks for patterns like: code=ABC123, UniqueCode: ABC123, NOTE:UniqueCode=ABC123
 */
const extractUniqueCode = (text: string): string | undefined => {
  // Pattern 1: Key-value pairs (code=, uniqueCode=, unique_code=, entryCode=, entry_code=)
  const keyValuePatterns = [
    /(?:code|uniquecode|unique_code|entrycode|entry_code|uniqueid|unique_id)\s*[=:]\s*([A-Za-z0-9]{9,15})/i,
    /NOTE\s*:\s*(?:code|uniquecode|unique_code)\s*[=:]\s*([A-Za-z0-9]{9,15})/i,
  ];

  for (const pattern of keyValuePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Pattern 2: Standalone alphanumeric code (9-15 chars) on its own line or after label
  const standalonePattern = /\b([A-Za-z0-9]{9,15})\b/g;
  const matches = text.match(standalonePattern);

  if (matches) {
    // Filter out common non-code patterns (phone numbers, emails, URLs)
    for (const match of matches) {
      // Skip if it looks like phone number (too many digits)
      const digitCount = match.replace(/[^\d]/g, '').length;
      if (digitCount > 10) continue;

      // Skip if it's all numbers (likely phone/zip)
      if (/^\d+$/.test(match)) continue;

      // Skip if it's part of email or URL context
      const context = text.substring(Math.max(0, text.indexOf(match) - 10), text.indexOf(match) + match.length + 10);
      if (context.includes('@') || context.includes('http') || context.includes('www')) continue;

      // This looks like a valid unique code
      return match;
    }
  }

  return undefined;
};

/**
 * Parses mailto: link and extracts contact information
 */
const parseMailtoLink = (mailtoLink: string): QRContactData => {
  const contactData: QRContactData = {};

  try {
    // Remove 'mailto:' prefix
    const emailPart = mailtoLink.replace('mailto:', '');
    const email = emailPart.split('?')[0];

    contactData.email = decodeURIComponent(email.trim());
  } catch (error: any) {
    console.error('Error parsing mailto link:', error.message);
  }

  return contactData;
};

/**
 * Parses tel: link and extracts phone number
 */
const parseTelLink = (telLink: string): QRContactData => {
  const contactData: QRContactData = {};

  try {
    // Remove 'tel:' prefix and clean up
    const phoneNumber = telLink
      .replace('tel:', '')
      .replace(/[^\d+\-\s()]/g, '')
      .trim();

    contactData.phoneNumber = phoneNumber;
    contactData.mobile = phoneNumber; // Also set as mobile
  } catch (error: any) {
    console.error('Error parsing tel link:', error.message);
  }

  return contactData;
};

/**
 * Scrapes contact information from a webpage using the crawler service
 */
const scrapeWebpage = async (url: string): Promise<QRContactData> => {
  try {
    console.log(`🌐 Calling crawler service for URL: ${url}`);

    const response = await axios.post(
      `${CRAWLER_SERVICE_URL}/api/crawl`,
      { url },
      {
        timeout: 45000, // 45 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log("✅ Crawler service returned data:", response.data.data);
      return response.data.data as QRContactData;
    } else {
      console.warn("⚠️ Crawler service returned unsuccessful response");
      return { website: url };
    }
  } catch (error: any) {
    console.error("❌ Error calling crawler service:", error.message);

    // Return at least the URL if crawler service fails
    return { website: url };
  }
};


/**
 * Parses vCard data
 */
const parseVCard = (vcardText: string): QRContactData => {
  try {
    const parsed = VCard.parse(vcardText);
    const contactData: QRContactData = {};

    if (parsed && parsed.fn) {
      // Parse full name
      const fullName = parsed.fn[0].value;
      const nameParts = fullName.split(" ");
      if (nameParts.length >= 2) {
        contactData.firstName = nameParts[0];
        contactData.lastName = nameParts.slice(1).join(" ");
      } else {
        contactData.firstName = fullName;
      }
    }

    // Parse structured name if available
    if (parsed && parsed.n && parsed.n[0]) {
      const n = parsed.n[0].value;
      if (n.length >= 2) {
        contactData.lastName = n[0];
        contactData.firstName = n[1];
      }
    }

    // Parse organization
    if (parsed && parsed.org) {
      contactData.company = parsed.org[0].value;
    }

    // Parse title/position
    if (parsed && parsed.title) {
      contactData.position = parsed.title[0].value;
    }

    // Parse email
    if (parsed && parsed.email) {
      contactData.email = parsed.email[0].value;
    }

    // Parse phone
    if (parsed && parsed.tel) {
      contactData.phoneNumber = parsed.tel[0].value;
    }

    // Parse URL/website
    if (parsed && parsed.url) {
      contactData.website = parsed.url[0].value;
    }

    // Parse address
    if (parsed && parsed.adr && parsed.adr[0]) {
      const addr = parsed.adr[0].value;
      if (Array.isArray(addr)) {
        // addr format: [po-box, extended, street, city, region, postal, country]
        if (addr[2]) contactData.address = addr[2]; // street
        if (addr[3]) contactData.city = addr[3]; // city
        if (addr[6]) contactData.country = addr[6]; // country
      }
    }

    // Parse NOTE field for unique code (optional)
    // Example: NOTE:UniqueCode=ABC123XYZ or NOTE:ABC123XYZ456
    if (parsed && parsed.note && parsed.note[0]) {
      const noteValue = parsed.note[0].value;
      const uniqueCode = extractUniqueCode(noteValue);
      if (uniqueCode) {
        contactData.uniqueCode = uniqueCode;
        console.log(`📌 Extracted unique code from vCard NOTE: ${uniqueCode}`);
      }
    }

    // Also try extracting from the raw vCard text (in case NOTE isn't parsed correctly)
    if (!contactData.uniqueCode) {
      const uniqueCode = extractUniqueCode(vcardText);
      if (uniqueCode) {
        contactData.uniqueCode = uniqueCode;
        console.log(`📌 Extracted unique code from vCard raw text: ${uniqueCode}`);
      }
    }

    return contactData;
  } catch (error: any) {
    console.error("Error parsing vCard:", error.message);
    throw new Error("Failed to parse vCard data");
  }
};

/**
 * Extracts contact info from plain text
 */
const parsePlainText = (text: string): QRContactData => {
  const contactData: QRContactData = {};

  // Extract email
  contactData.email = extractEmail(text);

  // Extract phone
  contactData.phoneNumber = extractPhone(text);

  // Extract unique code (optional)
  const uniqueCode = extractUniqueCode(text);
  if (uniqueCode) {
    contactData.uniqueCode = uniqueCode;
    console.log(`📌 Extracted unique code from plain text: ${uniqueCode}`);
  }

  // Try to extract name from first line
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    // If first line looks like a name (less than 50 chars, no email/phone)
    if (
      firstLine.length < 50 &&
      !firstLine.includes("@") &&
      !firstLine.match(/\d{3}/)
    ) {
      const nameParts = firstLine.split(" ");
      if (nameParts.length >= 2) {
        contactData.firstName = nameParts[0];
        contactData.lastName = nameParts.slice(1).join(" ");
      } else {
        contactData.firstName = firstLine;
      }
    }
  }

  // Do not include notes in the response

  return contactData;
};

/**
 * Processes QR code text and extracts contact information
 */
export const processQRCode = async (
  qrText: string
): Promise<QRProcessResult> => {
  try {
    if (!qrText || qrText.trim().length === 0) {
      return {
        success: false,
        type: "plaintext",
        error: "QR code text is empty",
      };
    }

    const trimmedText = qrText.trim();

    // Check if it's an entry code (do this first as it's the simplest)
    if (isEntryCode(trimmedText)) {
      console.log("🎫 Detected entry code in QR code");
      return {
        success: true,
        type: "entry_code",
        data: {
          entryCode: trimmedText,
          rawData: trimmedText,
          confidence: 1.0
        },
      };
    }

    // Check if it's a mailto: link
    if (trimmedText.toLowerCase().startsWith('mailto:')) {
      console.log("📧 Detected mailto link in QR code");
      const rawContactData = parseMailtoLink(trimmedText);
      const entryCode = rawContactData.uniqueCode || '';
      const contactData = normalizeContactData(rawContactData);

      return {
        success: true,
        type: "mailto",
        data: {
          details: contactData,
          entryCode,
          rawData: trimmedText,
          confidence: contactData.email ? 1.0 : 0.5,
        },
      };
    }

    // Check if it's a tel: link
    if (trimmedText.toLowerCase().startsWith('tel:')) {
      console.log("📞 Detected tel link in QR code");
      const rawContactData = parseTelLink(trimmedText);
      const entryCode = rawContactData.uniqueCode || '';
      const contactData = normalizeContactData(rawContactData);

      return {
        success: true,
        type: "tel",
        data: {
          details: contactData,
          entryCode,
          rawData: trimmedText,
          confidence: contactData.phoneNumber ? 1.0 : 0.5,
        },
      };
    }

    // Check if it's a URL
    if (isURL(trimmedText)) {
      console.log("🌐 Detected URL in QR code, scraping webpage...");
      const rawContactData = await scrapeWebpage(trimmedText);
      const entryCode = rawContactData.uniqueCode || '';
      const contactData = normalizeContactData(rawContactData);

      // Optionally: Use LLM to fill missing fields (uncomment and configure)
      /*
      if (Object.values(contactData).filter(Boolean).length < 6) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = `Extract contact info (firstName, lastName, company, position, email, phoneNumber, website, address, city, country) from this HTML or JSON. Return as JSON.`;
        const llmResult = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: response.data },
          ],
        });
        try {
          const llmJson = JSON.parse(llmResult.choices[0].message.content);
          Object.assign(contactData, llmJson);
        } catch {}
      }
      */

      // Calculate confidence based on fields found
      const fieldCount = Object.values(contactData).filter(
        (v) => v && v.length > 0
      ).length;
      const confidence = Math.min(fieldCount / 10, 1); // Normalize to 0-1 (10 fields)

      return {
        success: true,
        type: "url",
        data: {
          details: contactData,
          entryCode,
          rawData: trimmedText,
          confidence: parseFloat(confidence.toFixed(2)),
        },
      };
    }

    // Check if it's a vCard
    if (isVCard(trimmedText)) {
      console.log("📇 Detected vCard in QR code, parsing...");
      const rawContactData = parseVCard(trimmedText);
      const entryCode = rawContactData.uniqueCode || '';
      const contactData = normalizeContactData(rawContactData);

      // Calculate confidence based on fields found
      const fieldCount = Object.values(contactData).filter(
        (v) => v && v.length > 0
      ).length;
      const confidence = Math.min(fieldCount / 5, 1);

      return {
        success: true,
        type: "vcard",
        data: {
          details: contactData,
          entryCode,
          rawData: trimmedText,
          confidence: parseFloat(confidence.toFixed(2)),
        },
      };
    }

    // Treat as plain text
    console.log("📄 Detected plain text in QR code, extracting info...");
    const rawContactData = parsePlainText(trimmedText);
    const entryCode = rawContactData.uniqueCode || '';
    const contactData = normalizeContactData(rawContactData);

    // Calculate confidence
    const fieldCount = Object.values(contactData).filter(
      (v) => v && v.length > 0
    ).length;
    const confidence = fieldCount > 0 ? Math.min(fieldCount / 3, 1) : 0.3;

    return {
      success: true,
      type: "plaintext",
      data: {
        details: contactData,
        entryCode,
        rawData: trimmedText,
        confidence: parseFloat(confidence.toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error("❌ Error processing QR code:", error);
    return {
      success: false,
      type: "plaintext",
      error: error.message || "Failed to process QR code",
    };
  }
};
