import { Request, Response } from "express";
import LeadModel from "../models/leads.model";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";
import { scanBusinessCard } from "../services/businessCardScanner.service";
import { processQRCode } from "../services/qrCodeProcessor.service";

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
      scannedCardImage,
      ocrText,
      details,
      rating,
    } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!scannedCardImage) {
      return res.status(400).json({
        success: false,
        message: "scannedCardImage is required",
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const lead = await LeadModel.create({
      userId,
      eventId,
      isIndependentLead: isIndependentLead || !eventId,
      scannedCardImage,
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

    // Build filter query based on role
    let filter: any = { isDeleted: false };

    if (userRole === "EXHIBITOR") {
      // For exhibitors, get leads from their events
      const EventModel = (await import("../models/event.model")).default;
      const exhibitorEvents = await EventModel.find({
        exhibitorId: userId,
        isDeleted: false,
      }).select("_id");

      const eventIds = exhibitorEvents.map((event) => event._id);
      filter.eventId = { $in: eventIds };
    } else {
      // For end users, only show their own leads
      filter.userId = userId;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (isIndependentLead !== undefined) {
      filter.isIndependentLead = isIndependentLead === "true";
    }

    if (rating) {
      filter.rating = parseInt(rating as string);
    }

    // Search in details
    if (search) {
      filter.$or = [
        { "details.firstName": { $regex: search, $options: "i" } },
        { "details.lastName": { $regex: search, $options: "i" } },
        { "details.company": { $regex: search, $options: "i" } },
        { "details.email": { $regex: search, $options: "i" } },
        { "details.phoneNumber": { $regex: search, $options: "i" } },
      ];
    }

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: 1 }, // Ascending order (oldest first)
      populate: [
        { path: "eventId", select: "eventName type startDate endDate" },
        { path: "userId", select: "firstName lastName email" },
      ],
    };

    const leads = await LeadModel.paginate(filter, options);

    return res.status(200).json({
      success: true,
      data: leads.docs,
      pagination: {
        total: leads.totalDocs,
        page: leads.page,
        limit: leads.limit,
        totalPages: leads.totalPages,
        hasNextPage: leads.hasNextPage,
        hasPrevPage: leads.hasPrevPage,
      },
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

    const lead = await LeadModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    })
      .populate("eventId", "eventName type startDate endDate")
      .populate("userId", "firstName lastName email");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return res.status(500).json({
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
      scannedCardImage,
      ocrText,
      details,
      rating,
      isActive,
    } = req.body;

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const lead = await LeadModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Update fields
    if (eventId !== undefined) lead.eventId = eventId;
    if (isIndependentLead !== undefined)
      lead.isIndependentLead = isIndependentLead;
    if (scannedCardImage !== undefined)
      lead.scannedCardImage = scannedCardImage;
    if (ocrText !== undefined) lead.ocrText = ocrText;
    if (details !== undefined) lead.details = { ...lead.details, ...details };
    if (rating !== undefined) lead.rating = rating;
    if (isActive !== undefined) lead.isActive = isActive;

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return res.status(500).json({
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

    const lead = await LeadModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    lead.isDeleted = true;
    lead.isActive = false;
    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get Lead Statistics
export const getLeadStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const totalLeads = await LeadModel.countDocuments({
      userId,
      isDeleted: false,
    });
    const activeLeads = await LeadModel.countDocuments({
      userId,
      isActive: true,
      isDeleted: false,
    });
    const independentLeads = await LeadModel.countDocuments({
      userId,
      isIndependentLead: true,
      isDeleted: false,
    });
    const eventLeads = await LeadModel.countDocuments({
      userId,
      isIndependentLead: false,
      isDeleted: false,
    });

    // Rating distribution
    const ratingStats = await LeadModel.aggregate([
      { $match: { userId: userId, isDeleted: false, rating: { $exists: true } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        activeLeads,
        independentLeads,
        eventLeads,
        ratingDistribution: ratingStats,
      },
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

    // Return the extracted data
    return res.status(200).json({
      success: true,
      message: "QR code processed successfully",
      data: result.data,
      type: result.type,
      confidence: result.data?.confidence,
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

    // 1. Last 30 Days (Day-wise)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`[Analytics] Fetching for User: ${userId}, Role: ${userRole}, TimeZone: ${timeZone}`);

    let matchStage: any = {
      isDeleted: false,
      createdAt: { $gte: thirtyDaysAgo },
    };

    if (userRole === "EXHIBITOR") {
      const EventModel = (await import("../models/event.model")).default;
      const exhibitorEvents = await EventModel.find({
        exhibitorId: userId,
        isDeleted: false,
      }).select("_id");

      const eventIds = exhibitorEvents.map((event) => event._id);
      matchStage.eventId = { $in: eventIds };
    } else {
      matchStage.userId = new mongoose.Types.ObjectId(userId);
    }

    const dailyStats = await LeadModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timeZone as string },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log('[Analytics] Raw Daily Stats:', JSON.stringify(dailyStats));

    // 2. Last 12 Months (Month-wise)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1); // Start from the 1st of that month

    // Adjust match stage for monthly
    const monthlyMatchStage = { ...matchStage };
    monthlyMatchStage.createdAt = { $gte: twelveMonthsAgo };

    const monthlyStats = await LeadModel.aggregate([
      { $match: monthlyMatchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: timeZone as string },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing dates/months with 0 counts
    const filledDailyStats = fillMissingDates(dailyStats, 30);
    const filledMonthlyStats = fillMissingMonths(monthlyStats, 12);

    return res.status(200).json({
      success: true,
      data: {
        daily: filledDailyStats,
        monthly: filledMonthlyStats,
      },
    });
  } catch (error: any) {
    console.error("Error fetching lead analytics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Helper to fill missing dates
function fillMissingDates(data: any[], days: number) {
  const result = [];
  const map = new Map(data.map((item) => [item._id, item.count]));

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      count: map.get(dateStr) || 0,
    });
  }
  return result;
}

// Helper to fill missing months
function fillMissingMonths(data: any[], months: number) {
  const result = [];
  const map = new Map(data.map((item) => [item._id, item.count]));

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
    result.push({
      month: monthStr,
      count: map.get(monthStr) || 0,
    });
  }
  return result;
}
