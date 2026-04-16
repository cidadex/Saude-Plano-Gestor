import type { Plano, TabelaPlano } from './types';

export const planos: Plano[] = [
  {
    id: 'p1', codigo: '5254', nome: 'AMBUL+HOSP. S/PARTO ENFERMARIA',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'NOSSO PLANO', valorTitular: 143.12, valorDependente: 143.12,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Rede própria'],
  },
  {
    id: 'p2', codigo: '5285', nome: 'AMBUL+HOSP. S/PARTO APARTAMENTO',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'NOSSO PLANO', valorTitular: 207.53, valorDependente: 207.53,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Apartamento', 'Rede própria'],
  },
  {
    id: 'p3', codigo: '5252', nome: 'AMBUL+HOSP. C/PARTO ENFERMARIA',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'NOSSO PLANO', valorTitular: 153.92, valorDependente: 153.92,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Rede própria'],
  },
  {
    id: 'p4', codigo: '9714', nome: 'AMBUL+HOSP. C/PARTO APARTAMENTO',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'NOSSO PLANO', valorTitular: 223.20, valorDependente: 223.20,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Apartamento', 'Rede própria'],
  },
  {
    id: 'p5', codigo: '5403', nome: 'AMBUL+HOSP. S/PARTO ENFERMARIA MIX',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'MIX', valorTitular: 186.07, valorDependente: 186.07,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Rede própria + credenciada'],
  },
  {
    id: 'p6', codigo: '5404', nome: 'AMBUL+HOSP. S/PARTO APARTAMENTO MIX',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'MIX', valorTitular: 269.81, valorDependente: 269.81,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Apartamento', 'Rede própria + credenciada'],
  },
  {
    id: 'p7', codigo: '5123', nome: 'AMBUL+HOSP. C/PARTO ENFERMARIA MIX',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'MIX', valorTitular: 200.10, valorDependente: 200.10,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Rede própria + credenciada'],
  },
  {
    id: 'p8', codigo: '9717', nome: 'AMBUL+HOSP. C/PARTO APARTAMENTO MIX',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'MIX', valorTitular: 290.18, valorDependente: 290.18,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Apartamento', 'Rede própria + credenciada'],
  },
  {
    id: 'p9', codigo: '5397', nome: 'AMBUL+HOSP. S/PARTO ENFERMARIA PLENO',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'PLENO', valorTitular: 286.27, valorDependente: 286.27,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Cobertura plena'],
  },
  {
    id: 'p10', codigo: '5402', nome: 'AMBUL+HOSP. S/PARTO APARTAMENTO PLENO',
    tipo: 'AMBUL+HOSP.S/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'PLENO', valorTitular: 415.04, valorDependente: 415.04,
    coberturas: ['Ambulatorial', 'Hospitalar sem parto', 'Apartamento', 'Cobertura plena'],
  },
  {
    id: 'p11', codigo: '5127', nome: 'AMBUL+HOSP. C/PARTO ENFERMARIA PLENO',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'ENFERMARIA',
    categoria: 'PLENO', valorTitular: 307.85, valorDependente: 307.85,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Cobertura plena'],
  },
  {
    id: 'p12', codigo: '5283', nome: 'AMBUL+HOSP. C/PARTO APARTAMENTO PLENO',
    tipo: 'AMBUL+HOSP.C/PARTO', acomodacao: 'APARTAMENTO',
    categoria: 'PLENO', valorTitular: 446.39, valorDependente: 446.39,
    coberturas: ['Ambulatorial', 'Hospitalar com parto', 'Apartamento', 'Cobertura plena'],
  },
];

export const tabelasPlanos: TabelaPlano[] = [
  {
    vendedor: 'CAROL',
    ano: 2026,
    tipoPlano: 'NOSSO PLANO',
    titular: [
      { faixa: 'Até 29 anos', enfermaria: 302.40, apartamento: 423.36 },
      { faixa: '30 a 39 anos', enfermaria: 341.29, apartamento: 477.81 },
      { faixa: '40 a 49 anos', enfermaria: 385.28, apartamento: 539.39 },
      { faixa: '50 anos ou mais', enfermaria: 600.00, apartamento: 780.00 },
    ],
    dependente: 260.00,
  },
  {
    vendedor: 'LIS',
    ano: 2026,
    tipoPlano: 'NOSSO PLANO (SEM OBSTETRICIA)',
    titular: [
      { faixa: '14 a 29 anos', enfermaria: 341.67, apartamento: 478.35 },
      { faixa: '30 a 49 anos', enfermaria: 406.52, apartamento: 569.13 },
      { faixa: '50 a 59 anos', enfermaria: 626.67, apartamento: 814.08 },
      { faixa: '60 anos ou mais', enfermaria: 750.90, apartamento: 917.90 },
    ],
    dependente: 304.89,
  },
  {
    vendedor: 'LIS',
    ano: 2026,
    tipoPlano: 'NOSSO PLANO (COM OBSTETRICIA)',
    titular: [
      { faixa: '14 a 29 anos', enfermaria: 367.45, apartamento: 532.84 },
      { faixa: '30 a 49 anos', enfermaria: 425.31, apartamento: 595.44 },
      { faixa: '50 a 59 anos', enfermaria: 679.75, apartamento: 883.03 },
      { faixa: '60 anos ou mais', enfermaria: 814.67, apartamento: 999.98 },
    ],
    dependente: 318.99,
  },
];

export const getPlanoByCodigo = (codigo: string): Plano | undefined =>
  planos.find(p => p.codigo === codigo);

export const getPlanosByCategoria = (categoria: string): Plano[] =>
  planos.filter(p => p.categoria === categoria);
