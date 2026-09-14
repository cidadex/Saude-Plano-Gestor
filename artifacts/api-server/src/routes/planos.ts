import { Router } from "express";
import { eq, asc, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  db, planosTable, tabelasPrecoTable, tabelasPrecoFaixasTable, vendedoresTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const PLANO_ORDER = ["5254","5252","5285","9714","5403","5123","5404","9717","5397","5127","5283","5402"];
const sortPlanos = <T extends { codigo: string | null }>(list: T[]): T[] =>
  [...list].sort((a, b) => {
    const ia = PLANO_ORDER.indexOf(a.codigo ?? "");
    const ib = PLANO_ORDER.indexOf(b.codigo ?? "");
    if (ia === -1 && ib === -1) return (a.codigo ?? "").localeCompare(b.codigo ?? "");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

const router = Router();
router.use(requireAuth);

// ─── PLANOS ───────────────────────────────────────────────────

// GET /api/planos — todos (qualquer usuário autenticado)
router.get("/planos", async (_req, res) => {
  try {
    const planos = await db.select().from(planosTable).orderBy(asc(planosTable.nome));
    res.json({ planos: sortPlanos(planos) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/planos — admin only (mesma lista, com mais contexto)
router.get("/admin/planos", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const planos = await db.select().from(planosTable).orderBy(asc(planosTable.nome));
    res.json({ planos: sortPlanos(planos) });
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

type FaixaInput = { faixaEtaria: string; valor: string; valorApartamento?: string; planoId: string };

function validarFaixas(faixas: unknown): { ok: true; faixas: FaixaInput[] } | { ok: false; error: string } {
  if (!Array.isArray(faixas)) return { ok: false, error: "faixas deve ser um array" };
  const combinacoes = new Set<string>();
  for (const f of faixas) {
    if (typeof f !== "object" || f === null) return { ok: false, error: "Cada faixa deve ser um objeto" };
    const fx = f as Record<string, unknown>;
    if (!fx.faixaEtaria || typeof fx.faixaEtaria !== "string") return { ok: false, error: "faixaEtaria é obrigatória" };
    if (!fx.planoId || typeof fx.planoId !== "string") return { ok: false, error: "planoId é obrigatório em cada faixa" };
    if (!fx.valor || isNaN(parseFloat(String(fx.valor)))) return { ok: false, error: `Valor inválido na faixa "${fx.faixaEtaria}"` };
    if (fx.valorApartamento !== undefined && fx.valorApartamento !== null && isNaN(parseFloat(String(fx.valorApartamento)))) {
      return { ok: false, error: `valorApartamento inválido na faixa "${fx.faixaEtaria}"` };
    }
    const combinacao = `${fx.planoId}\u0000${fx.faixaEtaria}`;
    if (combinacoes.has(combinacao)) {
      return { ok: false, error: `Faixa etária "${fx.faixaEtaria}" duplicada para o mesmo plano` };
    }
    combinacoes.add(combinacao);
  }
  return { ok: true, faixas: faixas as FaixaInput[] };
}

// POST /api/admin/tabelas-preco — criar nova tabela de preço por vendedor
router.post("/admin/tabelas-preco", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const { vendedorId, nome, tipoPlano, ano, faixas: faixasRaw } = req.body as {
      vendedorId?: string;
      nome?: string;
      tipoPlano?: string;
      ano?: number;
      faixas?: unknown;
    };
    if (!nome || typeof nome !== "string") return res.status(400).json({ error: "nome é obrigatório" });
    if (vendedorId !== undefined && vendedorId !== null && typeof vendedorId !== "string") {
      return res.status(400).json({ error: "vendedorId inválido" });
    }

    const faixasCheck = validarFaixas(faixasRaw ?? []);
    if (!faixasCheck.ok) return res.status(400).json({ error: faixasCheck.error });

    const tabelaId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(tabelasPrecoTable).values({ id: tabelaId, vendedorId: vendedorId ?? null, nome, tipoPlano, ano });
      for (const f of faixasCheck.faixas) {
        await tx.insert(tabelasPrecoFaixasTable).values({
          id: randomUUID(),
          tabelaId,
          planoId: f.planoId,
          faixaEtaria: f.faixaEtaria,
          valor: String(parseFloat(f.valor)),
          valorApartamento: f.valorApartamento ? String(parseFloat(f.valorApartamento)) : null,
        });
      }
    });
    res.status(201).json({ ok: true, tabelaId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PUT /api/admin/tabelas-preco/:id — editar tabela e substituir faixas
router.put("/admin/tabelas-preco/:id", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const { id } = req.params;
    const { nome, tipoPlano, ano, faixas: faixasRaw } = req.body as {
      nome?: string;
      tipoPlano?: string;
      ano?: number;
      faixas?: unknown;
    };

    const [tabela] = await db
      .select({ id: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.id, id))
      .limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    if (faixasRaw !== undefined) {
      const faixasCheck = validarFaixas(faixasRaw);
      if (!faixasCheck.ok) return res.status(400).json({ error: faixasCheck.error });

      await db.transaction(async (tx) => {
        const updates: Record<string, unknown> = {};
        if (nome !== undefined) updates.nome = nome;
        if (tipoPlano !== undefined) updates.tipoPlano = tipoPlano;
        if (ano !== undefined) updates.ano = ano;
        if (Object.keys(updates).length > 0) {
          await tx.update(tabelasPrecoTable).set(updates).where(eq(tabelasPrecoTable.id, id));
        }
        await tx.delete(tabelasPrecoFaixasTable).where(eq(tabelasPrecoFaixasTable.tabelaId, id));
        for (const f of faixasCheck.faixas) {
          await tx.insert(tabelasPrecoFaixasTable).values({
            id: randomUUID(),
            tabelaId: id,
            planoId: f.planoId,
            faixaEtaria: f.faixaEtaria,
            valor: String(parseFloat(f.valor)),
            valorApartamento: f.valorApartamento ? String(parseFloat(f.valorApartamento)) : null,
          });
        }
      });
    } else {
      const updates: Record<string, unknown> = {};
      if (nome !== undefined) updates.nome = nome;
      if (tipoPlano !== undefined) updates.tipoPlano = tipoPlano;
      if (ano !== undefined) updates.ano = ano;
      if (Object.keys(updates).length > 0) {
        await db.update(tabelasPrecoTable).set(updates).where(eq(tabelasPrecoTable.id, id));
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/vendedores-para-tabela — lista vendedores com info de tabela vinculada
router.get("/admin/vendedores-para-tabela", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const rows = await db
      .select({
        id: vendedoresTable.id,
        nome: vendedoresTable.nome,
        tabelaId: tabelasPrecoTable.id,
      })
      .from(vendedoresTable)
      .leftJoin(tabelasPrecoTable, eq(tabelasPrecoTable.vendedorId, vendedoresTable.id))
      .orderBy(asc(vendedoresTable.nome));

    res.json({ vendedores: rows.map(r => ({ id: r.id, nome: r.nome, tabelaId: r.tabelaId ?? null })) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/admin/tabelas-preco/:id/vincular — vincular ou desvincular vendedor
router.patch("/admin/tabelas-preco/:id/vincular", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const { id } = req.params;
    const { vendedorId } = req.body as { vendedorId: string | null };

    const [tabela] = await db
      .select({ id: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.id, id))
      .limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });

    if (vendedorId !== null && vendedorId !== undefined) {
      // Ensure seller exists
      const [vend] = await db.select({ id: vendedoresTable.id }).from(vendedoresTable).where(eq(vendedoresTable.id, vendedorId)).limit(1);
      if (!vend) return res.status(404).json({ error: "Vendedor não encontrado" });
      // Ensure seller has no other table
      const [outroTabela] = await db
        .select({ id: tabelasPrecoTable.id })
        .from(tabelasPrecoTable)
        .where(and(eq(tabelasPrecoTable.vendedorId, vendedorId), ne(tabelasPrecoTable.id, id)))
        .limit(1);
      if (outroTabela) return res.status(409).json({ error: "Este vendedor já possui uma tabela vinculada" });
    }

    await db.update(tabelasPrecoTable)
      .set({ vendedorId: vendedorId ?? null })
      .where(eq(tabelasPrecoTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Erro ao vincular tabela");
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/admin/tabelas-preco/:id — excluir tabela e suas faixas
router.delete("/admin/tabelas-preco/:id", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const { id } = req.params;
    const [tabela] = await db
      .select({ id: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.id, id))
      .limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    if (tabela.vendedorId) {
      return res.status(409).json({ error: "Não é possível excluir uma tabela atribuída a um vendedor" });
    }
    await db.transaction(async (tx) => {
      await tx.delete(tabelasPrecoFaixasTable).where(eq(tabelasPrecoFaixasTable.tabelaId, id));
      await tx.delete(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id));
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/admin/vendedores/:vendedorId/planos-disponiveis
router.get("/admin/vendedores/:vendedorId/planos-disponiveis", async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  try {
    const vendedorId = String(req.params.vendedorId);
    const [tabela] = await db
      .select()
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.vendedorId, vendedorId))
      .limit(1);

    if (!tabela) {
      res.json({ tabela: null, planos: [] });
      return;
    }

    const rows = await db
      .select({
        planoId: planosTable.id,
        planoNome: planosTable.nome,
        codigo: planosTable.codigo,
        tipo: planosTable.tipo,
        descricao: planosTable.descricao,
        operadora: planosTable.operadora,
        categoria: planosTable.categoria,
        acomodacao: planosTable.acomodacao,
        faixaId: tabelasPrecoFaixasTable.id,
        faixaEtaria: tabelasPrecoFaixasTable.faixaEtaria,
        valor: tabelasPrecoFaixasTable.valor,
        valorApartamento: tabelasPrecoFaixasTable.valorApartamento,
      })
      .from(tabelasPrecoFaixasTable)
      .innerJoin(
        planosTable,
        and(
          eq(planosTable.id, tabelasPrecoFaixasTable.planoId),
          eq(planosTable.ativo, true),
        ),
      )
      .where(eq(tabelasPrecoFaixasTable.tabelaId, tabela.id));

    const porPlano = new Map<string, {
      id: string;
      nome: string;
      codigo: string | null;
      tipo: string;
      descricao: string | null;
      operadora: string;
      categoria: string | null;
      acomodacao: string | null;
      faixas: Array<{ id: string; label: string; faixaEtaria: string; valor: string; valorApartamento: string | null }>;
    }>();
    for (const row of rows) {
      let plano = porPlano.get(row.planoId);
      if (!plano) {
        plano = {
          id: row.planoId,
          nome: row.planoNome,
          codigo: row.codigo,
          tipo: row.tipo,
          descricao: row.descricao,
          operadora: row.operadora,
          categoria: row.categoria,
          acomodacao: row.acomodacao,
          faixas: [],
        };
        porPlano.set(row.planoId, plano);
      }
      plano.faixas.push({
        id: row.faixaId,
        label: row.faixaEtaria,
        faixaEtaria: row.faixaEtaria,
        valor: row.valor,
        valorApartamento: row.valorApartamento,
      });
    }

    res.json({
      tabela: {
        id: tabela.id,
        nome: tabela.nome,
        tipoPlano: tabela.tipoPlano,
        ano: tabela.ano,
      },
      planos: sortPlanos([...porPlano.values()]),
    });
  } catch (err) {
    req.log.error({ err }, "Erro ao listar planos disponíveis do vendedor");
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/tabela-preco — tabela de preço do vendedor logado
router.get("/vendedor/tabela-preco", async (req, res) => {
  const vendedorId = req.user?.vendedorId;
  if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });
  try {
    const [tabela] = await db
      .select()
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.vendedorId, vendedorId))
      .limit(1);

    if (!tabela) {
      res.json({ tabela: null, planos: [] });
      return;
    }

    // Load faixas joined with plan info so the seller can see plan names/codes
    const rows = await db
      .select({
        planoId: planosTable.id,
        planoNome: planosTable.nome,
        codigo: planosTable.codigo,
        categoria: planosTable.categoria,
        acomodacao: planosTable.acomodacao,
        faixaId: tabelasPrecoFaixasTable.id,
        faixaEtaria: tabelasPrecoFaixasTable.faixaEtaria,
        valor: tabelasPrecoFaixasTable.valor,
        valorApartamento: tabelasPrecoFaixasTable.valorApartamento,
      })
      .from(tabelasPrecoFaixasTable)
      .innerJoin(planosTable, eq(planosTable.id, tabelasPrecoFaixasTable.planoId))
      .where(eq(tabelasPrecoFaixasTable.tabelaId, tabela.id))
      .orderBy(planosTable.nome, tabelasPrecoFaixasTable.faixaEtaria);

    // Group by plan
    const porPlano = new Map<string, {
      id: string; nome: string; codigo: string | null;
      categoria: string | null; acomodacao: string | null;
      faixas: { id: string; faixaEtaria: string; valor: string; valorApartamento: string | null }[];
    }>();
    for (const row of rows) {
      let p = porPlano.get(row.planoId);
      if (!p) {
        p = { id: row.planoId, nome: row.planoNome, codigo: row.codigo, categoria: row.categoria, acomodacao: row.acomodacao, faixas: [] };
        porPlano.set(row.planoId, p);
      }
      p.faixas.push({ id: row.faixaId, faixaEtaria: row.faixaEtaria, valor: row.valor, valorApartamento: row.valorApartamento });
    }

    res.json({
      tabela: { id: tabela.id, nome: tabela.nome, tipoPlano: tabela.tipoPlano, ano: tabela.ano },
      planos: [...porPlano.values()],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
