import { Router } from "express";
import { register, login, getProfile, verifyLoginOTP } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyLoginOTP);

// Protected routes
router.get("/profile", authenticateToken, getProfile);

export default router;
