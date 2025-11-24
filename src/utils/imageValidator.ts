/**
 * Image Validation Utility
 * Provides functions to validate image formats, sizes, and base64 encoding
 */

// Supported image formats
export const SUPPORTED_IMAGE_FORMATS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Maximum image size (20MB for OpenAI Vision API)
export const MAX_IMAGE_SIZE_MB = 20;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Validates if a string is a valid base64 image
 */
export const isValidBase64Image = (imageData: string): boolean => {
  if (!imageData || typeof imageData !== "string") {
    return false;
  }

  // Check if it's a data URL with proper format
  const dataUrlRegex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
  if (dataUrlRegex.test(imageData)) {
    return true;
  }

  // Check if it's pure base64 (without data URL prefix)
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(imageData) && imageData.length > 100; // Minimum length check
};

/**
 * Extracts the image format from base64 data URL
 */
export const getImageFormat = (imageData: string): string | null => {
  const match = imageData.match(/^data:image\/([a-zA-Z]+);base64,/);
  return match ? match[1] : null;
};

/**
 * Checks if the image format is supported
 */
export const isSupportedFormat = (imageData: string): boolean => {
  const format = getImageFormat(imageData);
  if (!format) {
    // If no format prefix, assume it's base64 and we'll validate later
    return true;
  }

  return SUPPORTED_IMAGE_FORMATS.some((supported) => supported.includes(format.toLowerCase()));
};

/**
 * Calculates the approximate size of a base64 image in bytes
 */
export const getBase64ImageSize = (base64String: string): number => {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, "");

  // Calculate size: (length * 3/4) - padding
  const padding = (base64Data.match(/=/g) || []).length;
  return base64Data.length * 0.75 - padding;
};

/**
 * Validates if the image size is within limits
 */
export const isValidImageSize = (imageData: string): boolean => {
  const sizeInBytes = getBase64ImageSize(imageData);
  return sizeInBytes <= MAX_IMAGE_SIZE_BYTES;
};

/**
 * Comprehensive image validation
 */
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  sizeInMB?: number;
  format?: string;
}

export const validateImage = (imageData: string): ImageValidationResult => {
  // Check if image data exists
  if (!imageData || typeof imageData !== "string") {
    return {
      isValid: false,
      error: "Image data is required",
    };
  }

  // Check if it's valid base64
  if (!isValidBase64Image(imageData)) {
    return {
      isValid: false,
      error: "Invalid image format. Please provide a valid base64 encoded image.",
    };
  }

  // Check format
  if (!isSupportedFormat(imageData)) {
    return {
      isValid: false,
      error: `Unsupported image format. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(", ")}`,
    };
  }

  // Check size
  const sizeInBytes = getBase64ImageSize(imageData);
  const sizeInMB = sizeInBytes / (1024 * 1024);

  if (!isValidImageSize(imageData)) {
    return {
      isValid: false,
      error: `Image size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size of ${MAX_IMAGE_SIZE_MB}MB`,
      sizeInMB,
    };
  }

  // Get format
  const format = getImageFormat(imageData);

  return {
    isValid: true,
    sizeInMB: parseFloat(sizeInMB.toFixed(2)),
    format: format || "unknown",
  };
};

/**
 * Converts a file buffer to base64 data URL
 */
export const bufferToBase64DataUrl = (buffer: Buffer, mimeType: string = "image/jpeg"): string => {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
};

/**
 * Extracts base64 data from data URL
 */
export const extractBase64FromDataUrl = (dataUrl: string): string => {
  if (dataUrl.startsWith("data:")) {
    return dataUrl.split(",")[1];
  }
  return dataUrl;
};
