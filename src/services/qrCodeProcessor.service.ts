import axios from "axios";
import * as cheerio from "cheerio";
import VCard from "vcard-parser";
// Uncomment and configure if you want LLM fallback
// import OpenAI from "openai";

// Interface for extracted contact data
export interface QRContactData {
  firstName?: string;
  lastName?: string;
  company?: string;
  position?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

// Interface for QR processing result
export interface QRProcessResult {
  success: boolean;
  type: "url" | "vcard" | "plaintext" | "entry_code";
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
  // Match various phone formats
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const match = text.match(phoneRegex);
  return match ? match[0] : undefined;
};

/**
 * Scrapes contact information from a webpage
 */
const fieldMap: Record<string, keyof QRContactData> = {
  // Common alternates for each field
  firstname: "firstName",
  given_name: "firstName",
  lastname: "lastName",
  surname: "lastName",
  org: "company",
  organization: "company",
  company: "company",
  job_title: "position",
  title: "position",
  email: "email",
  mail: "email",
  phone: "phoneNumber",
  tel: "phoneNumber",
  mobile: "phoneNumber",
  website: "website",
  url: "website",
  address: "address",
  street: "address",
  city: "city",
  locality: "city",
  country: "country",
  country_name: "country",
  notes: "notes",
  note: "notes",
};

const scrapeWebpage = async (url: string): Promise<QRContactData> => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Scan2Card/1.0; +http://scan2card.com)",
      },
    });

    // Try JSON first
    if (typeof response.data === "object") {
      const contactData: QRContactData = {};
      for (const [key, value] of Object.entries(response.data)) {
        const mapped = fieldMap[key.toLowerCase()];
        if (mapped && value) contactData[mapped] = String(value);
      }
      // Always store website
      contactData.website = url;
      return contactData;
    }

    // Otherwise, treat as HTML
    const $ = cheerio.load(response.data);
    const contactData: QRContactData = {};

    // Helper to try selectors and map to schema
    const trySelectors = (selectors: string[], field: keyof QRContactData, maxLen = 200) => {
      for (const selector of selectors) {
        const val = $(selector).attr("content") || $(selector).text().trim();
        if (val && val.length < maxLen) {
          contactData[field] = val;
          break;
        }
      }
    };

    trySelectors([
      'meta[property="og:title"]',
      'meta[name="author"]',
      ".name",
      ".person-name",
      "h1",
    ], "firstName", 100);

    // Last name: try to split firstName if possible
    if (contactData.firstName && !contactData.lastName) {
      const parts = contactData.firstName.split(" ");
      if (parts.length >= 2) {
        contactData.firstName = parts[0];
        contactData.lastName = parts.slice(1).join(" ");
      }
    }

    trySelectors([
      'a[href^="mailto:"]',
    ], "email", 100);
    if (!contactData.email) {
      const bodyText = $("body").text();
      contactData.email = extractEmail(bodyText);
    }

    trySelectors([
      'a[href^="tel:"]',
    ], "phoneNumber", 100);
    if (!contactData.phoneNumber) {
      const bodyText = $("body").text();
      contactData.phoneNumber = extractPhone(bodyText);
    }

    trySelectors([
      'meta[property="og:site_name"]',
      ".company",
      ".organization",
    ], "company", 100);

    trySelectors([".title", ".position", ".job-title"], "position", 100);

    trySelectors([
      'meta[property="og:street-address"]',
      'meta[name="address"]',
      ".address",
      ".street-address",
      "address",
    ], "address", 200);

    trySelectors([
      'meta[property="og:locality"]',
      'meta[name="city"]',
      ".city",
      ".locality",
    ], "city", 100);

    trySelectors([
      'meta[property="og:country-name"]',
      'meta[name="country"]',
      ".country",
      ".country-name",
    ], "country", 100);

    trySelectors([
      'meta[name="description"]',
      ".notes",
      ".note",
      "#notes",
    ], "notes", 500);

    // Always store the URL as website
    contactData.website = url;

    // Fallback: Try to parse address/city/country from visible text if not found
    const bodyText = $("body").text();
    // Address: look for patterns like '123 Main St' or '456 Elm Avenue'
    if (!contactData.address) {
      const addressMatch = bodyText.match(/\d+\s+[A-Za-z0-9 .,'#-]+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Boulevard|Blvd|Drive|Dr|Block|Sector)/i);
      if (addressMatch) contactData.address = addressMatch[0];
    }
    // City: look for a capitalized word not matching name/phone/email
    if (!contactData.city) {
      const cityMatch = bodyText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
      if (cityMatch) {
        // Filter out names and known fields
        const filtered = cityMatch.filter(
          (c) =>
            c !== contactData.firstName &&
            c !== contactData.lastName &&
            c !== contactData.company &&
            c !== contactData.position &&
            (!contactData.phoneNumber || !c.includes(contactData.phoneNumber)) &&
            (!contactData.email || !c.includes(contactData.email))
        );
        if (filtered.length > 0) contactData.city = filtered[0];
      }
    }
    // Country: match only from a known list
    if (!contactData.country) {
      const countryMatch = bodyText.match(/\b(?:India|United States|USA|Canada|Australia|UK|United Kingdom|Germany|France|Italy|Spain|China|Japan|Singapore|UAE|United Arab Emirates|[A-Z][a-z]+land)\b/);
      if (countryMatch) contactData.country = countryMatch[0];
    }

    // Remove notes from the response
    if (contactData.notes) {
      delete contactData.notes;
    }

    return contactData;
  } catch (error: any) {
    console.error("Error scraping webpage:", error.message);
    // Return at least the URL
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

    // Do not include notes in the response

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
          confidence: 1.0,
        },
      };
    }

    // Check if it's a URL
    if (isURL(trimmedText)) {
      console.log("🌐 Detected URL in QR code, scraping webpage...");
      const contactData = await scrapeWebpage(trimmedText);

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
          rawData: trimmedText,
          confidence: parseFloat(confidence.toFixed(2)),
        },
      };
    }

    // Check if it's a vCard
    if (isVCard(trimmedText)) {
      console.log("📇 Detected vCard in QR code, parsing...");
      const contactData = parseVCard(trimmedText);

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
          rawData: trimmedText,
          confidence: parseFloat(confidence.toFixed(2)),
        },
      };
    }

    // Treat as plain text
    console.log("📄 Detected plain text in QR code, extracting info...");
    const contactData = parsePlainText(trimmedText);

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
