import { Request, Response } from "express";
import mongoose from "mongoose";
import EventModel from "../models/event.model";
import LeadsModel from "../models/leads.model";
import TeamModel from "../models/team.model";
import UserModel from "../models/user.model";
import RoleModel from "../models/role.model";
import { AuthRequest } from "../middleware/auth.middleware";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Helper function to generate unique license key (fixed 9 characters)
const generateLicenseKey = (): string => {
  return nanoid(9).toUpperCase();
};

// Helper function to create team manager for license
const createTeamManagerForLicense = async (
  email: string,
  exhibitorId: string,
  firstName?: string,
  lastName?: string
) => {
  try {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email, isDeleted: false });
    if (existingUser) {
      return existingUser._id;
    }

    // Get TEAMMANAGER role
    const teamManagerRole = await RoleModel.findOne({ name: "TEAMMANAGER" });
    if (!teamManagerRole) {
      throw new Error("TEAMMANAGER role not found");
    }

    // Extract name from email if not provided
    const emailUsername = email.split("@")[0];
    const defaultFirstName = firstName || emailUsername.split(".")[0] || "Team";
    const defaultLastName = lastName || emailUsername.split(".")[1] || "Manager";

    // Create password (same as email for testing)
    const hashedPassword = await bcrypt.hash(email, 10);

    // Create team manager user
    const teamManager = await UserModel.create({
      firstName: defaultFirstName.charAt(0).toUpperCase() + defaultFirstName.slice(1),
      lastName: defaultLastName.charAt(0).toUpperCase() + defaultLastName.slice(1),
      email,
      password: hashedPassword,
      role: teamManagerRole._id,
      exhibitorId,
      isActive: true,
      isDeleted: false,
    });

    console.log(`✅ Team Manager created: ${email} (Password: ${email})`);
    return teamManager._id;
  } catch (error: any) {
    console.error("❌ Create team manager error:", error);
    throw error;
  }
};

// Create Event (Exhibitor only)
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { eventName, description, type, startDate, endDate, location } = req.body;
    const exhibitorId = req.user?.userId;

    // Validation
    if (!eventName || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "eventName, type, startDate, and endDate are required",
      });
    }

    // Validate event type
    if (!["Offline", "Online", "Hybrid"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be Offline, Online, or Hybrid",
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    const event = await EventModel.create({
      eventName,
      description,
      type,
      startDate: start,
      endDate: end,
      location,
      exhibitorId,
      licenseKeys: [],
      isActive: true,
      isDeleted: false,
    });

    await event.populate("exhibitorId", "firstName lastName email companyName");

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error: any) {
    console.error("❌ Create event error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create event",
    });
  }
};

// Get all events for exhibitor
export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const exhibitorId = req.user?.userId;

    const searchQuery: any = {
      exhibitorId,
      isDeleted: false,
    };

    if (search) {
      searchQuery.$or = [
        { eventName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "location.venue": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const events = await EventModel.find(searchQuery)
      .populate("exhibitorId", "firstName lastName email companyName")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await EventModel.countDocuments(searchQuery);

    return res.status(200).json({
      success: true,
      message: "Events retrieved successfully",
      data: {
        events,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get events error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve events",
    });
  }
};

// Get single event by ID
export const getEventById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exhibitorId = req.user?.userId;

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    }).populate("exhibitorId", "firstName lastName email companyName");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      data: event,
    });
  } catch (error: any) {
    console.error("❌ Get event error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve event",
    });
  }
};

// Update event
export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { eventName, description, type, startDate, endDate, location, isActive } = req.body;
    const exhibitorId = req.user?.userId;

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Validate event type if provided
    if (type && !["Offline", "Online", "Hybrid"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be Offline, Online, or Hybrid",
      });
    }

    // Validate dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : event.startDate;
      const end = endDate ? new Date(endDate) : event.endDate;
      
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Update fields
    if (eventName) event.eventName = eventName;
    if (description !== undefined) event.description = description;
    if (type) event.type = type;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (location) event.location = location;
    if (typeof isActive === "boolean") event.isActive = isActive;

    await event.save();

    await event.populate("exhibitorId", "firstName lastName email companyName");

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error: any) {
    console.error("❌ Update event error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update event",
    });
  }
};

