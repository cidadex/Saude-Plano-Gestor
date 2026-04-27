import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import {
  db,
  contratosTable,
  clientesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
});

// Mascara a chave Asaas para exibição
function maskKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

// GET /admin/contratos — lista com contagem de beneficiários
router.get("/admin/contratos", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: contratosTable.id,
        nome: contratosTable.nome,
        descricao: contratosTable.descricao,
        asaasModo: contratosTable.asaasModo,
        asaasApiKey: contratosTable.asaasApiKey,
        ativo: contratosTable.ativo,
        createdAt: contratosTable.createdAt,
      })
      .from(contratosTable)
      .orderBy(contratosTable.nome);

    const counts = await db
      .select({ contratoId: clientesTable.contratoId, total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .groupBy(clientesTable.contratoId);
    const countMap = Object.fromEntries(counts.map(c => [c.contratoId ?? "", c.total]));

    const contratos = rows.map(c => ({
      ...c,
      asaasApiKey: undefined,
      asaasApiKeyMasked: maskKey(c.asaasApiKey),
      asaasApiKeyConfigured: !!c.asaasApiKey && c.asaasApiKey.length > 0,
      totalBeneficiarios: countMap[c.id] ?? 0,
    }));

    res.json({ contratos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /admin/contratos/:id
router.get("/admin/contratos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [contrato] = await db.select().from(contratosTable).where(eq(contratosTable.id, id)).limit(1);
    if (!contrato) return res.status(404).json({ error: "Contrato não encontrado" });
    const beneficiarios = await db
      .select({
        id: clientesTable.id,
        nome: clientesTable.nome,
        cpf: clientesTable.cpf,
        status: clientesTable.status,
      })
      .from(clientesTable)
      .where(eq(clientesTable.contratoId, id))
      .orderBy(clientesTable.nome);
    res.json({
      contrato: {
        ...contrato,
        asaasApiKey: undefined,
        asaasApiKeyMasked: maskKey(contrato.asaasApiKey),
        asaasApiKeyConfigured: !!contrato.asaasApiKey && contrato.asaasApiKey.length > 0,
      },
      beneficiarios,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/contratos
router.post("/admin/contratos", async (req, res) => {
  try {
    const { nome, descricao, asaasApiKey, asaasModo, ativo } = req.body as {
      nome: string;
      descricao?: string;
      asaasApiKey?: string;
      asaasModo?: "SANDBOX" | "PRODUCAO";
      ativo?: boolean;
    };
    if (!nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });

    const id = `ctr-${Date.now()}`;
    const [contrato] = await db.insert(contratosTable).values({
      id,
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      asaasApiKey: asaasApiKey?.trim() || null,
      asaasModo: asaasModo ?? "SANDBOX",
      ativo: ativo ?? true,
    }).returning();

    res.status(201).json({
      contrato: {
        ...contrato,
        asaasApiKey: undefined,
        asaasApiKeyMasked: maskKey(contrato.asaasApiKey),
        asaasApiKeyConfigured: !!contrato.asaasApiKey,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/contratos/:id
router.patch("/admin/contratos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as {
      nome?: string;
      descricao?: string | null;
      asaasApiKey?: string | null;
      asaasModo?: "SANDBOX" | "PRODUCAO";
      ativo?: boolean;
    };

    const [existing] = await db.select().from(contratosTable).where(eq(contratosTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Contrato não encontrado" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.nome !== undefined) updates.nome = body.nome.trim();
    if (body.descricao !== undefined) updates.descricao = body.descricao?.toString().trim() || null;
    // Só atualiza a chave se vier não-vazia (impede apagar acidentalmente quando o form omite)
    if (body.asaasApiKey !== undefined && body.asaasApiKey !== null && body.asaasApiKey !== "") {
      updates.asaasApiKey = body.asaasApiKey.trim();
    }
    if (body.asaasModo !== undefined) updates.asaasModo = body.asaasModo;
    if (body.ativo !== undefined) updates.ativo = body.ativo;

    await db.update(contratosTable).set(updates as never).where(eq(contratosTable.id, id));
    const [updated] = await db.select().from(contratosTable).where(eq(contratosTable.id, id)).limit(1);
    res.json({
      contrato: {
        ...updated,
        asaasApiKey: undefined,
        asaasApiKeyMasked: maskKey(updated.asaasApiKey),
        asaasApiKeyConfigured: !!updated.asaasApiKey,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /admin/contratos/:id (só se não tiver beneficiários)
router.delete("/admin/contratos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [count] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .where(eq(clientesTable.contratoId, id));
    if ((count?.total ?? 0) > 0) {
      return res.status(409).json({ error: "Não é possível excluir um contrato com beneficiários vinculados. Desative-o no lugar." });
    }
    await db.delete(contratosTable).where(eq(contratosTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /contratos (autenticado, qualquer role) — usado pelos selects de cadastro
// Exportado separadamente para NÃO herdar o middleware admin-only do router principal.
export const contratosPublicRouter = Router();
contratosPublicRouter.use(requireAuth);
contratosPublicRouter.get("/contratos", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: contratosTable.id,
        nome: contratosTable.nome,
        descricao: contratosTable.descricao,
        asaasModo: contratosTable.asaasModo,
        ativo: contratosTable.ativo,
      })
      .from(contratosTable)
      .where(eq(contratosTable.ativo, true))
      .orderBy(contratosTable.nome);
    res.json({ contratos: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
