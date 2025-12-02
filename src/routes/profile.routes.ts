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
import {
  profileWriteLimiter,
  readLimiter
} from "../middleware/rateLimiter.middleware";

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

// Write operations - Moderate limit (30/min per user)
router.put("/", profileWriteLimiter, upload.single('profileImage'), updateProfile);
router.post("/change-password", profileWriteLimiter, changePassword);
router.post("/toggle-2fa", profileWriteLimiter, toggle2FA);
router.post("/feedback", profileWriteLimiter, submitFeedback);

// Read operations - Standard limit (200/min per user)
router.get("/feedback", readLimiter, getMyFeedback);

export default router;
