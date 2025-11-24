import { NextFunction, Request, Response } from "express";
import { registerUser } from "../services/auth.service";
import UserModel from "../models/user.model";
import RoleModel from "../models/role.model";
import EventModel from "../models/event.model";
import LeadsModel from "../models/leads.model";
import bcrypt from "bcrypt";

type CreateExhibitorBody = {
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  companyName?: string;
  password?: string;
  address?: string;
};

const REQUIRED_FIELDS: Array<keyof CreateExhibitorBody> = ["firstName", "lastName"];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateRandomPassword = (length = 12) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@$%*?";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const sanitizeUser = (user: unknown) => {
  if (!user) return user;
  if (typeof user === "object" && user !== null) {
    const plain =
      typeof (user as any).toJSON === "function" ? (user as any).toJSON() : { ...(user as Record<string, unknown>) };
    delete (plain as Record<string, unknown>).password;
    delete (plain as Record<string, unknown>).salt;
    return plain;
  }
  return user;
};

export const createExhibitor = async (
  req: Request<unknown, unknown, CreateExhibitorBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, phoneNumber, companyName, password, address } = req.body;

    // Validate required fields
    const missingFields = REQUIRED_FIELDS.filter((field) => !req.body?.[field]);
    if (missingFields.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    // Validate at least one contact method
    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "At least one of email or phoneNumber must be provided",
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email ? normalizeEmail(email) : undefined;
    const finalPassword = password || generateRandomPassword();

    const exhibitor = await registerUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(normalizedEmail && { email: normalizedEmail }),
      ...(phoneNumber && { phoneNumber: phoneNumber.trim() }),
      ...(companyName && { companyName: companyName.trim() }),
      password: finalPassword,
      roleName: "EXHIBITOR",
    });

    const responsePayload: Record<string, unknown> = {
      success: true,
      message: "Exhibitor created successfully",
      data: sanitizeUser(exhibitor),
    };

    if (!password) {
      responsePayload.temporaryPassword = finalPassword;
    }

    return res.status(201).json(responsePayload);
  } catch (error: any) {
    console.error("❌ Create exhibitor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create exhibitor",
    });
  }
};

// Get all exhibitors
export const getExhibitors = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    // Find EXHIBITOR role
    const exhibitorRole = await RoleModel.findOne({ name: "EXHIBITOR", isDeleted: false });
    if (!exhibitorRole) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor role not found",
      });
    }

    // Build search query
    const searchQuery: any = {
      role: exhibitorRole._id,
      isDeleted: false,
    };

    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const exhibitors = await UserModel.find(searchQuery)
      .select("-password")
      .populate("role", "name")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await UserModel.countDocuments(searchQuery);

    // Get event counts and key counts for each exhibitor
    const exhibitorsWithEventCount = await Promise.all(
      exhibitors.map(async (exhibitor) => {
        const eventCount = await EventModel.countDocuments({
          exhibitorId: exhibitor._id,
          isDeleted: false,
        });

        // Calculate total license keys created by this exhibitor
        const keyCountResult = await EventModel.aggregate([
          {
            $match: {
              exhibitorId: exhibitor._id,
              isDeleted: false,
            },
          },
          {
            $project: {
              keyCount: { $size: "$licenseKeys" },
            },
          },
          {
            $group: {
              _id: null,
              totalKeys: { $sum: "$keyCount" },
            },
          },
        ]);

        const keyCount = keyCountResult.length > 0 ? keyCountResult[0].totalKeys : 0;

        return {
          ...exhibitor.toJSON(),
          eventCount,
          keyCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Exhibitors retrieved successfully",
      data: {
        exhibitors: exhibitorsWithEventCount,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get exhibitors error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve exhibitors",
    });
  }
};

// Get single exhibitor by ID
export const getExhibitorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exhibitor = await UserModel.findById(id)
      .select("-password")
      .populate("role", "name");

    if (!exhibitor || exhibitor.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Exhibitor retrieved successfully",
      data: exhibitor,
    });
  } catch (error: any) {
    console.error("❌ Get exhibitor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve exhibitor",
    });
  }
};

