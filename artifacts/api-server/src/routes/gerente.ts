import { Router } from "express";
import { db, vendedoresTable, clientesTable, propostasTable, boletosTable, comissoesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);

function hasPermissao(req: { user?: { role?: string; permissoes?: string[] } }, permissao: string) {
  if (req.user?.role === "admin") return true;
  if (req.user?.role !== "gerente") return false;
  return (req.user?.permissoes ?? []).includes(permissao);
}

// GET /api/gerente/stats — resumo geral (requer ver_dashboard; retorna apenas dados das permissões do gerente)
router.get("/gerente/stats", async (req, res) => {
  if (!hasPermissao(req, "ver_dashboard")) return res.status(403).json({ error: "Sem permissão" });
  try {
    const result: Record<string, unknown> = {};

    if (hasPermissao(req, "ver_clientes")) {
      const clientes = await db.select().from(clientesTable);
      result.totalClientes = clientes.filter(c => c.status === "ATIVO").length;
      result.totalTitulares = clientes.filter(c => c.tipo === "TITULAR" && c.status === "ATIVO").length;
      result.totalDependentes = clientes.filter(c => c.tipo === "DEPENDENTE" && c.status === "ATIVO").length;
      result.totalReceitaMensal = clientes.filter(c => c.status === "ATIVO").reduce((s, c) => s + parseFloat(c.valorMensal ?? "0"), 0);
    }
    if (hasPermissao(req, "ver_propostas")) {
      const propostas = await db.select().from(propostasTable);
      result.propostas_aguardando = propostas.filter(p => p.status === "AGUARDANDO_ENVIO").length;
      result.propostas_ativas = propostas.filter(p => p.status === "ATIVA").length;
    }
    if (hasPermissao(req, "ver_comissoes")) {
      const comissoes = await db.select().from(comissoesTable);
      result.comissoesPendentes = comissoes.filter(c => c.status === "PENDENTE").reduce((s, c) => s + parseFloat(c.valor ?? "0"), 0);
    }
    if (hasPermissao(req, "ver_financeiro") || hasPermissao(req, "ver_cobranca")) {
      const now = new Date();
      const mesAtual = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      const boletos = await db.select().from(boletosTable);
      const boletosMes = boletos.filter(b => b.mesReferencia === mesAtual);
      result.boletosEmDia = boletosMes.filter(b => b.status === "PAGO").length;
      result.boletosVencidos = boletosMes.filter(b => b.status === "VENCIDO").length;
      result.boletosAVencer = boletosMes.filter(b => b.status === "PENDENTE").length;
      result.mesReferencia = mesAtual;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/vendedores — equipe (requer ver_equipe)
router.get("/gerente/vendedores", async (req, res) => {
  if (!hasPermissao(req, "ver_equipe")) return res.status(403).json({ error: "Sem permissão" });
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

// GET /api/gerente/clientes — lista completa (requer ver_clientes)
router.get("/gerente/clientes", async (req, res) => {
  if (!hasPermissao(req, "ver_clientes")) return res.status(403).json({ error: "Sem permissão" });
  try {
    const clientes = await db.select().from(clientesTable).orderBy(clientesTable.nome);
    res.json({ clientes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/propostas — lista completa (requer ver_propostas)
router.get("/gerente/propostas", async (req, res) => {
  if (!hasPermissao(req, "ver_propostas")) return res.status(403).json({ error: "Sem permissão" });
  try {
    const propostas = await db.select().from(propostasTable).orderBy(propostasTable.createdAt);
    res.json({ propostas });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/comissoes — lista completa (requer ver_comissoes)
router.get("/gerente/comissoes", async (req, res) => {
  if (!hasPermissao(req, "ver_comissoes")) return res.status(403).json({ error: "Sem permissão" });
  try {
    const comissoes = await db.select().from(comissoesTable).orderBy(comissoesTable.createdAt);
    res.json({ comissoes });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/gerente/boletos — lista completa (requer ver_financeiro ou ver_cobranca)
router.get("/gerente/boletos", async (req, res) => {
  if (!hasPermissao(req, "ver_financeiro") && !hasPermissao(req, "ver_cobranca")) {
    return res.status(403).json({ error: "Sem permissão" });
  }
  try {
    const boletos = await db.select().from(boletosTable).orderBy(boletosTable.vencimento);
    res.json({ boletos });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
