import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import seedRouter from "./seed.js";
import vendedorRouter from "./vendedor.js";
import comunicacoesRouter from "./comunicacoes.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(seedRouter);
router.use(vendedorRouter);
router.use(comunicacoesRouter);

export default router;
