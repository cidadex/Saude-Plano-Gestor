import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Shield } from "lucide-react";

type TabelaFaixa = {
  id: string;
  faixaEtaria: string;
  valor: string;
  valorApartamento: string | null;
};

type PlanoTabela = {
  id: string;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  acomodacao: string | null;
  faixas: TabelaFaixa[];
};

type TabelaInfo = {
  id: string;
  nome: string;
  tipoPlano: string | null;
  ano: number | null;
};

type ApiResponse = {
  tabela: TabelaInfo | null;
  planos: PlanoTabela[];
};

const categoriaCor: Record<string, string> = {
  "NOSSO PLANO": "border-blue-300 bg-blue-50 text-blue-700",
  "MIX": "border-teal-300 bg-teal-50 text-teal-700",
  "PLENO": "border-purple-300 bg-purple-50 text-purple-700",
};

export default function VendedorPlanos() {
  const [tabela, setTabela] = useState<TabelaInfo | null>(null);
  const [planos, setPlanos] = useState<PlanoTabela[]>([]);
  const [loading, setLoading] = useState(true);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const carregar = async () => {
      try {
        const data = await apiFetch<ApiResponse>("/vendedor/tabela-preco");
        setTabela(data.tabela);
        setPlanos(data.planos ?? []);
        // Open all plans by default
        if (data.planos?.length) {
          setAbertos(new Set(data.planos.map(p => p.id)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const toggle = (id: string) => {
    setAbertos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Tabela de Planos</h2>
        {tabela ? (
          <p className="text-muted-foreground">
            Tabela <strong>{tabela.nome}</strong>
            {tabela.ano ? ` · ${tabela.ano}` : ""}
            {tabela.tipoPlano ? ` · ${tabela.tipoPlano}` : ""}
          </p>
        ) : (
          <p className="text-muted-foreground">Valores dos planos que você pode oferecer aos seus clientes.</p>
        )}
      </div>

      {/* No table assigned */}
      {!tabela && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 py-5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Tabela de preços não vinculada</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Você ainda não possui uma tabela de preços associada. Solicite ao administrador que vincule uma tabela ao seu cadastro.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards by category */}
      {planos.length > 0 && (() => {
        const categorias = [...new Set(planos.map(p => p.categoria).filter(Boolean))] as string[];
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map(cat => {
              const planosCateg = planos.filter(p => p.categoria === cat);
              const menores = planosCateg.flatMap(p => p.faixas.map(f => Number(f.valor))).filter(v => v > 0);
              const menor = menores.length ? Math.min(...menores) : 0;
              return (
                <Card key={cat} className="border shadow-sm">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className={`text-xs ${categoriaCor[cat] ?? ""}`}>{cat}</Badge>
                      <span className="text-xs text-muted-foreground">{planosCateg.length} plano{planosCateg.length !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">A partir de</p>
                    <p className="text-xl font-bold text-foreground">{menor > 0 ? formatMoney(menor) : "—"}</p>
                    <p className="text-xs text-muted-foreground">/ mês (por faixa etária)</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* Plans list */}
      {planos.length === 0 && tabela && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            A tabela ainda não possui planos com preços cadastrados. Fale com o administrador.
          </CardContent>
        </Card>
      )}

      {planos.length > 0 && (
        <div className="space-y-3">
          {planos.map(plano => {
            const open = abertos.has(plano.id);
            return (
              <Card key={plano.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => toggle(plano.id)}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {plano.codigo && (
                          <Badge variant="outline" className="font-mono text-xs bg-muted/50">{plano.codigo}</Badge>
                        )}
                        <span className="font-bold text-foreground text-sm">{plano.nome}</span>
                        {plano.categoria && (
                          <Badge variant="outline" className={`text-xs ${categoriaCor[plano.categoria] ?? ""}`}>
                            {plano.categoria}
                          </Badge>
                        )}
                        {plano.acomodacao && (
                          <span className="text-xs text-muted-foreground">{plano.acomodacao}</span>
                        )}
                      </div>
                      {!open && plano.faixas.length > 0 && (() => {
                        const vals = plano.faixas.map(f => Number(f.valor)).filter(v => v > 0);
                        const min = vals.length ? Math.min(...vals) : 0;
                        const max = vals.length ? Math.max(...vals) : 0;
                        return (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {min > 0 ? `${formatMoney(min)}${max !== min ? ` – ${formatMoney(max)}` : ""} / mês` : ""}
                            {" · "}{plano.faixas.length} faixa{plano.faixas.length !== 1 ? "s" : ""}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  {open
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {open && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Faixa Etária</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plano.faixas.map(faixa => (
                          <TableRow key={faixa.id} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-sm">{faixa.faixaEtaria}</TableCell>
                            <TableCell className="text-right font-bold text-sm text-primary">
                              {formatMoney(Number(faixa.valor))}
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
      )}
    </div>
  );
}
