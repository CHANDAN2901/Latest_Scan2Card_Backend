import { Router } from "express";
import multer from "multer";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  updateProfile,
  changePassword,
  submitFeedback,
  getMyFeedback,
  toggle2FA,
} from "../controllers/profile.controller";

const router = Router();

// Multer configuration for profile image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// All routes require authentication
router.use(authenticateToken);

// Update profile - All authenticated users
// Supports optional file upload for profile image
router.put("/", upload.single('profileImage'), updateProfile);

// Change password - All authenticated users
router.post("/change-password", changePassword);

// Toggle 2FA - All authenticated users
router.post("/toggle-2fa", toggle2FA);

// Submit feedback - All authenticated users
router.post("/feedback", submitFeedback);

// Get my feedback history - All authenticated users
router.get("/feedback", getMyFeedback);

export default router;
