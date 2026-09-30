import { Router } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, boletosTable, clientesTable, contratosTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { baixarBoleto, estadoJob, iniciarGeracao, mesAtual } from "../lib/mensalidadesAsaas.js";

/** Webhook do Asaas — público, autenticado pelo token do contrato (header asaas-access-token). */
export const asaasWebhookRouter = Router();

asaasWebhookRouter.post("/asaas/webhook", async (req, res) => {
  try {
    const token = String(req.header("asaas-access-token") ?? "");
    if (!token) return res.status(401).json({ error: "Token ausente" });
    const [contrato] = await db.select({ id: contratosTable.id }).from(contratosTable)
      .where(eq(contratosTable.asaasWebhookToken, token)).limit(1);
    if (!contrato) return res.status(401).json({ error: "Token inválido" });

    const { event, payment } = req.body as { event?: string; payment?: { id?: string; paymentDate?: string; clientPaymentDate?: string } };
    if (!event || !payment?.id) return res.json({ ok: true, ignorado: true });

    const [linha] = await db.select({ boleto: boletosTable, contratoId: clientesTable.contratoId })
      .from(boletosTable).innerJoin(clientesTable, eq(clientesTable.id, boletosTable.clienteId))
      .where(eq(boletosTable.asaasPaymentId, payment.id)).limit(1);
    if (!linha || linha.contratoId !== contrato.id) return res.json({ ok: true, ignorado: true });
    const boleto = linha.boleto;

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      await baixarBoleto(boleto.id, payment.paymentDate ?? payment.clientPaymentDate);
    } else if (event === "PAYMENT_OVERDUE" && boleto.status === "PENDENTE") {
      await db.update(boletosTable).set({ status: "VENCIDO" }).where(eq(boletosTable.id, boleto.id));
    } else if ((event === "PAYMENT_DELETED" || event === "PAYMENT_REFUNDED") && boleto.status !== "PAGO") {
      await db.update(boletosTable).set({ status: "CANCELADO" }).where(eq(boletosTable.id, boleto.id));
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    // 500 faz o Asaas reenviar o evento depois.
    res.status(500).json({ error: String(err) });
  }
});

/** Rotas administrativas do Asaas. Montado antes do adminRouter, com checagem de admin própria. */
export const asaasAdminRouter = Router();
asaasAdminRouter.use("/admin/asaas", requireAuth, (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Acesso negado" });
  next();
});

asaasAdminRouter.get("/admin/asaas/mensalidades/status", (_req, res) => {
  res.json({ ...estadoJob(), mesPadrao: mesAtual() });
});

asaasAdminRouter.post("/admin/asaas/mensalidades/gerar", (req, res) => {
  const { mes, contratoId } = req.body as { mes?: string; contratoId?: string };
  if (!mes || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(mes)) return res.status(400).json({ error: "Mês inválido (use MM/AAAA)" });
  const r = iniciarGeracao({ mes, contratoIds: contratoId ? [contratoId] : undefined, geradoPorId: req.user!.userId });
  if (!r.iniciado) return res.status(409).json({ error: "Já existe uma geração em andamento" });
  res.status(202).json({ ok: true });
});

asaasAdminRouter.post("/admin/asaas/contratos/:id/webhook-token", async (req, res) => {
  try {
    const token = randomBytes(24).toString("hex");
    const r = await db.update(contratosTable).set({ asaasWebhookToken: token, updatedAt: new Date() })
      .where(eq(contratosTable.id, String(req.params.id))).returning({ id: contratosTable.id });
    if (!r.length) return res.status(404).json({ error: "Contrato não encontrado" });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});
