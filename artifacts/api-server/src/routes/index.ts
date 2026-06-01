import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foodsRouter from "./foods";
import mealsRouter from "./meals";
import goalsRouter from "./goals";
import dashboardRouter from "./dashboard";
import analyzeFoodRouter from "./analyze-food";
import analyzePostureRouter from "./analyze-posture";
import analyzeTrackerRouter from "./analyze-tracker-screenshot";
import sheetsRouter from "./sheets";
import wellnessRouter from "./wellness";
import tokensRouter from "./tokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(foodsRouter);
router.use(mealsRouter);
router.use(goalsRouter);
router.use(dashboardRouter);
router.use(analyzeFoodRouter);
router.use(analyzePostureRouter);
router.use(analyzeTrackerRouter);
router.use(sheetsRouter);
router.use(wellnessRouter);
router.use(tokensRouter);

export default router;
