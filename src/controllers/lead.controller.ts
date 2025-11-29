import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { scanBusinessCard } from "../services/businessCardScanner.service";
import { processQRCode } from "../services/qrCodeProcessor.service";
import * as leadService from "../services/lead.service";

// Scan Business Card
export const scanCard = async (req: AuthRequest, res: Response) => {
  try {
    const { image } = req.body;

    // Validation
    if (!image) {
      return res.status(400).json({
        success: false,
        message: "Image is required. Please provide a base64 encoded business card image.",
      });
    }

    // Validate image is not empty
    if (typeof image !== "string" || image.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid image data",
      });
    }

    console.log("📸 Scanning business card for user:", req.user?.userId);

    // Scan the business card using OpenAI
    const scanResult = await scanBusinessCard(image);

    if (!scanResult.success) {
      return res.status(400).json({
        success: false,
        message: scanResult.error || "Failed to scan business card",
      });
    }

    console.log("✅ Business card scanned successfully");

    // Return the extracted data
    return res.status(200).json({
      success: true,
      message: "Business card scanned successfully",
      data: {
        scannedCardImage: image,
        ocrText: scanResult.data?.ocrText,
        details: scanResult.data?.details,
        confidence: scanResult.data?.confidence,
      },
    });
  } catch (error: any) {
    console.error("❌ Error scanning business card:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while scanning business card",
    });
  }
};

// Create Lead
export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const {
      eventId,
      isIndependentLead,
      leadType = "full_scan",
      scannedCardImage,
      entryCode,
      ocrText,
      details,
      rating,
    } = req.body;
    const userId = req.user?.userId;

    // Validation based on lead type
    if (leadType === "entry_code") {
      if (!entryCode) {
        return res.status(400).json({
          success: false,
          message: "Entry code is required for entry code type leads",
        });
      }
    } else if (leadType === "full_scan") {
      if (!scannedCardImage) {
        return res.status(400).json({
          success: false,
          message: "Scanned card image is required for full scan type leads",
        });
      }
    }

    const lead = await leadService.createLead({
      userId: userId!,
      eventId,
      isIndependentLead,
      leadType,
      scannedCardImage,
      entryCode,
      ocrText,
      details,
      rating,
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get All Leads (with pagination and filters)
export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const {
      page = 1,
      limit = 10,
      eventId,
      isIndependentLead,
      rating,
      search,
    } = req.query;

    const result = await leadService.getLeads({
      userId: userId!,
      userRole: userRole!,
      page: Number(page),
      limit: Number(limit),
      eventId: eventId as string,
      isIndependentLead: isIndependentLead as string,
      rating: rating as string,
      search: search as string,
    });

    return res.status(200).json({
      success: true,
      data: result.leads,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get Lead by ID
export const getLeadById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const lead = await leadService.getLeadById(id, userId!);

    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return res.status(error.message === "Lead not found" ? 404 : 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Update Lead
export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const {
      eventId,
      isIndependentLead,
      leadType,
      scannedCardImage,
      entryCode,
      ocrText,
      details,
      rating,
      isActive,
    } = req.body;

    const lead = await leadService.updateLead(id, userId!, {
      eventId,
      isIndependentLead,
      leadType,
      scannedCardImage,
      entryCode,
      ocrText,
      details,
      rating,
      isActive,
    });

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return res.status(error.message === "Lead not found" ? 404 : 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Delete Lead (Soft Delete)
export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await leadService.deleteLead(id, userId!);

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return res.status(error.message === "Lead not found" ? 404 : 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get Lead Statistics
export const getLeadStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const stats = await leadService.getLeadStats(userId!);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error fetching lead stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Scan QR Code (digital business card)
export const scanQRCode = async (req: AuthRequest, res: Response) => {
  try {
    const { qrText } = req.body;

    // Validation
    if (!qrText || typeof qrText !== "string" || qrText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "QR code text is required. Please provide the decoded QR text.",
      });
    }

    console.log("🔍 Scanning QR code for user:", req.user?.userId);

    // Process the QR code text
    const result = await processQRCode(qrText);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || "Failed to process QR code",
      });
    }

    // Return the extracted data based on type
    if (result.type === "entry_code") {
      return res.status(200).json({
        success: true,
        message: "Entry code detected successfully",
        leadType: "entry_code",
        data: {
          entryCode: result.data?.entryCode,
          rawData: result.data?.rawData,
          confidence: result.data?.confidence,
        },
      });
    }

    // For other types (url, vcard, plaintext)
    return res.status(200).json({
      success: true,
      message: "QR code processed successfully",
      leadType: "full_scan",
      data: {
        details: result.data?.details,
        rawData: result.data?.rawData,
        confidence: result.data?.confidence,
      },
      type: result.type,
    });
  } catch (error: any) {
    console.error("❌ Error scanning QR code:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while scanning QR code",
    });
  }
};

// Get Lead Analytics (Day-wise and Month-wise)
export const getLeadAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { timeZone = "UTC" } = req.query;

    const analytics = await leadService.getLeadAnalytics(
      userId!,
      userRole!,
      timeZone as string
    );

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    console.error("Error fetching lead analytics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