// Update exhibitor
export const updateExhibitor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phoneNumber, companyName, password, address, isActive } = req.body;

    const exhibitor = await UserModel.findById(id);
    if (!exhibitor || exhibitor.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor not found",
      });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }

      // Check if email is already taken by another user
      const existingUser = await UserModel.findOne({ email, _id: { $ne: id }, isDeleted: false });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use",
        });
      }
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Update fields
    if (firstName) exhibitor.firstName = firstName.trim();
    if (lastName) exhibitor.lastName = lastName.trim();
    if (email) exhibitor.email = normalizeEmail(email);
    if (phoneNumber) exhibitor.phoneNumber = phoneNumber.trim();
    if (companyName !== undefined) exhibitor.companyName = companyName.trim();
    if (typeof isActive === "boolean") exhibitor.isActive = isActive;
    if (password) exhibitor.password = await bcrypt.hash(password, 10);

    await exhibitor.save();

    const updatedExhibitor = await UserModel.findById(id)
      .select("-password")
      .populate("role", "name");

    return res.status(200).json({
      success: true,
      message: "Exhibitor updated successfully",
      data: updatedExhibitor,
    });
  } catch (error: any) {
    console.error("❌ Update exhibitor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update exhibitor",
    });
  }
};

// Delete exhibitor (soft delete)
export const deleteExhibitor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exhibitor = await UserModel.findById(id);
    if (!exhibitor || exhibitor.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor not found",
      });
    }

    exhibitor.isDeleted = true;
    exhibitor.isActive = false;
    await exhibitor.save();

    return res.status(200).json({
      success: true,
      message: "Exhibitor deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete exhibitor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete exhibitor",
    });
  }
};

// Get dashboard stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // Get EXHIBITOR role
    const exhibitorRole = await RoleModel.findOne({ name: "EXHIBITOR", isDeleted: false });
    
    // Count total exhibitors
    const totalExhibitors = await UserModel.countDocuments({
      role: exhibitorRole?._id,
      isDeleted: false,
    });

    // Count active events
    const now = new Date();
    const activeEvents = await EventModel.countDocuments({
      isDeleted: false,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    // Count total leads
    const totalLeads = await LeadsModel.countDocuments({
      isDeleted: false,
    });

    // Count active users (all users who are active)
    const activeUsers = await UserModel.countDocuments({
      isActive: true,
      isDeleted: false,
    });

    return res.status(200).json({
      success: true,
      message: "Dashboard stats retrieved successfully",
      data: {
        totalExhibitors,
        activeEvents,
        totalLeads,
        activeUsers,
      },
    });
  } catch (error: any) {
    console.error("❌ Get dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve dashboard stats",
    });
  }
};

// Get events trend only
export const getEventsTrend = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Number(days);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const dateLabels: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateLabels.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const eventsData = await EventModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const eventsMap = new Map(eventsData.map(item => [item._id, item.count]));
    const trends = dateLabels.map(date => ({
      date,
      count: eventsMap.get(date) || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Events trend retrieved successfully",
      data: { trends },
    });
  } catch (error: any) {
    console.error("❌ Get events trend error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve events trend",
    });
  }
};

