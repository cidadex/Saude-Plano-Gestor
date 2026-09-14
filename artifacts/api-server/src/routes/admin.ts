import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq, sql, desc, and, or, inArray, ne } from "drizzle-orm";
import {
  db,
  usersTable,
  vendedoresTable,
  gerentesTable,
  clientesTable,
  propostasTable,
  boletosTable,
  contratosTable,
  planosTable,
  tabelasPrecoTable,
  tabelasPrecoFaixasTable,
  responsaveisFinanceirosTable,
  comissoesTable,
} from "@workspace/db";
import { count as drizzleCount, sum as drizzleSum } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { validarDadosTitular } from "../lib/validacaoProposta.js";
import { validarSelecaoProposta } from "../lib/validacaoSelecaoProposta.js";
import {
  ensureActivationCommission,
  COMISSAO_CONFIGURACAO_AUSENTE,
  COMISSAO_CONFIGURACAO_MENSAGEM,
  COMISSAO_VALOR_MENSAL_AUSENTE,
  COMISSAO_VALOR_MENSAL_MENSAGEM,
} from "../lib/ativacaoComissao.js";

const router = Router();

// Apenas admins
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
});

type ComissaoModalidade = "FIXO" | "PERCENTUAL";

function validarConfiguracaoComissao(
  comissionado: boolean,
  modalidade: ComissaoModalidade | null | undefined,
  valor: string | number | null | undefined,
): { modalidade: ComissaoModalidade | null; valor: string | null; error?: string } {
  if (!comissionado) return { modalidade: null, valor: null };
  if (modalidade !== "FIXO" && modalidade !== "PERCENTUAL") {
    return { modalidade: null, valor: null, error: "comissaoModalidade deve ser FIXO ou PERCENTUAL" };
  }

  const parsed = valor === null || valor === undefined || valor === ""
    ? NaN
    : Number(String(valor).replace(",", "."));
  const rounded = Number.isFinite(parsed)
    ? Math.round((parsed + Number.EPSILON) * 100) / 100
    : NaN;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return { modalidade: null, valor: null, error: "comissaoValor deve ser maior que zero para vendedores comissionados" };
  }
  if (modalidade === "PERCENTUAL" && rounded > 100) {
    return { modalidade: null, valor: null, error: "comissaoValor percentual não pode ser maior que 100" };
  }

  return { modalidade, valor: rounded.toFixed(2) };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "23505";
}

// ─── VENDEDORES ───────────────────────────────────────────────

