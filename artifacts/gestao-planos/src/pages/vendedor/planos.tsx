import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { ChevronDown, ChevronUp, ClipboardList, Shield, Loader2 } from "lucide-react";

type PlanoAPI = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string | null;
  acomodacao: string | null;
  valorTitular: string | null;
  valorDependente: string | null;
  coberturas: string | null;
  ativo: boolean;
};

type TabelaFaixa = {
  id: string;
  faixaEtaria: string;
  valor: string;
  valorApartamento: string | null;
};

type TabelaPreco = {
  id: string;
  nome: string;
  tipoPlano: string | null;
  ano: number | null;
  faixas: TabelaFaixa[];
};

const categoriaCor: Record<string, string> = {
  "NOSSO PLANO": "border-blue-300 bg-blue-50 text-blue-700",
  "MIX": "border-teal-300 bg-teal-50 text-teal-700",
  "PLENO": "border-purple-300 bg-purple-50 text-purple-700",
};

const categoriaDesc: Record<string, string> = {
  "NOSSO PLANO": "Plano básico da rede própria Hapvida. Ideal para quem busca cobertura completa com menor custo.",
  "MIX": "Combina rede própria e credenciada. Mais opções de atendimento.",
  "PLENO": "Cobertura máxima com apartamento e rede ampla. Para quem quer o melhor.",
};

const CATEGORIAS = ["NOSSO PLANO", "MIX", "PLENO"];

export default function VendedorPlanos() {
  const [planos, setPlanos] = useState<PlanoAPI[]>([]);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>("NOSSO PLANO");
  const [tabelasVisiveis, setTabelasVisiveis] = useState(false);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [dadosPlanos, dadosTabelas] = await Promise.all([
          apiFetch("/planos") as Promise<{ planos: PlanoAPI[] }>,
          apiFetch("/vendedor/tabela-preco") as Promise<{ tabelas: TabelaPreco[] }>,
        ]);
        setPlanos((dadosPlanos.planos ?? []).filter(p => p.ativo));
        setTabelas(dadosTabelas.tabelas ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Tabela de Planos</h2>
        <p className="text-muted-foreground">Consulte os planos disponíveis para oferecer aos seus clientes.</p>
      </div>

      {/* KPIs por categoria */}
      <div className="grid gap-4 sm:grid-cols-3">
        {CATEGORIAS.map(cat => {
          const planosCateg = planos.filter(p => p.categoria === cat);
          if (!planosCateg.length) return null;
          const menorPreco = Math.min(...planosCateg.map(p => parseFloat(p.valorTitular ?? "0")));
          return (
            <Card key={cat} className="border shadow-sm">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className={`text-xs ${categoriaCor[cat] ?? ""}`}>{cat}</Badge>
                  <span className="text-xs text-muted-foreground">{planosCateg.length} planos</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">A partir de</p>
                <p className="text-xl font-bold text-foreground">{formatMoney(menorPreco)}</p>
                <p className="text-xs text-muted-foreground">/ mês (titular)</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Planos por categoria — accordion */}
      <div className="space-y-3">
        {CATEGORIAS.map(cat => {
          const planosCateg = planos.filter(p => p.categoria === cat);
          if (!planosCateg.length) return null;
          const aberto = categoriaAberta === cat;
          return (
            <Card key={cat} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
                onClick={() => setCategoriaAberta(aberto ? null : cat)}
                data-testid={`btn-categoria-${cat.replace(/ /g, "-").toLowerCase()}`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{cat}</span>
                      <Badge variant="outline" className={`text-xs ${categoriaCor[cat] ?? ""}`}>
                        {planosCateg.length} opções
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{categoriaDesc[cat]}</p>
                  </div>
                </div>
                {aberto
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                }
              </button>

              {aberto && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
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
                            <Badge variant="outline" className="font-mono text-xs bg-muted/50">{plano.codigo ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{plano.nome}</TableCell>
                          <TableCell className="text-sm">{plano.acomodacao ?? "—"}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-primary">
                            {plano.valorTitular ? formatMoney(parseFloat(plano.valorTitular)) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {plano.valorDependente ? formatMoney(parseFloat(plano.valorDependente)) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {plano.coberturas?.split(",").map(c => (
                                <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">{c.trim()}</Badge>
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

      {/* Tabelas por faixa etária — se o vendedor tiver */}
      {tabelas.length > 0 && (
        <div className="space-y-3 pt-2">
          <button
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            onClick={() => setTabelasVisiveis(v => !v)}
            data-testid="btn-toggle-tabelas-faixa"
          >
            <ClipboardList className="h-4 w-4" />
            {tabelasVisiveis ? "Ocultar" : "Ver"} minha tabela de preços por faixa etária
            {tabelasVisiveis ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {tabelasVisiveis && (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {tabelas.map(tabela => (
                <Card key={tabela.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-3 border-b">
                    <CardTitle className="text-sm font-semibold">
                      {tabela.tipoPlano}
                      {tabela.ano && <span className="ml-2 text-xs text-muted-foreground font-normal">({tabela.ano})</span>}
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
                      {tabela.faixas.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{f.faixaEtaria}</TableCell>
                          <TableCell className="text-right text-sm">{formatMoney(parseFloat(f.valor))}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {f.valorApartamento ? formatMoney(parseFloat(f.valorApartamento)) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
