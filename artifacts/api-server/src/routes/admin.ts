import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  vendedoresTable,
  gerentesTable,
  clientesTable,
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

export default router;
