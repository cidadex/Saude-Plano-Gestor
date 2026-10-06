import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface DCliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  tipo: string | null;
  status: string;
  planoCode: string | null;
  valorMensal: string | null;
  saldo: string | null;
  vendedorId: string | null;
  vendedorNome: string | null;
  responsavelNome: string | null;
  qtdDependentes: number;
}
export interface DBoleto {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone: string | null;
  vendedorNome: string | null;
  planoCode: string | null;
  valor: string;
  vencimento: string;
  status: "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";
  mesReferencia: string;
}
export interface DVendedor { id: string; nome: string; comissionado: boolean; totalClientes: number }
export interface DComissao { id: string; vendedorId: string; vendedorNome: string | null; valor: string; status: "PENDENTE" | "PAGO" }

export interface AdminDados {
  clientes: DCliente[];
  boletos: DBoleto[];
  vendedores: DVendedor[];
  comissoes: DComissao[];
}

/** Dados reais do sistema (clientes importados, boletos, vendedores, comissões) para as telas de gestão. */
export function useAdminDados() {
  return useQuery({
    queryKey: ["admin-dados"],
    queryFn: async (): Promise<AdminDados> => {
      const [c, b, v, co] = await Promise.all([
        apiFetch<{ clientes: DCliente[] }>("/admin/clientes"),
        apiFetch<{ boletos: DBoleto[] }>("/admin/boletos"),
        apiFetch<{ vendedores: DVendedor[] }>("/admin/vendedores"),
        apiFetch<{ comissoes: DComissao[] }>("/admin/comissoes"),
      ]);
      return { clientes: c.clientes ?? [], boletos: b.boletos ?? [], vendedores: v.vendedores ?? [], comissoes: co.comissoes ?? [] };
    },
  });
}

export const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
