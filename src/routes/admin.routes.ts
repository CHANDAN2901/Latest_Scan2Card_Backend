import { Request, RequestHandler, Router } from "express";
import {
  createExhibitor,
  getExhibitors,
  getExhibitorById,
  updateExhibitor,
  deleteExhibitor,
  getDashboardStats,
  getEventsTrend,
  getLeadsTrend,
  getLicenseKeysTrend,
  getTopPerformers,
  getExhibitorKeys
} from "../controllers/admin.controller";
import { authenticateToken, AuthRequest } from "../middleware/auth.middleware";

const router = Router();

const ensureSuperAdmin: RequestHandler = (req, res, next) => {
  const { user } = req as AuthRequest;
  if (!user || user.role !== "SUPERADMIN") {
    return res.status(403).json({ message: "Only SUPERADMIN users can perform this action." });
  }
  return next();
};

// Dashboard routes
router.get("/dashboard/stats", authenticateToken, ensureSuperAdmin, getDashboardStats);
router.get("/dashboard/trends/events", authenticateToken, ensureSuperAdmin, getEventsTrend);
router.get("/dashboard/trends/leads", authenticateToken, ensureSuperAdmin, getLeadsTrend);
router.get("/dashboard/trends/keys", authenticateToken, ensureSuperAdmin, getLicenseKeysTrend);

// Exhibitor CRUD routes
router.post("/exhibitors", authenticateToken, ensureSuperAdmin, createExhibitor);
router.get("/exhibitors", authenticateToken, ensureSuperAdmin, getExhibitors);
router.get("/exhibitors/top-performers", authenticateToken, ensureSuperAdmin, getTopPerformers);
router.get("/exhibitors/:id", authenticateToken, ensureSuperAdmin, getExhibitorById);
router.get("/exhibitors/:id/keys", authenticateToken, ensureSuperAdmin, getExhibitorKeys);
router.put("/exhibitors/:id", authenticateToken, ensureSuperAdmin, updateExhibitor);
router.delete("/exhibitors/:id", authenticateToken, ensureSuperAdmin, deleteExhibitor);

export default router;
