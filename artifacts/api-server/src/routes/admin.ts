import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, sql, desc, and, or, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  vendedoresTable,
  gerentesTable,
  clientesTable,
  propostasTable,
  boletosTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// Apenas admins
router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
});

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
        createdAt: vendedoresTable.createdAt,
        active: usersTable.active,
      })
      .from(vendedoresTable)
      .leftJoin(usersTable, eq(usersTable.id, vendedoresTable.userId))
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
    const { nome, email, telefone, comissionado, tipoComissao, senha } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      comissionado: boolean;
      tipoComissao?: "VENDA" | "SERVICO" | "AMBOS";
      senha: string;
    };

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "nome, email e senha são obrigatórios" });
    }

    // Verifica duplicata de email
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
    if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

    const passwordHash = await bcrypt.hash(senha, 10);
    const uid = `user-v-${Date.now()}`;
    const vid = `v-${Date.now()}`;

    await db.insert(usersTable).values({
      id: uid,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "vendedor",
      nome,
      active: true,
    });

    await db.insert(vendedoresTable).values({
      id: vid,
      userId: uid,
      nome,
      email: email.toLowerCase().trim(),
      telefone: telefone ?? null,
      comissionado: comissionado ?? false,
      tipoComissao: comissionado ? (tipoComissao ?? "VENDA") : null,
    });

    res.status(201).json({ vendedor: { id: vid, userId: uid, nome, email, telefone, comissionado, tipoComissao } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Editar vendedor
router.put("/admin/vendedores/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, comissionado, tipoComissao } = req.body as {
      nome: string;
      email: string;
      telefone?: string;
      comissionado: boolean;
      tipoComissao?: "VENDA" | "SERVICO" | "AMBOS";
    };

    const [vendedor] = await db.select().from(vendedoresTable).where(eq(vendedoresTable.id, id)).limit(1);
    if (!vendedor) return res.status(404).json({ error: "Vendedor não encontrado" });

    await db.update(vendedoresTable).set({
      nome,
      email: email.toLowerCase().trim(),
      telefone: telefone ?? null,
      comissionado: comissionado ?? false,
      tipoComissao: comissionado ? (tipoComissao ?? "VENDA") : null,
    }).where(eq(vendedoresTable.id, id));

    // Atualiza também o usuário
    await db.update(usersTable).set({
      nome,
      email: email.toLowerCase().trim(),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, vendedor.userId));

    res.json({ ok: true });
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
    const { vendedorId, dadosTitular, dadosDependentes, valorTotal } = req.body as {
      vendedorId: string;
      dadosTitular: Record<string, unknown>;
      dadosDependentes?: Record<string, unknown>[];
      valorTotal?: string;
    };
    if (!vendedorId) return res.status(400).json({ error: "vendedorId é obrigatório" });
    if (!dadosTitular) return res.status(400).json({ error: "dadosTitular é obrigatório" });

    const id = `prop-${Date.now()}`;
    const [proposta] = await db.insert(propostasTable).values({
      id,
      vendedorId,
      status: "AGUARDANDO_ENVIO",
      dadosTitular,
      dadosDependentes: dadosDependentes ?? [],
      valorTotal: valorTotal ?? null,
    }).returning();

    res.status(201).json({ proposta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Listar todas as propostas com dados do vendedor
router.get("/admin/propostas", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: propostasTable.id,
        status: propostasTable.status,
        dadosTitular: propostasTable.dadosTitular,
        dadosDependentes: propostasTable.dadosDependentes,
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
      })
      .from(propostasTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, propostasTable.vendedorId))
      .orderBy(desc(propostasTable.createdAt));

    res.json({ propostas: rows });
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

// Ativar proposta com campos obrigatórios de ativação
router.patch("/admin/propostas/:id/ativar", async (req, res) => {
  try {
    const { id } = req.params;
    const { matricula, dataAtivacao, planoCode } = req.body as {
      matricula: string;       // 14 dígitos — código do usuário
      dataAtivacao: string;    // YYYY-MM-DD
      planoCode: string;       // 4 dígitos — código do plano
    };

    if (!matricula || matricula.replace(/\D/g, "").length !== 14) {
      return res.status(400).json({ error: "Código do usuário deve ter 14 dígitos" });
    }
    if (!dataAtivacao) {
      return res.status(400).json({ error: "Data de ativação é obrigatória" });
    }
    if (!planoCode || planoCode.trim().length < 4) {
      return res.status(400).json({ error: "Código do plano deve ter 4 dígitos" });
    }

    const [proposta] = await db.select().from(propostasTable).where(eq(propostasTable.id, id)).limit(1);
    if (!proposta) return res.status(404).json({ error: "Proposta não encontrada" });

    // Salva os dados de ativação no dadosTitular e atualiza status
    const dadosAtualizados = {
      ...(proposta.dadosTitular as Record<string, unknown>),
      matricula,
      dataAtivacao,
      planoCode,
    };

    await db.update(propostasTable).set({
      status: "ATIVA",
      dadosTitular: dadosAtualizados,
      dataAtivacao: new Date(),
      updatedAt: new Date(),
    }).where(eq(propostasTable.id, id));

    res.json({ ok: true, status: "ATIVA" });
  } catch (err) {
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

// GET /admin/clientes — listar todos os clientes com nome do vendedor
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
        vendedorId: clientesTable.vendedorId,
        vendedorNome: vendedoresTable.nome,
      })
      .from(clientesTable)
      .leftJoin(vendedoresTable, eq(vendedoresTable.id, clientesTable.vendedorId))
      .orderBy(clientesTable.nome);

    res.json({ clientes: rows });
  } catch (err) {
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
    await db.update(clientesTable).set({ status }).where(eq(clientesTable.id, id));
    res.json({ ok: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /admin/clientes/:id — editar dados do cliente
router.patch("/admin/clientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome, telefone, email, dataNascimento,
      cep, logradouro, numero, bairro, cidade, estado,
      observacao, formaPagamento, diaVencimento,
    } = req.body as Record<string, string | number | undefined>;

    const updates: Record<string, unknown> = {};
    if (nome !== undefined) updates.nome = nome;
    if (telefone !== undefined) updates.telefone = telefone;
    if (email !== undefined) updates.email = email;
    if (dataNascimento !== undefined) updates.dataNascimento = dataNascimento;
    if (cep !== undefined) updates.cep = cep;
    if (logradouro !== undefined) updates.logradouro = logradouro;
    if (numero !== undefined) updates.numero = String(numero);
    if (bairro !== undefined) updates.bairro = bairro;
    if (cidade !== undefined) updates.cidade = cidade;
    if (estado !== undefined) updates.estado = estado;
    if (observacao !== undefined) updates.observacao = observacao;
    if (formaPagamento !== undefined) updates.formaPagamento = formaPagamento;
    if (diaVencimento !== undefined) updates.diaVencimento = Number(diaVencimento);

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
