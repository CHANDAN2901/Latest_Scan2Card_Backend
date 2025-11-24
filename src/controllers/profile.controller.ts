import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import UserModel from "../models/user.model";
import FeedbackModel from "../models/feedback.model";
import OTPModel from "../models/otp.model";
import bcrypt from "bcryptjs";

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { firstName, lastName, phoneNumber, profileImage } = req.body;
    const userId = req.user.userId;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("role", "roleName")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error: any) {
    console.error("❌ Update profile error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Get user with password
    const user = await UserModel.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("❌ Change password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to change password",
    });
  }
};

// Submit feedback
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { message, rating, category } = req.body;
    const userId = req.user.userId;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required",
      });
    }

    const feedback = await FeedbackModel.create({
      userId,
      message,
      rating: rating || undefined,
      category: category || "other",
      status: "pending",
    });

    await feedback.populate("userId", "firstName lastName email");

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: { feedback },
    });
  } catch (error: any) {
    console.error("❌ Submit feedback error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to submit feedback",
    });
  }
};

// Get user's feedback history
export const getMyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userId = req.user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const feedbacks = await FeedbackModel.paginate(
      { userId, isDeleted: false },
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: { path: "userId", select: "firstName lastName email" },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        feedbacks: feedbacks.docs,
        pagination: {
          total: feedbacks.totalDocs,
          page: feedbacks.page,
          pages: feedbacks.totalPages,
          limit: feedbacks.limit,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get feedback error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get feedback",
    });
  }
};

// Toggle 2FA
export const toggle2FA = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { enabled } = req.body;
    const userId = req.user.userId;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled field must be a boolean",
      });
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { twoFactorEnabled: enabled },
      { new: true }
    )
      .populate("role", "roleName")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `2FA ${enabled ? "enabled" : "disabled"} successfully`,
      data: { user },
    });
  } catch (error: any) {
    console.error("❌ Toggle 2FA error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to toggle 2FA",
    });
  }
};
