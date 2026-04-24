import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, vendedoresTable, gerentesTable } from "@workspace/db";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.active) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    let vendedorId: string | undefined;
    let gerenteId: string | undefined;
    let permissoes: string[] | undefined;

    if (user.role === "vendedor") {
      const [v] = await db.select().from(vendedoresTable).where(eq(vendedoresTable.userId, user.id)).limit(1);
      vendedorId = v?.id;
    }

    if (user.role === "gerente") {
      const [g] = await db.select().from(gerentesTable).where(eq(gerentesTable.userId, user.id)).limit(1);
      gerenteId = g?.id;
      permissoes = (g?.permissoes as string[]) ?? [];
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      nome: user.nome,
      vendedorId,
      gerenteId,
      permissoes,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: user.id, email: user.email, role: user.role, nome: user.nome, vendedorId, gerenteId, permissoes },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

// Troca de senha pelo próprio usuário
router.patch("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { senhaAtual, novaSenha } = req.body as { senhaAtual: string; novaSenha: string };

    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    }
    if (novaSenha.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const valid = await bcrypt.compare(senhaAtual, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Senha atual incorreta" });

    const passwordHash = await bcrypt.hash(novaSenha, 10);
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const user = req.user!;

  let vendedorId = user.vendedorId;
  let gerenteId = user.gerenteId;
  let permissoes = user.permissoes;

  if (user.role === "vendedor" && !vendedorId) {
    const [v] = await db.select().from(vendedoresTable).where(eq(vendedoresTable.userId, user.userId)).limit(1);
    vendedorId = v?.id;
  }

  if (user.role === "gerente" && !gerenteId) {
    const [g] = await db.select().from(gerentesTable).where(eq(gerentesTable.userId, user.userId)).limit(1);
    gerenteId = g?.id;
    permissoes = (g?.permissoes as string[]) ?? [];
  }

  res.json({ user: { id: user.userId, email: user.email, role: user.role, nome: user.nome, vendedorId, gerenteId, permissoes } });
});

export default router;
