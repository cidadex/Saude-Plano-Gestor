import type { Cliente, Dependente } from './types';

export const clientesAtivos: Cliente[] = [
  {
    id: 'c1', codigo: '0DMQW', cpf: '722.987.331-2', nome: 'ABNER SOUSA LIMA',
    responsavel: 'ABNER', valor: 275.86, formaPagamento: 'BOLETO', vencimento: 10,
    representante: 'CAROL', plano: '5254', codigoPlano: '0DMQW000189006',
    dataNascimento: '30/06/1997', idade: 28, tipo: 'TITULAR', dataAtivacao: '26/03/2025',
    vrPl: 143.12, saldo: 132.74, valor2026: 275.86, comissao: 0,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'CAMBEBA', telefone: '(85) 98679-6239',
  },
  {
    id: 'c2', codigo: '0DMQW', cpf: '952.946.603-00', nome: 'ADAUTO RODRIGUES DE AGUIAR',
    responsavel: 'CLEBIA', valor: 252.19, formaPagamento: 'BOLETO', vencimento: 10,
    representante: '', plano: '5254', codigoPlano: '0DMQW000339008',
    dataNascimento: '15/09/1981', idade: 44, tipo: 'TITULAR', dataAtivacao: '01/11/2025',
    vrPl: 143.12, saldo: 109.07, valor2026: 252.19, comissao: 0,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'PARQUE MANIBURA', telefone: '(85) 99729-7661',
  },
  {
    id: 'c3', codigo: '0DMQW', cpf: '919.501.206', nome: 'ADELAINE BERNARDO LEAL',
    responsavel: 'WLADSON', valor: 268.75, formaPagamento: 'CORA', vencimento: 15,
    representante: '', plano: '5252', codigoPlano: '0DMQW000393002',
    dataNascimento: '22/04/1990', idade: 35, tipo: 'TITULAR', dataAtivacao: '14/01/2026',
    vrPl: 153.92, saldo: 84.83, valor2026: 268.75, comissao: 30,
    observacao: '', status: 'ATIVO', cidade: 'CAUCAIA', estado: 'CE',
    bairro: 'GRILO', telefone: '(85) 99722-8285',
  },
  {
    id: 'c4', codigo: '0H4C9', cpf: '424.346.023-04', nome: 'ADRIANA DA SILVA ALCANTARA',
    responsavel: 'ADRIANA', valor: 404.48, formaPagamento: 'BOLETO', vencimento: 5,
    representante: 'LUCAS', plano: '5254', codigoPlano: '0H4C9000334006',
    dataNascimento: '16/05/1974', idade: 51, tipo: 'TITULAR', dataAtivacao: '19/09/2025',
    vrPl: 143.12, saldo: 231.36, valor2026: 404.48, comissao: 30,
    observacao: '', status: 'ATIVO', cidade: 'MARACANAU', estado: 'CE',
    bairro: 'JEREISSATI I', telefone: '(85) 98670-0625',
  },
  {
    id: 'c5', codigo: '0H4C9', cpf: '425.827.503-44', nome: 'ADRIANA DE CASTRO CAMPOS',
    responsavel: 'WLADSON', valor: 251.94, formaPagamento: 'CORA', vencimento: 15,
    representante: '', plano: '5254', codigoPlano: '0H4C9000015008',
    dataNascimento: '12/12/1971', idade: 54, tipo: 'TITULAR', dataAtivacao: '02/04/2024',
    vrPl: 143.12, saldo: 78.81, valor2026: 251.94, comissao: 30,
    observacao: 'REAJUSTAR 55', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'DIONISIO TORRES', telefone: '(85) 99654-4111',
  },
  {
    id: 'c6', codigo: '0H4C9', cpf: '785.523-03', nome: 'ADRIANA DE OLIVEIRA FREITAS',
    responsavel: 'ADRIANA', valor: 341.28, formaPagamento: 'BOLETO', vencimento: 10,
    representante: 'CAROL', plano: '5254', codigoPlano: '0H4C9000279005',
    dataNascimento: '21/03/1984', idade: 42, tipo: 'TITULAR', dataAtivacao: '05/07/2025',
    vrPl: 143.12, saldo: 198.16, valor2026: 341.28, comissao: 0,
    observacao: '', status: 'ATIVO', cidade: 'CASCAVEL', estado: 'CE',
    bairro: 'CENTRO', telefone: '(85) 99800-5781',
  },
  {
    id: 'c7', codigo: '0H4C9', cpf: '785.523-03', nome: 'ARTHUR DE OLIVEIRA LOPES',
    responsavel: 'ADRIANA', valor: 275.84, formaPagamento: 'BOLETO', vencimento: 10,
    representante: 'CAROL', plano: '5254', codigoPlano: '0H4C9000279013',
    dataNascimento: '14/04/2019', idade: 7, tipo: 'DEPENDENTE', dataAtivacao: '05/07/2025',
    vrPl: 143.12, saldo: 132.72, valor2026: 275.84, comissao: 0,
    observacao: '', status: 'ATIVO', cidade: 'CASCAVEL', estado: 'CE',
    bairro: 'CENTRO', telefone: '(85) 99800-5781',
  },
  {
    id: 'c8', codigo: '0H4C9', cpf: '631.007.453-96', nome: 'ADRIELLY KETLEN BARBOSA PEREIRA',
    responsavel: 'NICOLLY', valor: 268.75, formaPagamento: 'C6', vencimento: 10,
    representante: '', plano: '5252', codigoPlano: '0H4C9000500003',
    dataNascimento: '13/02/2006', idade: 20, tipo: 'TITULAR', dataAtivacao: '26/02/2026',
    vrPl: 153.92, saldo: 104.83, valor2026: 268.75, comissao: 10,
    observacao: '', status: 'ATIVO', cidade: 'CAUCAIA', estado: 'CE',
    bairro: 'TOCO (JUREMA)', telefone: '(85) 99609-4618',
  },
  {
    id: 'c9', codigo: '10AAJ', cpf: '483.665.870-53', nome: 'AHMAD SAID ILAYAN HAMAWI',
    responsavel: 'WLADSON', valor: 404.52, formaPagamento: 'CORA', vencimento: 15,
    representante: '', plano: '5254', codigoPlano: '10AAJ000054003',
    dataNascimento: '02/05/1967', idade: 58, tipo: 'TITULAR', dataAtivacao: '08/07/2025',
    vrPl: 143.12, saldo: 211.40, valor2026: 404.52, comissao: 50,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'MEIRELES', telefone: '(85) 99689-1304',
  },
  {
    id: 'c10', codigo: '10AAJ', cpf: '882.408.273-49', nome: 'AIRTON AGUIAR HOLANDA NETO',
    responsavel: 'AIRTON', valor: 252.19, formaPagamento: 'BTG', vencimento: 15,
    representante: '', plano: '5254', codigoPlano: '0H4C9000463000',
    dataNascimento: '11/10/1981', idade: 44, tipo: 'TITULAR', dataAtivacao: '01/02/2026',
    vrPl: 143.12, saldo: 89.07, valor2026: 252.19, comissao: 20,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'FATIMA', telefone: '(85) 99970-1301',
  },
  {
    id: 'c11', codigo: '0H4C9', cpf: '295.649.437-6', nome: 'ADRIELE RODRIGUES LOPES',
    responsavel: 'ADRIELE', valor: 341.28, formaPagamento: 'BOLETO', vencimento: 10,
    representante: 'CAROL', plano: '5254', codigoPlano: '0H4C9000295000',
    dataNascimento: '03/12/1987', idade: 38, tipo: 'TITULAR', dataAtivacao: '05/08/2025',
    vrPl: 143.12, saldo: 198.16, valor2026: 341.28, comissao: 0,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'FARIAS BRITO', telefone: '(85) 98212-0646',
  },
  {
    id: 'c12', codigo: '0H4C9', cpf: '547.463.613-04', nome: 'ALDEIZA BARBOZA BARROS',
    responsavel: 'ALDEIZA', valor: 404.48, formaPagamento: 'BOLETO', vencimento: 20,
    representante: '', plano: '5254', codigoPlano: '0H4C9000387002',
    dataNascimento: '28/04/1968', idade: 57, tipo: 'TITULAR', dataAtivacao: '18/11/2025',
    vrPl: 143.12, saldo: 261.36, valor2026: 404.48, comissao: 0,
    observacao: 'PARCELADO 12/2025 em 5 vezes', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'CONJUNTO CEARA I', telefone: '(85) 98754-6607',
  },
  {
    id: 'c13', codigo: '0H4C9', cpf: '473.247.083-15', nome: 'ALDENISA MACIEL DE LIMA ALBUQUERQUE',
    responsavel: 'NICOLLY', valor: 404.48, formaPagamento: 'C6', vencimento: 10,
    representante: '', plano: '5252', codigoPlano: '0H4C9000484008',
    dataNascimento: '23/03/1973', idade: 53, tipo: 'TITULAR', dataAtivacao: '16/02/2026',
    vrPl: 153.92, saldo: 240.56, valor2026: 404.48, comissao: 10,
    observacao: '', status: 'ATIVO', cidade: 'FORTALEZA', estado: 'CE',
    bairro: 'PEDRAS', telefone: '(85) 99601-6320',
  },
];

export const dependentes: Dependente[] = [
  {
    id: 'd1', cpf: '785.523-03', nome: 'ARTHUR DE OLIVEIRA LOPES',
    dataNascimento: '14/04/2019', grauParentesco: 'FILHO(A)',
    titularCpf: '785.523-03', plano: '5254',
    dataAtivacao: '05/07/2025', valor: 275.84,
  },
];

export const getClientesByVendedor = (vendedor: string): Cliente[] =>
  clientesAtivos.filter(c => 
    c.representante.toUpperCase() === vendedor.toUpperCase() ||
    c.responsavel.toUpperCase() === vendedor.toUpperCase()
  );

export const getTotalMensal = (): number =>
  clientesAtivos.reduce((acc, c) => acc + c.valor, 0);

export const getTotalPorFormaPagamento = () => {
  const mapa: Record<string, number> = {};
  clientesAtivos.forEach(c => {
    const fp = c.formaPagamento.trim();
    mapa[fp] = (mapa[fp] || 0) + c.valor;
  });
  return mapa;
};
