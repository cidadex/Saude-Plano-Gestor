import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getPropostasByVendedor } from "@/data/propostas";
import { vendedorAtual } from "@/data/vendedores";
import { planos } from "@/data/planos";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import { Search, SlidersHorizontal, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Proposta } from "@/data/types";

const statusInicial: Proposta['status'] = 'PENDENTE';
const formasPagamento = ['BOLETO', 'CORA', 'C6', 'BTG', 'PIX', 'DÉBITO EM FOLHA'];

let proximoId = 100;

export default function VendedorPropostas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [propostasExtras, setPropostasExtras] = useState<Proposta[]>([]);
  const [novaPropostaAberta, setNovaPropostaAberta] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [salvo, setSalvo] = useState(false);

  const [form, setForm] = useState({
    clienteNome: '',
    clienteCpf: '',
    telefone: '',
    tipo: 'TITULAR' as 'TITULAR' | 'DEPENDENTE',
    codigoPlano: '',
    planoNome: '',
    formaPagamento: '',
    valorPrevisto: '',
    dataEnvio: new Date().toLocaleDateString('pt-BR'),
    observacao: '',
  });

  const basePropostas = getPropostasByVendedor(vendedorAtual.nome);
  const todasPropostas = [...basePropostas, ...propostasExtras];
  const statuses = useMemo(() => Array.from(new Set(todasPropostas.map(p => p.status))), [todasPropostas]);

  const filteredPropostas = useMemo(() => {
    return todasPropostas.filter(p => {
      const matchSearch = p.clienteNome.toLowerCase().includes(search.toLowerCase()) || p.clienteCpf.includes(search);
      const matchStatus = statusFilter === "TODOS" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, todasPropostas]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelecionarPlano = (codigo: string) => {
    const planoSelecionado = planos.find(p => p.codigo === codigo);
    handleChange('codigoPlano', codigo);
    handleChange('planoNome', planoSelecionado?.nome || '');
    if (planoSelecionado) {
      handleChange('valorPrevisto', planoSelecionado.valorTitular.toFixed(2).replace('.', ','));
    }
  };

  const handleSalvar = () => {
    const novaProposta: Proposta = {
      id: `nova-${++proximoId}`,
      clienteNome: form.clienteNome.toUpperCase(),
      clienteCpf: form.clienteCpf,
      vendedor: vendedorAtual.nome,
      plano: form.planoNome,
      codigoPlano: form.codigoPlano,
      tipo: form.tipo,
      dataEnvio: form.dataEnvio,
      status: statusInicial,
      observacao: form.observacao || undefined,
      valor: parseFloat(form.valorPrevisto.replace(',', '.')) || 0,
      telefone: form.telefone || undefined,
    };
    setSalvo(true);
    setTimeout(() => {
      setPropostasExtras(prev => [novaProposta, ...prev]);
      setSalvo(false);
      setStep(1);
      setForm({
        clienteNome: '', clienteCpf: '', telefone: '', tipo: 'TITULAR',
        codigoPlano: '', planoNome: '', formaPagamento: '',
        valorPrevisto: '', dataEnvio: new Date().toLocaleDateString('pt-BR'), observacao: '',
      });
      setNovaPropostaAberta(false);
    }, 1200);
  };

  const handleFechar = () => {
    setNovaPropostaAberta(false);
    setStep(1);
    setSalvo(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Minhas Propostas</h2>
          <p className="text-muted-foreground">Acompanhe o andamento das suas vendas.</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setNovaPropostaAberta(true)} data-testid="btn-nova-proposta">
          <Plus className="h-4 w-4" /> Nova Proposta
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 bg-muted/20">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <SlidersHorizontal className="h-4 w-4" /> Refinar Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Cliente</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nome ou CPF..." 
                  className="pl-9 bg-background" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status da Proposta</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os status</SelectItem>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <div className="rounded-md border-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2">
                <TableHead className="font-semibold text-foreground">Cliente / CPF</TableHead>
                <TableHead className="font-semibold text-foreground">Plano</TableHead>
                <TableHead className="font-semibold text-foreground">Envio</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Valor Previsto</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p>Nenhuma proposta encontrada com estes filtros.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPropostas.map((prop) => (
                  <TableRow key={prop.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-proposta-vendedor-${prop.id}`}>
                    <TableCell className="font-medium py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground">{prop.clienteNome}</span>
                        <span className="text-xs text-muted-foreground font-mono">{prop.clienteCpf}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{prop.plano}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1 py-0.5 rounded w-fit">{prop.codigoPlano}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{prop.dataEnvio}</TableCell>
                    <TableCell className="font-bold text-right text-foreground">{formatMoney(prop.valor)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`${getStatusBadgeVariant(prop.status)} font-medium border whitespace-nowrap`}>
                        {prop.status.replace('_', ' ')}
                      </Badge>
                      {prop.observacao && (
                        <p className="text-[10px] text-muted-foreground mt-1.5 max-w-[180px] mx-auto truncate" title={prop.observacao}>
                          {prop.observacao}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal Nova Proposta */}
      <Dialog open={novaPropostaAberta} onOpenChange={handleFechar}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Proposta
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente e do plano para registrar a proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= s ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Cliente' : s === 2 ? 'Plano' : 'Revisão'}
                </span>
                {s < 3 && <div className="h-px w-8 bg-muted-foreground/30" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="prop-nome">Nome Completo *</Label>
                  <Input
                    id="prop-nome"
                    placeholder="Nome do cliente"
                    value={form.clienteNome}
                    onChange={e => handleChange('clienteNome', e.target.value)}
                    data-testid="input-proposta-nome"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-cpf">CPF *</Label>
                  <Input
                    id="prop-cpf"
                    placeholder="000.000.000-00"
                    value={form.clienteCpf}
                    onChange={e => handleChange('clienteCpf', e.target.value)}
                    data-testid="input-proposta-cpf"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-tel">Telefone / WhatsApp</Label>
                  <Input
                    id="prop-tel"
                    placeholder="(85) 99999-9999"
                    value={form.telefone}
                    onChange={e => handleChange('telefone', e.target.value)}
                    data-testid="input-proposta-telefone"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Beneficiário</Label>
                  <Select value={form.tipo} onValueChange={v => handleChange('tipo', v)}>
                    <SelectTrigger data-testid="select-proposta-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TITULAR">Titular</SelectItem>
                      <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-data">Data de Envio</Label>
                  <Input
                    id="prop-data"
                    value={form.dataEnvio}
                    onChange={e => handleChange('dataEnvio', e.target.value)}
                    placeholder="DD/MM/AAAA"
                    data-testid="input-proposta-data"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Plano de Saúde *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {planos.map(p => (
                    <button
                      key={p.codigo}
                      onClick={() => handleSelecionarPlano(p.codigo)}
                      data-testid={`btn-proposta-plano-${p.codigo}`}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.codigoPlano === p.codigo
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="font-mono font-bold text-sm">{p.codigo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">{p.nome}</div>
                      <div className="text-xs font-semibold text-primary mt-1">
                        Tit: R$ {p.valorTitular.toFixed(2).replace('.', ',')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.formaPagamento} onValueChange={v => handleChange('formaPagamento', v)}>
                    <SelectTrigger data-testid="select-proposta-pagamento">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map(fp => (
                        <SelectItem key={fp} value={fp}>{fp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prop-valor">Valor Previsto (R$)</Label>
                  <Input
                    id="prop-valor"
                    value={form.valorPrevisto}
                    onChange={e => handleChange('valorPrevisto', e.target.value)}
                    placeholder="0,00"
                    data-testid="input-proposta-valor"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Informações adicionais sobre a proposta..."
                    value={form.observacao}
                    onChange={e => handleChange('observacao', e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-proposta-obs"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-sm">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{form.clienteNome || '—'}</span></div>
                  <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{form.clienteCpf || '—'}</span></div>
                  <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline" className="text-xs">{form.tipo}</Badge></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span>{form.telefone || '—'}</span></div>
                  <div><span className="text-muted-foreground">Data Envio:</span> <span>{form.dataEnvio}</span></div>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
                <h3 className="font-semibold text-sm">Plano Selecionado</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Código:</span> <span className="font-mono font-bold">{form.codigoPlano || '—'}</span></div>
                  <div><span className="text-muted-foreground">Pagamento:</span> <span>{form.formaPagamento || '—'}</span></div>
                  <div><span className="text-muted-foreground">Valor:</span> <span className="font-bold text-primary">R$ {form.valorPrevisto || '—'}</span></div>
                  <div><span className="text-muted-foreground">Status inicial:</span> <Badge variant="outline" className="text-xs border-amber-300 bg-amber-50 text-amber-700">PENDENTE</Badge></div>
                  {form.observacao && (
                    <div className="col-span-2"><span className="text-muted-foreground">Obs:</span> <span>{form.observacao}</span></div>
                  )}
                </div>
              </div>
              {salvo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Proposta cadastrada com sucesso!</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 sm:justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}>
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleFechar}>Cancelar</Button>
              {step < 3 ? (
                <Button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)} data-testid="btn-proximo-proposta">
                  Próximo
                </Button>
              ) : (
                <Button
                  className="bg-primary"
                  onClick={handleSalvar}
                  disabled={salvo || !form.clienteNome || !form.clienteCpf || !form.codigoPlano}
                  data-testid="btn-salvar-proposta"
                >
                  {salvo ? 'Salvando...' : 'Registrar Proposta'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
