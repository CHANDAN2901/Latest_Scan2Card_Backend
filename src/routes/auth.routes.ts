import { Router } from "express";
import {
  register,
  login,
  getProfile,
  verifyLoginOTP,
  sendVerificationOTP,
  verifyUserOTP,
  forgotPassword,
  resetPasswordWithOTP,
  changePassword
} from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyLoginOTP);

// User verification routes
router.post("/send-verification-otp", sendVerificationOTP);
router.post("/verify-user", verifyUserOTP);

// Password reset routes (forgot password)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithOTP);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.post("/change-password", authenticateToken, changePassword);

export default router;
