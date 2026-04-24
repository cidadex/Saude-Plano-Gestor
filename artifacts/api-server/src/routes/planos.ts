import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db, planosTable, tabelasPrecoTable, tabelasPrecoFaixasTable, vendedoresTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

// ─── PLANOS ───────────────────────────────────────────────────

// GET /api/planos — todos (qualquer usuário autenticado)
router.get("/planos", async (_req, res) => {
  try {
    const planos = await db.select().from(planosTable).orderBy(asc(planosTable.categoria), asc(planosTable.nome));
    res.json({ planos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/planos — admin only (mesma lista, com mais contexto)
router.get("/admin/planos", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const planos = await db.select().from(planosTable).orderBy(asc(planosTable.categoria), asc(planosTable.nome));
    res.json({ planos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/admin/planos/:id — editar valores e status de um plano
router.put("/admin/planos/:id", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const { id } = req.params;
    const { valorTitular, valorDependente, ativo } = req.body as {
      valorTitular?: string;
      valorDependente?: string;
      ativo?: boolean;
    };

    const [plano] = await db.select({ id: planosTable.id }).from(planosTable).where(eq(planosTable.id, id)).limit(1);
    if (!plano) return res.status(404).json({ error: "Plano não encontrado" });

    const updates: Record<string, unknown> = {};
    if (valorTitular !== undefined) updates.valorTitular = valorTitular;
    if (valorDependente !== undefined) updates.valorDependente = valorDependente;
    if (ativo !== undefined) updates.ativo = ativo;

    await db.update(planosTable).set(updates).where(eq(planosTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── TABELAS DE PREÇO (FAIXA ETÁRIA POR VENDEDOR) ─────────────

// GET /api/admin/tabelas-preco — lista todas as tabelas com faixas
router.get("/admin/tabelas-preco", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const tabelas = await db
      .select({
        id: tabelasPrecoTable.id,
        nome: tabelasPrecoTable.nome,
        tipoPlano: tabelasPrecoTable.tipoPlano,
        ano: tabelasPrecoTable.ano,
        vendedorId: tabelasPrecoTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
        createdAt: tabelasPrecoTable.createdAt,
      })
      .from(tabelasPrecoTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, tabelasPrecoTable.vendedorId))
      .orderBy(asc(vendedoresTable.nome));

    // Para cada tabela, busca suas faixas
    const tabelasComFaixas = await Promise.all(
      tabelas.map(async (t) => {
        const faixas = await db
          .select()
          .from(tabelasPrecoFaixasTable)
          .where(eq(tabelasPrecoFaixasTable.tabelaId, t.id));
        return { ...t, faixas };
      })
    );

    res.json({ tabelas: tabelasComFaixas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/tabela-preco — tabela de preço do vendedor logado
router.get("/vendedor/tabela-preco", async (req, res) => {
  const vendedorId = req.user?.vendedorId;
  if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });
  try {
    const tabelas = await db
      .select()
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.vendedorId, vendedorId));

    const tabelasComFaixas = await Promise.all(
      tabelas.map(async (t) => {
        const faixas = await db
          .select()
          .from(tabelasPrecoFaixasTable)
          .where(eq(tabelasPrecoFaixasTable.tabelaId, t.id));
        return { ...t, faixas };
      })
    );

    res.json({ tabelas: tabelasComFaixas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
