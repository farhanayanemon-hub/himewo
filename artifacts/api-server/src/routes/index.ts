import { Router, type IRouter } from "express";
import { authMiddleware } from "../lib/auth";
import { maintenanceGuard, requireFeature } from "../lib/flags";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import reportsRouter from "./reports";
import usersRouter from "./users";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import friendsRouter from "./friends";
import conversationsRouter from "./conversations";
import groupsRouter from "./groups";
import pagesRouter from "./pages";
import storiesRouter from "./stories";
import reelsRouter from "./reels";
import notificationsRouter from "./notifications";
import mediaRouter from "./media";
import callsRouter from "./calls";

const router: IRouter = Router();

// Populate req.userId from the bearer token (or dev fallback) for all routes.
router.use(authMiddleware);

// Block the app when maintenance mode is on (staff + a small allow-list pass).
router.use(maintenanceGuard);

router.use(healthRouter);
router.use(authRouter);

// Admin panel + public report/verification/config intake. Mounted before the
// feature gates so the panel and config endpoint are always reachable.
router.use(adminRouter);
router.use(reportsRouter);

router.use(usersRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(friendsRouter);
router.use(conversationsRouter);

// Feature-flag gated areas. The path-prefixed guard runs before each router.
router.use("/groups", requireFeature("groups"));
router.use(groupsRouter);
router.use("/pages", requireFeature("pages"));
router.use(pagesRouter);
router.use("/stories", requireFeature("stories"));
router.use(storiesRouter);
router.use("/reels", requireFeature("reels"));
router.use(reelsRouter);

router.use(notificationsRouter);
router.use(mediaRouter);

router.use("/calls", requireFeature("calls"));
router.use(callsRouter);

export default router;
