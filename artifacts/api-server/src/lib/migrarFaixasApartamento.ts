import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

/**
 * Each price row now maps to a single plan code (the code changes with the
 * accommodation). Legacy rows carried an extra "apartamento" price; this moves
 * that price to its own row using the matching APARTAMENTO plan code.
 * Idempotent: rows are cleared after being converted.
 */
export async function migrarFaixasApartamento(): Promise<number> {
  return db.transaction(async (tx) => {
    const res = await tx.execute(sql`
      select f.id, f.tabela_id, f.faixa_etaria, f.valor_apartamento, pa.id as plano_apto_id
      from tabelas_preco_faixas f
      join planos pe on pe.id = f.plano_id
      left join planos pa
        on pa.acomodacao = 'APARTAMENTO'
       and pa.categoria is not distinct from pe.categoria
       and pa.nome = replace(pe.nome, 'ENFERMARIA', 'APARTAMENTO')
      where f.valor_apartamento is not null
      for update of f
    `);
    const rows = res.rows as {
      id: string; tabela_id: string; faixa_etaria: string; valor_apartamento: string; plano_apto_id: string | null;
    }[];
    let convertidas = 0;
    for (const r of rows) {
      if (!r.plano_apto_id) continue; // keep legacy value until a plan match exists
      await tx.execute(sql`
        insert into tabelas_preco_faixas (id, tabela_id, plano_id, faixa_etaria, valor)
        values (${`fx-${randomUUID()}`}, ${r.tabela_id}, ${r.plano_apto_id}, ${r.faixa_etaria}, ${r.valor_apartamento})
      `);
      await tx.execute(sql`update tabelas_preco_faixas set valor_apartamento = null where id = ${r.id}`);
      convertidas++;
    }
    return convertidas;
  });
}
