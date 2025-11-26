import { Router } from "express";
import {
  register,
  login,
  getProfile,
  verifyLoginOTP,
  sendVerificationOTP,
  verifyUserOTP,
  forgotPassword,
  resetPassword
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

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", authenticateToken, getProfile);

export default router;
