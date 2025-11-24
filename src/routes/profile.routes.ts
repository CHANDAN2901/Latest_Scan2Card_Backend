import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  updateProfile,
  changePassword,
  submitFeedback,
  getMyFeedback,
  toggle2FA,
} from "../controllers/profile.controller";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Update profile - All authenticated users
router.put("/", updateProfile);

// Change password - All authenticated users
router.post("/change-password", changePassword);

// Toggle 2FA - All authenticated users
router.post("/toggle-2fa", toggle2FA);

// Submit feedback - All authenticated users
router.post("/feedback", submitFeedback);

// Get my feedback history - All authenticated users
router.get("/feedback", getMyFeedback);

export default router;
