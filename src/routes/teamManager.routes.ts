// Get all meetings for team manager's team members (for leads captured in their managed events)
import { getTeamMeetings } from "../controllers/teamManager.controller";
import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.middleware";
import {
  getDashboardStats,
  getLeadsGraph,
  getTeamMembers,
  getMyEvents,
  getMemberLeads,
  getAllLeadsForManager,
} from "../controllers/teamManager.controller";

const router = Router();

// All routes require TEAMMANAGER role
router.get("/leads/all", authenticateToken, authorizeRoles("TEAMMANAGER"), getAllLeadsForManager);
router.get("/dashboard/stats", authenticateToken, authorizeRoles("TEAMMANAGER"), getDashboardStats);
router.get("/leads/graph", authenticateToken, authorizeRoles("TEAMMANAGER"), getLeadsGraph);
router.get("/team/members", authenticateToken, authorizeRoles("TEAMMANAGER"), getTeamMembers);
router.get("/team/member/:memberId/leads", authenticateToken, authorizeRoles("TEAMMANAGER"), getMemberLeads);
router.get("/events", authenticateToken, authorizeRoles("TEAMMANAGER"), getMyEvents);
router.get("/meetings/team", authenticateToken, authorizeRoles("TEAMMANAGER"), getTeamMeetings);

export default router;
