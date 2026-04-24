import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, vendedoresTable, gerentesTable, clientesTable } from "@workspace/db";
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

// ─── LOGIN DO CLIENTE (CPF + Data de Nascimento) ───────────────
router.post("/auth/cliente/login", async (req, res) => {
  const { cpf, dataNascimento } = req.body as { cpf?: string; dataNascimento?: string };

  if (!cpf || !dataNascimento) {
    return res.status(400).json({ error: "CPF e data de nascimento são obrigatórios" });
  }

  try {
    // Normaliza CPF: tenta com e sem formatação
    const cpfLimpo = cpf.replace(/\D/g, "");
    const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    const busca = await db
      .select()
      .from(clientesTable)
      .where(eq(clientesTable.cpf, cpfLimpo))
      .limit(1);

    let clienteFinal = busca[0];

    if (!clienteFinal) {
      const busca2 = await db
        .select()
        .from(clientesTable)
        .where(eq(clientesTable.cpf, cpfFormatado))
        .limit(1);
      clienteFinal = busca2[0];
    }

    if (!clienteFinal) {
      return res.status(401).json({ error: "CPF não encontrado" });
    }

    if (clienteFinal.status === "CANCELADO") {
      return res.status(401).json({ error: "Contrato cancelado. Entre em contato com o suporte." });
    }

    // Verificar data de nascimento
    const dnBanco = clienteFinal.dataNascimento ? String(clienteFinal.dataNascimento).slice(0, 10) : null;
    const dnInput = dataNascimento.slice(0, 10);
    if (!dnBanco || dnBanco !== dnInput) {
      return res.status(401).json({ error: "Data de nascimento incorreta" });
    }

    const token = signToken({
      userId: clienteFinal.id,
      email: clienteFinal.email ?? "",
      role: "cliente",
      nome: clienteFinal.nome,
      clienteId: clienteFinal.id,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: { id: clienteFinal.id, nome: clienteFinal.nome, role: "cliente", clienteId: clienteFinal.id, email: clienteFinal.email },
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
