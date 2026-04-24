import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface ClienteAPI {
  id: string;
  nome: string;
  cpf: string;
  sexo?: string;
  dataNascimento?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  matricula?: string;
  valorMensal?: string;
  dataAtivacao?: string;
  dataVigencia?: string;
  codigo?: string;
  tipo: string;
  representante?: string;
  formaPagamento?: string;
  diaVencimento?: number;
  vrPl?: string;
  saldo?: string;
  valor2026?: string;
  comissao?: string;
  planoCode?: string;
  codigoPlano?: string;
  status: string;
  observacao?: string;
  vendedorId: string;
}

export interface PropostaAPI {
  id: string;
  vendedorId: string;
  status: string;
  dadosTitular: Record<string, unknown>;
  dadosDependentes: Record<string, unknown>[];
  valorTotal?: string;
  motivoRecusa?: string;
  dataEnvioOperadora?: string;
  dataAtivacao?: string;
  clienteId?: string;
  createdAt: string;
}

export interface BoletoAPI {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone?: string;
  valor: string;
  vencimento: string;
  status: string;
  codigoBarras?: string;
  mesReferencia: string;
  linkPagamento?: string;
  dataPagamento?: string;
  planoCode?: string;
  formaPagamento?: string;
  createdAt: string;
}

export interface ComissaoAPI {
  id: string;
  vendedorId: string;
  clienteNome: string;
  tipo: "VENDA" | "SERVICO";
  valor: string;
  mesReferencia: string;
  status: "PENDENTE" | "PAGO";
  planoCode?: string;
  dataVenda?: string;
  dataPagamento?: string;
}

export interface DashboardStats {
  totalClientes: number;
  totalPropostas: number;
  propostasPendentes: number;
  receitaMensal: number;
  totalAberto: number;
  boletosPendentes: number;
  comissaoVenda: number;
  comissaoServico: number;
}

function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(path);
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export function useClientes() {
  const { data, loading, error, reload } = useResource<{ clientes: ClienteAPI[] }>("/vendedor/clientes");
  return { clientes: data?.clientes ?? [], loading, error, reload };
}

export function usePropostas() {
  const { data, loading, error, reload } = useResource<{ propostas: PropostaAPI[] }>("/vendedor/propostas");
  return { propostas: data?.propostas ?? [], loading, error, reload };
}

export function useBoletos() {
  const { data, loading, error, reload } = useResource<{ boletos: BoletoAPI[] }>("/vendedor/boletos");
  return { boletos: data?.boletos ?? [], loading, error, reload };
}

export function useComissoes() {
  const { data, loading, error, reload } = useResource<{ comissoes: ComissaoAPI[] }>("/vendedor/comissoes");
  return { comissoes: data?.comissoes ?? [], loading, error, reload };
}

export function useDashboard() {
  const { data, loading, error, reload } = useResource<DashboardStats>("/vendedor/dashboard");
  return { stats: data, loading, error, reload };
}
