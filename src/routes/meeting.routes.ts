import express from "express";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
} from "../controllers/meeting.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  meetingWriteLimiter,
  readLimiter
} from "../middleware/rateLimiter.middleware";

const router = express.Router();

// All routes require authentication and ENDUSER role
router.use(authenticateToken);
router.use(authorizeRoles("ENDUSER"));

// Meeting CRUD routes
// Write operations - Moderate limit (100/min per user)
router.post("/", meetingWriteLimiter, createMeeting);
router.put("/:id", meetingWriteLimiter, updateMeeting);
router.delete("/:id", meetingWriteLimiter, deleteMeeting);

// Read operations - Standard limit (200/min per user)
router.get("/", readLimiter, getMeetings);
router.get("/:id", readLimiter, getMeetingById);

export default router;
