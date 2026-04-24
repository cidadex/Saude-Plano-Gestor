import { Router } from "express";
import { db, vendedoresTable, clientesTable, propostasTable, boletosTable, comissoesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function isGerente(req: { user?: { role?: string } }) {
  return req.user?.role === "gerente" || req.user?.role === "admin";
}

// GET /api/gerente/stats — resumo geral
router.get("/gerente/stats", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const [clientes, propostas, comissoes, boletos] = await Promise.all([
      db.select().from(clientesTable),
      db.select().from(propostasTable),
      db.select().from(comissoesTable),
      db.select().from(boletosTable),
    ]);
    const totalClientes = clientes.filter(c => c.status === "ATIVO").length;
    const totalTitulares = clientes.filter(c => c.tipo === "TITULAR" && c.status === "ATIVO").length;
    const totalDependentes = clientes.filter(c => c.tipo === "DEPENDENTE" && c.status === "ATIVO").length;
    const propostas_aguardando = propostas.filter(p => p.status === "AGUARDANDO_ENVIO").length;
    const propostas_ativas = propostas.filter(p => p.status === "ATIVA").length;
    const totalReceitaMensal = clientes
      .filter(c => c.status === "ATIVO")
      .reduce((sum, c) => sum + parseFloat(c.valorMensal ?? "0"), 0);
    const comissoesPendentes = comissoes
      .filter(c => c.status === "PENDENTE")
      .reduce((sum, c) => sum + parseFloat(c.valor ?? "0"), 0);
    const boletosMes = boletos.filter(b => b.mesReferencia === "04/2026");
    const boletosEmDia = boletosMes.filter(b => b.status === "PAGO").length;
    const boletosVencidos = boletosMes.filter(b => b.status === "VENCIDO").length;
    const boletosAVencer = boletosMes.filter(b => b.status === "PENDENTE").length;
    res.json({
      totalClientes, totalTitulares, totalDependentes,
      propostas_aguardando, propostas_ativas,
      totalReceitaMensal,
      comissoesPendentes,
      boletosEmDia, boletosVencidos, boletosAVencer,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/vendedores — equipe
router.get("/gerente/vendedores", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const vendedores = await db.select().from(vendedoresTable);
    const clientes = await db.select({ vendedorId: clientesTable.vendedorId, status: clientesTable.status }).from(clientesTable);
    const propostas = await db.select({ vendedorId: propostasTable.vendedorId, status: propostasTable.status }).from(propostasTable);
    const comissoes = await db.select({ vendedorId: comissoesTable.vendedorId, valor: comissoesTable.valor, status: comissoesTable.status }).from(comissoesTable);
    const result = vendedores.map(v => ({
      ...v,
      totalClientes: clientes.filter(c => c.vendedorId === v.id && c.status === "ATIVO").length,
      totalPropostas: propostas.filter(p => p.vendedorId === v.id).length,
      comissoesPendentes: comissoes
        .filter(c => c.vendedorId === v.id && c.status === "PENDENTE")
        .reduce((s, c) => s + parseFloat(c.valor ?? "0"), 0),
    }));
    res.json({ vendedores: result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/clientes — lista completa
router.get("/gerente/clientes", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const clientes = await db.select().from(clientesTable).orderBy(clientesTable.nome);
    res.json({ clientes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/propostas — lista completa
router.get("/gerente/propostas", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const propostas = await db.select().from(propostasTable).orderBy(propostasTable.createdAt);
    res.json({ propostas });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/comissoes — lista completa
router.get("/gerente/comissoes", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const comissoes = await db.select().from(comissoesTable).orderBy(comissoesTable.createdAt);
    res.json({ comissoes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/boletos — lista completa
router.get("/gerente/boletos", async (req, res) => {
  if (!isGerente(req)) return res.status(403).json({ error: "Acesso negado" });
  try {
    const boletos = await db.select().from(boletosTable).orderBy(boletosTable.vencimento);
    res.json({ boletos });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
