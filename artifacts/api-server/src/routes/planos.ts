import { Router } from "express";
import type { RequestHandler, Response } from "express";
import { eq, asc, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  db, planosTable, tabelasPrecoTable, tabelasPrecoFaixasTable, tabelasPrecoVendedoresTable,
  vendedoresTable, clientesTable, dependentesTable, propostasTable,
} from "@workspace/db";
import {
  carregarPlanosDoVendedor, definirVendedoresDaTabela, tabelaEmUso, vendedoresPorTabela,
} from "../lib/tabelasVendedor.js";
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

// ─── TABELAS DE PREÇO (FAIXA ETÁRIA; ATRIBUÍDAS A UM OU MAIS VENDEDORES) ─────

const soAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
};

class ErroNegocio extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function responderErro(res: Response, err: unknown) {
  if (err instanceof ErroNegocio) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: String(err) });
}

// GET /api/admin/tabelas-preco — lista todas as tabelas com faixas e vendedores atribuídos
router.get("/admin/tabelas-preco", soAdmin, async (_req, res) => {
  try {
    const tabelas = await db.select().from(tabelasPrecoTable).orderBy(asc(tabelasPrecoTable.nome));
    const vendedores = await db.select({ id: vendedoresTable.id, nome: vendedoresTable.nome }).from(vendedoresTable);
    const nomeVend = new Map(vendedores.map(v => [v.id, v.nome]));
    const atribuicoes = await vendedoresPorTabela(db);
    const todasFaixas = await db.select().from(tabelasPrecoFaixasTable);

    res.json({
      tabelas: await Promise.all(tabelas.map(async (t) => {
        const vids = atribuicoes.get(t.id) ?? [];
        const vs = vids.map(id => ({ id, nome: nomeVend.get(id) ?? id })).sort((a, b) => a.nome.localeCompare(b.nome));
        return {
          id: t.id, nome: t.nome, tipoPlano: t.tipoPlano, ano: t.ano, createdAt: t.createdAt,
          vendedores: vs,
          vendedorId: vs[0]?.id ?? null, // compat
          vendedorNome: vs[0]?.nome ?? null, // compat
          emUso: await tabelaEmUso(t.id),
          faixas: todasFaixas.filter(f => f.tabelaId === t.id),
        };
      })),
    });
  } catch (err) { responderErro(res, err); }
});

type FaixaInput = { faixaEtaria: string; valor: string; valorApartamento?: string | null; planoId: string };

