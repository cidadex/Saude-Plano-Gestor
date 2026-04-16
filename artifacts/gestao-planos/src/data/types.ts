export type TipoUsuario = 'TITULAR' | 'DEPENDENTE';
export type StatusCliente = 'ATIVO' | 'CANCELADO' | 'CANCELAR';
export type TipoComissao = 'VENDA' | 'SERVICO' | 'AMBOS';
export type StatusProposta = 'PENDENTE' | 'EM_ANALISE' | 'ENVIADO_OPERADORA' | 'ATIVO' | 'CANCELADO';
export type StatusBoleto = 'PENDENTE' | 'PAGO' | 'VENCIDO';
export type StatusComissao = 'PENDENTE' | 'PAGO';

export interface Cliente {
  id: string;
  codigo: string;
  cpf: string;
  nome: string;
  responsavel: string;
  valor: number;
  formaPagamento: string;
  vencimento: number;
  representante: string;
  plano: string;
  codigoPlano: string;
  dataNascimento: string;
  idade: number;
  tipo: TipoUsuario;
  dataAtivacao: string;
  vrPl: number;
  saldo: number;
  valor2026: number;
  comissao: number;
  observacao: string;
  status: StatusCliente;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  bairro?: string;
}

export interface Cancelado {
  id: string;
  codigo: string;
  cpf: string;
  nome: string;
  responsavel: string;
  valor?: number;
  formaPagamento?: string;
  vencimento?: number;
  plano?: string;
  dataAtivacao?: string;
  dataCancelamento?: string;
  observacao?: string;
  saldo?: number;
  debitoTotal?: number;
}

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  comissionado: boolean;
  tipoComissao: TipoComissao | null;
  totalClientes: number;
  totalAtivos: number;
  totalCancelados: number;
  receitaTotal: number;
  comissaoTotal: number;
}

export interface Plano {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  acomodacao: string;
  categoria: string;
  valorTitular: number;
  valorDependente: number;
  coberturas?: string[];
}

export interface TabelaPlanoFaixaEtaria {
  faixa: string;
  enfermaria: number;
  apartamento: number;
}

export interface TabelaPlano {
  vendedor: string;
  ano: number;
  tipoPlano: string;
  titular: TabelaPlanoFaixaEtaria[];
  dependente: number;
}

export interface Proposta {
  id: string;
  clienteNome: string;
  clienteCpf: string;
  vendedor: string;
  plano: string;
  codigoPlano: string;
  tipo: TipoUsuario;
  dataEnvio: string;
  status: StatusProposta;
  observacao?: string;
  dependentes?: string[];
  valor: number;
  telefone?: string;
}

export interface Boleto {
  id: string;
  clienteNome: string;
  clienteCpf: string;
  vendedor: string;
  valor: number;
  vencimento: string;
  mesReferencia: string;
  status: StatusBoleto;
  dataEmissao: string;
  codigoBoleto?: string;
  plano: string;
}

export interface Comissao {
  id: string;
  vendedor: string;
  clienteNome: string;
  tipo: 'VENDA' | 'SERVICO';
  valor: number;
  mesReferencia: string;
  status: StatusComissao;
  plano: string;
  dataVenda?: string;
}

export interface Dependente {
  id: string;
  cpf: string;
  nome: string;
  dataNascimento: string;
  grauParentesco: string;
  titularCpf: string;
  plano: string;
  dataAtivacao: string;
  valor: number;
}
