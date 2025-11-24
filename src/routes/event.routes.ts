import { Router } from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  generateLicenseKeyForEvent,
  bulkGenerateLicenseKeys,
  getLicenseKeys,
  getExhibitorDashboardStats,
  getTopEventsByLeads,
  getLeadsTrend,
} from "../controllers/event.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Dashboard routes
router.get("/dashboard/stats", authenticateToken, authorizeRoles("EXHIBITOR"), getExhibitorDashboardStats);
router.get("/dashboard/top-events", authenticateToken, authorizeRoles("EXHIBITOR"), getTopEventsByLeads);
router.get("/dashboard/leads-trend", authenticateToken, authorizeRoles("EXHIBITOR"), getLeadsTrend);

// Event CRUD routes - All require authentication and EXHIBITOR role
router.post("/", authenticateToken, authorizeRoles("EXHIBITOR"), createEvent);
router.get("/", authenticateToken, authorizeRoles("EXHIBITOR"), getEvents);
router.get("/:id", authenticateToken, authorizeRoles("EXHIBITOR"), getEventById);
router.put("/:id", authenticateToken, authorizeRoles("EXHIBITOR"), updateEvent);
router.delete("/:id", authenticateToken, authorizeRoles("EXHIBITOR"), deleteEvent);

// License key routes
router.post("/:id/license-keys", authenticateToken, authorizeRoles("EXHIBITOR"), generateLicenseKeyForEvent);
router.post("/:id/license-keys/bulk", authenticateToken, authorizeRoles("EXHIBITOR"), bulkGenerateLicenseKeys);
router.get("/:id/license-keys", authenticateToken, authorizeRoles("EXHIBITOR"), getLicenseKeys);

export default router;