function validarFaixas(faixas: unknown, planoUnico?: string): { ok: true; faixas: FaixaInput[] } | { ok: false; error: string } {
  if (!Array.isArray(faixas)) return { ok: false, error: "faixas deve ser um array" };
  const combinacoes = new Set<string>();
  const saida: FaixaInput[] = [];
  for (const f of faixas) {
    if (typeof f !== "object" || f === null) return { ok: false, error: "Cada faixa deve ser um objeto" };
    const fx = f as Record<string, unknown>;
    const faixaEtaria = typeof fx.faixaEtaria === "string" ? fx.faixaEtaria.trim() : "";
    const planoId = planoUnico ?? (typeof fx.planoId === "string" ? fx.planoId : "");
    if (!faixaEtaria) return { ok: false, error: "faixaEtaria é obrigatória" };
    if (!planoId) return { ok: false, error: "planoId é obrigatório em cada faixa" };
    const valor = parseFloat(String(fx.valor ?? "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return { ok: false, error: `Valor inválido na faixa "${faixaEtaria}"` };
    let valorApartamento: string | null = null;
    if (fx.valorApartamento !== undefined && fx.valorApartamento !== null && fx.valorApartamento !== "") {
      const va = parseFloat(String(fx.valorApartamento).replace(",", "."));
      if (!Number.isFinite(va) || va <= 0) return { ok: false, error: `valorApartamento inválido na faixa "${faixaEtaria}"` };
      valorApartamento = String(va);
    }
    const combinacao = `${planoId}\u0000${faixaEtaria.toLowerCase()}`;
    if (combinacoes.has(combinacao)) {
      return { ok: false, error: `Faixa etária "${faixaEtaria}" duplicada para o mesmo plano` };
    }
    combinacoes.add(combinacao);
    saida.push({ faixaEtaria, planoId, valor: String(valor), valorApartamento });
  }
  return { ok: true, faixas: saida };
}

function validarVendedorIds(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some(x => typeof x !== "string" || !x)) return null;
  return [...new Set(v as string[])];
}

async function exigirVendedores(ids: string[]) {
  if (!ids.length) return;
  const r = await db.select({ id: vendedoresTable.id }).from(vendedoresTable).where(inArray(vendedoresTable.id, ids));
  if (r.length !== ids.length) throw new ErroNegocio(404, "Vendedor não encontrado");
}

async function faixasReferenciadas(tx: Tx, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const out = new Set<string>();
  for (const t of [clientesTable, dependentesTable, propostasTable] as const) {
    const r = await tx.select({ f: t.faixaId }).from(t).where(inArray(t.faixaId, ids));
    r.forEach(x => x.f && out.add(x.f));
  }
  return out;
}

/**
 * Sincroniza as faixas da tabela preservando os ids existentes (clientes/propostas apontam para eles).
 * Com planoUnico, só toca nas faixas daquele plano.
 */
async function sincronizarFaixas(tx: Tx, tabelaId: string, faixas: FaixaInput[], planoUnico?: string) {
  const planoIds = [...new Set(faixas.map(f => f.planoId))];
  if (planoIds.length) {
    const ok = await tx.select({ id: planosTable.id }).from(planosTable).where(inArray(planosTable.id, planoIds));
    if (ok.length !== planoIds.length) throw new ErroNegocio(400, "Plano inexistente na tabela");
  }
  const existentes = await tx.select().from(tabelasPrecoFaixasTable).where(
    planoUnico
      ? and(eq(tabelasPrecoFaixasTable.tabelaId, tabelaId), eq(tabelasPrecoFaixasTable.planoId, planoUnico))
      : eq(tabelasPrecoFaixasTable.tabelaId, tabelaId),
  );
  const chave = (p: string, f: string) => `${p}\u0000${f.trim().toLowerCase()}`;
  const porChave = new Map(existentes.map(e => [chave(e.planoId, e.faixaEtaria), e]));
  const mantidas = new Set<string>();
  for (const f of faixas) {
    const ex = porChave.get(chave(f.planoId, f.faixaEtaria));
    if (ex) {
      mantidas.add(ex.id);
      await tx.update(tabelasPrecoFaixasTable)
        .set({ faixaEtaria: f.faixaEtaria, valor: f.valor, valorApartamento: f.valorApartamento ?? null })
        .where(eq(tabelasPrecoFaixasTable.id, ex.id));
    } else {
      await tx.insert(tabelasPrecoFaixasTable).values({
        id: randomUUID(), tabelaId, planoId: f.planoId, faixaEtaria: f.faixaEtaria,
        valor: f.valor, valorApartamento: f.valorApartamento ?? null,
      });
    }
  }
  const remover = existentes.filter(e => !mantidas.has(e.id));
  const usadas = await faixasReferenciadas(tx, remover.map(r => r.id));
  const bloqueada = remover.find(r => usadas.has(r.id));
  if (bloqueada) {
    throw new ErroNegocio(409, `A faixa "${bloqueada.faixaEtaria}" está em uso por cadastros existentes e não pode ser removida.`);
  }
  if (remover.length) {
    await tx.delete(tabelasPrecoFaixasTable).where(inArray(tabelasPrecoFaixasTable.id, remover.map(r => r.id)));
  }
}

// POST /api/admin/tabelas-preco — criar tabela (opcionalmente já atribuída a vendedores)
router.post("/admin/tabelas-preco", soAdmin, async (req, res) => {
  try {
    const { vendedorId, vendedorIds: vidsRaw, nome, tipoPlano, ano, faixas: faixasRaw } = req.body as {
      vendedorId?: string | null; vendedorIds?: unknown; nome?: string; tipoPlano?: string; ano?: number; faixas?: unknown;
    };
    if (!nome || typeof nome !== "string" || !nome.trim()) return res.status(400).json({ error: "nome é obrigatório" });
    const vendedorIds = validarVendedorIds(vidsRaw ?? (vendedorId ? [vendedorId] : []));
    if (!vendedorIds) return res.status(400).json({ error: "vendedorIds inválido" });
    const faixasCheck = validarFaixas(faixasRaw ?? []);
    if (!faixasCheck.ok) return res.status(400).json({ error: faixasCheck.error });
    await exigirVendedores(vendedorIds);

    const tabelaId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(tabelasPrecoTable).values({ id: tabelaId, nome: nome.trim(), tipoPlano, ano });
      await sincronizarFaixas(tx, tabelaId, faixasCheck.faixas);
      await definirVendedoresDaTabela(tx, tabelaId, vendedorIds);
    });
    res.status(201).json({ ok: true, tabelaId });
  } catch (err) { responderErro(res, err); }
});

