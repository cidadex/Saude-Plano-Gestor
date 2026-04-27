import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, sql, ilike, or, and } from "drizzle-orm";
import {
  db,
  usersTable,
  responsaveisFinanceirosTable,
  clientesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.use(requireAuth);

// Listar responsáveis (admin/vendedor para usar no select)
router.get("/responsaveis-financeiros", async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "vendedor" && role !== "gerente") {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const q = String(req.query.q ?? "").trim();
    const baseQuery = db
      .select({
        id: responsaveisFinanceirosTable.id,
        userId: responsaveisFinanceirosTable.userId,
        tipo: responsaveisFinanceirosTable.tipo,
        nome: responsaveisFinanceirosTable.nome,
        cpfCnpj: responsaveisFinanceirosTable.cpfCnpj,
        email: responsaveisFinanceirosTable.email,
        telefone: responsaveisFinanceirosTable.telefone,
      })
      .from(responsaveisFinanceirosTable);

    const rows = q
      ? await baseQuery
          .where(or(ilike(responsaveisFinanceirosTable.nome, `%${q}%`), ilike(responsaveisFinanceirosTable.cpfCnpj, `%${q}%`)))
          .orderBy(responsaveisFinanceirosTable.nome)
      : await baseQuery.orderBy(responsaveisFinanceirosTable.nome);

    res.json({ responsaveis: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// Buscar por CPF/CNPJ exato — facilita "checar se existe"
router.get("/responsaveis-financeiros/by-doc/:doc", async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "admin" && role !== "vendedor" && role !== "gerente") {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const docDigits = String(req.params.doc ?? "").replace(/\D/g, "");
    if (!docDigits) return res.status(400).json({ error: "Documento inválido" });
    const [resp] = await db
      .select()
      .from(responsaveisFinanceirosTable)
      .where(eq(responsaveisFinanceirosTable.cpfCnpj, docDigits))
      .limit(1);
    if (!resp) return res.status(404).json({ error: "Responsável não encontrado" });
    res.json({ responsavel: resp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

// ── ADMIN apenas ──────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(requireAuth);
adminRouter.use((req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
});

adminRouter.get("/admin/responsaveis", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const where = q
      ? or(ilike(responsaveisFinanceirosTable.nome, `%${q}%`), ilike(responsaveisFinanceirosTable.cpfCnpj, `%${q}%`))
      : undefined;
    const baseQuery = db
      .select({
        id: responsaveisFinanceirosTable.id,
        userId: responsaveisFinanceirosTable.userId,
        tipo: responsaveisFinanceirosTable.tipo,
        nome: responsaveisFinanceirosTable.nome,
        cpfCnpj: responsaveisFinanceirosTable.cpfCnpj,
        email: responsaveisFinanceirosTable.email,
        telefone: responsaveisFinanceirosTable.telefone,
        cep: responsaveisFinanceirosTable.cep,
        logradouro: responsaveisFinanceirosTable.logradouro,
        numero: responsaveisFinanceirosTable.numero,
        complemento: responsaveisFinanceirosTable.complemento,
        bairro: responsaveisFinanceirosTable.bairro,
        cidade: responsaveisFinanceirosTable.cidade,
        estado: responsaveisFinanceirosTable.estado,
        observacao: responsaveisFinanceirosTable.observacao,
        createdAt: responsaveisFinanceirosTable.createdAt,
      })
      .from(responsaveisFinanceirosTable);
    const rows = where
      ? await baseQuery.where(where).orderBy(responsaveisFinanceirosTable.nome)
      : await baseQuery.orderBy(responsaveisFinanceirosTable.nome);

    const counts = await db
      .select({ rid: clientesTable.responsavelFinanceiroId, total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .groupBy(clientesTable.responsavelFinanceiroId);
    const countMap = Object.fromEntries(counts.map(c => [c.rid ?? "", c.total]));

    const responsaveis = rows.map(r => ({ ...r, totalBeneficiarios: countMap[r.id] ?? 0 }));
    res.json({ responsaveis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

adminRouter.post("/admin/responsaveis", async (req, res) => {
  try {
    const body = req.body as {
      tipo: "PF" | "PJ";
      nome: string;
      cpfCnpj: string;
      email?: string;
      telefone?: string;
      cep?: string;
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      observacao?: string;
      senha?: string;
      criarLogin?: boolean;
    };

    if (!body.nome?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
    const docDigits = String(body.cpfCnpj ?? "").replace(/\D/g, "");
    if (!docDigits) return res.status(400).json({ error: "CPF/CNPJ é obrigatório" });

    const [dup] = await db
      .select({ id: responsaveisFinanceirosTable.id })
      .from(responsaveisFinanceirosTable)
      .where(eq(responsaveisFinanceirosTable.cpfCnpj, docDigits))
      .limit(1);
    if (dup) return res.status(409).json({ error: "Já existe um responsável com este CPF/CNPJ" });

    let userId: string | null = null;
    const wantLogin = body.criarLogin !== false;
    if (wantLogin && body.email && body.senha) {
      if (body.senha.length < 6) return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
      const emailNorm = body.email.toLowerCase().trim();
      const [emailDup] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, emailNorm))
        .limit(1);
      if (emailDup) return res.status(409).json({ error: "E-mail já está em uso por outro usuário" });

      userId = `user-r-${Date.now()}`;
      await db.insert(usersTable).values({
        id: userId,
        email: emailNorm,
        passwordHash: await bcrypt.hash(body.senha, 10),
        role: "responsavel",
        nome: body.nome.trim(),
        active: true,
      });
    }

    const id = `resp-${Date.now()}`;
    const [resp] = await db.insert(responsaveisFinanceirosTable).values({
      id,
      userId,
      tipo: body.tipo ?? "PF",
      nome: body.nome.trim(),
      cpfCnpj: docDigits,
      email: body.email?.toLowerCase().trim() || null,
      telefone: body.telefone?.trim() || null,
      cep: body.cep?.trim() || null,
      logradouro: body.logradouro?.trim() || null,
      numero: body.numero?.trim() || null,
      complemento: body.complemento?.trim() || null,
      bairro: body.bairro?.trim() || null,
      cidade: body.cidade?.trim() || null,
      estado: body.estado?.trim() || null,
      observacao: body.observacao?.trim() || null,
    }).returning();

    res.status(201).json({ responsavel: resp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

adminRouter.patch("/admin/responsaveis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, string | null | undefined>;

    const [existing] = await db.select().from(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Responsável não encontrado" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const setIf = (k: string, transform?: (v: string) => string) => {
      if (body[k] !== undefined) updates[k] = body[k] != null ? (transform ? transform(String(body[k])) : String(body[k]).trim() || null) : null;
    };

    if (body.nome !== undefined) updates.nome = String(body.nome).trim();
    if (body.tipo !== undefined) updates.tipo = body.tipo;
    if (body.cpfCnpj !== undefined) {
      const newDoc = String(body.cpfCnpj).replace(/\D/g, "");
      if (newDoc !== existing.cpfCnpj) {
        const [dup] = await db.select({ id: responsaveisFinanceirosTable.id })
          .from(responsaveisFinanceirosTable)
          .where(and(eq(responsaveisFinanceirosTable.cpfCnpj, newDoc), sql`${responsaveisFinanceirosTable.id} <> ${id}`))
          .limit(1);
        if (dup) return res.status(409).json({ error: "Outro responsável já usa este CPF/CNPJ" });
        updates.cpfCnpj = newDoc;
      }
    }
    setIf("email", v => v.toLowerCase().trim() || null as unknown as string);
    setIf("telefone");
    setIf("cep");
    setIf("logradouro");
    setIf("numero");
    setIf("complemento");
    setIf("bairro");
    setIf("cidade");
    setIf("estado");
    setIf("observacao");

    await db.update(responsaveisFinanceirosTable).set(updates as never).where(eq(responsaveisFinanceirosTable.id, id));

    // Sincronizar nome/email do user vinculado
    if (existing.userId && (updates.nome || updates.email !== undefined)) {
      const userUpdates: Record<string, unknown> = { updatedAt: new Date() };
      if (updates.nome) userUpdates.nome = updates.nome;
      if (updates.email !== undefined && updates.email) userUpdates.email = updates.email;
      await db.update(usersTable).set(userUpdates as never).where(eq(usersTable.id, existing.userId));
    }

    const [updated] = await db.select().from(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.id, id)).limit(1);
    res.json({ responsavel: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

adminRouter.post("/admin/responsaveis/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { novaSenha } = req.body as { novaSenha: string };
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
    const [resp] = await db.select().from(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.id, id)).limit(1);
    if (!resp) return res.status(404).json({ error: "Responsável não encontrado" });
    if (!resp.userId) return res.status(400).json({ error: "Este responsável não tem login criado" });
    await db.update(usersTable).set({
      passwordHash: await bcrypt.hash(novaSenha, 10),
      updatedAt: new Date(),
    }).where(eq(usersTable.id, resp.userId));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

adminRouter.delete("/admin/responsaveis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [count] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(clientesTable)
      .where(eq(clientesTable.responsavelFinanceiroId, id));
    if ((count?.total ?? 0) > 0) {
      return res.status(409).json({ error: "Não é possível excluir um responsável com beneficiários vinculados." });
    }
    const [resp] = await db.select().from(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.id, id)).limit(1);
    if (!resp) return res.status(404).json({ error: "Responsável não encontrado" });
    await db.delete(responsaveisFinanceirosTable).where(eq(responsaveisFinanceirosTable.id, id));
    if (resp.userId) {
      await db.delete(usersTable).where(eq(usersTable.id, resp.userId));
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

router.use(adminRouter);
export default router;
