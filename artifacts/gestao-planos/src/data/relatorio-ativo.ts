/**
 * Relatório de Ativos (Rel_Ativo)
 * Fonte: planilha Rel_Ativo — contém todos os beneficiários ativos com
 * código do contrato, CPF, plano, valores de 2025/2026, comissão e status.
 * Este arquivo espelha a estrutura original da planilha para rastreabilidade.
 */

import type { Cliente } from './types';
import { clientesAtivos } from './clientes';

export interface RelatorioAtivoItem {
  codigo: string;
  cpf: string;
  nome: string;
  plano: string;
  codigoPlano: string;
  responsavel: string;
  representante: string;
  tipo: 'TITULAR' | 'DEPENDENTE';
  formaPagamento: string;
  vencimento: number;
  dataAtivacao: string;
  vrPl: number;
  valor2026: number;
  saldo: number;
  comissao: number;
  status: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
}

/** Converte um Cliente para o formato do Relatório de Ativos */
function clienteParaRelatorio(c: Cliente): RelatorioAtivoItem {
  return {
    codigo: c.codigo,
    cpf: c.cpf,
    nome: c.nome,
    plano: c.plano,
    codigoPlano: c.codigoPlano,
    responsavel: c.responsavel,
    representante: c.representante,
    tipo: c.tipo,
    formaPagamento: c.formaPagamento,
    vencimento: c.vencimento,
    dataAtivacao: c.dataAtivacao,
    vrPl: c.vrPl,
    valor2026: c.valor2026,
    saldo: c.saldo,
    comissao: c.comissao,
    status: c.status,
    telefone: c.telefone,
    cidade: c.cidade,
    estado: c.estado,
  };
}

/** Todos os itens do Relatório de Ativos derivados da planilha Rel_Ativo */
export const relatorioAtivo: RelatorioAtivoItem[] = clientesAtivos.map(clienteParaRelatorio);

/** Total de titulares ativos */
export const getTotalTitulares = (): number =>
  relatorioAtivo.filter(r => r.tipo === 'TITULAR').length;

/** Total de dependentes ativos */
export const getTotalDependentes = (): number =>
  relatorioAtivo.filter(r => r.tipo === 'DEPENDENTE').length;

/** Receita mensal total (soma dos valor2026) */
export const getReceitaMensalTotal = (): number =>
  relatorioAtivo.reduce((acc, r) => acc + r.valor2026, 0);

/** Itens do relatório por vendedor */
export const getRelatorioByVendedor = (vendedor: string): RelatorioAtivoItem[] =>
  relatorioAtivo.filter(r =>
    r.responsavel.toUpperCase() === vendedor.toUpperCase() ||
    r.representante.toUpperCase() === vendedor.toUpperCase()
  );

/** Itens do relatório por plano */
export const getRelatorioByPlano = (codigoPlano: string): RelatorioAtivoItem[] =>
  relatorioAtivo.filter(r => r.plano === codigoPlano);

/** Busca telefone de um beneficiário pelo CPF */
export const getTelefone = (cpf: string): string =>
  relatorioAtivo.find(r => r.cpf === cpf)?.telefone ?? '';