// Delete event (soft delete)
export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exhibitorId = req.user?.userId;

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    event.isDeleted = true;
    event.isActive = false;
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete event error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete event",
    });
  }
};

// Generate license key for event
export const generateLicenseKeyForEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { stallName, email, maxActivations = 1, expiresAt } = req.body;
    const exhibitorId = req.user?.userId;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Expiration date is required",
      });
    }

    // Validate expiration date
    const expirationDate = new Date(expiresAt);
    if (isNaN(expirationDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiration date format",
      });
    }

    if (expirationDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Expiration date must be in the future",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Create team manager account
    const teamManagerId = await createTeamManagerForLicense(email, exhibitorId!);

    // Add to event's licenseKeys array
    event.licenseKeys.push({
      key: licenseKey,
      stallName,
      email,
      teamManagerId,
      expiresAt: expirationDate,
      isActive: true,
      maxActivations: Number(maxActivations),
      usedCount: 0,
      usedBy: [],
      paymentStatus: "pending",
    });

    await event.save();

    return res.status(201).json({
      success: true,
      message: "License key generated and team manager created successfully",
      data: {
        licenseKey,
        stallName,
        email,
        expiresAt: expirationDate,
        maxActivations,
        teamManagerId,
        credentials: {
          email,
          password: email,
          note: "Password is same as email for testing purposes",
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Generate license key error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate license key",
    });
  }
};

// Bulk generate license keys from CSV
export const bulkGenerateLicenseKeys = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { licenseKeys } = req.body; // Array of { stallName, email, maxActivations, expiresInDays }
    const exhibitorId = req.user?.userId;

    if (!licenseKeys || !Array.isArray(licenseKeys) || licenseKeys.length === 0) {
      return res.status(400).json({
        success: false,
        message: "License keys array is required",
      });
    }

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const generatedKeys: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < licenseKeys.length; i++) {
      const { stallName, email, maxActivations = 1, expiresAt } = licenseKeys[i];

      // Validate email - now required
      if (!email) {
        errors.push({ row: i + 1, error: "Email is required" });
        continue;
      }

      if (!emailRegex.test(email)) {
        errors.push({ row: i + 1, error: "Invalid email format", email });
        continue;
      }

      // Validate expiration date
      if (!expiresAt) {
        errors.push({ row: i + 1, error: "Expiration date is required" });
        continue;
      }

      const expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        errors.push({ row: i + 1, error: "Invalid date format", expiresAt });
        continue;
      }

      if (expirationDate <= new Date()) {
        errors.push({ row: i + 1, error: "Expiration date must be in the future" });
        continue;
      }

      try {
        // Generate license key
        const licenseKey = generateLicenseKey();

        // Create team manager account
        const teamManagerId = await createTeamManagerForLicense(email, exhibitorId!);

        // Add to event's licenseKeys array
        event.licenseKeys.push({
          key: licenseKey,
          stallName: stallName || "",
          email,
          teamManagerId,
          expiresAt: expirationDate,
          isActive: true,
          maxActivations: Number(maxActivations),
          usedCount: 0,
          usedBy: [],
          paymentStatus: "pending",
        });

        generatedKeys.push({
          licenseKey,
          stallName,
          email,
          expiresAt: expirationDate,
          maxActivations,
          teamManagerId,
          credentials: {
            email,
            password: email,
          },
        });
      } catch (error: any) {
        errors.push({ row: i + 1, error: error.message, email });
      }
    }

    await event.save();

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${generatedKeys.length} license keys`,
      data: {
        generatedKeys,
        errors: errors.length > 0 ? errors : undefined,
        totalGenerated: generatedKeys.length,
        totalErrors: errors.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Bulk generate license keys error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate license keys",
    });
  }
};

// Get license keys for an event
export const getLicenseKeys = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exhibitorId = req.user?.userId;

    const event = await EventModel.findOne({
      _id: id,
      exhibitorId,
      isDeleted: false,
    }).select("eventName licenseKeys");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "License keys retrieved successfully",
      data: {
        eventName: event.eventName,
        licenseKeys: event.licenseKeys,
      },
    });
  } catch (error: any) {
    console.error("❌ Get license keys error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve license keys",
    });
  }
};

export const getExhibitorDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const exhibitorId = req.user?.userId;

    // Get total events count
    const totalEvents = await EventModel.countDocuments({
      exhibitorId,
      isDeleted: false,
    });

    // Get active events count (between start and end date)
    const now = new Date();
    const activeEvents = await EventModel.countDocuments({
      exhibitorId,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // Get exhibitor's events
    const exhibitorEvents = await EventModel.find({ 
      exhibitorId,
      isDeleted: false 
    }).select('_id');

    const eventIds = exhibitorEvents.map(event => event._id);

    // Get total leads count for exhibitor's events
    const totalLeads = await LeadsModel.countDocuments({
      eventId: { $in: eventIds },
      isDeleted: false,
    });

    // Get team members count
    const teamMembers = await TeamModel.countDocuments({
      teamManagerId: exhibitorId,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: {
        totalEvents,
        activeEvents,
        totalLeads,
        teamMembers,
      },
    });
  } catch (error: any) {
    console.error("❌ Get exhibitor dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve dashboard stats",
    });
  }
};

export const getTopEventsByLeads = async (req: AuthRequest, res: Response) => {
  try {
    const exhibitorId = req.user?.userId;
    const limit = Number(req.query.limit) || 5;

    // Aggregate events with lead counts
    const topEvents = await EventModel.aggregate([
      {
        $match: {
          exhibitorId: new mongoose.Types.ObjectId(exhibitorId),
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "leads",
          localField: "_id",
          foreignField: "eventId",
          as: "leads",
        },
      },
      {
        $project: {
          eventName: 1,
          type: 1,
          startDate: 1,
          endDate: 1,
          isActive: 1,
          leadCount: {
            $size: {
              $filter: {
                input: "$leads",
                as: "lead",
                cond: { $eq: ["$$lead.isDeleted", false] },
              },
            },
          },
        },
      },
      { $sort: { leadCount: -1 } },
      { $limit: limit },
    ]);

    return res.status(200).json({
      success: true,
      message: "Top events retrieved successfully",
      data: {
        topEvents,
      },
    });
  } catch (error: any) {
    console.error("❌ Get top events error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve top events",
    });
  }
};

export const getLeadsTrend = async (req: AuthRequest, res: Response) => {
  try {
    const exhibitorId = req.user?.userId;
    const days = Number(req.query.days) || 30;

    // Use current date/time to ensure we include today
    const now = new Date();
    
    // End date is end of today (in server's timezone)
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    // Start date is (days-1) ago from today
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    console.log("🎯 Current server time:", now.toISOString());
    console.log("📅 Date range for", days, "days:", { 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });

    // Generate date labels for the period (including today)
    const dateLabels: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dateLabels.push(date.toISOString().split("T")[0]);
    }

    // Get exhibitor's events
    const exhibitorEvents = await EventModel.find({ 
      exhibitorId: new mongoose.Types.ObjectId(exhibitorId),
      isDeleted: false 
    }).select('_id');

    const eventIds = exhibitorEvents.map(event => event._id);

    console.log("🎯 Exhibitor ID:", exhibitorId);
    console.log("📅 Date range:", { startDate, endDate, days });
    console.log("🎪 Event IDs:", eventIds);

    // Aggregate leads by date for exhibitor's events
    const leadsData = await LeadsModel.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log("📊 Leads trend aggregation result:", leadsData);
    console.log("📋 Date labels:", dateLabels);

    const leadsMap = new Map(leadsData.map((item) => [item._id, item.count]));
    const trends = dateLabels.map((date) => ({
      date,
      count: leadsMap.get(date) || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Leads trend retrieved successfully",
      data: { trends },
    });
  } catch (error: any) {
    console.error("❌ Get leads trend error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve leads trend",
    });
  }
};
