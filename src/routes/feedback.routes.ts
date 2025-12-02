import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  getAllFeedback,
  updateFeedbackStatus,
  getFeedbackStats,
} from "../controllers/feedback.controller";
import {
  adminLimiter
} from "../middleware/rateLimiter.middleware";

const router = Router();

// All routes require SUPERADMIN authentication
router.use(authenticateToken);
router.use(authorizeRoles("SUPERADMIN"));

// Admin limit (300/min per user)
router.get("/", adminLimiter, getAllFeedback);
router.get("/stats", adminLimiter, getFeedbackStats);
router.put("/:id/status", adminLimiter, updateFeedbackStatus);

export default router;
