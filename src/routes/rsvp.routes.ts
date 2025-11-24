import express from "express";
import {
  createRsvp,
  getMyRsvps,
  getEventRsvps,
  cancelRsvp,
  getRsvpById,
  validateLicenseKey,
} from "../controllers/rsvp.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validate license key (before registration)
router.post("/validate", validateLicenseKey);

// Create RSVP (user registers with license key)
router.post("/", createRsvp);

// Get user's RSVPs
router.get("/my-rsvps", getMyRsvps);

// Get single RSVP details
router.get("/:rsvpId", getRsvpById);

// Cancel RSVP
router.delete("/:rsvpId", cancelRsvp);

// Get event RSVPs (exhibitors only)
router.get("/event/:eventId", authorizeRoles("EXHIBITOR"), getEventRsvps);

export default router;
