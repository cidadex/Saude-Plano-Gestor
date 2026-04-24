import type { Proposta } from './types';

export const propostas: Proposta[] = [
  {
    id: 'prop1', clienteNome: 'ADELAINE BERNARDO LEAL', clienteCpf: '919.501.206',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. C/PARTO ENFERMARIA', codigoPlano: '5252',
    tipo: 'TITULAR', dataEnvio: '10/01/2026', status: 'ATIVO',
    valor: 268.75, telefone: '(85) 99722-8285',
  },
  {
    id: 'prop2', clienteNome: 'ADRIANA DE CASTRO CAMPOS', clienteCpf: '425.827.503-44',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '28/03/2024', status: 'ATIVO',
    valor: 251.94, telefone: '(85) 99654-4111',
  },
  {
    id: 'prop3', clienteNome: 'AHMAD SAID ILAYAN HAMAWI', clienteCpf: '483.665.870-53',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '01/07/2025', status: 'ATIVO',
    valor: 404.52, telefone: '(85) 99689-1304',
  },
  {
    id: 'prop4', clienteNome: 'ALDENISA MACIEL DE LIMA ALBUQUERQUE', clienteCpf: '473.247.083-15',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. C/PARTO ENFERMARIA', codigoPlano: '5252',
    tipo: 'TITULAR', dataEnvio: '10/02/2026', status: 'ATIVO',
    valor: 404.48, telefone: '(85) 99601-6320', dependentes: ['DEP001'],
  },
  {
    id: 'prop5', clienteNome: 'MARCOS ANTONIO DA SILVA FILHO', clienteCpf: '362.073.430-5',
    vendedor: 'CAROL', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '05/01/2026', status: 'PENDENTE',
    valor: 400.00, telefone: '(85) 99876-5432', observacao: 'Aguardando documentos',
  },
  {
    id: 'prop6', clienteNome: 'ADRIANA DA SILVA ALCANTARA', clienteCpf: '424.346.023-04',
    vendedor: 'LUCAS', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '12/09/2025', status: 'ATIVO',
    valor: 404.48, telefone: '(85) 98670-0625',
  },
  {
    id: 'prop7', clienteNome: 'DANIELA LOPES DA SILVA', clienteCpf: '544.584.333-5',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. C/PARTO ENFERMARIA', codigoPlano: '5252',
    tipo: 'TITULAR', dataEnvio: '25/06/2025', status: 'EM_ANALISE',
    valor: 248.84, telefone: '(85) 99290-4936', observacao: 'Enviado para operadora, aguardando retorno',
  },
  {
    id: 'prop8', clienteNome: 'AIRTON AGUIAR HOLANDA NETO', clienteCpf: '882.408.273-49',
    vendedor: 'AIRTON', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '28/01/2026', status: 'ATIVO',
    valor: 252.19, telefone: '(85) 99970-1301',
  },
  {
    id: 'prop9', clienteNome: 'ANA PAULA ALMEIDA COSTA MONTEIRO', clienteCpf: '103.696.040-4',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '01/09/2025', status: 'CANCELADO',
    valor: 233.51, telefone: '(85) 98779-1819', observacao: 'CANCELADO',
  },
  {
    id: 'prop10', clienteNome: 'LAYSA CRISTINA ROCHA DUARTE', clienteCpf: '952.788.330-0',
    vendedor: 'WLADSON', plano: 'AMBUL+HOSP. C/PARTO ENFERMARIA', codigoPlano: '5252',
    tipo: 'TITULAR', dataEnvio: '05/06/2025', status: 'ENVIADO_OPERADORA',
    valor: 248.84, telefone: '(85) 99215-8576', observacao: 'Ficha enviada para a operadora em 08/06/2025',
  },
  {
    id: 'prop11', clienteNome: 'ADRIELLE RODRIGUES LOPES', clienteCpf: '295.649.437-6',
    vendedor: 'CAROL', plano: 'AMBUL+HOSP. S/PARTO ENFERMARIA', codigoPlano: '5254',
    tipo: 'TITULAR', dataEnvio: '01/08/2025', status: 'ATIVO',
    valor: 341.28, telefone: '(85) 98212-0646',
  },
  {
    id: 'prop12', clienteNome: 'ADRIELLY KETLEN BARBOSA PEREIRA', clienteCpf: '631.007.453-96',
    vendedor: 'NICOLLY', plano: 'AMBUL+HOSP. C/PARTO ENFERMARIA', codigoPlano: '5252',
    tipo: 'TITULAR', dataEnvio: '20/02/2026', status: 'ATIVO',
    valor: 268.75, telefone: '(85) 99609-4618',
  },
];

export const getPropostasByVendedor = (vendedor: string): Proposta[] =>
  propostas.filter(p => p.vendedor.toUpperCase() === vendedor.toUpperCase());

export const getPropostasByStatus = (status: string): Proposta[] =>
  propostas.filter(p => p.status === status);
