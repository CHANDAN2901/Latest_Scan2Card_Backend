import { Response } from "express";
import MeetingModel from "../models/meeting.model";
import { AuthRequest } from "../middleware/auth.middleware";
import LeadModel from "../models/leads.model";

// Create Meeting
export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const {
      leadId,
      eventId,
      title,
      description,
      meetingMode,
      date,
      startTime,
      endTime,
      location,
      notifyAttendees,
    } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!leadId || !title || !meetingMode || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "leadId, title, meetingMode, date, startTime, and endTime are required",
      });
    }

    // Verify lead exists and belongs to user
    const lead = await LeadModel.findOne({
      _id: leadId,
      userId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found or access denied",
      });
    }

    const meeting = await MeetingModel.create({
      userId,
      leadId,
      eventId,
      title,
      description,
      meetingMode,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notifyAttendees: notifyAttendees || false,
    });

    await meeting.populate([
      { path: "leadId", select: "details scannedCardImage" },
      { path: "eventId", select: "eventName" },
    ]);

    return res.status(201).json({
      success: true,
      message: "Meeting scheduled successfully",
      data: meeting,
    });
  } catch (error: any) {
    console.error("❌ Create meeting error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to schedule meeting",
    });
  }
};

// Get All Meetings (with pagination and filters)
export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const {
      page = 1,
      limit = 10,
      leadId,
      eventId,
      meetingStatus,
      meetingMode,
    } = req.query;

    // Build filter query
    const filter: any = { userId, isDeleted: false };

    if (leadId) {
      filter.leadId = leadId;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    if (meetingStatus) {
      filter.meetingStatus = meetingStatus;
    }

    if (meetingMode) {
      filter.meetingMode = meetingMode;
    }

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { date: 1, startTime: 1 }, // Ascending order (earliest first)
      populate: [
        { path: "leadId", select: "details scannedCardImage" },
        { path: "eventId", select: "eventName type startDate endDate" },
      ],
    };

    const meetings = await MeetingModel.paginate(filter, options);

    return res.status(200).json({
      success: true,
      data: meetings.docs,
      pagination: {
        total: meetings.totalDocs,
        page: meetings.page,
        limit: meetings.limit,
        totalPages: meetings.totalPages,
        hasNextPage: meetings.hasNextPage,
        hasPrevPage: meetings.hasPrevPage,
      },
    });
  } catch (error: any) {
    console.error("❌ Get meetings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve meetings",
    });
  }
};

// Get Meeting by ID
export const getMeetingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const meeting = await MeetingModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    })
      .populate("leadId", "details scannedCardImage")
      .populate("eventId", "eventName type startDate endDate");

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    console.error("❌ Get meeting by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve meeting",
    });
  }
};

// Update Meeting
export const updateMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const {
      title,
      description,
      meetingMode,
      meetingStatus,
      date,
      startTime,
      endTime,
      location,
      notifyAttendees,
      isActive,
    } = req.body;

    const meeting = await MeetingModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Update fields
    if (title !== undefined) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (meetingMode !== undefined) meeting.meetingMode = meetingMode;
    if (meetingStatus !== undefined) meeting.meetingStatus = meetingStatus;
    if (date !== undefined) meeting.date = new Date(date);
    if (startTime !== undefined) meeting.startTime = startTime;
    if (endTime !== undefined) meeting.endTime = endTime;
    if (location !== undefined) meeting.location = location;
    if (notifyAttendees !== undefined) meeting.notifyAttendees = notifyAttendees;
    if (typeof isActive === "boolean") meeting.isActive = isActive;

    await meeting.save();

    await meeting.populate([
      { path: "leadId", select: "details scannedCardImage" },
      { path: "eventId", select: "eventName" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Meeting updated successfully",
      data: meeting,
    });
  } catch (error: any) {
    console.error("❌ Update meeting error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update meeting",
    });
  }
};

// Delete Meeting (soft delete)
export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const meeting = await MeetingModel.findOne({
      _id: id,
      userId,
      isDeleted: false,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    meeting.isDeleted = true;
    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Delete meeting error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete meeting",
    });
  }
};
