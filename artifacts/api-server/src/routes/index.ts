import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import seedRouter from "./seed.js";
import vendedorRouter from "./vendedor.js";
import gerenteRouter from "./gerente.js";
import comunicacoesRouter from "./comunicacoes.js";
import adminRouter from "./admin.js";
import aiRouter from "./ai.js";
import planosRouter from "./planos.js";
import clienteRouter from "./cliente.js";
import contratosRouter, { contratosPublicRouter } from "./contratos.js";
import responsaveisRouter from "./responsaveis.js";
import storageRouter from "./storage.js";

const router: IRouter = Router();

router.use(storageRouter);
router.use(healthRouter);
router.use(authRouter);
router.use(seedRouter);
router.use(clienteRouter);
router.use(vendedorRouter);
router.use(gerenteRouter);
router.use(comunicacoesRouter);
// Public-among-authenticated routers come BEFORE admin-only routers so the admin guard doesn't block them
router.use(contratosPublicRouter);
router.use(responsaveisRouter);
router.use(adminRouter);
router.use(contratosRouter);
router.use(aiRouter);
router.use(planosRouter);

export default router;
