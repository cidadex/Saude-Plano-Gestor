import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import seedRouter from "./seed.js";
import vendedorRouter from "./vendedor.js";
import comunicacoesRouter from "./comunicacoes.js";
import adminRouter from "./admin.js";
import aiRouter from "./ai.js";
import planosRouter from "./planos.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(seedRouter);
router.use(vendedorRouter);
router.use(comunicacoesRouter);
router.use(adminRouter);
router.use(aiRouter);
router.use(planosRouter);

export default router;
