import type { Boleto } from './types';

const mesAtual = '04/2026';
const mesAnterior = '03/2026';

export const boletos: Boleto[] = [
  {
    id: 'b1', clienteNome: 'ABNER SOUSA LIMA', clienteCpf: '722.987.331-2',
    vendedor: 'CAROL', valor: 275.86, vencimento: '10/04/2026',
    mesReferencia: mesAtual, status: 'PENDENTE', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063957 8 93140000027586',
    plano: '5254',
  },
  {
    id: 'b2', clienteNome: 'ADAUTO RODRIGUES DE AGUIAR', clienteCpf: '952.946.603-00',
    vendedor: 'CLEBIA', valor: 252.19, vencimento: '10/04/2026',
    mesReferencia: mesAtual, status: 'PENDENTE', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063958 9 93140000025219',
    plano: '5254',
  },
  {
    id: 'b3', clienteNome: 'ADRIANA DA SILVA ALCANTARA', clienteCpf: '424.346.023-04',
    vendedor: 'LUCAS', valor: 404.48, vencimento: '05/04/2026',
    mesReferencia: mesAtual, status: 'PAGO', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063959 0 93140000040448',
    plano: '5254',
  },
  {
    id: 'b4', clienteNome: 'ADRIANA DE OLIVEIRA FREITAS', clienteCpf: '785.523-03',
    vendedor: 'CAROL', valor: 341.28, vencimento: '10/04/2026',
    mesReferencia: mesAtual, status: 'PAGO', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063960 1 93140000034128',
    plano: '5254',
  },
  {
    id: 'b5', clienteNome: 'ARTHUR DE OLIVEIRA LOPES', clienteCpf: '785.523-03',
    vendedor: 'CAROL', valor: 275.84, vencimento: '10/04/2026',
    mesReferencia: mesAtual, status: 'PENDENTE', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063961 2 93140000027584',
    plano: '5254',
  },
  {
    id: 'b6', clienteNome: 'AHMAD SAID ILAYAN HAMAWI', clienteCpf: '483.665.870-53',
    vendedor: 'WLADSON', valor: 404.52, vencimento: '15/04/2026',
    mesReferencia: mesAtual, status: 'PENDENTE', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063962 3 93140000040452',
    plano: '5254',
  },
  {
    id: 'b7', clienteNome: 'AIRTON AGUIAR HOLANDA NETO', clienteCpf: '882.408.273-49',
    vendedor: 'AIRTON', valor: 252.19, vencimento: '15/04/2026',
    mesReferencia: mesAtual, status: 'VENCIDO', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063963 4 93140000025219',
    plano: '5254',
  },
  {
    id: 'b8', clienteNome: 'ADELAINE BERNARDO LEAL', clienteCpf: '919.501.206',
    vendedor: 'WLADSON', valor: 268.75, vencimento: '15/04/2026',
    mesReferencia: mesAtual, status: 'PAGO', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063964 5 93140000026875',
    plano: '5252',
  },
  {
    id: 'b9', clienteNome: 'ADRIANA DE CASTRO CAMPOS', clienteCpf: '425.827.503-44',
    vendedor: 'WLADSON', valor: 251.94, vencimento: '15/04/2026',
    mesReferencia: mesAtual, status: 'PENDENTE', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063965 6 93140000025194',
    plano: '5254',
  },
  {
    id: 'b10', clienteNome: 'ADRIELE RODRIGUES LOPES', clienteCpf: '295.649.437-6',
    vendedor: 'CAROL', valor: 341.28, vencimento: '10/04/2026',
    mesReferencia: mesAtual, status: 'PAGO', dataEmissao: '01/04/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063966 7 93140000034128',
    plano: '5254',
  },
  // Boletos do mês anterior
  {
    id: 'b11', clienteNome: 'ABNER SOUSA LIMA', clienteCpf: '722.987.331-2',
    vendedor: 'CAROL', valor: 275.86, vencimento: '10/03/2026',
    mesReferencia: mesAnterior, status: 'PAGO', dataEmissao: '01/03/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063901 0 93140000027586',
    plano: '5254',
  },
  {
    id: 'b12', clienteNome: 'ADRIANA DE OLIVEIRA FREITAS', clienteCpf: '785.523-03',
    vendedor: 'CAROL', valor: 341.28, vencimento: '10/03/2026',
    mesReferencia: mesAnterior, status: 'PAGO', dataEmissao: '01/03/2026',
    codigoBoleto: '23793.38128 60007.827136 95000.063902 1 93140000034128',
    plano: '5254',
  },
];

export const getBoletosByVendedor = (vendedor: string): Boleto[] =>
  boletos.filter(b => b.vendedor.toUpperCase() === vendedor.toUpperCase());

export const getBoletosByMes = (mes: string): Boleto[] =>
  boletos.filter(b => b.mesReferencia === mes);

export const getTotalBoletosAbertos = (): number =>
  boletos
    .filter(b => b.status === 'PENDENTE' || b.status === 'VENCIDO')
    .reduce((acc, b) => acc + b.valor, 0);