// PUT /api/admin/tabelas-preco/:id — editar dados, vendedores e (opcionalmente) faixas
router.put("/admin/tabelas-preco/:id", soAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const { nome, tipoPlano, ano, vendedorIds: vidsRaw, faixas: faixasRaw } = req.body as {
      nome?: string; tipoPlano?: string; ano?: number; vendedorIds?: unknown; faixas?: unknown;
    };
    const [tabela] = await db.select({ id: tabelasPrecoTable.id }).from(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id)).limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    if (nome !== undefined && !String(nome).trim()) return res.status(400).json({ error: "nome é obrigatório" });

    let vendedorIds: string[] | undefined;
    if (vidsRaw !== undefined) {
      const v = validarVendedorIds(vidsRaw);
      if (!v) return res.status(400).json({ error: "vendedorIds inválido" });
      await exigirVendedores(v);
      vendedorIds = v;
    }
    let faixas: FaixaInput[] | undefined;
    if (faixasRaw !== undefined) {
      const c = validarFaixas(faixasRaw);
      if (!c.ok) return res.status(400).json({ error: c.error });
      faixas = c.faixas;
    }

    await db.transaction(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (nome !== undefined) updates.nome = String(nome).trim();
      if (tipoPlano !== undefined) updates.tipoPlano = tipoPlano;
      if (ano !== undefined) updates.ano = ano;
      if (Object.keys(updates).length) await tx.update(tabelasPrecoTable).set(updates).where(eq(tabelasPrecoTable.id, id));
      if (faixas) await sincronizarFaixas(tx, id, faixas);
      if (vendedorIds) await definirVendedoresDaTabela(tx, id, vendedorIds);
    });
    res.json({ ok: true });
  } catch (err) { responderErro(res, err); }
});

// PUT /api/admin/tabelas-preco/:id/planos/:planoId — configura um plano por vez (substitui só as faixas dele)
router.put("/admin/tabelas-preco/:id/planos/:planoId", soAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const planoId = String(req.params.planoId);
    const [tabela] = await db.select({ id: tabelasPrecoTable.id }).from(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id)).limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    const c = validarFaixas((req.body as { faixas?: unknown }).faixas ?? [], planoId);
    if (!c.ok) return res.status(400).json({ error: c.error });
    await db.transaction(tx => sincronizarFaixas(tx, id, c.faixas, planoId));
    res.json({ ok: true });
  } catch (err) { responderErro(res, err); }
});

// DELETE /api/admin/tabelas-preco/:id/planos/:planoId — remove o plano da tabela
router.delete("/admin/tabelas-preco/:id/planos/:planoId", soAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const planoId = String(req.params.planoId);
    await db.transaction(tx => sincronizarFaixas(tx, id, [], planoId));
    res.json({ ok: true });
  } catch (err) { responderErro(res, err); }
});

