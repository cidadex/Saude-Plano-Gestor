import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { planos as planosIniciais, tabelasPlanos } from "@/data/planos";
import { formatMoney } from "@/lib/format";
import type { Plano, TabelaPlano, TabelaPlanoFaixaEtaria } from "@/data/types";
import { Pencil, PauseCircle, PlayCircle, Check, AlertTriangle } from "lucide-react";

type StatusPlano = 'ATIVO' | 'SUSPENSO';

interface PlanoEditavel extends Plano {
  valorTitularEdit?: string;
  valorDependenteEdit?: string;
}

const categoriaCor: Record<string, string> = {
  'NOSSO PLANO': 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/20',
  'MIX': 'border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/20',
  'PLENO': 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/20',
};

export default function AdminPlanos() {
  const [statusMap, setStatusMap] = useState<Record<string, StatusPlano>>({});
  const [valoresMap, setValoresMap] = useState<Record<string, { titular: number; dependente: number }>>({});

  const [planoEditando, setPlanoEditando] = useState<PlanoEditavel | null>(null);
  const [planoSuspendendo, setPlanoSuspendendo] = useState<Plano | null>(null);
  const [salvo, setSalvo] = useState(false);

  const getStatus = (plano: Plano): StatusPlano => statusMap[plano.id] ?? 'ATIVO';
  const getValorTitular = (plano: Plano) => valoresMap[plano.id]?.titular ?? plano.valorTitular;
  const getValorDependente = (plano: Plano) => valoresMap[plano.id]?.dependente ?? plano.valorDependente;

  const handleAbrirEdicao = (plano: Plano) => {
    setPlanoEditando({
      ...plano,
      valorTitularEdit: getValorTitular(plano).toFixed(2).replace('.', ','),
      valorDependenteEdit: getValorDependente(plano).toFixed(2).replace('.', ','),
    });
    setSalvo(false);
  };

  const handleSalvarEdicao = () => {
    if (!planoEditando) return;
    const titular = parseFloat((planoEditando.valorTitularEdit || '0').replace(',', '.'));
    const dependente = parseFloat((planoEditando.valorDependenteEdit || '0').replace(',', '.'));
    setValoresMap(prev => ({ ...prev, [planoEditando.id]: { titular, dependente } }));
    setSalvo(true);
    setTimeout(() => { setPlanoEditando(null); setSalvo(false); }, 900);
  };

  const handleConfirmarSuspensao = () => {
    if (!planoSuspendendo) return;
    const atual = getStatus(planoSuspendendo);
    setStatusMap(prev => ({ ...prev, [planoSuspendendo.id]: atual === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' }));
    setPlanoSuspendendo(null);
  };

  const renderTabelaIdade = (tabela: TabelaPlano, index: number) => (
    <Card key={index} className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-3 border-b">
        <CardTitle className="text-base">
          {tabela.vendedor} — {tabela.tipoPlano} ({tabela.ano})
        </CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Faixa Etária</TableHead>
            <TableHead className="text-right">Enfermaria</TableHead>
            <TableHead className="text-right">Apartamento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tabela.titular.map((item: TabelaPlanoFaixaEtaria, i: number) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-sm">{item.faixa}</TableCell>
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

  const categorias = ['NOSSO PLANO', 'MIX', 'PLENO'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Planos</h2>
        <p className="text-muted-foreground">Edite valores, suspenda ou reative planos do portfólio.</p>
      </div>

      {/* Cards por categoria */}
      {categorias.map(cat => {
        const planosCategoria = planosIniciais.filter(p => p.categoria === cat);
        const ativos = planosCategoria.filter(p => getStatus(p) === 'ATIVO').length;
        const suspensos = planosCategoria.filter(p => getStatus(p) === 'SUSPENSO').length;

        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">{cat}</h3>
              <Badge variant="outline" className={categoriaCor[cat]}>
                {ativos} ativo{ativos !== 1 ? 's' : ''}
              </Badge>
              {suspensos > 0 && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                  {suspensos} suspenso{suspensos !== 1 ? 's' : ''}
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
                  {planosCategoria.map(plano => {
                    const status = getStatus(plano);
                    const suspenso = status === 'SUSPENSO';
                    return (
                      <TableRow
                        key={plano.id}
                        className={suspenso ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/20'}
                        data-testid={`row-plano-${plano.codigo}`}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-muted/50">{plano.codigo}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[220px]">
                          <span className={suspenso ? 'line-through text-muted-foreground' : ''}>
                            {plano.nome}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{plano.acomodacao}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {formatMoney(getValorTitular(plano))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatMoney(getValorDependente(plano))}
                        </TableCell>
                        <TableCell className="text-center">
                          {suspenso ? (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
                              Suspenso
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">
                              Ativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              onClick={() => handleAbrirEdicao(plano)}
                              title="Editar plano"
                              data-testid={`btn-editar-plano-${plano.codigo}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${suspenso ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                              onClick={() => setPlanoSuspendendo(plano)}
                              title={suspenso ? 'Reativar plano' : 'Suspender plano'}
                              data-testid={`btn-status-plano-${plano.codigo}`}
                            >
                              {suspenso ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      })}

      {/* Tabelas por faixa etária */}
      <div className="space-y-3 pt-2">
        <h3 className="text-lg font-bold text-foreground">Tabelas por Faixa Etária</h3>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {tabelasPlanos.map((tabela, idx) => renderTabelaIdade(tabela, idx))}
        </div>
      </div>

      {/* Modal Editar Plano */}
      <Dialog open={!!planoEditando} onOpenChange={() => { setPlanoEditando(null); setSalvo(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Editar Plano
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
                  value={planoEditando?.valorTitularEdit ?? ''}
                  onChange={e => setPlanoEditando(prev => prev ? { ...prev, valorTitularEdit: e.target.value } : prev)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-titular"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Dependente (R$)</Label>
                <Input
                  value={planoEditando?.valorDependenteEdit ?? ''}
                  onChange={e => setPlanoEditando(prev => prev ? { ...prev, valorDependenteEdit: e.target.value } : prev)}
                  className="font-mono"
                  placeholder="0,00"
                  data-testid="input-valor-dependente"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Coberturas</Label>
              <div className="flex flex-wrap gap-1.5">
                {planoEditando?.coberturas?.map(c => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
            {salvo && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
                <Check className="h-4 w-4" /> <span className="text-sm font-medium">Valores atualizados!</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={salvo} data-testid="btn-confirmar-edicao-plano">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suspender/Reativar Plano */}
      <Dialog open={!!planoSuspendendo} onOpenChange={() => setPlanoSuspendendo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {planoSuspendendo && getStatus(planoSuspendendo) === 'ATIVO' ? (
                <><PauseCircle className="h-5 w-5 text-amber-600" /> Suspender Plano</>
              ) : (
                <><PlayCircle className="h-5 w-5 text-emerald-600" /> Reativar Plano</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                {planoSuspendendo && getStatus(planoSuspendendo) === 'ATIVO' ? (
                  <p>Ao <strong>suspender</strong> o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong>, ele ficará indisponível para novas contratações. Clientes existentes não serão afetados automaticamente.</p>
                ) : (
                  <p>Ao <strong>reativar</strong> o plano <strong className="font-mono">{planoSuspendendo?.codigo}</strong>, ele voltará a estar disponível para novas contratações.</p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>{planoSuspendendo?.nome}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanoSuspendendo(null)}>Cancelar</Button>
            <Button
              variant={planoSuspendendo && getStatus(planoSuspendendo) === 'ATIVO' ? 'destructive' : 'default'}
              className={planoSuspendendo && getStatus(planoSuspendendo) !== 'ATIVO' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={handleConfirmarSuspensao}
              data-testid="btn-confirmar-suspensao-plano"
            >
              {planoSuspendendo && getStatus(planoSuspendendo) === 'ATIVO' ? 'Confirmar Suspensão' : 'Confirmar Reativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
