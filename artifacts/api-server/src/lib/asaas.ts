const BASES = { SANDBOX: "https://api-sandbox.asaas.com/v3", PRODUCAO: "https://api.asaas.com/v3" } as const;

export interface AsaasCreds { apiKey: string; modo: "SANDBOX" | "PRODUCAO" }

export class AsaasError extends Error {}

async function chamar<T>(c: AsaasCreds, metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const res = await fetch(`${BASES[c.modo]}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", access_token: c.apiKey, "User-Agent": "gestao-planos" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let json: Record<string, unknown> = {};
  try { json = texto ? JSON.parse(texto) : {}; } catch { /* resposta não-JSON */ }
  if (!res.ok) {
    const erros = (json.errors as { description?: string }[] | undefined)?.map(e => e.description).filter(Boolean);
    throw new AsaasError(erros?.length ? erros.join("; ") : `Asaas respondeu ${res.status}`);
  }
  return json as T;
}

export interface AsaasCliente { nome: string; cpfCnpj: string; email?: string | null; telefone?: string | null; cep?: string | null; numero?: string | null; externalReference?: string }

/** Busca o cliente pelo CPF/CNPJ na conta do contrato; cria se não existir. */
export async function obterOuCriarCliente(c: AsaasCreds, d: AsaasCliente): Promise<string> {
  const cpfCnpj = d.cpfCnpj.replace(/\D/g, "");
  const busca = await chamar<{ data: { id: string }[] }>(c, "GET", `/customers?cpfCnpj=${cpfCnpj}&limit=1`);
  if (busca.data?.[0]) return busca.data[0].id;
  const criado = await chamar<{ id: string }>(c, "POST", "/customers", {
    name: d.nome, cpfCnpj,
    email: d.email || undefined,
    mobilePhone: d.telefone ? d.telefone.replace(/\D/g, "") : undefined,
    postalCode: d.cep ? d.cep.replace(/\D/g, "") : undefined,
    addressNumber: d.numero || undefined,
    externalReference: d.externalReference,
  });
  return criado.id;
}

export interface AsaasCobranca { id: string; bankSlipUrl?: string; invoiceUrl?: string }

export function criarCobranca(c: AsaasCreds, d: { customer: string; valor: number; vencimento: string; descricao: string; externalReference: string }) {
  return chamar<AsaasCobranca>(c, "POST", "/payments", {
    customer: d.customer, billingType: "BOLETO", value: d.valor, dueDate: d.vencimento,
    description: d.descricao, externalReference: d.externalReference,
  });
}

export async function linhaDigitavel(c: AsaasCreds, paymentId: string): Promise<string | null> {
  try {
    const r = await chamar<{ identificationField?: string }>(c, "GET", `/payments/${paymentId}/identificationField`);
    return r.identificationField ?? null;
  } catch { return null; }
}

export async function removerCobranca(c: AsaasCreds, paymentId: string) {
  await chamar(c, "DELETE", `/payments/${paymentId}`);
}
