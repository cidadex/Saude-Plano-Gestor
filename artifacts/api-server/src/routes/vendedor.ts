import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  db, clientesTable, propostasTable, boletosTable,
  comissoesTable, planosTable, vendedoresTable,
} from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

const router = Router();

// All routes require auth
router.use(requireAuth);

// GET /api/vendedor/clientes
router.get("/vendedor/clientes", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    const clientes = await db
      .select()
      .from(clientesTable)
      .where(eq(clientesTable.vendedorId, vendedorId));

    res.json({ clientes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/propostas
router.get("/vendedor/propostas", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    const propostas = await db
      .select()
      .from(propostasTable)
      .where(eq(propostasTable.vendedorId, vendedorId));

    res.json({ propostas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/boletos
router.get("/vendedor/boletos", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    // Join boletos → clientes to filter by vendedorId
    const rows = await db
      .select({
        id: boletosTable.id,
        clienteId: boletosTable.clienteId,
        clienteNome: clientesTable.nome,
        clienteCpf: clientesTable.cpf,
        clienteTelefone: clientesTable.telefone,
        valor: boletosTable.valor,
        vencimento: boletosTable.vencimento,
        status: boletosTable.status,
        codigoBarras: boletosTable.codigoBarras,
        mesReferencia: boletosTable.mesReferencia,
        linkPagamento: boletosTable.linkPagamento,
        dataPagamento: boletosTable.dataPagamento,
        planoCode: clientesTable.planoCode,
        formaPagamento: clientesTable.formaPagamento,
        createdAt: boletosTable.createdAt,
      })
      .from(boletosTable)
      .innerJoin(clientesTable, eq(boletosTable.clienteId, clientesTable.id))
      .where(eq(clientesTable.vendedorId, vendedorId));

    res.json({ boletos: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/comissoes
router.get("/vendedor/comissoes", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    const comissoes = await db
      .select()
      .from(comissoesTable)
      .where(eq(comissoesTable.vendedorId, vendedorId));

    res.json({ comissoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/dashboard  — summary stats
router.get("/vendedor/dashboard", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    const [clientes, propostas, boletos, comissoes] = await Promise.all([
      db.select().from(clientesTable).where(eq(clientesTable.vendedorId, vendedorId)),
      db.select().from(propostasTable).where(eq(propostasTable.vendedorId, vendedorId)),
      db.select({ id: boletosTable.id, valor: boletosTable.valor, status: boletosTable.status, mesReferencia: boletosTable.mesReferencia, clienteId: boletosTable.clienteId })
        .from(boletosTable)
        .innerJoin(clientesTable, eq(boletosTable.clienteId, clientesTable.id))
        .where(eq(clientesTable.vendedorId, vendedorId)),
      db.select().from(comissoesTable).where(eq(comissoesTable.vendedorId, vendedorId)),
    ]);

    const totalClientes = clientes.filter(c => c.status === "ATIVO").length;
    const receitaMensal = clientes.reduce((a, c) => a + parseFloat(c.valorMensal ?? "0"), 0);
    const boletosPendentes = boletos.filter(b => b.status === "PENDENTE" || b.status === "VENCIDO");
    const totalAberto = boletosPendentes.reduce((a, b) => a + parseFloat(b.valor), 0);
    const comissaoVenda = comissoes.filter(c => c.tipo === "VENDA").reduce((a, c) => a + parseFloat(c.valor), 0);
    const comissaoServico = comissoes.filter(c => c.tipo === "SERVICO").reduce((a, c) => a + parseFloat(c.valor), 0);

    res.json({
      totalClientes,
      totalPropostas: propostas.length,
      propostasPendentes: propostas.filter(p => p.status === "AGUARDANDO_ENVIO").length,
      receitaMensal,
      totalAberto,
      boletosPendentes: boletosPendentes.length,
      comissaoVenda,
      comissaoServico,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/vendedor/propostas — create new proposal
router.post("/vendedor/propostas", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    const { dadosTitular, dadosDependentes, planoId, valorTotal } = req.body as {
      dadosTitular: Record<string, unknown>;
      dadosDependentes?: Record<string, unknown>[];
      planoId?: string;
      valorTotal?: string;
    };

    if (!dadosTitular) return res.status(400).json({ error: "dadosTitular é obrigatório" });

    const id = `prop-${Date.now()}`;
    const [proposta] = await db.insert(propostasTable).values({
      id,
      vendedorId,
      status: "AGUARDANDO_ENVIO",
      dadosTitular,
      dadosDependentes: dadosDependentes ?? [],
      planoId: planoId ?? null,
      valorTotal: valorTotal ?? null,
    }).returning();

    res.status(201).json({ proposta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/planos  — all plans (any authenticated user)
router.get("/planos", async (_req, res) => {
  try {
    const planos = await db.select().from(planosTable);
    res.json({ planos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
