import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import {
  db, clientesTable, dependentesTable, boletosTable, planosTable, responsaveisFinanceirosTable,
} from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";

const router = Router();

router.use(requireAuth);

function requireCliente(req: Parameters<typeof requireAuth>[0], res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]) {
  if (req.user?.role !== "cliente" || !req.user?.clienteId) {
    res.status(403).json({ error: "Acesso exclusivo para clientes" });
    return;
  }
  next();
}

// GET /cliente/me — dados do titular + dependentes + plano
router.get("/cliente/me", requireCliente, async (req, res) => {
  try {
    const clienteId = req.user!.clienteId!;

    const [cliente] = await db
      .select({
        id: clientesTable.id,
        nome: clientesTable.nome,
        cpf: clientesTable.cpf,
        dataNascimento: clientesTable.dataNascimento,
        sexo: clientesTable.sexo,
        telefone: clientesTable.telefone,
        email: clientesTable.email,
        cep: clientesTable.cep,
        logradouro: clientesTable.logradouro,
        numero: clientesTable.numero,
        complemento: clientesTable.complemento,
        bairro: clientesTable.bairro,
        cidade: clientesTable.cidade,
        estado: clientesTable.estado,
        status: clientesTable.status,
        valorMensal: clientesTable.valorMensal,
        dataVigencia: clientesTable.dataVigencia,
        dataAtivacao: clientesTable.dataAtivacao,
        diaVencimento: clientesTable.diaVencimento,
        formaPagamento: clientesTable.formaPagamento,
        planoId: clientesTable.planoId,
        codigoPlano: clientesTable.codigoPlano,
        planoCode: clientesTable.planoCode,
        tipo: clientesTable.tipo,
      })
      .from(clientesTable)
      .where(eq(clientesTable.id, clienteId))
      .limit(1);

    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });

    // Buscar plano
    let plano = null;
    if (cliente.planoId) {
      const [p] = await db.select({ id: planosTable.id, nome: planosTable.nome, codigo: planosTable.codigo, tipo: planosTable.tipo, operadora: planosTable.operadora })
        .from(planosTable).where(eq(planosTable.id, cliente.planoId)).limit(1);
      plano = p ?? null;
    }

    // Buscar dependentes
    const dependentes = await db
      .select({
        id: dependentesTable.id,
        nome: dependentesTable.nome,
        cpf: dependentesTable.cpf,
        dataNascimento: dependentesTable.dataNascimento,
        sexo: dependentesTable.sexo,
        grauParentesco: dependentesTable.grauParentesco,
        valorMensal: dependentesTable.valorMensal,
      })
      .from(dependentesTable)
      .where(eq(dependentesTable.clienteId, clienteId));

    res.json({ cliente, plano, dependentes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /cliente/boletos — histórico de faturas
router.get("/cliente/boletos", requireCliente, async (req, res) => {
  try {
    const clienteId = req.user!.clienteId!;

    const boletos = await db
      .select({
        id: boletosTable.id,
        valor: boletosTable.valor,
        vencimento: boletosTable.vencimento,
        status: boletosTable.status,
        codigoBarras: boletosTable.codigoBarras,
        mesReferencia: boletosTable.mesReferencia,
        linkPagamento: boletosTable.linkPagamento,
        dataPagamento: boletosTable.dataPagamento,
        createdAt: boletosTable.createdAt,
      })
      .from(boletosTable)
      .where(eq(boletosTable.clienteId, clienteId))
      .orderBy(desc(boletosTable.vencimento));

    res.json({ boletos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// GET /responsavel/me — responsável financeiro logado: beneficiários vinculados e suas faturas
router.get("/responsavel/me", async (req, res) => {
  try {
    if (req.user?.role !== "responsavel" || !req.user.responsavelId) {
      return res.status(403).json({ error: "Acesso exclusivo para responsáveis financeiros" });
    }
    const [responsavel] = await db
      .select({
        id: responsaveisFinanceirosTable.id, nome: responsaveisFinanceirosTable.nome,
        cpfCnpj: responsaveisFinanceirosTable.cpfCnpj, email: responsaveisFinanceirosTable.email,
      })
      .from(responsaveisFinanceirosTable)
      .where(eq(responsaveisFinanceirosTable.id, req.user.responsavelId)).limit(1);
    if (!responsavel) return res.status(404).json({ error: "Responsável não encontrado" });

    const beneficiarios = await db
      .select({
        id: clientesTable.id, nome: clientesTable.nome, cpf: clientesTable.cpf, status: clientesTable.status,
        tipo: clientesTable.tipo, valorMensal: clientesTable.valorMensal,
      })
      .from(clientesTable)
      .where(eq(clientesTable.responsavelFinanceiroId, responsavel.id));

    const ids = beneficiarios.map(b => b.id);
    const boletos = ids.length
      ? await db
          .select({
            id: boletosTable.id, clienteId: boletosTable.clienteId, valor: boletosTable.valor,
            vencimento: boletosTable.vencimento, status: boletosTable.status, codigoBarras: boletosTable.codigoBarras,
            mesReferencia: boletosTable.mesReferencia, linkPagamento: boletosTable.linkPagamento,
            dataPagamento: boletosTable.dataPagamento,
          })
          .from(boletosTable)
          .where(inArray(boletosTable.clienteId, ids))
          .orderBy(desc(boletosTable.vencimento))
      : [];

    res.json({ responsavel, beneficiarios, boletos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
