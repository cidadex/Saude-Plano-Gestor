import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, vendedoresTable, gerentesTable, planosTable, tabelasPrecoTable, tabelasPrecoFaixasTable, clientesTable, propostasTable, boletosTable, comissoesTable, contratosTable, responsaveisFinanceirosTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const vendedorNomeParaId: Record<string, string> = {
  WLADSON: "v1", CAROL: "v2", LUCAS: "v3", NICOLLY: "v4",
  CLEBIA: "v5", F2: "v6", ADRIANA: "v7", LIS: "v8",
  ALISSON: "v9", AIRTON: "v10", ALDEIZA: "v7", ADRIELE: "v2",
};

function toVendedorId(nome: string): string {
  return vendedorNomeParaId[nome.toUpperCase()] ?? "v1";
}

router.post("/seed", async (_req, res) => {
  try {
    const hash = await bcrypt.hash("123456", 10);

    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM comunicacoes`);
      await tx.execute(sql`DELETE FROM comissoes`);
      await tx.execute(sql`DELETE FROM boletos`);
      await tx.execute(sql`DELETE FROM propostas`);
      await tx.execute(sql`DELETE FROM dependentes`);
      await tx.execute(sql`DELETE FROM clientes`);
      await tx.execute(sql`DELETE FROM responsaveis_financeiros`);
      await tx.execute(sql`DELETE FROM contratos`);
      await tx.execute(sql`DELETE FROM tabelas_preco_faixas`);
      await tx.execute(sql`DELETE FROM tabelas_preco`);
      await tx.execute(sql`DELETE FROM gerentes`);
      await tx.execute(sql`DELETE FROM vendedores`);
      await tx.execute(sql`DELETE FROM planos`);
      await tx.execute(sql`DELETE FROM users`);

      // Admin
      await tx.insert(usersTable).values({
        id: "user-admin", email: "admin@teste.com",
        passwordHash: hash, role: "admin", nome: "Administrador Geral", active: true,
      });

      // Vendedores
      const vendedoresData = [
        { id: "v1", nome: "WLADSON", email: "wladson@teste.com", telefone: "(85) 99900-0001", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v2", nome: "CAROL", email: "carol@teste.com", telefone: "(85) 99900-0002", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v3", nome: "LUCAS", email: "lucas@teste.com", telefone: "(85) 99900-0003", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v4", nome: "NICOLLY", email: "nicolly@teste.com", telefone: "(85) 99900-0004", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v5", nome: "CLEBIA", email: "clebia@teste.com", telefone: "(85) 99900-0005", comissionado: true, tipoComissao: "SERVICO" as const },
        { id: "v6", nome: "F2", email: "f2@teste.com", telefone: "(85) 99900-0006", comissionado: false, tipoComissao: null },
        { id: "v7", nome: "ADRIANA", email: "adriana@teste.com", telefone: "(85) 99900-0007", comissionado: true, tipoComissao: "VENDA" as const },
        { id: "v8", nome: "LIS", email: "lis@teste.com", telefone: "(85) 99900-0008", comissionado: true, tipoComissao: "AMBOS" as const },
        { id: "v9", nome: "ALISSON", email: "alisson@teste.com", telefone: "(85) 99900-0009", comissionado: false, tipoComissao: null },
        { id: "v10", nome: "AIRTON", email: "airton@teste.com", telefone: "(85) 99900-0010", comissionado: false, tipoComissao: null },
      ];

      for (const v of vendedoresData) {
        await tx.insert(usersTable).values({
          id: `user-${v.id}`, email: v.email, passwordHash: hash,
          role: "vendedor", nome: v.nome, active: true,
        });
        await tx.insert(vendedoresTable).values({
          id: v.id, userId: `user-${v.id}`, nome: v.nome,
          email: v.email, telefone: v.telefone ?? null,
          comissionado: v.comissionado, tipoComissao: v.tipoComissao,
        });
      }

      // Gerentes
      const gerentesData = [
        {
          id: "g1", nome: "MARCOS GERENTE", email: "marcos@teste.com", telefone: "(85) 99800-0101",
          permissoes: ["ver_dashboard", "ver_clientes", "ver_financeiro", "ver_comissoes", "ver_relatorios", "ver_equipe", "ver_propostas", "ver_cobranca"],
        },
        {
          id: "g2", nome: "SILVIA GERENTE", email: "silvia@teste.com", telefone: "(85) 99800-0102",
          permissoes: ["ver_dashboard", "ver_clientes", "ver_propostas"],
        },
      ];
      for (const g of gerentesData) {
        await tx.insert(usersTable).values({
          id: `user-${g.id}`, email: g.email, passwordHash: hash,
          role: "gerente", nome: g.nome, active: true,
        });
        await tx.insert(gerentesTable).values({
          id: g.id, userId: `user-${g.id}`, nome: g.nome,
          email: g.email, telefone: g.telefone, permissoes: g.permissoes,
        });
      }

      // Planos — todos os 12 com preços reais
      const planosData = [
        { id: "p1",  codigo: "5254", nome: "AMBUL+HOSP. S/PARTO ENFERMARIA",     tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "NOSSO PLANO", acomodacao: "ENFERMARIA",  valorTitular: "143.12", valorDependente: "143.12", coberturas: "Ambulatorial,Hospitalar sem parto,Rede própria",                                ativo: true },
        { id: "p2",  codigo: "5285", nome: "AMBUL+HOSP. S/PARTO APARTAMENTO",    tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "NOSSO PLANO", acomodacao: "APARTAMENTO", valorTitular: "207.53", valorDependente: "207.53", coberturas: "Ambulatorial,Hospitalar sem parto,Apartamento,Rede própria",                      ativo: true },
        { id: "p3",  codigo: "5252", nome: "AMBUL+HOSP. C/PARTO ENFERMARIA",     tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "NOSSO PLANO", acomodacao: "ENFERMARIA",  valorTitular: "153.92", valorDependente: "153.92", coberturas: "Ambulatorial,Hospitalar com parto,Rede própria",                                ativo: true },
        { id: "p4",  codigo: "9714", nome: "AMBUL+HOSP. C/PARTO APARTAMENTO",    tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "NOSSO PLANO", acomodacao: "APARTAMENTO", valorTitular: "223.20", valorDependente: "223.20", coberturas: "Ambulatorial,Hospitalar com parto,Apartamento,Rede própria",                      ativo: true },
        { id: "p5",  codigo: "5403", nome: "AMBUL+HOSP. S/PARTO ENFERMARIA MIX", tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "MIX",         acomodacao: "ENFERMARIA",  valorTitular: "186.07", valorDependente: "186.07", coberturas: "Ambulatorial,Hospitalar sem parto,Rede própria + credenciada",                  ativo: true },
        { id: "p6",  codigo: "5404", nome: "AMBUL+HOSP. S/PARTO APARTAMENTO MIX",tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "MIX",         acomodacao: "APARTAMENTO", valorTitular: "269.81", valorDependente: "269.81", coberturas: "Ambulatorial,Hospitalar sem parto,Apartamento,Rede própria + credenciada",          ativo: true },
        { id: "p7",  codigo: "5123", nome: "AMBUL+HOSP. C/PARTO ENFERMARIA MIX", tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "MIX",         acomodacao: "ENFERMARIA",  valorTitular: "200.10", valorDependente: "200.10", coberturas: "Ambulatorial,Hospitalar com parto,Rede própria + credenciada",                  ativo: true },
        { id: "p8",  codigo: "9717", nome: "AMBUL+HOSP. C/PARTO APARTAMENTO MIX",tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "MIX",         acomodacao: "APARTAMENTO", valorTitular: "290.18", valorDependente: "290.18", coberturas: "Ambulatorial,Hospitalar com parto,Apartamento,Rede própria + credenciada",          ativo: true },
        { id: "p9",  codigo: "5397", nome: "AMBUL+HOSP. S/PARTO ENFERMARIA PLENO",tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "PLENO",       acomodacao: "ENFERMARIA",  valorTitular: "286.27", valorDependente: "286.27", coberturas: "Ambulatorial,Hospitalar sem parto,Cobertura plena",                             ativo: true },
        { id: "p10", codigo: "5402", nome: "AMBUL+HOSP. S/PARTO APARTAMENTO PLENO",tipo: "AMBULATORIAL_HOSPITALAR" as const,operadora: "Hapvida", categoria: "PLENO",       acomodacao: "APARTAMENTO", valorTitular: "415.04", valorDependente: "415.04", coberturas: "Ambulatorial,Hospitalar sem parto,Apartamento,Cobertura plena",                  ativo: true },
        { id: "p11", codigo: "5127", nome: "AMBUL+HOSP. C/PARTO ENFERMARIA PLENO",tipo: "AMBULATORIAL_HOSPITALAR" as const, operadora: "Hapvida", categoria: "PLENO",       acomodacao: "ENFERMARIA",  valorTitular: "307.85", valorDependente: "307.85", coberturas: "Ambulatorial,Hospitalar com parto,Cobertura plena",                             ativo: true },
        { id: "p12", codigo: "5283", nome: "AMBUL+HOSP. C/PARTO APARTAMENTO PLENO",tipo: "AMBULATORIAL_HOSPITALAR" as const,operadora: "Hapvida", categoria: "PLENO",       acomodacao: "APARTAMENTO", valorTitular: "446.39", valorDependente: "446.39", coberturas: "Ambulatorial,Hospitalar com parto,Apartamento,Cobertura plena",                  ativo: true },
      ];
      for (const p of planosData) await tx.insert(planosTable).values(p);

      // Tabelas de preço por faixa etária — por vendedor
      const tabelaCarolId = "tab-carol-np";
      const tabelaLisId1  = "tab-lis-np-sem";
      const tabelaLisId2  = "tab-lis-np-com";

      await tx.insert(tabelasPrecoTable).values([
        { id: tabelaCarolId, vendedorId: "v2", nome: "CAROL — NOSSO PLANO",              tipoPlano: "NOSSO PLANO",                   ano: 2026 },
        { id: tabelaLisId1,  vendedorId: "v8", nome: "LIS — NOSSO PLANO SEM OBSTETRÍCIA", tipoPlano: "NOSSO PLANO (SEM OBSTETRÍCIA)", ano: 2026 },
        { id: tabelaLisId2,  vendedorId: "v8", nome: "LIS — NOSSO PLANO COM OBSTETRÍCIA", tipoPlano: "NOSSO PLANO (COM OBSTETRÍCIA)", ano: 2026 },
      ]);

      const faixasCarol = [
        { id: "fc1", tabelaId: tabelaCarolId, planoId: "p1", faixaEtaria: "Até 29 anos",      valor: "302.40", valorApartamento: "423.36" },
        { id: "fc2", tabelaId: tabelaCarolId, planoId: "p1", faixaEtaria: "30 a 39 anos",     valor: "341.29", valorApartamento: "477.81" },
        { id: "fc3", tabelaId: tabelaCarolId, planoId: "p1", faixaEtaria: "40 a 49 anos",     valor: "385.28", valorApartamento: "539.39" },
        { id: "fc4", tabelaId: tabelaCarolId, planoId: "p1", faixaEtaria: "50 anos ou mais",  valor: "600.00", valorApartamento: "780.00" },
        { id: "fc5", tabelaId: tabelaCarolId, planoId: "p3", faixaEtaria: "DEPENDENTE (fixo)", valor: "260.00", valorApartamento: null },
      ];
      const faixasLisSem = [
        { id: "fl1", tabelaId: tabelaLisId1, planoId: "p1", faixaEtaria: "14 a 29 anos",     valor: "341.67", valorApartamento: "478.35" },
        { id: "fl2", tabelaId: tabelaLisId1, planoId: "p1", faixaEtaria: "30 a 49 anos",     valor: "406.52", valorApartamento: "569.13" },
        { id: "fl3", tabelaId: tabelaLisId1, planoId: "p1", faixaEtaria: "50 a 59 anos",     valor: "626.67", valorApartamento: "814.08" },
        { id: "fl4", tabelaId: tabelaLisId1, planoId: "p1", faixaEtaria: "60 anos ou mais",  valor: "750.90", valorApartamento: "917.90" },
        { id: "fl5", tabelaId: tabelaLisId1, planoId: "p3", faixaEtaria: "DEPENDENTE (fixo)", valor: "304.89", valorApartamento: null },
      ];
      const faixasLisCom = [
        { id: "flc1", tabelaId: tabelaLisId2, planoId: "p3", faixaEtaria: "14 a 29 anos",     valor: "367.45", valorApartamento: "532.84" },
        { id: "flc2", tabelaId: tabelaLisId2, planoId: "p3", faixaEtaria: "30 a 49 anos",     valor: "425.31", valorApartamento: "595.44" },
        { id: "flc3", tabelaId: tabelaLisId2, planoId: "p3", faixaEtaria: "50 a 59 anos",     valor: "679.75", valorApartamento: "883.03" },
        { id: "flc4", tabelaId: tabelaLisId2, planoId: "p3", faixaEtaria: "60 anos ou mais",  valor: "814.67", valorApartamento: "999.98" },
        { id: "flc5", tabelaId: tabelaLisId2, planoId: "p3", faixaEtaria: "DEPENDENTE (fixo)", valor: "318.99", valorApartamento: null },
      ];
      for (const f of [...faixasCarol, ...faixasLisSem, ...faixasLisCom]) {
        await tx.insert(tabelasPrecoFaixasTable).values(f);
      }

      // Contratos — agrupam beneficiários e cada um carrega sua chave Asaas
      await tx.insert(contratosTable).values([
        {
          id: "ctr-padrao",
          nome: "Contrato Padrão",
          descricao: "Contrato geral para beneficiários individuais (PF). Pré-cadastre a chave Asaas para emitir boletos.",
          asaasApiKey: null,
          asaasModo: "SANDBOX",
          ativo: true,
        },
        {
          id: "ctr-corp-acme",
          nome: "Contrato Corporativo — ACME LTDA",
          descricao: "Contrato pessoa jurídica de exemplo. ACME paga pelos beneficiários atrelados.",
          asaasApiKey: null,
          asaasModo: "SANDBOX",
          ativo: true,
        },
      ]);

      // Responsável Financeiro PJ de exemplo (com login)
      const respPjUserId = "user-resp-acme";
      await tx.insert(usersTable).values({
        id: respPjUserId,
        email: "financeiro@acme.com.br",
        passwordHash: hash,
        role: "responsavel",
        nome: "ACME LTDA",
        active: true,
      });
      await tx.insert(responsaveisFinanceirosTable).values({
        id: "resp-acme",
        userId: respPjUserId,
        tipo: "PJ",
        nome: "ACME LTDA",
        cpfCnpj: "12345678000199",
        email: "financeiro@acme.com.br",
        telefone: "(85) 3000-0000",
        cep: "60000-000",
        logradouro: "Av. Empresarial",
        numero: "1000",
        bairro: "Centro",
        cidade: "Fortaleza",
        estado: "CE",
        observacao: "Responsável financeiro de exemplo (PJ) — paga por funcionários cadastrados sob este responsável.",
      });

      // Clientes
      const clientesData = [
        { id: "c1", vendedorId: "v2", nome: "ABNER SOUSA LIMA", cpf: "722.987.331-2", sexo: "M" as const, dataNascimento: "1997-06-30", telefone: "(85) 98679-6239", email: "abner.lima@gmail.com", cep: "60822-140", logradouro: "RUA DAS ACÁCIAS", numero: "45", bairro: "CAMBEBA", cidade: "FORTALEZA", estado: "CE", matricula: "00218900619010", valorMensal: "275.86", dataAtivacao: "2025-03-26", codigo: "0DMQW", tipo: "TITULAR", representante: "CAROL", formaPagamento: "BOLETO", diaVencimento: 10, vrPl: "143.12", saldo: "132.74", valor2026: "275.86", comissao: "0", planoCode: "5254", codigoPlano: "0DMQW000189006", status: "ATIVO" as const, observacao: "" },
        { id: "c2", vendedorId: "v5", nome: "ADAUTO RODRIGUES DE AGUIAR", cpf: "952.946.603-00", sexo: "M" as const, dataNascimento: "1981-09-15", telefone: "(85) 99729-7661", cep: "60414-370", logradouro: "AV. JOSE LEON", numero: "190", bairro: "PARQUE MANIBURA", cidade: "FORTALEZA", estado: "CE", matricula: "00333900819010", valorMensal: "252.19", dataAtivacao: "2025-11-01", codigo: "0DMQW", tipo: "TITULAR", representante: "", formaPagamento: "BOLETO", diaVencimento: 10, vrPl: "143.12", saldo: "109.07", valor2026: "252.19", comissao: "0", planoCode: "5254", codigoPlano: "0DMQW000339008", status: "ATIVO" as const, observacao: "" },
        { id: "c3", vendedorId: "v1", nome: "ADELAINE BERNARDO LEAL", cpf: "919.501.206", sexo: "F" as const, dataNascimento: "1990-04-22", telefone: "(85) 99722-8285", email: "adelaine.leal@hotmail.com", cep: "61600-000", logradouro: "RUA GRILO", numero: "12", bairro: "GRILO", cidade: "CAUCAIA", estado: "CE", matricula: "00393200219010", valorMensal: "268.75", dataAtivacao: "2026-01-14", codigo: "0DMQW", tipo: "TITULAR", representante: "", formaPagamento: "CORA", diaVencimento: 15, vrPl: "153.92", saldo: "84.83", valor2026: "268.75", comissao: "30", planoCode: "5252", codigoPlano: "0DMQW000393002", status: "ATIVO" as const, observacao: "" },
        { id: "c4", vendedorId: "v7", nome: "ADRIANA DA SILVA ALCANTARA", cpf: "424.346.023-04", sexo: "F" as const, dataNascimento: "1974-05-16", telefone: "(85) 98670-0625", email: "adriana.alcantara@gmail.com", cep: "61900-000", logradouro: "RUA PIAUI", numero: "35", bairro: "JEREISSATI I", cidade: "MARACANAU", estado: "CE", matricula: "00334600619010", valorMensal: "404.48", dataAtivacao: "2025-09-19", codigo: "0H4C9", tipo: "TITULAR", representante: "LUCAS", formaPagamento: "BOLETO", diaVencimento: 5, vrPl: "143.12", saldo: "231.36", valor2026: "404.48", comissao: "30", planoCode: "5254", codigoPlano: "0H4C9000334006", status: "ATIVO" as const, observacao: "" },
        { id: "c5", vendedorId: "v1", nome: "ADRIANA DE CASTRO CAMPOS", cpf: "425.827.503-44", sexo: "F" as const, dataNascimento: "1971-12-12", telefone: "(85) 99654-4111", cep: "60135-140", logradouro: "RUA JOSE VILAR", numero: "820", bairro: "DIONISIO TORRES", cidade: "FORTALEZA", estado: "CE", matricula: "00001500819010", valorMensal: "251.94", dataAtivacao: "2024-04-02", codigo: "0H4C9", tipo: "TITULAR", representante: "", formaPagamento: "CORA", diaVencimento: 15, vrPl: "143.12", saldo: "78.81", valor2026: "251.94", comissao: "30", planoCode: "5254", codigoPlano: "0H4C9000015008", status: "ATIVO" as const, observacao: "REAJUSTAR 55" },
        { id: "c6", vendedorId: "v7", nome: "ADRIANA DE OLIVEIRA FREITAS", cpf: "785.523.463-03", sexo: "F" as const, dataNascimento: "1984-03-21", telefone: "(85) 99800-5781", email: "adriana.freitas@yahoo.com.br", cep: "62940-000", logradouro: "R DR JOSE MOURA", numero: "200", bairro: "CENTRO", cidade: "CASCAVEL", estado: "CE", matricula: "00279500519010", valorMensal: "341.28", dataAtivacao: "2025-07-05", codigo: "0H4C9", tipo: "TITULAR", representante: "CAROL", formaPagamento: "BOLETO", diaVencimento: 10, vrPl: "143.12", saldo: "198.16", valor2026: "341.28", comissao: "0", planoCode: "5254", codigoPlano: "0H4C9000279005", status: "ATIVO" as const, observacao: "" },
        { id: "c7", vendedorId: "v7", nome: "ARTHUR DE OLIVEIRA LOPES", cpf: "785.523.463-03-dep", sexo: "M" as const, dataNascimento: "2019-04-14", telefone: "(85) 99800-5781", bairro: "CENTRO", cidade: "CASCAVEL", estado: "CE", matricula: "00279501319010", valorMensal: "275.84", dataAtivacao: "2025-07-05", codigo: "0H4C9", tipo: "DEPENDENTE", representante: "CAROL", formaPagamento: "BOLETO", diaVencimento: 10, vrPl: "143.12", saldo: "132.72", valor2026: "275.84", comissao: "0", planoCode: "5254", codigoPlano: "0H4C9000279013", status: "ATIVO" as const, observacao: "" },
        { id: "c8", vendedorId: "v4", nome: "ADRIELLY KETLEN BARBOSA PEREIRA", cpf: "631.007.453-96", sexo: "F" as const, dataNascimento: "2006-02-13", telefone: "(85) 99609-4618", cep: "61600-000", logradouro: "RUA DO SOL", numero: "88", bairro: "TOCO (JUREMA)", cidade: "CAUCAIA", estado: "CE", matricula: "00500000319010", valorMensal: "268.75", dataAtivacao: "2026-02-26", codigo: "0H4C9", tipo: "TITULAR", representante: "", formaPagamento: "C6", diaVencimento: 10, vrPl: "153.92", saldo: "104.83", valor2026: "268.75", comissao: "10", planoCode: "5252", codigoPlano: "0H4C9000500003", status: "ATIVO" as const, observacao: "" },
        { id: "c9", vendedorId: "v1", nome: "AHMAD SAID ILAYAN HAMAWI", cpf: "483.665.870-53", sexo: "M" as const, dataNascimento: "1967-05-02", telefone: "(85) 99689-1304", email: "ahmad.hamawi@gmail.com", cep: "60165-050", logradouro: "AV BEIRA MAR", numero: "3310", bairro: "MEIRELES", cidade: "FORTALEZA", estado: "CE", matricula: "10054000319010", valorMensal: "404.52", dataAtivacao: "2025-07-08", codigo: "10AAJ", tipo: "TITULAR", representante: "", formaPagamento: "CORA", diaVencimento: 15, vrPl: "143.12", saldo: "211.40", valor2026: "404.52", comissao: "50", planoCode: "5254", codigoPlano: "10AAJ000054003", status: "ATIVO" as const, observacao: "" },
        { id: "c10", vendedorId: "v10", nome: "AIRTON AGUIAR HOLANDA NETO", cpf: "882.408.273-49", sexo: "M" as const, dataNascimento: "1981-10-11", telefone: "(85) 99970-1301", cep: "60040-531", logradouro: "RUA SENADOR POMPEU", numero: "750", bairro: "FATIMA", cidade: "FORTALEZA", estado: "CE", matricula: "00463000019010", valorMensal: "252.19", dataAtivacao: "2026-02-01", codigo: "10AAJ", tipo: "TITULAR", representante: "", formaPagamento: "BTG", diaVencimento: 15, vrPl: "143.12", saldo: "89.07", valor2026: "252.19", comissao: "20", planoCode: "5254", codigoPlano: "0H4C9000463000", status: "ATIVO" as const, observacao: "" },
        { id: "c11", vendedorId: "v2", nome: "ADRIELE RODRIGUES LOPES", cpf: "295.649.437-6", sexo: "F" as const, dataNascimento: "1987-12-03", telefone: "(85) 98212-0646", cep: "60045-085", logradouro: "AV. DOM LUIS", numero: "500", bairro: "FARIAS BRITO", cidade: "FORTALEZA", estado: "CE", matricula: "00295000019010", valorMensal: "341.28", dataAtivacao: "2025-08-05", codigo: "0H4C9", tipo: "TITULAR", representante: "CAROL", formaPagamento: "BOLETO", diaVencimento: 10, vrPl: "143.12", saldo: "198.16", valor2026: "341.28", comissao: "0", planoCode: "5254", codigoPlano: "0H4C9000295000", status: "ATIVO" as const, observacao: "" },
        { id: "c12", vendedorId: "v7", nome: "ALDEIZA BARBOZA BARROS", cpf: "547.463.613-04", sexo: "F" as const, dataNascimento: "1968-04-28", telefone: "(85) 98754-6607", cep: "60540-540", logradouro: "RUA DOUTOR GILBERTO STUDART", numero: "880", bairro: "CONJUNTO CEARA I", cidade: "FORTALEZA", estado: "CE", matricula: "00387200219010", valorMensal: "404.48", dataAtivacao: "2025-11-18", codigo: "0H4C9", tipo: "TITULAR", representante: "", formaPagamento: "BOLETO", diaVencimento: 20, vrPl: "143.12", saldo: "261.36", valor2026: "404.48", comissao: "0", planoCode: "5254", codigoPlano: "0H4C9000387002", status: "ATIVO" as const, observacao: "PARCELADO 12/2025 em 5 vezes" },
        { id: "c13", vendedorId: "v4", nome: "ALDENISA MACIEL DE LIMA ALBUQUERQUE", cpf: "473.247.083-15", sexo: "F" as const, dataNascimento: "1973-03-23", telefone: "(85) 99601-6320", email: "aldenisa.maciel@gmail.com", cep: "60870-480", logradouro: "RUA PEDRAS", numero: "55", bairro: "PEDRAS", cidade: "FORTALEZA", estado: "CE", matricula: "00484000819010", valorMensal: "404.48", dataAtivacao: "2026-02-16", codigo: "0H4C9", tipo: "TITULAR", representante: "", formaPagamento: "C6", diaVencimento: 10, vrPl: "153.92", saldo: "240.56", valor2026: "404.48", comissao: "10", planoCode: "5252", codigoPlano: "0H4C9000484008", status: "ATIVO" as const, observacao: "" },
      ];
      // Beneficiários atrelados ao Contrato Corporativo + Responsável PJ ACME
      const corporativosClienteIds = new Set(["c4", "c8"]);

      // Pré-cria 1 responsável (PF, próprio beneficiário) para cada cliente — exceto os que vão pro responsável PJ
      const responsaveisInsert: Array<typeof responsaveisFinanceirosTable.$inferInsert> = [];
      const clienteResp: Record<string, string> = {};
      for (const c of clientesData) {
        if (corporativosClienteIds.has(c.id)) {
          clienteResp[c.id] = "resp-acme";
          continue;
        }
        const docDigits = c.cpf.replace(/\D/g, "");
        const respId = `resp-${c.id}`;
        clienteResp[c.id] = respId;
        responsaveisInsert.push({
          id: respId,
          userId: null,
          tipo: "PF",
          nome: c.nome,
          cpfCnpj: docDigits || `${c.id}-doc`,
          email: c.email ?? null,
          telefone: c.telefone ?? null,
          cep: c.cep ?? null,
          logradouro: c.logradouro ?? null,
          numero: c.numero ?? null,
          bairro: c.bairro ?? null,
          cidade: c.cidade ?? null,
          estado: c.estado ?? null,
          observacao: "Responsável criado automaticamente — beneficiário paga o próprio plano.",
        });
      }
      // Deduplica por cpfCnpj para evitar conflito de unicidade
      const seen = new Set<string>();
      const respDedup = responsaveisInsert.filter(r => {
        if (seen.has(r.cpfCnpj!)) return false;
        seen.add(r.cpfCnpj!);
        return true;
      });
      for (const r of respDedup) await tx.insert(responsaveisFinanceirosTable).values(r);
      // Re-aponta clientes cujo responsável foi removido por duplicidade
      const respIdsExistentes = new Set([...respDedup.map(r => r.id), "resp-acme"]);
      for (const cid of Object.keys(clienteResp)) {
        if (!respIdsExistentes.has(clienteResp[cid])) clienteResp[cid] = "resp-acme";
      }

      for (const c of clientesData) {
        const isCorporativo = corporativosClienteIds.has(c.id);
        await tx.insert(clientesTable).values({
          ...c,
          contratoId: isCorporativo ? "ctr-corp-acme" : "ctr-padrao",
          responsavelFinanceiroId: clienteResp[c.id],
        });
      }

      // Propostas
      const propostasData = [
        { id: "prop1", vendedorId: "v1", status: "ATIVA" as const, dadosTitular: { nome: "ADELAINE BERNARDO LEAL", cpf: "919.501.206", telefone: "(85) 99722-8285", plano: "AMBUL+HOSP. C/PARTO ENFERMARIA", codigoPlano: "5252", tipo: "TITULAR", valor: 268.75 }, dadosDependentes: [], valorTotal: "268.75", dataAtivacao: new Date("2026-01-14"), clienteId: "c3" },
        { id: "prop2", vendedorId: "v1", status: "ATIVA" as const, dadosTitular: { nome: "ADRIANA DE CASTRO CAMPOS", cpf: "425.827.503-44", telefone: "(85) 99654-4111", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 251.94 }, dadosDependentes: [], valorTotal: "251.94", dataAtivacao: new Date("2024-04-02"), clienteId: "c5" },
        { id: "prop3", vendedorId: "v1", status: "ATIVA" as const, dadosTitular: { nome: "AHMAD SAID ILAYAN HAMAWI", cpf: "483.665.870-53", telefone: "(85) 99689-1304", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 404.52 }, dadosDependentes: [], valorTotal: "404.52", dataAtivacao: new Date("2025-07-08"), clienteId: "c9" },
        { id: "prop5", vendedorId: "v2", status: "AGUARDANDO_ENVIO" as const, dadosTitular: { nome: "MARCOS ANTONIO DA SILVA FILHO", cpf: "362.073.430-5", telefone: "(85) 99876-5432", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 400.00 }, dadosDependentes: [], valorTotal: "400.00" },
        { id: "prop6", vendedorId: "v7", status: "ATIVA" as const, dadosTitular: { nome: "ADRIANA DA SILVA ALCANTARA", cpf: "424.346.023-04", telefone: "(85) 98670-0625", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 404.48 }, dadosDependentes: [], valorTotal: "404.48", dataAtivacao: new Date("2025-09-19"), clienteId: "c4" },
        { id: "prop7", vendedorId: "v1", status: "ENVIADA_OPERADORA" as const, dadosTitular: { nome: "DANIELA LOPES DA SILVA", cpf: "544.584.333-5", telefone: "(85) 99290-4936", plano: "AMBUL+HOSP. C/PARTO ENFERMARIA", codigoPlano: "5252", tipo: "TITULAR", valor: 248.84, observacao: "Enviado para operadora, aguardando retorno" }, dadosDependentes: [], valorTotal: "248.84", dataEnvioOperadora: new Date("2025-06-08") },
        { id: "prop8", vendedorId: "v10", status: "ATIVA" as const, dadosTitular: { nome: "AIRTON AGUIAR HOLANDA NETO", cpf: "882.408.273-49", telefone: "(85) 99970-1301", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 252.19 }, dadosDependentes: [], valorTotal: "252.19", dataAtivacao: new Date("2026-02-01"), clienteId: "c10" },
        { id: "prop9", vendedorId: "v1", status: "RECUSADA" as const, dadosTitular: { nome: "ANA PAULA ALMEIDA COSTA MONTEIRO", cpf: "103.696.040-4", telefone: "(85) 98779-1819", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 233.51, observacao: "CANCELADO" }, dadosDependentes: [], valorTotal: "233.51", motivoRecusa: "CANCELADO" },
        { id: "prop10", vendedorId: "v1", status: "ENVIADA_OPERADORA" as const, dadosTitular: { nome: "LAYSA CRISTINA ROCHA DUARTE", cpf: "952.788.330-0", telefone: "(85) 99215-8576", plano: "AMBUL+HOSP. C/PARTO ENFERMARIA", codigoPlano: "5252", tipo: "TITULAR", valor: 248.84, observacao: "Ficha enviada para Hapvida em 08/06/2025" }, dadosDependentes: [], valorTotal: "248.84", dataEnvioOperadora: new Date("2025-06-08") },
        { id: "prop11", vendedorId: "v2", status: "ATIVA" as const, dadosTitular: { nome: "ADRIELLE RODRIGUES LOPES", cpf: "295.649.437-6", telefone: "(85) 98212-0646", plano: "AMBUL+HOSP. S/PARTO ENFERMARIA", codigoPlano: "5254", tipo: "TITULAR", valor: 341.28 }, dadosDependentes: [], valorTotal: "341.28", dataAtivacao: new Date("2025-08-05"), clienteId: "c11" },
        { id: "prop12", vendedorId: "v4", status: "ATIVA" as const, dadosTitular: { nome: "ADRIELLY KETLEN BARBOSA PEREIRA", cpf: "631.007.453-96", telefone: "(85) 99609-4618", plano: "AMBUL+HOSP. C/PARTO ENFERMARIA", codigoPlano: "5252", tipo: "TITULAR", valor: 268.75 }, dadosDependentes: [], valorTotal: "268.75", dataAtivacao: new Date("2026-02-26"), clienteId: "c8" },
      ];
      for (const p of propostasData) {
        // Se a proposta tem clienteId, herda contrato/responsável dele; caso contrário usa padrão + ACME
        const clienteId = (p as { clienteId?: string }).clienteId;
        const ctr = clienteId && corporativosClienteIds.has(clienteId) ? "ctr-corp-acme" : "ctr-padrao";
        const rsp = clienteId && clienteResp[clienteId] ? clienteResp[clienteId] : "resp-acme";
        await tx.insert(propostasTable).values({
          ...p,
          contratoId: ctr,
          responsavelFinanceiroId: rsp,
        });
      }

      // Boletos
      const boletosData = [
        { id: "b1", clienteId: "c1", valor: "275.86", vencimento: "2026-04-10", status: "PENDENTE" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063957 8 93140000027586" },
        { id: "b2", clienteId: "c2", valor: "252.19", vencimento: "2026-04-10", status: "PENDENTE" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063958 9 93140000025219" },
        { id: "b3", clienteId: "c4", valor: "404.48", vencimento: "2026-04-05", status: "PAGO" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063959 0 93140000040448" },
        { id: "b4", clienteId: "c6", valor: "341.28", vencimento: "2026-04-10", status: "PAGO" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063960 1 93140000034128" },
        { id: "b5", clienteId: "c7", valor: "275.84", vencimento: "2026-04-10", status: "PENDENTE" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063961 2 93140000027584" },
        { id: "b6", clienteId: "c9", valor: "404.52", vencimento: "2026-04-15", status: "PENDENTE" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063962 3 93140000040452" },
        { id: "b7", clienteId: "c10", valor: "252.19", vencimento: "2026-04-15", status: "VENCIDO" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063963 4 93140000025219" },
        { id: "b8", clienteId: "c3", valor: "268.75", vencimento: "2026-04-15", status: "PAGO" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063964 5 93140000026875" },
        { id: "b9", clienteId: "c5", valor: "251.94", vencimento: "2026-04-15", status: "PENDENTE" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063965 6 93140000025194" },
        { id: "b10", clienteId: "c11", valor: "341.28", vencimento: "2026-04-10", status: "PAGO" as const, mesReferencia: "04/2026", codigoBarras: "23793.38128 60007.827136 95000.063966 7 93140000034128" },
        { id: "b11", clienteId: "c1", valor: "275.86", vencimento: "2026-03-10", status: "PAGO" as const, mesReferencia: "03/2026", codigoBarras: "23793.38128 60007.827136 95000.063901 0 93140000027586" },
        { id: "b12", clienteId: "c6", valor: "341.28", vencimento: "2026-03-10", status: "PAGO" as const, mesReferencia: "03/2026", codigoBarras: "23793.38128 60007.827136 95000.063902 1 93140000034128" },
      ];
      for (const b of boletosData) await tx.insert(boletosTable).values(b);

      // Comissões
      const comissoesData = [
        { id: "com1", vendedorId: "v1", clienteNome: "ADELAINE BERNARDO LEAL", tipo: "VENDA" as const, valor: "268.75", mesReferencia: "01/2026", status: "PAGO" as const, planoCode: "5252", dataVenda: "14/01/2026" },
        { id: "com2", vendedorId: "v1", clienteNome: "ADRIANA DE CASTRO CAMPOS", tipo: "SERVICO" as const, valor: "50.00", mesReferencia: "04/2026", status: "PENDENTE" as const, planoCode: "5254" },
        { id: "com3", vendedorId: "v1", clienteNome: "AHMAD SAID ILAYAN HAMAWI", tipo: "VENDA" as const, valor: "404.52", mesReferencia: "07/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "08/07/2025" },
        { id: "com4", vendedorId: "v1", clienteNome: "AHMAD SAID ILAYAN HAMAWI", tipo: "SERVICO" as const, valor: "50.00", mesReferencia: "04/2026", status: "PENDENTE" as const, planoCode: "5254" },
        { id: "com5", vendedorId: "v2", clienteNome: "ABNER SOUSA LIMA", tipo: "VENDA" as const, valor: "275.86", mesReferencia: "03/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "26/03/2025" },
        { id: "com6", vendedorId: "v2", clienteNome: "ADRIANA DE OLIVEIRA FREITAS", tipo: "VENDA" as const, valor: "341.28", mesReferencia: "07/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "05/07/2025" },
        { id: "com7", vendedorId: "v2", clienteNome: "ARTHUR DE OLIVEIRA LOPES", tipo: "VENDA" as const, valor: "275.84", mesReferencia: "07/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "05/07/2025" },
        { id: "com8", vendedorId: "v2", clienteNome: "ADRIELE RODRIGUES LOPES", tipo: "VENDA" as const, valor: "341.28", mesReferencia: "08/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "05/08/2025" },
        { id: "com9", vendedorId: "v3", clienteNome: "ADRIANA DA SILVA ALCANTARA", tipo: "VENDA" as const, valor: "404.48", mesReferencia: "09/2025", status: "PAGO" as const, planoCode: "5254", dataVenda: "19/09/2025" },
        { id: "com10", vendedorId: "v3", clienteNome: "ADRIANA DA SILVA ALCANTARA", tipo: "SERVICO" as const, valor: "30.00", mesReferencia: "04/2026", status: "PENDENTE" as const, planoCode: "5254" },
        { id: "com11", vendedorId: "v4", clienteNome: "ADRIELLY KETLEN BARBOSA PEREIRA", tipo: "VENDA" as const, valor: "268.75", mesReferencia: "02/2026", status: "PAGO" as const, planoCode: "5252", dataVenda: "26/02/2026" },
        { id: "com12", vendedorId: "v4", clienteNome: "ALDENISA MACIEL DE LIMA ALBUQUERQUE", tipo: "VENDA" as const, valor: "404.48", mesReferencia: "02/2026", status: "PAGO" as const, planoCode: "5252", dataVenda: "16/02/2026" },
        { id: "com13", vendedorId: "v1", clienteNome: "ADELAINE BERNARDO LEAL", tipo: "SERVICO" as const, valor: "30.00", mesReferencia: "03/2026", status: "PAGO" as const, planoCode: "5252" },
        { id: "com14", vendedorId: "v1", clienteNome: "ADRIANA DE CASTRO CAMPOS", tipo: "SERVICO" as const, valor: "30.00", mesReferencia: "03/2026", status: "PAGO" as const, planoCode: "5254" },
      ];
      for (const c of comissoesData) await tx.insert(comissoesTable).values(c);
    });

    res.json({ ok: true, message: "Banco populado com sucesso. Senha padrão: 123456" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
