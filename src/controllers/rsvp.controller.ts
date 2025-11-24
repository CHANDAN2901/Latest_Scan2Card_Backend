import { Response } from "express";
import RsvpModel from "../models/rsvp.model";
import EventModel from "../models/event.model";
import { AuthRequest } from "../middleware/auth.middleware";

import UserModel from "../models/user.model";

/**
 * Create RSVP by License Key
 * User enters license key to register for an event
 */
export const createRsvp = async (req: AuthRequest, res: Response) => {
  try {
    const { rsvpLicenseKey } = req.body;
    const userId = req.user?._id;

    if (!rsvpLicenseKey) {
      return res.status(400).json({
        success: false,
        message: "License key is required",
      });
    }

    // Find event with this license key
    const event = await EventModel.findOne({
      "licenseKeys.key": rsvpLicenseKey,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Invalid license key",
      });
    }

    // Find the specific license key
    const licenseKey = event.licenseKeys.find(
      (lk) => lk.key === rsvpLicenseKey
    );

    if (!licenseKey) {
      return res.status(404).json({
        success: false,
        message: "License key not found",
      });
    }

    // Validate license key
    if (!licenseKey.isActive) {
      return res.status(400).json({
        success: false,
        message: "License key is inactive",
      });
    }

    if (licenseKey.expiresAt && new Date(licenseKey.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "License key has expired",
      });
    }

    // Check if license key has available activations
    const remainingActivations = licenseKey.maxActivations - licenseKey.usedCount;
    if (remainingActivations <= 0) {
      return res.status(400).json({
        success: false,
        message: "License key has reached maximum activations",
      });
    }

    // Check if user already has RSVP for this event
    const existingRsvp = await RsvpModel.findOne({
      eventId: event._id,
      userId: userId,
      isDeleted: false,
    });

    if (existingRsvp) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event",
      });
    }

    // Assign user to the team manager (owner) associated with the license key's email
    if (licenseKey.email) {
      const teamManager = await UserModel.findOne({ email: licenseKey.email });
      if (teamManager) {
        await UserModel.updateOne(
          { _id: userId },
          { exhibitorId: teamManager._id }
        );
      }
    }

    // Create RSVP
    const rsvp = await RsvpModel.create({
      eventId: event._id,
      userId: userId,
      eventLicenseKey: rsvpLicenseKey,
      expiresAt: licenseKey.expiresAt,
      status: 1,
      isActive: true,
      isDeleted: false,
    });

    // Increment usedCount for the license key
    await EventModel.updateOne(
      { _id: event._id, "licenseKeys.key": rsvpLicenseKey },
      { $inc: { "licenseKeys.$.usedCount": 1 } }
    );

    // Populate event and user details
    const populatedRsvp = await RsvpModel.findById(rsvp._id)
      .populate("eventId", "eventName type startDate endDate location")
      .populate("userId", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Successfully registered for the event",
      data: {
        rsvp: populatedRsvp,
      },
    });
  } catch (error: any) {
    console.error("Error creating RSVP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register for event",
      error: error.message,
    });
  }
};

/**
 * Get User's RSVPs
 * List all events the user has registered for
 */
export const getMyRsvps = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const rsvps = await RsvpModel.paginate(
      {
        userId: userId,
        isDeleted: false,
      },
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          {
            path: "eventId",
            select: "eventName type startDate endDate location isActive",
          },
        ],
      }
    );

    res.status(200).json({
      success: true,
      data: {
        rsvps: rsvps.docs,
        pagination: {
          total: rsvps.totalDocs,
          page: rsvps.page,
          pages: rsvps.totalPages,
          limit: rsvps.limit,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching RSVPs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVPs",
      error: error.message,
    });
  }
};

/**
 * Get Event RSVPs (For Exhibitors)
 * List all attendees registered for their event
 */
export const getEventRsvps = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verify event exists and belongs to exhibitor
    const event = await EventModel.findOne({
      _id: eventId,
      createdBy: req.user?._id,
      isDeleted: false,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or access denied",
      });
    }

    const rsvps = await RsvpModel.paginate(
      {
        eventId: eventId,
        isDeleted: false,
      },
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          {
            path: "userId",
            select: "firstName lastName email phoneNumber",
          },
          {
            path: "addedBy",
            select: "firstName lastName email",
          },
        ],
      }
    );

    res.status(200).json({
      success: true,
      data: {
        rsvps: rsvps.docs,
        pagination: {
          total: rsvps.totalDocs,
          page: rsvps.page,
          pages: rsvps.totalPages,
          limit: rsvps.limit,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching event RSVPs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event RSVPs",
      error: error.message,
    });
  }
};

/**
 * Cancel RSVP
 * User cancels their event registration
 */
export const cancelRsvp = async (req: AuthRequest, res: Response) => {
  try {
    const { rsvpId } = req.params;
    const userId = req.user?._id;

    const rsvp = await RsvpModel.findOne({
      _id: rsvpId,
      userId: userId,
      isDeleted: false,
    });

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found",
      });
    }

    // Soft delete the RSVP
    rsvp.isDeleted = true;
    rsvp.isActive = false;
    await rsvp.save();

    // Decrement usedCount for the license key
    if (rsvp.eventLicenseKey) {
      await EventModel.updateOne(
        { _id: rsvp.eventId, "licenseKeys.key": rsvp.eventLicenseKey },
        { $inc: { "licenseKeys.$.usedCount": -1 } }
      );
    }

    res.status(200).json({
      success: true,
      message: "RSVP cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling RSVP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel RSVP",
      error: error.message,
    });
  }
};

/**
 * Get RSVP Details
 * Get single RSVP with full details
 */
export const getRsvpById = async (req: AuthRequest, res: Response) => {
  try {
    const { rsvpId } = req.params;
    const userId = req.user?._id;

    const rsvp = await RsvpModel.findOne({
      _id: rsvpId,
      userId: userId,
      isDeleted: false,
    })
      .populate("eventId", "eventName type startDate endDate location description")
      .populate("userId", "firstName lastName email phoneNumber")
      .populate("addedBy", "firstName lastName email");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        rsvp,
      },
    });
  } catch (error: any) {
    console.error("Error fetching RSVP:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVP details",
      error: error.message,
    });
  }
};

/**
 * Validate License Key (Before Registration)
 * Check if license key is valid without creating RSVP
 */
export const validateLicenseKey = async (req: AuthRequest, res: Response) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: "License key is required",
      });
    }

    // Find event with this license key
    const event = await EventModel.findOne({
      "licenseKeys.key": licenseKey,
      isDeleted: false,
    }).select("eventName type startDate endDate location licenseKeys");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Invalid license key",
      });
    }

    const lk = event.licenseKeys.find((k) => k.key === licenseKey);

    if (!lk) {
      return res.status(404).json({
        success: false,
        message: "License key not found",
      });
    }

    // Check validations
    const isExpired = lk.expiresAt && new Date(lk.expiresAt) < new Date();
    const remainingActivations = lk.maxActivations - lk.usedCount;
    const isMaxedOut = remainingActivations <= 0;
    const isValid = lk.isActive && !isExpired && !isMaxedOut;

    res.status(200).json({
      success: true,
      data: {
        valid: isValid,
        event: {
          id: event._id,
          name: event.eventName,
          type: event.type,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
        },
        licenseKey: {
          stallName: lk.stallName,
          isActive: lk.isActive,
          expiresAt: lk.expiresAt,
          remainingActivations: remainingActivations,
          isExpired,
          isMaxedOut,
        },
      },
    });
  } catch (error: any) {
    console.error("Error validating license key:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate license key",
      error: error.message,
    });
  }
};
