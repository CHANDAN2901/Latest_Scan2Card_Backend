import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Register FCM token
router.post("/register-token", notificationController.registerFCMToken);

// Remove FCM token
router.post("/remove-token", notificationController.removeFCMToken);

// Get all FCM tokens for current user
router.get("/tokens", notificationController.getFCMTokens);

// Send test notification
router.post("/test", notificationController.sendTestNotification);

export default router;