// GET /api/admin/vendedores-para-tabela — vendedores e as tabelas atribuídas
router.get("/admin/vendedores-para-tabela", soAdmin, async (_req, res) => {
  try {
    const vs = await db.select({ id: vendedoresTable.id, nome: vendedoresTable.nome }).from(vendedoresTable).orderBy(asc(vendedoresTable.nome));
    const atrib = await vendedoresPorTabela(db);
    const tabelasDe = new Map<string, string[]>();
    for (const [t, vids] of atrib) for (const v of vids) tabelasDe.set(v, [...(tabelasDe.get(v) ?? []), t]);
    res.json({
      vendedores: vs.map(v => ({
        id: v.id, nome: v.nome,
        tabelaIds: tabelasDe.get(v.id) ?? [],
        tabelaId: tabelasDe.get(v.id)?.[0] ?? null, // compat
      })),
    });
  } catch (err) { responderErro(res, err); }
});

// PUT /api/admin/tabelas-preco/:id/vendedores — define o conjunto de vendedores da tabela
router.put("/admin/tabelas-preco/:id/vendedores", soAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const vendedorIds = validarVendedorIds((req.body as { vendedorIds?: unknown }).vendedorIds);
    if (!vendedorIds) return res.status(400).json({ error: "vendedorIds inválido" });
    const [tabela] = await db.select({ id: tabelasPrecoTable.id }).from(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id)).limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    await exigirVendedores(vendedorIds);
    await db.transaction(tx => definirVendedoresDaTabela(tx, id, vendedorIds));
    res.json({ ok: true });
  } catch (err) { responderErro(res, err); }
});

// DELETE /api/admin/tabelas-preco/:id — só se não estiver atribuída nem em uso
router.delete("/admin/tabelas-preco/:id", soAdmin, async (req, res) => {
  try {
    const id = String(req.params.id);
    const [tabela] = await db.select({ id: tabelasPrecoTable.id }).from(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id)).limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela não encontrada" });
    if ((await vendedoresPorTabela(db)).get(id)?.length) {
      return res.status(409).json({ error: "Não é possível excluir uma tabela atribuída a vendedores. Remova as atribuições primeiro." });
    }
    if (await tabelaEmUso(id)) {
      return res.status(409).json({ error: "Não é possível excluir: há propostas ou clientes usando faixas desta tabela." });
    }
    await db.transaction(async (tx) => {
      await tx.delete(tabelasPrecoFaixasTable).where(eq(tabelasPrecoFaixasTable.tabelaId, id));
      await tx.delete(tabelasPrecoVendedoresTable).where(eq(tabelasPrecoVendedoresTable.tabelaId, id));
      await tx.delete(tabelasPrecoTable).where(eq(tabelasPrecoTable.id, id));
    });
    res.json({ ok: true });
  } catch (err) { responderErro(res, err); }
});

// GET /api/admin/vendedores/:vendedorId/planos-disponiveis — planos/faixas/preços das tabelas do vendedor
router.get("/admin/vendedores/:vendedorId/planos-disponiveis", soAdmin, async (req, res) => {
  try {
    const { tabelas, planos } = await carregarPlanosDoVendedor(String(req.params.vendedorId), { somenteAtivos: true });
    res.json({ tabela: tabelas[0] ?? null, tabelas, planos: sortPlanos(planos) });
  } catch (err) { responderErro(res, err); }
});

// GET /api/vendedor/tabela-preco — tabelas de preço do vendedor logado
router.get("/vendedor/tabela-preco", async (req, res) => {
  const vendedorId = req.user?.vendedorId;
  if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });
  try {
    const { tabelas, planos } = await carregarPlanosDoVendedor(vendedorId, { somenteAtivos: true });
    res.json({ tabela: tabelas[0] ?? null, tabelas, planos: sortPlanos(planos) });
  } catch (err) { responderErro(res, err); }
});

export default router;
