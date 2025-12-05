import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import UserModel from "../models/user.model";
import { sendNotificationToDevice, NotificationPayload } from "../services/firebase.service";

// Register FCM token for the authenticated user
export const registerFCMToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    // Find user and add FCM token if not already present
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if token already exists
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "FCM token registered successfully",
    });
  } catch (error: any) {
    console.error("❌ Register FCM token error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register FCM token",
    });
  }
};

// Remove FCM token for the authenticated user
export const removeFCMToken = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    // Find user and remove FCM token
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter((token) => token !== fcmToken);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "FCM token removed successfully",
    });
  } catch (error: any) {
    console.error("❌ Remove FCM token error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove FCM token",
    });
  }
};

// Get all FCM tokens for the authenticated user
export const getFCMTokens = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await UserModel.findById(userId).select("fcmTokens");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        fcmTokens: user.fcmTokens || [],
        count: user.fcmTokens?.length || 0,
      },
    });
  } catch (error: any) {
    console.error("❌ Get FCM tokens error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get FCM tokens",
    });
  }
};

// Test notification (for debugging)
export const sendTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await UserModel.findById(userId).select("fcmTokens firstName");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No FCM tokens registered for this user",
      });
    }

    const payload: NotificationPayload = {
      title: "🎉 Test Notification",
      body: `Hello ${user.firstName}! This is a test notification from Scan2Card.`,
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
    };

    // Send to the first registered token
    const success = await sendNotificationToDevice(user.fcmTokens[0], payload);

    if (success) {
      return res.status(200).json({
        success: true,
        message: "Test notification sent successfully",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send test notification",
      });
    }
  } catch (error: any) {
    console.error("❌ Send test notification error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send test notification",
    });
  }
};
