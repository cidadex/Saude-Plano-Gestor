import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Pencil, PauseCircle, PlayCircle, Check, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type PlanoAPI = {
  id: string;
  codigo: string | null;
  nome: string;
  tipo: string;
  categoria: string | null;
  acomodacao: string | null;
  valorTitular: string | null;
  valorDependente: string | null;
  coberturas: string | null;
  ativo: boolean;
  operadora: string;
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
  vendedorNome: string | null;
  faixas: TabelaFaixa[];
};

const categoriaCor: Record<string, string> = {
  "NOSSO PLANO": "border-blue-300 bg-blue-50 text-blue-700",
  "MIX": "border-teal-300 bg-teal-50 text-teal-700",
  "PLENO": "border-purple-300 bg-purple-50 text-purple-700",
};

const CATEGORIAS = ["NOSSO PLANO", "MIX", "PLENO"];

export default function AdminPlanos() {
  const [planos, setPlanos] = useState<PlanoAPI[]>([]);
  const [tabelas, setTabelas] = useState<TabelaPreco[]>([]);
  const [loading, setLoading] = useState(true);

  const [planoEditando, setPlanoEditando] = useState<PlanoAPI | null>(null);
  const [valorTitularEdit, setValorTitularEdit] = useState("");
  const [valorDependenteEdit, setValorDependenteEdit] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const [planoSuspendendo, setPlanoSuspendendo] = useState<PlanoAPI | null>(null);
  const [suspendendo, setSuspendendo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dadosPlanos, dadosTabelas] = await Promise.all([
        apiFetch("/admin/planos") as Promise<{ planos: PlanoAPI[] }>,
        apiFetch("/admin/tabelas-preco") as Promise<{ tabelas: TabelaPreco[] }>,
      ]);
      setPlanos(dadosPlanos.planos ?? []);
      setTabelas(dadosTabelas.tabelas ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAbrirEdicao = (plano: PlanoAPI) => {
    setPlanoEditando(plano);
    setValorTitularEdit((plano.valorTitular ?? "0").replace(".", ","));
    setValorDependenteEdit((plano.valorDependente ?? "0").replace(".", ","));
    setSalvo(false);
  };

  const handleSalvarEdicao = async () => {
    if (!planoEditando) return;
    setSalvando(true);
    try {
      await apiFetch(`/admin/planos/${planoEditando.id}`, {
        method: "PUT",
        body: JSON.stringify({
          valorTitular: valorTitularEdit.replace(",", "."),
          valorDependente: valorDependenteEdit.replace(",", "."),
        }),
      });
      setSalvo(true);
      await carregar();
      setTimeout(() => { setPlanoEditando(null); setSalvo(false); }, 900);
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!planoSuspendendo) return;
    setSuspendendo(true);
    try {
      await apiFetch(`/admin/planos/${planoSuspendendo.id}`, {
        method: "PUT",
        body: JSON.stringify({ ativo: !planoSuspendendo.ativo }),
      });
      await carregar();
      setPlanoSuspendendo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSuspendendo(false);
    }
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
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Planos</h2>
          <p className="text-muted-foreground">Edite valores e status dos planos. Tabelas de faixa etária por vendedor estão abaixo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* Planos por categoria */}
      {CATEGORIAS.map(cat => {
        const planosCateg = planos.filter(p => p.categoria === cat);
        if (!planosCateg.length) return null;
        const ativos = planosCateg.filter(p => p.ativo).length;
        const suspensos = planosCateg.filter(p => !p.ativo).length;

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">{cat}</h3>
              <Badge variant="outline" className={categoriaCor[cat] ?? ""}>
                {ativos} ativo{ativos !== 1 ? "s" : ""}
              </Badge>
              {suspensos > 0 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  {suspensos} suspenso{suspensos !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Acomodação</TableHead>
                    <TableHead className="text-right">Vr. Titular</TableHead>
                    <TableHead className="text-right">Vr. Depend.</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planosCateg.map(plano => (
                    <TableRow
                      key={plano.id}
                      className={!plano.ativo ? "opacity-60 bg-muted/20" : "hover:bg-muted/20"}
                      data-testid={`row-plano-${plano.codigo}`}
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                          {plano.codigo ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-medium text-sm max-w-[220px] ${!plano.ativo ? "line-through text-muted-foreground" : ""}`}>
                        {plano.nome}
                      </TableCell>
                      <TableCell className="text-sm">{plano.acomodacao ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-primary">
                        {plano.valorTitular ? formatMoney(parseFloat(plano.valorTitular)) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {plano.valorDependente ? formatMoney(parseFloat(plano.valorDependente)) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {plano.ativo ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">Suspenso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            onClick={() => handleAbrirEdicao(plano)}
                            title="Editar preços"
                            data-testid={`btn-editar-plano-${plano.codigo}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className={`h-8 w-8 p-0 ${plano.ativo ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                            onClick={() => setPlanoSuspendendo(plano)}
                            title={plano.ativo ? "Suspender" : "Reativar"}
                            data-testid={`btn-status-plano-${plano.codigo}`}
                          >
                            {plano.ativo ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      })}

      {/* Tabelas de preço por faixa etária */}
      {tabelas.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-lg font-bold text-foreground">Tabelas de Preço por Faixa Etária</h3>
          <p className="text-sm text-muted-foreground">Preços específicos por vendedor, definidos por faixa de idade.</p>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {tabelas.map(tabela => (
              <Card key={tabela.id} className="overflow-hidden">
                <CardHeader className="bg-primary/5 pb-3 border-b">
                  <CardTitle className="text-sm">
                    <span className="font-bold">{tabela.vendedorNome}</span>
                    <span className="text-muted-foreground font-normal"> — {tabela.tipoPlano}</span>
                    {tabela.ano && <span className="ml-1 text-xs text-muted-foreground">({tabela.ano})</span>}
                  </CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
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
        </div>
      )}

      {/* Modal Editar Valores */}
      <Dialog open={!!planoEditando} onOpenChange={() => { setPlanoEditando(null); setSalvo(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Editar Preços do Plano
            </DialogTitle>
            <DialogDescription>
              <span className="font-mono font-bold">{planoEditando?.codigo}</span> — {planoEditando?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor Titular (R$)</Label>
                <Input
                  value={valorTitularEdit}
                  onChange={e => setValorTitularEdit(e.target.value)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-titular"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Dependente (R$)</Label>
                <Input
                  value={valorDependenteEdit}
                  onChange={e => setValorDependenteEdit(e.target.value)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-dependente"
                />
              </div>
            </div>
            {planoEditando?.coberturas && (
              <div className="space-y-1.5">
                <Label>Coberturas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {planoEditando.coberturas.split(",").map(c => (
                    <Badge key={c} variant="secondary" className="text-xs">{c.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
            {salvo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Check className="h-4 w-4" /> <span className="text-sm font-medium">Valores salvos com sucesso!</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={salvando || salvo} data-testid="btn-confirmar-edicao-plano">
              {salvando ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suspender/Reativar */}
      <Dialog open={!!planoSuspendendo} onOpenChange={() => setPlanoSuspendendo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {planoSuspendendo?.ativo
                ? <><PauseCircle className="h-5 w-5 text-amber-600" /> Suspender Plano</>
                : <><PlayCircle className="h-5 w-5 text-emerald-600" /> Reativar Plano</>
              }
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm">
                {planoSuspendendo?.ativo
                  ? <>Ao <strong>suspender</strong> o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong>, ele ficará indisponível para novas contratações.</>
                  : <>Ao <strong>reativar</strong>, o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong> voltará a estar disponível.</>
                }
              </p>
            </div>
            <p className="text-sm text-muted-foreground"><strong>{planoSuspendendo?.nome}</strong></p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoSuspendendo(null)}>Cancelar</Button>
            <Button
              disabled={suspendendo}
              variant={planoSuspendendo?.ativo ? "destructive" : "default"}
              className={!planoSuspendendo?.ativo ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              onClick={handleToggleStatus}
              data-testid="btn-confirmar-suspensao-plano"
            >
              {suspendendo ? <Loader2 className="h-4 w-4 animate-spin" /> : planoSuspendendo?.ativo ? "Confirmar Suspensão" : "Confirmar Reativação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
