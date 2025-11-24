// Get all meetings for team manager's team members (for leads captured in their managed events)
import MeetingModel from "../models/meeting.model";
import { Request, Response } from "express";

export const getTeamMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;
    // Find all events managed by this team manager
    const managedEvents = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    });
    const managedEventIds = managedEvents.map(e => e._id.toString());
    if (managedEventIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    // Find the ObjectId for the ENDUSER role
    const endUserRole = await (await import("../models/role.model")).default.findOne({ name: "ENDUSER", isDeleted: false });
    if (!endUserRole) {
      return res.status(500).json({ success: false, message: "ENDUSER role not found" });
    }
    // Find all team members (ENDUSERs) under this manager
    const teamMembers = await UserModel.find({
      role: endUserRole._id,
      isDeleted: false,
      // Optionally, add more filters if you have a team/exhibitorId field
    });
    const teamMemberIds = teamMembers.map(u => u._id.toString());
    // Find all leads for these events and team members
    const leads = await LeadsModel.find({
      eventId: { $in: managedEventIds },
      userId: { $in: teamMemberIds },
      isDeleted: false,
    });
    const leadIds = leads.map(l => l._id.toString());
    // Find all meetings for these leads and team members
    const meetings = await MeetingModel.find({
      leadId: { $in: leadIds },
      userId: { $in: teamMemberIds },
      isDeleted: false,
    })
      .populate("leadId", "details eventId")
      .populate("userId", "firstName lastName email")
      .populate("eventId", "eventName");
    res.status(200).json({ success: true, data: meetings });
  } catch (error: any) {
    console.error("❌ Get team meetings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get team meetings",
    });
  }
};
export const getAllLeadsForManager = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;
    const { eventId, memberId } = req.query;

    // Find all events managed by this team manager
    const managedEvents = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    });
    const managedEventIds = managedEvents.map(e => e._id.toString());
    if (managedEventIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Build query
    const query: any = {
      eventId: { $in: managedEventIds },
      isDeleted: false,
    };
    if (eventId) query.eventId = eventId;
    if (memberId) query.userId = memberId;

    const leads = await LeadsModel.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error: any) {
    console.error("❌ Get all manager leads error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get all manager leads",
    });
  }
};
// Get leads for a specific team member, only for events managed by this team manager and where the member used the assigned license key
export const getMemberLeads = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ success: false, message: "Member ID is required" });
    }

    // Find all events managed by this team manager
    const managedEvents = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    });
    const managedEventIds = managedEvents.map(e => e._id);

    // Find all event/license key pairs where this member is in usedBy
    let allowedEventIds = [];
    for (const event of managedEvents) {
      for (const key of event.licenseKeys) {
        if (key.teamManagerId?.toString() === teamManagerId && key.usedBy.some(u => u.toString() === memberId)) {
          allowedEventIds.push(event._id);
        }
      }
    }

    // Get all leads for this member, only for allowed events
    const leads = await LeadsModel.find({
      userId: memberId,
      eventId: { $in: allowedEventIds },
      isDeleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("❌ Get member leads error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get member leads",
    });
  }
};
// (already imported above)
import { AuthRequest } from "../middleware/auth.middleware";
import UserModel from "../models/user.model";
import LeadsModel from "../models/leads.model";
import EventModel from "../models/event.model";
import mongoose from "mongoose";

// Get team manager dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;

    // Find license keys assigned to this team manager
    const events = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    });

    const licenseKeys = events.flatMap(event => 
      event.licenseKeys.filter(key => 
        key.teamManagerId?.toString() === teamManagerId
      )
    );

    // Count team members (ENDUSERs under this team manager)
    const totalMembers = await UserModel.countDocuments({
      exhibitorId: req.user?.userId,
      role: await UserModel.findOne({ email: req.user?.email }).then(u => u?.role),
      isDeleted: false,
    });

    // Count total leads scanned by team members
    const totalLeads = await LeadsModel.countDocuments({
      userId: { $exists: true },
      isDeleted: false,
    });

    // Total license keys assigned
    const totalLicenseKeys = licenseKeys.length;

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalLeads,
        totalLicenseKeys,
        licenseKeys: licenseKeys.map(key => ({
          key: key.key,
          email: key.email,
          stallName: key.stallName,
          expiresAt: key.expiresAt,
          usedCount: key.usedCount,
          maxActivations: key.maxActivations,
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get dashboard stats",
    });
  }
};

