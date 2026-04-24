import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, vendedoresTable, planosTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.post("/seed", async (_req, res) => {
  try {
    const hash = await bcrypt.hash("123456", 10);

    await db.transaction(async (tx) => {
      // Clear tables in order
      await tx.execute(sql`DELETE FROM comunicacoes`);
      await tx.execute(sql`DELETE FROM boletos`);
      await tx.execute(sql`DELETE FROM propostas`);
      await tx.execute(sql`DELETE FROM dependentes`);
      await tx.execute(sql`DELETE FROM clientes`);
      await tx.execute(sql`DELETE FROM tabelas_preco_faixas`);
      await tx.execute(sql`DELETE FROM tabelas_preco`);
      await tx.execute(sql`DELETE FROM gerentes`);
      await tx.execute(sql`DELETE FROM vendedores`);
      await tx.execute(sql`DELETE FROM planos`);
      await tx.execute(sql`DELETE FROM users`);

      // Admin
      await tx.insert(usersTable).values({
        id: "user-admin",
        email: "admin@seacec.com.br",
        passwordHash: hash,
        role: "admin",
        nome: "Administrador Geral",
        active: true,
      });

      // Vendedor users
      const vendedoresData = [
        { id: "v1", nome: "WLADSON", email: "wladson@seacec.com.br", telefone: "(85) 99900-0001", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v2", nome: "CAROL", email: "carol@seacec.com.br", telefone: "(85) 99900-0002", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v3", nome: "LUCAS", email: "lucas@seacec.com.br", telefone: "(85) 99900-0003", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v4", nome: "NICOLLY", email: "nicolly@seacec.com.br", telefone: "(85) 99900-0004", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v5", nome: "CLEBIA", email: "clebia@seacec.com.br", telefone: "(85) 99900-0005", comissionado: true, tipoComissao: "SERVICO" as const },
        { id: "v6", nome: "F2", email: "f2@seacec.com.br", telefone: "(85) 99900-0006", comissionado: false, tipoComissao: null },
        { id: "v7", nome: "ADRIANA", email: "adriana@seacec.com.br", telefone: "(85) 99900-0007", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v8", nome: "LIS", email: "lis@seacec.com.br", telefone: "(85) 99900-0008", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v9", nome: "ALISSON", email: "alisson@seacec.com.br", telefone: "(85) 99900-0009", comissionado: false, tipoComissao: null },
        { id: "v10", nome: "AIRTON", email: "airton@seacec.com.br", telefone: "(85) 99900-0010", comissionado: false, tipoComissao: null },
      ];

      for (const v of vendedoresData) {
        await tx.insert(usersTable).values({
          id: `user-${v.id}`,
          email: v.email,
          passwordHash: hash,
          role: "vendedor",
          nome: v.nome,
          active: true,
        });

        await tx.insert(vendedoresTable).values({
          id: v.id,
          userId: `user-${v.id}`,
          nome: v.nome,
          email: v.email,
          telefone: v.telefone ?? null,
          comissionado: v.comissionado,
          tipoComissao: v.tipoComissao,
        });
      }

      // Planos
      const planosData = [
        { id: "p1", nome: "AMBU. S/PARTO", tipo: "AMBULATORIAL" as const, operadora: "Hapvida" },
        { id: "p2", nome: "AMBU. C/PARTO", tipo: "AMBULATORIAL" as const, operadora: "Hapvida" },
        { id: "p3", nome: "AMBUL+HOSP. S/PARTO", tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida" },
        { id: "p4", nome: "AMBUL+HOSP. C/PARTO", tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida" },
        { id: "p5", nome: "AMBUL+HOSP. C/PARTO ENFERMARIA", tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida" },
        { id: "p6", nome: "ODONTOLÓGICO", tipo: "ODONTOLOGICO" as const, operadora: "Hapvida" },
        { id: "p7", nome: "COMPLETO", tipo: "COMPLETO" as const, operadora: "Hapvida" },
      ];

      for (const p of planosData) {
        await tx.insert(planosTable).values(p);
      }
    });

    res.json({ ok: true, message: "Banco populado com sucesso. Senha padrão: 123456" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
