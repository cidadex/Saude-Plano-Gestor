import { boletos } from './boletos';
import { clientesAtivos } from './clientes';
import { clientesCancelados } from './cancelados';
import type { Boleto, Cliente, Cancelado } from './types';

export interface RegistroCobranca {
  id: string;
  clienteNome: string;
  clienteCpf: string;
  telefone: string;
  vendedor: string;
  plano: string;
  valor: number;
  vencimento: string;
  mesReferencia: string;
  status: 'PENDENTE' | 'VENCIDO' | 'CANCELAR';
  boleto?: Boleto;
  cliente?: Cliente;
  cancelado?: Cancelado;
}

const telefonesPorCpf: Record<string, string> = {
  '722.987.331-2': '(85) 98679-6239',
  '952.946.603-00': '(85) 99729-7661',
  '919.501.206': '(85) 99722-8285',
  '424.346.023-04': '(85) 98670-0625',
  '425.827.503-44': '(85) 99654-4111',
  '785.523-03': '(85) 99800-5781',
  '631.007.453-96': '(85) 99609-4618',
  '483.665.870-53': '(85) 99689-1304',
  '882.408.273-49': '(85) 99970-1301',
  '295.649.437-6': '(85) 98212-0646',
  '547.463.613-04': '(85) 98754-6607',
  '473.247.083-15': '(85) 99601-6320',
};

export const registrosCobranca: RegistroCobranca[] = [
  ...boletos
    .filter(b => b.status === 'PENDENTE' || b.status === 'VENCIDO')
    .map(b => ({
      id: `cob-${b.id}`,
      clienteNome: b.clienteNome,
      clienteCpf: b.clienteCpf,
      telefone: telefonesPorCpf[b.clienteCpf] || '(85) 99999-0000',
      vendedor: b.vendedor,
      plano: b.plano,
      valor: b.valor,
      vencimento: b.vencimento,
      mesReferencia: b.mesReferencia,
      status: b.status as 'PENDENTE' | 'VENCIDO',
      boleto: b,
    })),
  ...clientesAtivos
    .filter(c => c.status === 'CANCELAR')
    .map(c => ({
      id: `cob-cancelar-${c.id}`,
      clienteNome: c.nome,
      clienteCpf: c.cpf,
      telefone: c.telefone || '(85) 99999-0000',
      vendedor: c.representante || c.responsavel,
      plano: c.plano,
      valor: c.valor,
      vencimento: `Dia ${c.vencimento}`,
      mesReferencia: 'A definir',
      status: 'CANCELAR' as const,
      cliente: c,
    })),
];

export const getCobrancasByVendedor = (vendedor: string): RegistroCobranca[] =>
  registrosCobranca.filter(r =>
    r.vendedor.toUpperCase() === vendedor.toUpperCase()
  );

export const getResumoCobranca = () => ({
  totalPendente: registrosCobranca
    .filter(r => r.status === 'PENDENTE')
    .reduce((a, r) => a + r.valor, 0),
  totalVencido: registrosCobranca
    .filter(r => r.status === 'VENCIDO')
    .reduce((a, r) => a + r.valor, 0),
  qtdPendente: registrosCobranca.filter(r => r.status === 'PENDENTE').length,
  qtdVencido: registrosCobranca.filter(r => r.status === 'VENCIDO').length,
});