// Get leads graph data (hourly or daily)
export const getLeadsGraph = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;
    const { eventId, period = "hourly" } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    // Find event and verify team manager has access
    const event = await EventModel.findOne({
      _id: eventId,
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or access denied",
      });
    }

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    let groupByFormat: any;
    let dateArray: any[] = [];

    if (period === "hourly") {
      // Group by hour for single day or short events
      groupByFormat = {
        year: { $year: "$scannedAt" },
        month: { $month: "$scannedAt" },
        day: { $dayOfMonth: "$scannedAt" },
        hour: { $hour: "$scannedAt" },
      };

      // Generate hourly slots
      const current = new Date(startDate);
      while (current <= endDate) {
        dateArray.push({
          year: current.getFullYear(),
          month: current.getMonth() + 1,
          day: current.getDate(),
          hour: current.getHours(),
          label: current.toLocaleString("en-US", { 
            month: "short", 
            day: "numeric", 
            hour: "numeric", 
            hour12: true 
          }),
          count: 0,
        });
        current.setHours(current.getHours() + 1);
      }
    } else {
      // Group by day for longer events
      groupByFormat = {
        year: { $year: "$scannedAt" },
        month: { $month: "$scannedAt" },
        day: { $dayOfMonth: "$scannedAt" },
      };

      // Generate daily slots
      const current = new Date(startDate);
      while (current <= endDate) {
        dateArray.push({
          year: current.getFullYear(),
          month: current.getMonth() + 1,
          day: current.getDate(),
          label: current.toLocaleString("en-US", { 
            month: "short", 
            day: "numeric" 
          }),
          count: 0,
        });
        current.setDate(current.getDate() + 1);
      }
    }

    // Get actual lead counts
    const leadsData = await LeadsModel.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId as string),
          scannedAt: {
            $gte: startDate,
            $lte: endDate,
          },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: groupByFormat,
          count: { $sum: 1 },
        },
      },
    ]);

    // Merge actual data with dateArray
    leadsData.forEach(item => {
      const matchIndex = dateArray.findIndex(slot => {
        if (period === "hourly") {
          return (
            slot.year === item._id.year &&
            slot.month === item._id.month &&
            slot.day === item._id.day &&
            slot.hour === item._id.hour
          );
        } else {
          return (
            slot.year === item._id.year &&
            slot.month === item._id.month &&
            slot.day === item._id.day
          );
        }
      });

      if (matchIndex !== -1) {
        dateArray[matchIndex].count = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        eventName: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate,
        graphData: dateArray.map(item => ({
          label: item.label,
          count: item.count,
        })),
      },
    });
  } catch (error: any) {
    console.error("❌ Get leads graph error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get leads graph",
    });
  }
};

// Get team members with their lead count
export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;
    const { page = 1, limit = 10, search = "" } = req.query;

    // Find all team members (this would need proper team structure)
    // For now, getting all ENDUSERs under the same exhibitor
    const teamManager = await UserModel.findById(teamManagerId);
    
    if (!teamManager) {
      return res.status(404).json({
        success: false,
        message: "Team manager not found",
      });
    }

    const searchQuery: any = {
      exhibitorId: teamManager._id,
      isDeleted: false,
    };

    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }


    // Exclude the team manager's own profile from the members list
    const members = await UserModel.find({
      ...searchQuery,
      _id: { $ne: teamManagerId },
    })
      .select("firstName lastName email phoneNumber isActive createdAt")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await UserModel.countDocuments(searchQuery);

    // Get all eventIds managed by this team manager
    const managedEvents = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    }).select("_id");
    const managedEventIds = managedEvents.map(e => e._id);

    // Get lead count for each member (only for managed events)
    const membersWithLeads = await Promise.all(
      members.map(async (member) => {
        const leadCount = await LeadsModel.countDocuments({
          userId: member._id,
          eventId: { $in: managedEventIds },
          isDeleted: false,
        });
        return {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phoneNumber: member.phoneNumber,
          isActive: member.isActive,
          leadCount,
          joinedAt: member.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        members: membersWithLeads,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get team members error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get team members",
    });
  }
};

// Get team manager's events
export const getMyEvents = async (req: AuthRequest, res: Response) => {
  try {
    const teamManagerId = req.user?.userId;

    const events = await EventModel.find({
      "licenseKeys.teamManagerId": teamManagerId,
      isDeleted: false,
    })
      .populate("exhibitorId", "firstName lastName companyName")
      .select("eventName description type startDate endDate location licenseKeys")
      .sort({ startDate: -1 });

    // Filter and format events
    const formattedEvents = events.map(event => {
      const myLicenseKeys = event.licenseKeys.filter(
        key => key.teamManagerId?.toString() === teamManagerId
      );

      return {
        _id: event._id,
        eventName: event.eventName,
        description: event.description,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        exhibitor: event.exhibitorId,
        myLicenseKeys: myLicenseKeys.map(key => ({
          key: key.key,
          stallName: key.stallName,
          expiresAt: key.expiresAt,
          usedCount: key.usedCount,
          maxActivations: key.maxActivations,
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: formattedEvents,
    });
  } catch (error: any) {
    console.error("❌ Get my events error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get events",
    });
  }
};
