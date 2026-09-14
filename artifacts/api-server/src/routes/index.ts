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
// Public-among-authenticated routers MUST come BEFORE adminRouter.
// adminRouter uses a router-level middleware that blocks non-admins for every
// request that reaches it — even when no route matches — so any route meant
// for non-admin roles must be registered in a router that is mounted first.
router.use(planosRouter);      // /planos (public) and /vendedor/tabela-preco (vendedor)
router.use(contratosPublicRouter);
router.use(responsaveisRouter);
router.use(adminRouter);
router.use(contratosRouter);
router.use(aiRouter);

export default router;
