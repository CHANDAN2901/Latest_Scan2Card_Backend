import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  getAllFeedback,
  updateFeedbackStatus,
  getFeedbackStats,
} from "../controllers/feedback.controller";

const router = Router();

// All routes require SUPERADMIN authentication
router.use(authenticateToken);
router.use(authorizeRoles("SUPERADMIN"));

// Get all feedback with filters
router.get("/", getAllFeedback);

// Get feedback statistics
router.get("/stats", getFeedbackStats);

// Update feedback status
router.put("/:id/status", updateFeedbackStatus);

export default router;
