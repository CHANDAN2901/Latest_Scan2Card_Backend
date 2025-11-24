import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import FeedbackModel from "../models/feedback.model";

// Get all feedback (Admin only)
export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const category = req.query.category as string;

    const query: any = { isDeleted: false };
    if (status) query.status = status;
    if (category) query.category = category;

    const feedbacks = await FeedbackModel.paginate(query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: "userId", select: "firstName lastName email role companyName" },
    });

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
    console.error("❌ Get all feedback error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get feedback",
    });
  }
};

// Update feedback status (Admin only)
export const updateFeedbackStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "reviewed", "resolved"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (pending, reviewed, resolved)",
      });
    }

    const feedback = await FeedbackModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("userId", "firstName lastName email");

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Feedback status updated successfully",
      data: { feedback },
    });
  } catch (error: any) {
    console.error("❌ Update feedback status error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update feedback status",
    });
  }
};

// Get feedback statistics (Admin only)
export const getFeedbackStats = async (req: AuthRequest, res: Response) => {
  try {
    const [total, pending, reviewed, resolved] = await Promise.all([
      FeedbackModel.countDocuments({ isDeleted: false }),
      FeedbackModel.countDocuments({ isDeleted: false, status: "pending" }),
      FeedbackModel.countDocuments({ isDeleted: false, status: "reviewed" }),
      FeedbackModel.countDocuments({ isDeleted: false, status: "resolved" }),
    ]);

    const byCategory = await FeedbackModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        reviewed,
        resolved,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    console.error("❌ Get feedback stats error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get feedback statistics",
    });
  }
};
