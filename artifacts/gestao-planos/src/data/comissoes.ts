import type { Comissao } from './types';

export const comissoes: Comissao[] = [
  {
    id: 'com1', vendedor: 'WLADSON', clienteNome: 'ADELAINE BERNARDO LEAL',
    tipo: 'VENDA', valor: 268.75, mesReferencia: '01/2026',
    status: 'PAGO', plano: '5252', dataVenda: '14/01/2026',
  },
  {
    id: 'com2', vendedor: 'WLADSON', clienteNome: 'ADRIANA DE CASTRO CAMPOS',
    tipo: 'SERVICO', valor: 50.00, mesReferencia: '04/2026',
    status: 'PENDENTE', plano: '5254',
  },
  {
    id: 'com3', vendedor: 'WLADSON', clienteNome: 'AHMAD SAID ILAYAN HAMAWI',
    tipo: 'VENDA', valor: 404.52, mesReferencia: '07/2025',
    status: 'PAGO', plano: '5254', dataVenda: '08/07/2025',
  },
  {
    id: 'com4', vendedor: 'WLADSON', clienteNome: 'AHMAD SAID ILAYAN HAMAWI',
    tipo: 'SERVICO', valor: 50.00, mesReferencia: '04/2026',
    status: 'PENDENTE', plano: '5254',
  },
  {
    id: 'com5', vendedor: 'CAROL', clienteNome: 'ABNER SOUSA LIMA',
    tipo: 'VENDA', valor: 275.86, mesReferencia: '03/2025',
    status: 'PAGO', plano: '5254', dataVenda: '26/03/2025',
  },
  {
    id: 'com6', vendedor: 'CAROL', clienteNome: 'ADRIANA DE OLIVEIRA FREITAS',
    tipo: 'VENDA', valor: 341.28, mesReferencia: '07/2025',
    status: 'PAGO', plano: '5254', dataVenda: '05/07/2025',
  },
  {
    id: 'com7', vendedor: 'CAROL', clienteNome: 'ARTHUR DE OLIVEIRA LOPES',
    tipo: 'VENDA', valor: 275.84, mesReferencia: '07/2025',
    status: 'PAGO', plano: '5254', dataVenda: '05/07/2025',
  },
  {
    id: 'com8', vendedor: 'CAROL', clienteNome: 'ADRIELE RODRIGUES LOPES',
    tipo: 'VENDA', valor: 341.28, mesReferencia: '08/2025',
    status: 'PAGO', plano: '5254', dataVenda: '05/08/2025',
  },
  {
    id: 'com9', vendedor: 'LUCAS', clienteNome: 'ADRIANA DA SILVA ALCANTARA',
    tipo: 'VENDA', valor: 404.48, mesReferencia: '09/2025',
    status: 'PAGO', plano: '5254', dataVenda: '19/09/2025',
  },
  {
    id: 'com10', vendedor: 'LUCAS', clienteNome: 'ADRIANA DA SILVA ALCANTARA',
    tipo: 'SERVICO', valor: 30.00, mesReferencia: '04/2026',
    status: 'PENDENTE', plano: '5254',
  },
  {
    id: 'com11', vendedor: 'NICOLLY', clienteNome: 'ADRIELLY KETLEN BARBOSA PEREIRA',
    tipo: 'VENDA', valor: 268.75, mesReferencia: '02/2026',
    status: 'PAGO', plano: '5252', dataVenda: '26/02/2026',
  },
  {
    id: 'com12', vendedor: 'NICOLLY', clienteNome: 'ALDENISA MACIEL DE LIMA ALBUQUERQUE',
    tipo: 'VENDA', valor: 404.48, mesReferencia: '02/2026',
    status: 'PAGO', plano: '5252', dataVenda: '16/02/2026',
  },
  {
    id: 'com13', vendedor: 'WLADSON', clienteNome: 'ADELAINE BERNARDO LEAL',
    tipo: 'SERVICO', valor: 30.00, mesReferencia: '03/2026',
    status: 'PAGO', plano: '5252',
  },
  {
    id: 'com14', vendedor: 'WLADSON', clienteNome: 'ADRIANA DE CASTRO CAMPOS',
    tipo: 'SERVICO', valor: 30.00, mesReferencia: '03/2026',
    status: 'PAGO', plano: '5254',
  },
];

export const getComissoesByVendedor = (vendedor: string): Comissao[] =>
  comissoes.filter(c => c.vendedor.toUpperCase() === vendedor.toUpperCase());

export const getComissoesByTipo = (vendedor: string, tipo: 'VENDA' | 'SERVICO'): Comissao[] =>
  comissoes.filter(c => c.vendedor.toUpperCase() === vendedor.toUpperCase() && c.tipo === tipo);

export const getTotalComissoesVendedor = (vendedor: string): { venda: number; servico: number } => {
  const comVendedor = getComissoesByVendedor(vendedor);
  return {
    venda: comVendedor.filter(c => c.tipo === 'VENDA').reduce((a, c) => a + c.valor, 0),
    servico: comVendedor.filter(c => c.tipo === 'SERVICO').reduce((a, c) => a + c.valor, 0),
  };
};
