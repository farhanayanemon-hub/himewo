import { Router, type IRouter } from "express";
import { requireAuth } from "../../lib/auth";
import { requirePanel } from "../../lib/admin-auth";
import dashboardRouter from "./dashboard";
import usersRouter from "./users";
import contentRouter from "./content";
import conversationsRouter from "./conversations";
import reportsRouter from "./reports";
import communitiesRouter from "./communities";
import announcementsRouter from "./announcements";
import settingsRouter from "./settings";
import rolesRouter from "./roles";
import auditRouter from "./audit";
import verificationRouter from "./verification";

const router: IRouter = Router();

// Every /admin/* route requires a signed-in user holding a panel role.
router.use("/admin", requireAuth, requirePanel);

// Identity + capabilities for the current admin (drives the panel UI).
router.get("/admin/me", (req, res): void => {
  res.json({
    userId: req.userId,
    role: req.adminRole,
    permissions: req.adminPermissions ?? [],
  });
});

router.use("/admin", dashboardRouter);
router.use("/admin", usersRouter);
router.use("/admin", contentRouter);
router.use("/admin", conversationsRouter);
router.use("/admin", reportsRouter);
router.use("/admin", communitiesRouter);
router.use("/admin", announcementsRouter);
router.use("/admin", settingsRouter);
router.use("/admin", rolesRouter);
router.use("/admin", auditRouter);
router.use("/admin", verificationRouter);

export default router;