// Get leads trend only
export const getLeadsTrend = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Number(days);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const dateLabels: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateLabels.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const leadsData = await LeadsModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const leadsMap = new Map(leadsData.map(item => [item._id, item.count]));
    const trends = dateLabels.map(date => ({
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

// Get license keys trend only
export const getLicenseKeysTrend = async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Number(days);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const dateLabels: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateLabels.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const keysData = await EventModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          keyCount: { $size: "$licenseKeys" },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: "$keyCount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const keysMap = new Map(keysData.map(item => [item._id, item.count]));
    const trends = dateLabels.map(date => ({
      date,
      count: keysMap.get(date) || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "License keys trend retrieved successfully",
      data: { trends },
    });
  } catch (error: any) {
    console.error("❌ Get license keys trend error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve license keys trend",
    });
  }
};

// Get all license keys for a specific exhibitor
export const getExhibitorKeys = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify exhibitor exists
    const exhibitor = await UserModel.findById(id);
    if (!exhibitor || exhibitor.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor not found",
      });
    }

    // Get all events for this exhibitor with their license keys
    const events = await EventModel.find({
      exhibitorId: id,
      isDeleted: false,
    }).select("eventName licenseKeys");

    // Flatten all license keys with event information
    const allKeys: any[] = [];
    events.forEach((event) => {
      event.licenseKeys.forEach((key) => {
        allKeys.push({
          _id: key._id,
          key: key.key,
          stallName: key.stallName,
          email: key.email,
          maxActivations: key.maxActivations,
          usedCount: key.usedCount,
          isActive: key.isActive,
          expiresAt: key.expiresAt,
          eventName: event.eventName,
          eventId: event._id,
          usagePercentage: Math.round((key.usedCount / key.maxActivations) * 100),
        });
      });
    });

    // Sort by usedCount descending
    allKeys.sort((a, b) => b.usedCount - a.usedCount);

    return res.status(200).json({
      success: true,
      message: "Exhibitor keys retrieved successfully",
      data: {
        exhibitor: {
          _id: exhibitor._id,
          firstName: exhibitor.firstName,
          lastName: exhibitor.lastName,
          email: exhibitor.email,
          companyName: exhibitor.companyName,
        },
        keys: allKeys,
        totalKeys: allKeys.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Get exhibitor keys error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve exhibitor keys",
    });
  }
};

export const getTopPerformers = async (req: Request, res: Response) => {
  try {
    const exhibitorRole = await RoleModel.findOne({ name: "EXHIBITOR" });
    if (!exhibitorRole) {
      return res.status(404).json({
        success: false,
        message: "Exhibitor role not found",
      });
    }

    // 1. Most Events Created - Top 5 exhibitors
    const topEventCreators = await EventModel.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $group: {
          _id: "$exhibitorId",
          eventCount: { $sum: 1 },
        },
      },
      { $sort: { eventCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { 
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          companyName: "$user.companyName",
          eventCount: 1,
        },
      },
    ]);

    // 2. Most Keys Created - Top 5 exhibitors
    const topKeyCreators = await EventModel.aggregate([
      {
        $match: { isDeleted: false },
      },
      {
        $project: {
          exhibitorId: 1,
          keyCount: { $size: "$licenseKeys" },
        },
      },
      {
        $group: {
          _id: "$exhibitorId",
          totalKeys: { $sum: "$keyCount" },
        },
      },
      { $sort: { totalKeys: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { 
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          companyName: "$user.companyName",
          totalKeys: 1,
        },
      },
    ]);

    // 3. Most License Key Usage - Top 5 exhibitors (keys with scanCount > 0)
    const topKeyUsers = await EventModel.aggregate([
      {
        $match: { isDeleted: false },
      },
      { $unwind: "$licenseKeys" },
      {
        $match: {
          "licenseKeys.usedCount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$exhibitorId",
          usedKeysCount: { $sum: 1 },
          totalScans: { $sum: "$licenseKeys.usedCount" },
        },
      },
      { $sort: { totalScans: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { 
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          companyName: "$user.companyName",
          usedKeysCount: 1,
          totalScans: 1,
        },
      },
    ]);

    console.log("✅ Top Event Creators:", topEventCreators);
    console.log("✅ Top Key Creators:", topKeyCreators);
    console.log("✅ Top Key Users:", topKeyUsers);

    return res.status(200).json({
      success: true,
      message: "Top performers retrieved successfully",
      data: {
        mostEventsCreated: topEventCreators,
        mostKeysCreated: topKeyCreators,
        mostLicenseKeyUsage: topKeyUsers,
      },
    });
  } catch (error: any) {
    console.error("❌ Get top performers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve top performers",
    });
  }
};
