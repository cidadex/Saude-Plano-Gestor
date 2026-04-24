import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import seedRouter from "./seed.js";
import vendedorRouter from "./vendedor.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(seedRouter);
router.use(vendedorRouter);

export default router;