// Listar vendedores com status da conta e total de clientes
router.get("/admin/vendedores", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: vendedoresTable.id,
        userId: vendedoresTable.userId,
        nome: vendedoresTable.nome,
        email: vendedoresTable.email,
        telefone: vendedoresTable.telefone,
        comissionado: vendedoresTable.comissionado,
        tipoComissao: vendedoresTable.tipoComissao,
        comissaoModalidade: vendedoresTable.comissaoModalidade,
        comissaoValor: vendedoresTable.comissaoValor,
        createdAt: vendedoresTable.createdAt,
        active: usersTable.active,
        tabelaPrecoId: tabelasPrecoTable.id,
        tabelaPrecoNome: tabelasPrecoTable.nome,
      })
      .from(vendedoresTable)
      .leftJoin(usersTable, eq(usersTable.id, vendedoresTable.userId))
      .leftJoin(tabelasPrecoTable, eq(tabelasPrecoTable.vendedorId, vendedoresTable.id))
      .orderBy(vendedoresTable.nome);

    // Conta clientes por vendedor
    const counts = await db
      .select({ vendedorId: clientesTable.vendedorId, total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .groupBy(clientesTable.vendedorId);

    const countMap = Object.fromEntries(counts.map(c => [c.vendedorId, c.total]));

    const vendedores = rows.map(v => ({
      ...v,
      totalClientes: countMap[v.id] ?? 0,
    }));

    res.json({ vendedores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Criar vendedor
router.post("/admin/vendedores", async (req, res) => {
  try {
    const { nome, email, telefone, comissionado, tipoComissao, comissaoModalidade, comissaoValor, senha, tabelaPrecoId } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      comissionado: boolean;
      tipoComissao?: "VENDA" | "SERVICO" | "AMBOS";
      comissaoModalidade?: ComissaoModalidade | null;
      comissaoValor?: string | number | null;
      senha: string;
      tabelaPrecoId: string;
    };

    if (!nome || !email || !senha || !tabelaPrecoId) {
      return res.status(400).json({ error: "nome, email, senha e tabelaPrecoId são obrigatórios" });
    }
    if (senha.length < 6) return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });

    // Verifica duplicata de email
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
    if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

    const [tabela] = await db
      .select({ id: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.id, tabelaPrecoId))
      .limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela de preço não encontrada" });
    if (tabela.vendedorId) return res.status(409).json({ error: "Tabela de preço já atribuída a outro vendedor" });

    const comissaoConfig = validarConfiguracaoComissao(
      comissionado === true,
      comissaoModalidade,
      comissaoValor,
    );
    if (comissaoConfig.error) return res.status(400).json({ error: comissaoConfig.error });

    const passwordHash = await bcrypt.hash(senha, 10);
    const uid = `user-v-${Date.now()}`;
    const vid = `v-${Date.now()}`;

    await db.transaction(async (tx) => {
      await tx.insert(usersTable).values({
        id: uid,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "vendedor",
        nome,
        active: true,
      });
      await tx.insert(vendedoresTable).values({
        id: vid,
        userId: uid,
        nome,
        email: email.toLowerCase().trim(),
        telefone: telefone ?? null,
        comissionado: comissionado ?? false,
        tipoComissao: comissionado ? (tipoComissao ?? "VENDA") : null,
        comissaoModalidade: comissaoConfig.modalidade,
        comissaoValor: comissaoConfig.valor,
      });
      const tabelasAtribuidas = await tx
        .update(tabelasPrecoTable)
        .set({ vendedorId: vid })
        .where(and(eq(tabelasPrecoTable.id, tabelaPrecoId), sql`${tabelasPrecoTable.vendedorId} is null`))
        .returning({ id: tabelasPrecoTable.id });
      if (tabelasAtribuidas.length !== 1) {
        throw new Error("TABELA_PRECO_JA_ATRIBUIDA");
      }
    });

    res.status(201).json({
      vendedor: {
        id: vid,
        userId: uid,
        nome,
        email,
        telefone,
        comissionado,
        tipoComissao: comissionado ? (tipoComissao ?? "VENDA") : null,
        comissaoModalidade: comissaoConfig.modalidade,
        comissaoValor: comissaoConfig.valor,
        tabelaPrecoId,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "TABELA_PRECO_JA_ATRIBUIDA") {
      return res.status(409).json({ error: "Tabela de preço já atribuída a outro vendedor" });
    }
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Editar vendedor
router.put("/admin/vendedores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, comissionado, tipoComissao, comissaoModalidade, comissaoValor, tabelaPrecoId } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      comissionado: boolean;
      tipoComissao?: "VENDA" | "SERVICO" | "AMBOS";
      comissaoModalidade?: ComissaoModalidade | null;
      comissaoValor?: string | number | null;
      tabelaPrecoId: string;
    };
    if (!nome || !email || !tabelaPrecoId) {
      return res.status(400).json({ error: "nome, email e tabelaPrecoId são obrigatórios" });
    }

    const [vendedor] = await db.select().from(vendedoresTable).where(eq(vendedoresTable.id, id)).limit(1);
    if (!vendedor) return res.status(404).json({ error: "Vendedor não encontrado" });

    const normalizedEmail = email.toLowerCase().trim();
    const [emailEmUso] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, normalizedEmail), ne(usersTable.id, vendedor.userId)))
      .limit(1);
    if (emailEmUso) return res.status(409).json({ error: "E-mail já cadastrado" });

    const [tabela] = await db
      .select({ id: tabelasPrecoTable.id, vendedorId: tabelasPrecoTable.vendedorId })
      .from(tabelasPrecoTable)
      .where(eq(tabelasPrecoTable.id, tabelaPrecoId))
      .limit(1);
    if (!tabela) return res.status(404).json({ error: "Tabela de preço não encontrada" });
    if (tabela.vendedorId && tabela.vendedorId !== id) {
      return res.status(409).json({ error: "Tabela de preço já atribuída a outro vendedor" });
    }

    const effectiveComissionado = comissionado ?? vendedor.comissionado;
    const effectiveModalidade = comissaoModalidade !== undefined
      ? comissaoModalidade
      : vendedor.comissaoModalidade;
    const effectiveValor = comissaoValor !== undefined
      ? comissaoValor
      : vendedor.comissaoValor;
    const comissaoConfig = validarConfiguracaoComissao(
      effectiveComissionado === true,
      effectiveModalidade,
      effectiveValor,
    );
    if (comissaoConfig.error) return res.status(400).json({ error: comissaoConfig.error });

    await db.transaction(async (tx) => {
      await tx.update(vendedoresTable).set({
        nome,
        email: normalizedEmail,
        telefone: telefone ?? null,
        comissionado: effectiveComissionado,
        tipoComissao: effectiveComissionado ? (tipoComissao ?? vendedor.tipoComissao ?? "VENDA") : null,
        comissaoModalidade: comissaoConfig.modalidade,
        comissaoValor: comissaoConfig.valor,
      }).where(eq(vendedoresTable.id, id));

      await tx.update(usersTable).set({
        nome,
        email: normalizedEmail,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, vendedor.userId));

      await tx
        .update(tabelasPrecoTable)
        .set({ vendedorId: null })
        .where(eq(tabelasPrecoTable.vendedorId, id));
      await tx
        .update(tabelasPrecoTable)
        .set({ vendedorId: id })
        .where(eq(tabelasPrecoTable.id, tabelaPrecoId));
    });

    const [updated] = await db.select().from(vendedoresTable).where(eq(vendedoresTable.id, id)).limit(1);
    res.json({ ok: true, vendedor: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── GERENTES ─────────────────────────────────────────────────

router.get("/admin/gerentes", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: gerentesTable.id,
        userId: gerentesTable.userId,
        nome: gerentesTable.nome,
        email: gerentesTable.email,
        telefone: gerentesTable.telefone,
        permissoes: gerentesTable.permissoes,
        createdAt: gerentesTable.createdAt,
        active: usersTable.active,
      })
      .from(gerentesTable)
      .leftJoin(usersTable, eq(usersTable.id, gerentesTable.userId))
      .orderBy(gerentesTable.nome);

    res.json({ gerentes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

router.post("/admin/gerentes", async (req, res) => {
  try {
    const { nome, email, telefone, permissoes, senha } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      permissoes: string[];
      senha: string;
    };

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "nome, email e senha são obrigatórios" });
    }

    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
    if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

    const passwordHash = await bcrypt.hash(senha, 10);
    const uid = `user-g-${Date.now()}`;
    const gid = `g-${Date.now()}`;

    await db.insert(usersTable).values({
      id: uid,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "gerente",
      nome,
      active: true,
    });

    await db.insert(gerentesTable).values({
      id: gid,
      userId: uid,
      nome,
      email: email.toLowerCase().trim(),
      telefone: telefone ?? null,
      permissoes: permissoes ?? [],
    });

    res.status(201).json({ gerente: { id: gid, userId: uid, nome, email, telefone, permissoes } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

router.put("/admin/gerentes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, permissoes } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      permissoes: string[];
    };

    const [gerente] = await db.select().from(gerentesTable).where(eq(gerentesTable.id, id)).limit(1);
    if (!gerente) return res.status(404).json({ error: "Gerente não encontrado" });

    await db.update(gerentesTable).set({
      nome,
      email: email.toLowerCase().trim(),
      telefone: telefone ?? null,
      permissoes: permissoes ?? [],
    }).where(eq(gerentesTable.id, id));

    await db.update(usersTable).set({
      nome,
      email: email.toLowerCase().trim(),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, gerente.userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── GESTÃO DE CONTAS ──────────────────────────────────────────

// Suspender / ativar conta
router.patch("/admin/users/:userId/status", async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body as { active: boolean };

    const [user] = await db.select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    if (user.role === "admin") return res.status(400).json({ error: "Não é possível suspender um admin" });

    await db.update(usersTable).set({ active, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    res.json({ ok: true, active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Resetar senha (admin define nova senha)
router.patch("/admin/users/:userId/reset-password", async (req, res) => {
  try {
    const { userId } = req.params;
    const { novaSenha } = req.body as { novaSenha: string };

    if (!novaSenha || novaSenha.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
    }

    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const passwordHash = await bcrypt.hash(novaSenha, 10);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── PROPOSTAS ─────────────────────────────────────────────────

// POST /admin/propostas — admin cria proposta para qualquer vendedor
router.post("/admin/propostas", async (req, res) => {
  try {
    const { vendedorId, dadosTitular, dadosDependentes, planoId, faixaId, valorTotal, contratoId, responsavelFinanceiroId, titularEhResponsavel } = req.body as {
      vendedorId: string;
      dadosTitular: Record<string, unknown>;
      dadosDependentes?: Record<string, unknown>[];
      planoId?: string;
      faixaId?: string;
      valorTotal?: string;
      contratoId?: string;
      responsavelFinanceiroId?: string;
      titularEhResponsavel?: boolean;
    };
    if (!vendedorId) return res.status(400).json({ error: "vendedorId é obrigatório" });
    if (!dadosTitular) return res.status(400).json({ error: "dadosTitular é obrigatório" });
    if (!contratoId) return res.status(400).json({ error: "contratoId é obrigatório" });
    if (!titularEhResponsavel && !responsavelFinanceiroId) return res.status(400).json({ error: "responsavelFinanceiroId é obrigatório" });
    const erroValidacao = validarDadosTitular(dadosTitular);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });

    const selecao = await validarSelecaoProposta(db, vendedorId, planoId, faixaId);
    if (!selecao.ok) return res.status(400).json({ error: selecao.error });

    const dadosTitularPersistidos = {
      ...dadosTitular,
      planoId: selecao.planoId,
      faixaId: selecao.faixaId,
      plano: selecao.planoNome,
      codigoPlano: selecao.planoCodigo,
      valorMensal: selecao.valorTitular,
      valor: selecao.valorTitular,
    };
    const id = `prop-${Date.now()}`;
    const [proposta] = await db.insert(propostasTable).values({
      id,
      vendedorId,
      adminId: req.user?.userId ?? null,
      status: "AGUARDANDO_ENVIO",
      dadosTitular: dadosTitularPersistidos,
      dadosDependentes: dadosDependentes ?? [],
      planoId: selecao.planoId,
      faixaId: selecao.faixaId,
      valorTotal: valorTotal ?? null,
      contratoId,
      responsavelFinanceiroId,
    }).returning();

    res.status(201).json({ proposta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── COMISSÕES ──────────────────────────────────────────────────

// GET /admin/comissoes — lista com vendedor e cliente relacionados
router.get("/admin/comissoes", async (_req, res) => {
  try {
    const comissoes = await db
      .select({
        id: comissoesTable.id,
        vendedorId: comissoesTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
        clienteId: comissoesTable.clienteId,
        clienteNome: comissoesTable.clienteNome,
        tipo: comissoesTable.tipo,
        valor: comissoesTable.valor,
        mesReferencia: comissoesTable.mesReferencia,
        status: comissoesTable.status,
        planoCode: comissoesTable.planoCode,
        dataVenda: comissoesTable.dataVenda,
        dataPagamento: comissoesTable.dataPagamento,
        observacao: comissoesTable.observacao,
        createdAt: comissoesTable.createdAt,
      })
      .from(comissoesTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, comissoesTable.vendedorId))
      .orderBy(desc(comissoesTable.createdAt));

    res.json({ comissoes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/comissoes/:id/pagar — idempotente
router.patch("/admin/comissoes/:id/pagar", async (req, res) => {
  try {
    const { id } = req.params;
    const dataPagamento = new Date().toISOString();

    // The status predicate makes concurrent payment requests converge on one
    // PAGO row without replacing an existing payment timestamp.
    await db
      .update(comissoesTable)
      .set({ status: "PAGO", dataPagamento })
      .where(and(eq(comissoesTable.id, id), eq(comissoesTable.status, "PENDENTE")));

    const [comissao] = await db
      .select({
        id: comissoesTable.id,
        vendedorId: comissoesTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
        clienteId: comissoesTable.clienteId,
        clienteNome: comissoesTable.clienteNome,
        tipo: comissoesTable.tipo,
        valor: comissoesTable.valor,
        mesReferencia: comissoesTable.mesReferencia,
        status: comissoesTable.status,
        planoCode: comissoesTable.planoCode,
        dataVenda: comissoesTable.dataVenda,
        dataPagamento: comissoesTable.dataPagamento,
        observacao: comissoesTable.observacao,
        createdAt: comissoesTable.createdAt,
      })
      .from(comissoesTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, comissoesTable.vendedorId))
      .where(eq(comissoesTable.id, id))
      .limit(1);

    if (!comissao) return res.status(404).json({ error: "Comissão não encontrada" });
    res.json({ ok: true, comissao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Listar todas as propostas com dados do vendedor / contrato / responsável
router.get("/admin/propostas", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: propostasTable.id,
        status: propostasTable.status,
        dadosTitular: propostasTable.dadosTitular,
        dadosDependentes: propostasTable.dadosDependentes,
        planoId: propostasTable.planoId,
        faixaId: propostasTable.faixaId,
        valorTotal: propostasTable.valorTotal,
        dataEnvioOperadora: propostasTable.dataEnvioOperadora,
        dataRetorno: propostasTable.dataRetorno,
        dataAtivacao: propostasTable.dataAtivacao,
        motivoRecusa: propostasTable.motivoRecusa,
        clienteId: propostasTable.clienteId,
        createdAt: propostasTable.createdAt,
        vendedorId: propostasTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
        vendedorEmail: vendedoresTable.email,
        contratoId: propostasTable.contratoId,
        contratoNome: contratosTable.nome,
        responsavelFinanceiroId: propostasTable.responsavelFinanceiroId,
        responsavelNome: responsaveisFinanceirosTable.nome,
        responsavelTipo: responsaveisFinanceirosTable.tipo,
      })
      .from(propostasTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, propostasTable.vendedorId))
      .leftJoin(contratosTable, eq(contratosTable.id, propostasTable.contratoId))
      .leftJoin(responsaveisFinanceirosTable, eq(responsaveisFinanceirosTable.id, propostasTable.responsavelFinanceiroId))
      .orderBy(desc(propostasTable.createdAt));

    res.json({ propostas: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/propostas/:id — editar dados da proposta (dadosTitular + valorTotal + vínculos)
router.patch("/admin/propostas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { dadosTitular, dadosDependentes, valorTotal, contratoId, responsavelFinanceiroId } = req.body as {
      dadosTitular?: Record<string, unknown>;
      dadosDependentes?: Record<string, unknown>[];
      valorTotal?: string;
      contratoId?: string | null;
      responsavelFinanceiroId?: string | null;
    };

    const [proposta] = await db.select().from(propostasTable).where(eq(propostasTable.id, id)).limit(1);
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada" });

    const erroValidacao = validarDadosTitular(dadosTitular);
    if (erroValidacao) return res.status(400).json({ error: erroValidacao });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dadosTitular !== undefined) {
      updates.dadosTitular = { ...(proposta.dadosTitular as Record<string, unknown>), ...dadosTitular };
    }
    if (dadosDependentes !== undefined) updates.dadosDependentes = dadosDependentes;
    if (valorTotal !== undefined) updates.valorTotal = valorTotal;
    // contratoId / responsavelFinanceiroId só atualizam se vier valor não-vazio (impede nullification)
    if (contratoId !== undefined && contratoId !== null && String(contratoId).trim() !== "") {
      updates.contratoId = String(contratoId).trim();
    }
    if (responsavelFinanceiroId !== undefined && responsavelFinanceiroId !== null && String(responsavelFinanceiroId).trim() !== "") {
      updates.responsavelFinanceiroId = String(responsavelFinanceiroId).trim();
    }

    await db.update(propostasTable).set(updates as never).where(eq(propostasTable.id, id));
    const [updated] = await db.select().from(propostasTable).where(eq(propostasTable.id, id)).limit(1);
    res.json({ proposta: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Atualizar status geral de uma proposta
router.patch("/admin/propostas/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motivoRecusa } = req.body as {
      status: "AGUARDANDO_ENVIO" | "ENVIADA_OPERADORA" | "ACEITA" | "RECUSADA" | "ATIVA";
      motivoRecusa?: string;
    };

    const [proposta] = await db.select().from(propostasTable).where(eq(propostasTable.id, id)).limit(1);
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada" });

    if (status === "ATIVA") {
      return res.status(400).json({ error: "Para ativar, use a rota PATCH /admin/propostas/:id/ativar" });
    }

    // Matriz de transições válidas
    const transicoesValidas: Record<string, string[]> = {
      AGUARDANDO_ENVIO: ["ENVIADA_OPERADORA"],
      ENVIADA_OPERADORA: ["ACEITA", "RECUSADA"],
      ACEITA: [],
      RECUSADA: [],
      ATIVA: [],
    };
    const permitidas = transicoesValidas[proposta.status] ?? [];
    if (!permitidas.includes(status)) {
      return res.status(400).json({
        error: `Transição inválida: ${proposta.status} → ${status}. Transições permitidas: ${permitidas.join(", ") || "nenhuma"}`,
      });
    }

    if (status === "RECUSADA" && !motivoRecusa?.trim()) {
      return res.status(400).json({ error: "motivoRecusa é obrigatório ao recusar uma proposta" });
    }

    const updateData: Partial<typeof propostasTable.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "ENVIADA_OPERADORA") {
      updateData.dataEnvioOperadora = new Date();
    } else if (status === "ACEITA" || status === "RECUSADA") {
      updateData.dataRetorno = new Date();
    }

    if (status === "RECUSADA") {
      updateData.motivoRecusa = motivoRecusa;
    }

    await db.update(propostasTable).set(updateData).where(eq(propostasTable.id, id));
    res.json({ ok: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Ativar proposta com campos obrigatórios de ativação. Plan/faixa/código são
// sempre resolvidos da seleção persistida e da tabela de preço do vendedor.
router.patch("/admin/propostas/:id/ativar", async (req, res) => {
  try {
    const { id } = req.params;
    const { matricula, dataAtivacao } = req.body as {
      matricula: string;       // 14 dígitos — código do usuário
      dataAtivacao: string;    // YYYY-MM-DD
    };

    if (!matricula || matricula.replace(/\D/g, "").length !== 14) {
      return res.status(400).json({ error: "Código do usuário deve ter 14 dígitos" });
    }
    if (!dataAtivacao) {
      return res.status(400).json({ error: "Data de ativação é obrigatória" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAtivacao)) {
      return res.status(400).json({ error: "Data de ativação deve estar no formato YYYY-MM-DD" });
    }
    const resultado = await db.transaction(async (tx) => {
      const [proposta] = await tx
        .select()
        .from(propostasTable)
        .where(eq(propostasTable.id, id))
        .for("update")
        .limit(1);
      if (!proposta) throw new Error("PROPOSTA_NAO_ENCONTRADA");

      const selecao = await validarSelecaoProposta(tx, proposta.vendedorId, proposta.planoId, proposta.faixaId);
      if (!selecao.ok) throw new Error(`SELECAO_PROPOSTA_INVALIDA:${selecao.error}`);

      const dadosTitular = proposta.dadosTitular as Record<string, unknown>;
      const nome = String(dadosTitular.nome ?? "").trim();
      const cpfOriginal = String(dadosTitular.cpf ?? "").trim();
      const cpfDigits = cpfOriginal.replace(/\D/g, "");
      const cpf = cpfDigits || cpfOriginal;
      if (!nome || !cpf) throw new Error("DADOS_TITULAR_INCOMPLETOS");

      const dadosAtualizados = {
        ...dadosTitular,
        matricula,
        dataAtivacao,
        planoId: selecao.planoId,
        faixaId: selecao.faixaId,
        plano: selecao.planoNome,
        codigoPlano: selecao.planoCodigo,
        planoCode: selecao.planoCodigo,
        valorMensal: selecao.valorTitular,
        valor: selecao.valorTitular,
      };

      let cliente: typeof clientesTable.$inferSelect | undefined;

      if (proposta.clienteId) {
        const [vinculado] = await tx
          .select()
          .from(clientesTable)
          .where(eq(clientesTable.id, proposta.clienteId))
          .for("update")
          .limit(1);
        cliente = vinculado;
      }

      if (!cliente) {
        const cpfs = [...new Set([cpfOriginal, cpf].filter(Boolean))];
        const [existente] = await tx
          .select()
          .from(clientesTable)
          .where(or(...cpfs.map((candidate) => eq(clientesTable.cpf, candidate))))
          .for("update")
          .limit(1);
        cliente = existente;
      }

      if (cliente && cliente.vendedorId !== proposta.vendedorId) {
        throw new Error("CLIENTE_VENDEDOR_DIVERGENTE");
      }

      if (!cliente) {
        const valorMensal = selecao.valorTitular;
        const dataNascRaw = dadosTitular.dataNascimento ? String(dadosTitular.dataNascimento) : null;
        let dataNascimento: string | null = null;
        const nascimentoBr = dataNascRaw?.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
        if (nascimentoBr) {
          const ano = nascimentoBr[3].length === 2 ? `20${nascimentoBr[3]}` : nascimentoBr[3];
          dataNascimento = `${ano}-${nascimentoBr[2]}-${nascimentoBr[1]}`;
        } else if (dataNascRaw && /^\d{4}-\d{2}-\d{2}$/.test(dataNascRaw)) {
          dataNascimento = dataNascRaw;
        }

        const novoCliente = {
          id: `cli-${randomUUID()}`,
          vendedorId: proposta.vendedorId,
          planoId: proposta.planoId,
          faixaId: proposta.faixaId,
          contratoId: proposta.contratoId,
          responsavelFinanceiroId: proposta.responsavelFinanceiroId,
          nome,
          cpf,
          dataNascimento,
          sexo: dadosTitular.sexo === "M" || dadosTitular.sexo === "F" ? dadosTitular.sexo : null,
          telefone: dadosTitular.telefone ? String(dadosTitular.telefone).trim() : null,
          email: dadosTitular.email ? String(dadosTitular.email).toLowerCase().trim() : null,
          cep: dadosTitular.cep ? String(dadosTitular.cep).trim() : null,
          logradouro: dadosTitular.logradouro ? String(dadosTitular.logradouro).trim() : null,
          numero: dadosTitular.numero ? String(dadosTitular.numero).trim() : null,
          complemento: dadosTitular.complemento ? String(dadosTitular.complemento).trim() : null,
          bairro: dadosTitular.bairro ? String(dadosTitular.bairro).trim() : null,
          cidade: dadosTitular.cidade ? String(dadosTitular.cidade).trim() : null,
          estado: dadosTitular.estado ? String(dadosTitular.estado).trim() : null,
          nomeMae: dadosTitular.nomeMae ? String(dadosTitular.nomeMae).trim() : null,
          rg: dadosTitular.rg ? String(dadosTitular.rg).trim() : null,
          rgOrgaoEmissor: dadosTitular.rgOrgaoEmissor ? String(dadosTitular.rgOrgaoEmissor).trim() : null,
          rgUf: dadosTitular.rgUf ? String(dadosTitular.rgUf).trim() : null,
          estadoCivil: dadosTitular.estadoCivil ? String(dadosTitular.estadoCivil).trim() : null,
          matricula: matricula.replace(/\D/g, ""),
          valorMensal,
          dataAtivacao,
          status: "ATIVO" as const,
          tipo: "TITULAR",
          formaPagamento: dadosTitular.formaPagamento ? String(dadosTitular.formaPagamento) : null,
          diaVencimento:
            dadosTitular.diaVencimento !== undefined && dadosTitular.diaVencimento !== null && dadosTitular.diaVencimento !== ""
              ? Number(dadosTitular.diaVencimento)
              : null,
          planoCode: selecao.planoCodigo,
          codigoPlano: selecao.planoCodigo,
          representante: dadosTitular.representante ? String(dadosTitular.representante) : null,
        } as typeof clientesTable.$inferInsert;
        [cliente] = await tx.insert(clientesTable).values(novoCliente).returning();
        if (!cliente) throw new Error("CLIENTE_NAO_CRIADO");
      } else {
        const [atualizado] = await tx
          .update(clientesTable)
          .set({
            status: "ATIVO",
            matricula: matricula.replace(/\D/g, ""),
            dataAtivacao,
            planoId: selecao.planoId,
            faixaId: selecao.faixaId,
            valorMensal: selecao.valorTitular,
            planoCode: selecao.planoCodigo,
            codigoPlano: selecao.planoCodigo,
            updatedAt: new Date(),
          })
          .where(eq(clientesTable.id, cliente.id))
          .returning();
        cliente = atualizado ?? cliente;
      }

      await ensureActivationCommission(tx, cliente, dataAtivacao);

      const [updatedProposta] = await tx
        .update(propostasTable)
        .set({
          status: "ATIVA",
          dadosTitular: dadosAtualizados,
          dataAtivacao: new Date(),
          clienteId: cliente.id,
          updatedAt: new Date(),
        })
        .where(eq(propostasTable.id, id))
        .returning();

      const [withSnapshot] = await tx
        .select()
        .from(clientesTable)
        .where(eq(clientesTable.id, cliente.id))
        .limit(1);

      return { proposta: updatedProposta, cliente: withSnapshot ?? cliente };
    });

    res.json({ ok: true, status: "ATIVA", clienteId: resultado.cliente.id, cliente: resultado.cliente });
  } catch (err) {
    if (err instanceof Error && err.message === COMISSAO_CONFIGURACAO_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_CONFIGURACAO_MENSAGEM });
    }
    if (err instanceof Error && err.message === COMISSAO_VALOR_MENSAL_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_VALOR_MENSAL_MENSAGEM });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Já existe um cliente com este CPF" });
    }
    if (err instanceof Error && err.message === "PROPOSTA_NAO_ENCONTRADA") {
      return res.status(404).json({ error: "Proposta não encontrada" });
    }
    if (err instanceof Error && err.message === "DADOS_TITULAR_INCOMPLETOS") {
      return res.status(400).json({ error: "Nome e CPF do titular são obrigatórios para ativar a proposta" });
    }
    if (err instanceof Error && err.message.startsWith("SELECAO_PROPOSTA_INVALIDA:")) {
      return res.status(400).json({
        error: err.message.slice("SELECAO_PROPOSTA_INVALIDA:".length),
      });
    }
    if (err instanceof Error && err.message === "CLIENTE_VENDEDOR_DIVERGENTE") {
      return res.status(409).json({ error: "O cliente já está vinculado a outro vendedor" });
    }
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/propostas/:id/gerar-boleto — gera boleto após ativação
router.post("/admin/propostas/:id/gerar-boleto", async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user!.userId;

    const [proposta] = await db.select().from(propostasTable).where(eq(propostasTable.id, id)).limit(1);
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada" });
    if (proposta.status !== "ATIVA") return res.status(400).json({ error: "Apenas propostas ativas podem gerar boleto" });

    const dadosTitular = proposta.dadosTitular as Record<string, unknown>;
    const valorTotal = proposta.valorTotal ?? "0";

    // Calcular mês de referência atual
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = agora.getFullYear();
    const mesReferencia = `${mes}/${ano}`;

    // Vencimento padrão: dia 10 do mês atual (ou próximo mês se já passou)
    let vencimento = new Date(agora.getFullYear(), agora.getMonth(), 10);
    if (vencimento < agora) {
      vencimento = new Date(agora.getFullYear(), agora.getMonth() + 1, 10);
    }
    const vencimentoStr = vencimento.toISOString().split("T")[0];

    // Se há clienteId, usar diretamente; caso contrário buscar pelo nome/cpf
    let clienteId = proposta.clienteId ?? null;
    if (!clienteId && dadosTitular.cpf) {
      const [cliente] = await db
        .select({ id: clientesTable.id })
        .from(clientesTable)
        .where(eq(clientesTable.cpf, String(dadosTitular.cpf)))
        .limit(1);
      clienteId = cliente?.id ?? null;
    }
    if (!clienteId) return res.status(400).json({ error: "Cliente não encontrado para gerar o boleto" });

    // Verificar se já existe boleto para este mês
    const existente = await db
      .select({ id: boletosTable.id })
      .from(boletosTable)
      .where(and(eq(boletosTable.clienteId, clienteId), eq(boletosTable.mesReferencia, mesReferencia)))
      .limit(1);
    if (existente.length > 0) {
      return res.status(409).json({ error: `Já existe um boleto para ${mesReferencia}` });
    }

    const boletoId = `bol-${Date.now()}`;
    const [boleto] = await db.insert(boletosTable).values({
      id: boletoId,
      clienteId,
      geradoPorId: adminUserId,
      valor: valorTotal,
      vencimento: vencimentoStr,
      status: "PENDENTE",
      mesReferencia,
    }).returning();

    res.status(201).json({ boleto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── CLIENTES ──────────────────────────────────────────────────

// GET /admin/clientes — listar todos os clientes com nome do vendedor / contrato / responsável
router.get("/admin/clientes", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: clientesTable.id,
        nome: clientesTable.nome,
        cpf: clientesTable.cpf,
        sexo: clientesTable.sexo,
        dataNascimento: clientesTable.dataNascimento,
        telefone: clientesTable.telefone,
        email: clientesTable.email,
        cep: clientesTable.cep,
        logradouro: clientesTable.logradouro,
        numero: clientesTable.numero,
        bairro: clientesTable.bairro,
        cidade: clientesTable.cidade,
        estado: clientesTable.estado,
        matricula: clientesTable.matricula,
        valorMensal: clientesTable.valorMensal,
        dataAtivacao: clientesTable.dataAtivacao,
        codigo: clientesTable.codigo,
        tipo: clientesTable.tipo,
        representante: clientesTable.representante,
        formaPagamento: clientesTable.formaPagamento,
        diaVencimento: clientesTable.diaVencimento,
        vrPl: clientesTable.vrPl,
        saldo: clientesTable.saldo,
        valor2026: clientesTable.valor2026,
        comissao: clientesTable.comissao,
        planoCode: clientesTable.planoCode,
        codigoPlano: clientesTable.codigoPlano,
        status: clientesTable.status,
        observacao: clientesTable.observacao,
        nomeMae: clientesTable.nomeMae,
        rg: clientesTable.rg,
        rgOrgaoEmissor: clientesTable.rgOrgaoEmissor,
        rgUf: clientesTable.rgUf,
        estadoCivil: clientesTable.estadoCivil,
        docRgUrl: clientesTable.docRgUrl,
        docComprovanteUrl: clientesTable.docComprovanteUrl,
        vendedorId: clientesTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
        contratoId: clientesTable.contratoId,
        contratoNome: contratosTable.nome,
        responsavelFinanceiroId: clientesTable.responsavelFinanceiroId,
        responsavelNome: responsaveisFinanceirosTable.nome,
        responsavelTipo: responsaveisFinanceirosTable.tipo,
        responsavelCpfCnpj: responsaveisFinanceirosTable.cpfCnpj,
      })
      .from(clientesTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, clientesTable.vendedorId))
      .leftJoin(contratosTable, eq(contratosTable.id, clientesTable.contratoId))
      .leftJoin(responsaveisFinanceirosTable, eq(responsaveisFinanceirosTable.id, clientesTable.responsavelFinanceiroId))
      .orderBy(clientesTable.nome);

    res.json({ clientes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/clientes — admin cadastra cliente diretamente (sem fluxo de proposta)
router.post("/admin/clientes", async (req, res) => {
  try {
    const body = req.body as Record<string, string | number | boolean | undefined | null>;
    const cpfDigits = String(body.cpf ?? "").replace(/\D/g, "");
    if (!body.nome || !cpfDigits) {
      return res.status(400).json({ error: "Nome e CPF são obrigatórios" });
    }
    if (!body.vendedorId) return res.status(400).json({ error: "vendedorId é obrigatório" });
    if (!body.planoId || !body.faixaId) return res.status(400).json({ error: "planoId e faixaId são obrigatórios" });
    if (!body.contratoId) return res.status(400).json({ error: "contratoId é obrigatório" });
    if (!body.responsavelFinanceiroId) return res.status(400).json({ error: "responsavelFinanceiroId é obrigatório" });

    // Validação dia de vencimento (1–31, quando informado)
    if (body.diaVencimento !== undefined && body.diaVencimento !== null && body.diaVencimento !== "") {
      const dia = Number(body.diaVencimento);
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        return res.status(400).json({ error: "diaVencimento deve ser um inteiro entre 1 e 31" });
      }
    }

    // Verifica duplicidade
    const [dup] = await db.select({ id: clientesTable.id })
      .from(clientesTable).where(eq(clientesTable.cpf, cpfDigits)).limit(1);
    if (dup) return res.status(409).json({ error: "Já existe um cliente com este CPF" });

    const [precoSelecionado] = await db
      .select({
        planoId: planosTable.id,
        codigo: planosTable.codigo,
        faixaId: tabelasPrecoFaixasTable.id,
        valor: tabelasPrecoFaixasTable.valor,
      })
      .from(tabelasPrecoTable)
      .innerJoin(
        tabelasPrecoFaixasTable,
        and(
          eq(tabelasPrecoFaixasTable.tabelaId, tabelasPrecoTable.id),
          eq(tabelasPrecoFaixasTable.id, String(body.faixaId)),
          eq(tabelasPrecoFaixasTable.planoId, String(body.planoId)),
        ),
      )
      .innerJoin(
        planosTable,
        and(
          eq(planosTable.id, tabelasPrecoFaixasTable.planoId),
          eq(planosTable.ativo, true),
        ),
      )
      .where(eq(tabelasPrecoTable.vendedorId, String(body.vendedorId)))
      .limit(1);
    if (!precoSelecionado) {
      return res.status(400).json({ error: "Plano e faixa não pertencem à tabela de preço do vendedor selecionado" });
    }

    const id = `cli-${randomUUID()}`;
    const dataNasc = body.dataNascimento ? String(body.dataNascimento) : null;
    // Converte DD/MM/YYYY → YYYY-MM-DD se necessário
    let dataNascIso: string | null = null;
    if (dataNasc) {
      const m = dataNasc.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
      if (m) {
        const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
        dataNascIso = `${ano}-${m[2]}-${m[1]}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
        dataNascIso = dataNasc;
      }
    }

    const valuesToInsert = {
      id,
      vendedorId: String(body.vendedorId),
      planoId: precoSelecionado.planoId,
      faixaId: precoSelecionado.faixaId,
      contratoId: String(body.contratoId),
      responsavelFinanceiroId: String(body.responsavelFinanceiroId),
      nome: String(body.nome).trim(),
      cpf: cpfDigits,
      dataNascimento: dataNascIso,
      sexo: body.sexo === "M" || body.sexo === "F" ? body.sexo : null,
      telefone: body.telefone ? String(body.telefone).trim() : null,
      email: body.email ? String(body.email).toLowerCase().trim() : null,
      cep: body.cep ? String(body.cep).trim() : null,
      logradouro: body.logradouro ? String(body.logradouro).trim() : null,
      numero: body.numero ? String(body.numero).trim() : null,
      complemento: body.complemento ? String(body.complemento).trim() : null,
      bairro: body.bairro ? String(body.bairro).trim() : null,
      cidade: body.cidade ? String(body.cidade).trim() : null,
      estado: body.estado ? String(body.estado).trim() : null,
      nomeMae: body.nomeMae ? String(body.nomeMae).trim() : null,
      rg: body.rg ? String(body.rg).trim() : null,
      rgOrgaoEmissor: body.rgOrgaoEmissor ? String(body.rgOrgaoEmissor).trim() : null,
      rgUf: body.rgUf ? String(body.rgUf).trim() : null,
      estadoCivil: body.estadoCivil ? String(body.estadoCivil).trim() : null,
      docRgUrl: body.docRgUrl ? String(body.docRgUrl).trim() : null,
      docComprovanteUrl: body.docComprovanteUrl ? String(body.docComprovanteUrl).trim() : null,
      tipo: body.tipo ? String(body.tipo) : "TITULAR",
      formaPagamento: body.formaPagamento ? String(body.formaPagamento) : null,
      diaVencimento:
        body.diaVencimento !== undefined && body.diaVencimento !== null && body.diaVencimento !== ""
          ? Number(body.diaVencimento)
          : null,
      valorMensal: precoSelecionado.valor,
      status: "ATIVO" as const,
      dataAtivacao: new Date().toISOString().slice(0, 10),
      planoCode: precoSelecionado.codigo,
      codigoPlano: precoSelecionado.codigo,
      observacao: body.observacao ? String(body.observacao) : null,
      representante: body.representante ? String(body.representante) : null,
    } as typeof clientesTable.$inferInsert;

    const cliente = await db.transaction(async (tx) => {
      const [created] = await tx.insert(clientesTable).values(valuesToInsert).returning();
      if (!created) throw new Error("CLIENTE_NAO_CRIADO");
      await ensureActivationCommission(tx, created, created.dataAtivacao);
      const [withSnapshot] = await tx
        .select()
        .from(clientesTable)
        .where(eq(clientesTable.id, created.id))
        .limit(1);
      return withSnapshot ?? created;
    });
    res.status(201).json({ cliente });
  } catch (err) {
    if (err instanceof Error && err.message === COMISSAO_CONFIGURACAO_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_CONFIGURACAO_MENSAGEM });
    }
    if (err instanceof Error && err.message === COMISSAO_VALOR_MENSAL_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_VALOR_MENSAL_MENSAGEM });
    }
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: "Já existe um cliente com este CPF" });
    }
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/clientes/:id/status — suspender ou reativar
router.patch("/admin/clientes/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: "ATIVO" | "SUSPENSO" | "CANCELADO" };
    if (!["ATIVO", "SUSPENSO", "CANCELADO"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const cliente = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(clientesTable)
        .where(eq(clientesTable.id, id))
        .for("update")
        .limit(1);
      if (!current) return null;

      const isActivation = status === "ATIVO" && current.status !== "ATIVO";
      if (current.status !== status) {
        await tx.update(clientesTable).set({ status, updatedAt: new Date() }).where(eq(clientesTable.id, id));
      }
      if (isActivation) {
        await ensureActivationCommission(tx, { ...current, status: "ATIVO" }, current.dataAtivacao);
      }

      const [updated] = await tx
        .select()
        .from(clientesTable)
        .where(eq(clientesTable.id, id))
        .limit(1);
      return updated ?? current;
    });
    if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
    res.json({ ok: true, status: cliente.status, cliente });
  } catch (err) {
    if (err instanceof Error && err.message === COMISSAO_CONFIGURACAO_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_CONFIGURACAO_MENSAGEM });
    }
    if (err instanceof Error && err.message === COMISSAO_VALOR_MENSAL_AUSENTE) {
      return res.status(409).json({ error: COMISSAO_VALOR_MENSAL_MENSAGEM });
    }
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/clientes/:id — editar dados do cliente
router.patch("/admin/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, string | number | undefined | null>;

    // Validação dia de vencimento (1–31, quando informado)
    if (body.diaVencimento !== undefined && body.diaVencimento !== null && body.diaVencimento !== "") {
      const dia = Number(body.diaVencimento);
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
        return res.status(400).json({ error: "diaVencimento deve ser um inteiro entre 1 e 31" });
      }
    }

    const updates: Record<string, unknown> = {};
    const str = (k: string) => { if (body[k] !== undefined) updates[k] = body[k] ?? null; };
    const num = (k: string) => { if (body[k] !== undefined) updates[k] = body[k] != null ? Number(body[k]) : null; };
    // Campos obrigatórios — só atualizam se vier valor não-vazio (impede nullification)
    const reqStr = (k: string) => {
      if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== "") {
        updates[k] = String(body[k]).trim();
      }
    };

    str("nome"); str("telefone"); str("email"); str("dataNascimento");
    str("cep"); str("logradouro"); str("numero"); str("complemento"); str("bairro"); str("cidade"); str("estado");
    str("observacao"); str("formaPagamento");
    if (body.diaVencimento !== undefined) {
      updates.diaVencimento =
        body.diaVencimento === null || body.diaVencimento === "" ? null : Number(body.diaVencimento);
    }
    str("sexo"); str("representante"); str("tipo");
    str("matricula"); str("planoCode"); str("codigoPlano");
    str("valorMensal"); str("dataAtivacao");
    str("vrPl"); str("saldo"); str("valor2026");
    str("nomeMae"); str("rg"); str("rgOrgaoEmissor"); str("rgUf"); str("estadoCivil");
    str("docRgUrl"); str("docComprovanteUrl");
    reqStr("contratoId"); reqStr("responsavelFinanceiroId");

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    await db.update(clientesTable).set(updates as never).where(eq(clientesTable.id, id));
    const [updated] = await db.select().from(clientesTable).where(eq(clientesTable.id, id)).limit(1);
    res.json({ cliente: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── CONTRATO DETALHE ─────────────────────────────────────────

// GET /admin/contratos/:id/detalhe — visão detalhada de um contrato
router.get("/admin/contratos/:id/detalhe", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Dados básicos do contrato
    const [contrato] = await db.select().from(contratosTable).where(eq(contratosTable.id, id)).limit(1);
    if (!contrato) return res.status(404).json({ error: "Contrato não encontrado" });

    // 2. Stats de clientes por status
    const clientesStats = await db
      .select({ status: clientesTable.status, total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .where(eq(clientesTable.contratoId, id))
      .groupBy(clientesTable.status);

    // 3. Stats de propostas por status
    const propostasStats = await db
      .select({ status: propostasTable.status, total: sql<number>`count(*)::int` })
      .from(propostasTable)
      .where(eq(propostasTable.contratoId, id))
      .groupBy(propostasTable.status);

    // 4. Receita mensal estimada (valorMensal dos clientes ATIVOS)
    const receitaRow = await db
      .select({ total: sql<string>`coalesce(sum(${clientesTable.valorMensal}::numeric), 0)::text` })
      .from(clientesTable)
      .where(and(eq(clientesTable.contratoId, id), eq(clientesTable.status, "ATIVO")));
    const receitaMensal = receitaRow[0]?.total ?? "0";

    // 5. Planos usados pelos clientes desse contrato
    const planosUsados = await db
      .select({
        planoId: planosTable.id,
        planoNome: planosTable.nome,
        planoCodigo: planosTable.codigo,
        planoTipo: planosTable.tipo,
        valorTitular: planosTable.valorTitular,
        totalClientes: sql<number>`count(${clientesTable.id})::int`,
      })
      .from(clientesTable)
      .innerJoin(planosTable, eq(planosTable.id, clientesTable.planoId))
      .where(eq(clientesTable.contratoId, id))
      .groupBy(planosTable.id, planosTable.nome, planosTable.codigo, planosTable.tipo, planosTable.valorTitular)
      .orderBy(desc(sql`count(${clientesTable.id})`));

    // 6. Vendedores com suas métricas nesse contrato
    const vendedoresData = await db
      .select({
        vendedorId: vendedoresTable.id,
        vendedorNome: vendedoresTable.nome,
        vendedorEmail: vendedoresTable.email,
        totalPropostas: sql<number>`count(distinct ${propostasTable.id})::int`,
        totalClientes: sql<number>`count(distinct ${clientesTable.id})::int`,
      })
      .from(vendedoresTable)
      .leftJoin(propostasTable, and(eq(propostasTable.vendedorId, vendedoresTable.id), eq(propostasTable.contratoId, id)))
      .leftJoin(clientesTable, and(eq(clientesTable.vendedorId, vendedoresTable.id), eq(clientesTable.contratoId, id)))
      .where(or(eq(propostasTable.contratoId, id), eq(clientesTable.contratoId, id)))
      .groupBy(vendedoresTable.id, vendedoresTable.nome, vendedoresTable.email)
      .orderBy(desc(sql`count(distinct ${clientesTable.id})`));

    // 7. Pendências: propostas em aberto (AGUARDANDO_ENVIO / EM_ANALISE)
    const pendencias = await db
      .select({
        id: propostasTable.id,
        status: propostasTable.status,
        dadosTitular: propostasTable.dadosTitular,
        valorTotal: propostasTable.valorTotal,
        createdAt: propostasTable.createdAt,
        vendedorNome: vendedoresTable.nome,
      })
      .from(propostasTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, propostasTable.vendedorId))
      .where(and(
        eq(propostasTable.contratoId, id),
        inArray(propostasTable.status, ["AGUARDANDO_ENVIO", "ENVIADA_OPERADORA"]),
      ))
      .orderBy(desc(propostasTable.createdAt));

    res.json({
      contrato: {
        id: contrato.id,
        nome: contrato.nome,
        descricao: contrato.descricao,
        asaasModo: contrato.asaasModo,
        ativo: contrato.ativo,
        asaasApiKeyConfigured: !!contrato.asaasApiKey,
      },
      clientesStats,
      propostasStats,
      receitaMensal,
      planosUsados,
      vendedores: vendedoresData,
      pendencias,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── BOLETOS (admin) ──────────────────────────────────────────

// GET /admin/boletos — listar todos os boletos com dados do cliente e vendedor
router.get("/admin/boletos", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: boletosTable.id,
        clienteId: boletosTable.clienteId,
        clienteNome: clientesTable.nome,
        clienteCpf: clientesTable.cpf,
        clienteTelefone: clientesTable.telefone,
        vendedorNome: vendedoresTable.nome,
        planoCode: clientesTable.planoCode,
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
      .innerJoin(clientesTable, eq(boletosTable.clienteId, clientesTable.id))
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, clientesTable.vendedorId))
      .orderBy(desc(boletosTable.createdAt));

    res.json({ boletos: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
