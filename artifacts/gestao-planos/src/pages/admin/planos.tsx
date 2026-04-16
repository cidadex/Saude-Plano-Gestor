import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { planos, tabelasPlanos } from "@/data/planos";
import { formatMoney } from "@/lib/format";
import type { TabelaPlano, TabelaPlanoFaixaEtaria } from "@/data/types";

export default function AdminPlanos() {
  const renderTabelaIdade = (tabela: TabelaPlano, index: number) => (
    <Card key={index} className="mb-6 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="text-lg">
          Tabela Específica - {tabela.vendedor} {tabela.ano}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{tabela.tipoPlano}</p>
      </CardHeader>
      <div className="border-t border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faixa Etária</TableHead>
              <TableHead className="text-right">Enfermaria</TableHead>
              <TableHead className="text-right">Apartamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabela.titular.map((item: TabelaPlanoFaixaEtaria, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.faixa}</TableCell>
                <TableCell className="text-right">{formatMoney(item.enfermaria)}</TableCell>
                <TableCell className="text-right">{formatMoney(item.apartamento)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-semibold">
              <TableCell>Dependente (Fixo)</TableCell>
              <TableCell className="text-right" colSpan={2}>{formatMoney(tabela.dependente)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Tabela de Planos</h2>
        <p className="text-muted-foreground">Preços e coberturas do portfólio de saúde.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl">Planos Padrão</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Acomodação</TableHead>
                <TableHead className="text-right">Vr. Titular</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planos.map((plano) => (
                <TableRow key={plano.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono bg-muted/50">{plano.codigo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-md">{plano.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{plano.categoria}</Badge>
                  </TableCell>
                  <TableCell>{plano.acomodacao}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(plano.valorTitular)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="mt-8">
        <h3 className="text-xl font-bold tracking-tight mb-4">Tabelas por Faixa Etária</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          {tabelasPlanos.map((tabela, idx) => renderTabelaIdade(tabela, idx))}
        </div>
      </div>
    </div>
  );
}
