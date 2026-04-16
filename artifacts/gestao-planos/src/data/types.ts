export type TipoUsuario = 'TITULAR' | 'DEPENDENTE';
export type Sexo = 'M' | 'F';
export type StatusCliente = 'ATIVO' | 'SUSPENSO' | 'CANCELADO' | 'CANCELAR';
export type TipoComissao = 'VENDA' | 'SERVICO' | 'AMBOS';
export type StatusProposta = 'PENDENTE' | 'EM_ANALISE' | 'ENVIADO_OPERADORA' | 'ATIVO' | 'CANCELADO';
export type StatusBoleto = 'PENDENTE' | 'PAGO' | 'VENCIDO';
export type StatusComissao = 'PENDENTE' | 'PAGO';
export type GrauParentesco = 'CÔNJUGE' | 'FILHO(A)' | 'PAI/MÃE' | 'OUTRO' | 'AGREGADO';

export interface Cliente {
  id: string;
  /* ── Identificação ──────────────────────── */
  codigo: string;
  cpf: string;
  nome: string;
  sexo?: Sexo;
  dataNascimento: string;
  idade: number;
  nomeMae?: string;
  cns?: string; // Cartão Nacional de Saúde
  /* ── Vínculo familiar ───────────────────── */
  tipo: TipoUsuario;
  grauParentesco?: GrauParentesco;
  titularNome?: string;
  titularCpf?: string;
  /* ── Contato ────────────────────────────── */
  telefone?: string;
  email?: string;
  /* ── Endereço ───────────────────────────── */
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  /* ── Venda / Representação ──────────────── */
  responsavel: string;
  representante: string;
  /* ── Plano ──────────────────────────────── */
  plano: string;
  codigoPlano: string;
  matricula?: string;
  dataAtivacao: string;
  dataVigencia?: string;
  vencimento: number;
  formaPagamento: string;
  /* ── Financeiro ─────────────────────────── */
  valor: number;
  vrPl: number;
  saldo: number;
  valor2026: number;
  comissao: number;
  /* ── Status ─────────────────────────────── */
  status: StatusCliente;
  observacao: string;
}

export interface Cancelado {
  id: string;
  codigo: string;
  cpf: string;
  nome: string;
  sexo?: Sexo;
  dataNascimento?: string;
  tipo?: TipoUsuario;
  responsavel: string;
  representante?: string;
  plano?: string;
  codigoPlano?: string;
  valor?: number;
  formaPagamento?: string;
  vencimento?: number;
  dataAtivacao?: string;
  dataCancelamento?: string;
  motivoCancelamento?: string;
  observacao?: string;
  saldo?: number;
  debitoTotal?: number;
  telefone?: string;
  cidade?: string;
  estado?: string;
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
  grauParentesco?: GrauParentesco;
  dataEnvio: string;
  dataEnvioOperadora?: string;
  dataAprovacao?: string;
  protocolo?: string;
  numeroContrato?: string;
  status: StatusProposta;
  observacao?: string;
  dependentes?: string[];
  valor: number;
  telefone?: string;
  documentos?: string[];
}

export interface Boleto {
  id: string;
  clienteNome: string;
  clienteCpf: string;
  vendedor: string;
  plano: string;
  valor: number;
  vencimento: string;
  mesReferencia: string;
  status: StatusBoleto;
  dataEmissao: string;
  dataPagamento?: string;
  valorPago?: number;
  multa?: number;
  juros?: number;
  codigoBoleto?: string;
  nossoNumero?: string;
}

export interface Comissao {
  id: string;
  vendedor: string;
  clienteNome: string;
  tipo: 'VENDA' | 'SERVICO';
  valor: number;
  percentual?: number;
  mesReferencia: string;
  status: StatusComissao;
  plano: string;
  dataVenda?: string;
  dataPagamento?: string;
  observacao?: string;
}

export interface Dependente {
  id: string;
  cpf: string;
  nome: string;
  sexo?: Sexo;
  dataNascimento: string;
  grauParentesco: GrauParentesco;
  titularCpf: string;
  titularNome?: string;
  plano: string;
  dataAtivacao: string;
  valor: number;
}
