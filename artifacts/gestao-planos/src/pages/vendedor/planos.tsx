import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { planos, tabelasPlanos } from "@/data/planos";
import { formatMoney } from "@/lib/format";
import type { TabelaPlano, TabelaPlanoFaixaEtaria } from "@/data/types";
import { ChevronDown, ChevronUp, ClipboardList, Shield } from "lucide-react";

const categoriaCor: Record<string, string> = {
  'NOSSO PLANO': 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/20',
  'MIX': 'border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/20',
  'PLENO': 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/20',
};

const categoriaDesc: Record<string, string> = {
  'NOSSO PLANO': 'Plano básico da rede própria Hapvida. Ideal para quem busca cobertura completa com menor custo.',
  'MIX': 'Combina rede própria e credenciada. Mais opções de atendimento.',
  'PLENO': 'Cobertura máxima com apartamento e rede ampla. Para quem quer o melhor.',
};

export default function VendedorPlanos() {
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>('NOSSO PLANO');
  const [tabelasVisiveis, setTabelasVisiveis] = useState(false);

  const categorias = ['NOSSO PLANO', 'MIX', 'PLENO'];

  const renderTabelaFaixa = (tabela: TabelaPlano, index: number) => (
    <Card key={index} className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3 border-b">
        <CardTitle className="text-sm font-semibold text-foreground">
          {tabela.vendedor} — {tabela.tipoPlano}
          <span className="ml-2 text-xs text-muted-foreground font-normal">({tabela.ano})</span>
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20">
            <TableHead className="text-xs">Faixa Etária</TableHead>
            <TableHead className="text-right text-xs">Enfermaria</TableHead>
            <TableHead className="text-right text-xs">Apartamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabela.titular.map((item: TabelaPlanoFaixaEtaria, i: number) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">{item.faixa}</TableCell>
              <TableCell className="text-right text-sm">{formatMoney(item.enfermaria)}</TableCell>
              <TableCell className="text-right text-sm">{formatMoney(item.apartamento)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/30 font-semibold">
            <TableCell className="text-sm">Dependente (Fixo)</TableCell>
            <TableCell className="text-right text-sm" colSpan={2}>{formatMoney(tabela.dependente)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Tabela de Planos</h2>
        <p className="text-muted-foreground">Consulte os planos disponíveis para oferecer aos seus clientes.</p>
      </div>

      {/* KPIs rápidos */}
      <div className="grid gap-4 sm:grid-cols-3">
        {categorias.map(cat => {
          const count = planos.filter(p => p.categoria === cat).length;
          const menorPreco = Math.min(...planos.filter(p => p.categoria === cat).map(p => p.valorTitular));
          return (
            <Card key={cat} className="border shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className={`text-xs ${categoriaCor[cat]}`}>{cat}</Badge>
                  <span className="text-xs text-muted-foreground">{count} planos</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">A partir de</p>
                <p className="text-xl font-bold text-foreground">{formatMoney(menorPreco)}</p>
                <p className="text-xs text-muted-foreground">/ mês (titular)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Planos por categoria */}
      <div className="space-y-3">
        {categorias.map(cat => {
          const planosCateg = planos.filter(p => p.categoria === cat);
          const aberto = categoriaAberta === cat;
          return (
            <Card key={cat} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setCategoriaAberta(aberto ? null : cat)}
                data-testid={`btn-categoria-${cat.replace(' ', '-').toLowerCase()}`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{cat}</span>
                      <Badge variant="outline" className={`text-xs ${categoriaCor[cat]}`}>
                        {planosCateg.length} opções
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{categoriaDesc[cat]}</p>
                  </div>
                </div>
                {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {aberto && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Código</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Acomodação</TableHead>
                        <TableHead className="text-right">Vr. Titular</TableHead>
                        <TableHead className="text-right">Vr. Depend.</TableHead>
                        <TableHead>Coberturas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planosCateg.map(plano => (
                        <TableRow key={plano.id} data-testid={`row-vendedor-plano-${plano.codigo}`} className="hover:bg-muted/20">
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs bg-muted/50">{plano.codigo}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{plano.tipo}</TableCell>
                          <TableCell className="text-sm">{plano.acomodacao}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-primary">
                            {formatMoney(plano.valorTitular)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatMoney(plano.valorDependente)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {plano.coberturas?.map(c => (
                                <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tabelas por faixa etária */}
      <div className="space-y-3 pt-2">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          onClick={() => setTabelasVisiveis(v => !v)}
          data-testid="btn-toggle-tabelas-faixa"
        >
          <ClipboardList className="h-4 w-4" />
          {tabelasVisiveis ? 'Ocultar' : 'Ver'} Tabelas por Faixa Etária
          {tabelasVisiveis ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {tabelasVisiveis && (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {tabelasPlanos.map((tabela, idx) => renderTabelaFaixa(tabela, idx))}
          </div>
        )}
      </div>
    </div>
  );
}
