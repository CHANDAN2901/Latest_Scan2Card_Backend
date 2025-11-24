import OpenAI from "openai";

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

// Interface for extracted business card data
export interface BusinessCardData {
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

// Interface for scan result
export interface ScanResult {
  success: boolean;
  data?: {
    ocrText: string;
    details: BusinessCardData;
    confidence: number;
  };
  error?: string;
}

/**
 * Validates if the image is in base64 format
 */
export const isValidBase64Image = (imageData: string): boolean => {
  // Check if it's a data URL or just base64
  const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
  return base64Regex.test(imageData) || /^[A-Za-z0-9+/=]+$/.test(imageData);
};

/**
 * Ensures the image has the proper data URL prefix
 */
export const formatImageDataUrl = (imageData: string): string => {
  // If it already has the data URL prefix, return as is
  if (imageData.startsWith("data:image/")) {
    return imageData;
  }

  // Otherwise, assume it's JPEG and add the prefix
  return `data:image/jpeg;base64,${imageData}`;
};

/**
 * Validates extracted email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Cleans and formats phone number
 */
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters except + at the start
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Ensure + is only at the start
  if (cleaned.includes("+")) {
    cleaned = "+" + cleaned.replace(/\+/g, "");
  }

  return cleaned;
};

/**
 * Validates and cleans extracted data
 */
const validateAndCleanData = (data: BusinessCardData): BusinessCardData => {
  const cleaned: BusinessCardData = {};

  // Clean and validate each field
  if (data.firstName) cleaned.firstName = data.firstName.trim();
  if (data.lastName) cleaned.lastName = data.lastName.trim();
  if (data.company) cleaned.company = data.company.trim();
  if (data.position) cleaned.position = data.position.trim();

  // Validate email
  if (data.email && isValidEmail(data.email.trim())) {
    cleaned.email = data.email.trim().toLowerCase();
  }

  // Format phone number
  if (data.phoneNumber) {
    cleaned.phoneNumber = formatPhoneNumber(data.phoneNumber);
  }

  // Clean website URL
  if (data.website) {
    let website = data.website.trim().toLowerCase();
    // Add https:// if no protocol specified
    if (!website.startsWith("http://") && !website.startsWith("https://")) {
      website = "https://" + website;
    }
    cleaned.website = website;
  }

  if (data.address) cleaned.address = data.address.trim();
  if (data.city) cleaned.city = data.city.trim();
  if (data.country) cleaned.country = data.country.trim();
  if (data.notes) cleaned.notes = data.notes.trim();

  return cleaned;
};

/**
 * Scans a business card image using OpenAI Vision API
 * @param imageBase64 - Base64 encoded image string (with or without data URL prefix)
 * @returns Scan result with extracted data
 */
export const scanBusinessCard = async (imageBase64: string): Promise<ScanResult> => {
  try {
    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not configured");
      return {
        success: false,
        error: "OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.",
      };
    }

    // Validate image format
    if (!isValidBase64Image(imageBase64)) {
      return {
        success: false,
        error: "Invalid image format. Please provide a valid base64 encoded image.",
      };
    }

    // Format image data URL
    const imageDataUrl = formatImageDataUrl(imageBase64);

    console.log("🔍 Scanning business card with OpenAI Vision API...");

    // Get OpenAI client and call Vision API
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this business card image and extract all visible information.

Please extract the following fields if they are present on the card:
- firstName: First name of the person
- lastName: Last name of the person
- company: Company/organization name
- position: Job title or position
- email: Email address
- phoneNumber: Phone number (with country code if visible)
- website: Website URL
- address: Street address
- city: City name
- country: Country name

Return the data in valid JSON format with only the fields that are found on the card. Use null for missing fields. Do not make assumptions or add data that is not visible on the card.

Example format:
{
  "firstName": "John",
  "lastName": "Doe",
  "company": "Tech Corp",
  "position": "CEO",
  "email": "john@techcorp.com",
  "phoneNumber": "+1234567890",
  "website": "www.techcorp.com",
  "address": "123 Tech Street",
  "city": "San Francisco",
  "country": "USA"
}

Return ONLY the JSON object, no additional text.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for more consistent extraction
    });

    // Extract the response
    const messageContent = response.choices[0]?.message?.content;

    if (!messageContent) {
      return {
        success: false,
        error: "No response from OpenAI API",
      };
    }

    console.log("✅ OpenAI API response received");

    // Parse the JSON response
    let extractedData: BusinessCardData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(messageContent);
      }
    } catch (parseError) {
      console.error("❌ Failed to parse OpenAI response:", messageContent);
      return {
        success: false,
        error: "Failed to parse extracted data from business card",
      };
    }

    // Validate and clean the extracted data
    const cleanedData = validateAndCleanData(extractedData);

    // Calculate confidence based on number of fields extracted
    const totalFields = Object.keys(cleanedData).length;
    const confidence = Math.min(totalFields / 6, 1); // Normalize to 0-1 (6 key fields expected)

    console.log(`✅ Business card scanned successfully. Extracted ${totalFields} fields.`);

    return {
      success: true,
      data: {
        ocrText: messageContent, // Store raw response for reference
        details: cleanedData,
        confidence: parseFloat(confidence.toFixed(2)),
      },
    };
  } catch (error: any) {
    console.error("❌ Error scanning business card:", error);

    // Handle specific OpenAI API errors
    if (error.code === "invalid_api_key") {
      return {
        success: false,
        error: "Invalid OpenAI API key",
      };
    }

    if (error.code === "rate_limit_exceeded") {
      return {
        success: false,
        error: "OpenAI API rate limit exceeded. Please try again later.",
      };
    }

    if (error.code === "insufficient_quota") {
      return {
        success: false,
        error: "OpenAI API quota exceeded. Please check your billing.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to scan business card",
    };
  }
};

/**
 * Batch scan multiple business cards (for future use)
 */
export const batchScanBusinessCards = async (
  images: string[]
): Promise<ScanResult[]> => {
  const results: ScanResult[] = [];

  for (const image of images) {
    const result = await scanBusinessCard(image);
    results.push(result);
  }

  return results;
};
