import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { db, comunicacoesTable, clientesTable, boletosTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

// Mapeamento do tipo frontend → enum do banco
const tipoMap: Record<string, "BOLETO_EMITIDO" | "ATRASO" | "AVISO_SUSPENSAO" | "SUSPENSO"> = {
  BOLETO: "BOLETO_EMITIDO",
  ATRASO: "ATRASO",
  SUSPENSAO: "AVISO_SUSPENSAO",
  SUSPENSO: "SUSPENSO",
  // passagem direta (caso já venha o valor do banco)
  BOLETO_EMITIDO: "BOLETO_EMITIDO",
  AVISO_SUSPENSAO: "AVISO_SUSPENSAO",
};

// POST /api/comunicacoes — registrar envio de mensagem WhatsApp
router.post("/comunicacoes", async (req, res) => {
  try {
    const { clienteId, tipo, boletoId } = req.body as {
      clienteId: string;
      tipo: string;
      boletoId?: string;
    };

    if (!clienteId || !tipo) {
      return res.status(400).json({ error: "clienteId e tipo são obrigatórios" });
    }

    const tipoBanco = tipoMap[tipo];
    if (!tipoBanco) {
      return res.status(400).json({ error: `Tipo inválido: ${tipo}` });
    }

    // Vendedor só pode registrar comunicação dos seus próprios clientes
    const vendedorId = req.user!.vendedorId;
    if (vendedorId) {
      const [cliente] = await db.select({ id: clientesTable.id })
        .from(clientesTable)
        .where(eq(clientesTable.id, clienteId))
        .limit(1);

      if (!cliente) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
    }

    const id = `com-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const [comunicacao] = await db.insert(comunicacoesTable).values({
      id,
      clienteId,
      operadorId: req.user!.userId,
      tipo: tipoBanco,
      boletoId: boletoId ?? null,
    }).returning();

    res.status(201).json({ comunicacao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /api/vendedor/comunicacoes — histórico de comunicações dos clientes do vendedor
router.get("/vendedor/comunicacoes", async (req, res) => {
  try {
    const vendedorId = req.user!.vendedorId;
    if (!vendedorId) return res.status(403).json({ error: "Somente vendedores" });

    // Busca IDs dos clientes deste vendedor
    const clientes = await db.select({ id: clientesTable.id, nome: clientesTable.nome, cpf: clientesTable.cpf, telefone: clientesTable.telefone })
      .from(clientesTable)
      .where(eq(clientesTable.vendedorId, vendedorId));

    if (clientes.length === 0) {
      return res.json({ comunicacoes: [] });
    }

    const clienteIds = clientes.map(c => c.id);
    const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c]));

    // Busca comunicações dos clientes
    const coms = await db.select()
      .from(comunicacoesTable)
      .where(inArray(comunicacoesTable.clienteId, clienteIds))
      .orderBy(desc(comunicacoesTable.createdAt));

    // Enriquece com dados do cliente e boleto (se houver)
    const boletoIds = coms.filter(c => c.boletoId).map(c => c.boletoId!);
    let boletoMap: Record<string, { mesReferencia: string; valor: string }> = {};
    if (boletoIds.length > 0) {
      const boletos = await db.select({ id: boletosTable.id, mesReferencia: boletosTable.mesReferencia, valor: boletosTable.valor })
        .from(boletosTable)
        .where(inArray(boletosTable.id, boletoIds));
      boletoMap = Object.fromEntries(boletos.map(b => [b.id, b]));
    }

    const comunicacoes = coms.map(c => ({
      ...c,
      clienteNome: clienteMap[c.clienteId]?.nome ?? "—",
      clienteCpf: clienteMap[c.clienteId]?.cpf ?? "—",
      clienteTelefone: clienteMap[c.clienteId]?.telefone ?? null,
      boleto: c.boletoId ? boletoMap[c.boletoId] ?? null : null,
    }));

    res.json({ comunicacoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
