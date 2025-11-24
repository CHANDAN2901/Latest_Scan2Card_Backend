import express from "express";
import {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeeting,
  deleteMeeting,
} from "../controllers/meeting.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = express.Router();

// All routes require authentication and ENDUSER role
router.use(authenticateToken);
router.use(authorizeRoles("ENDUSER"));

// Meeting CRUD routes
router.post("/", createMeeting);
router.get("/", getMeetings);
router.get("/:id", getMeetingById);
router.put("/:id", updateMeeting);
router.delete("/:id", deleteMeeting);

export default router;
