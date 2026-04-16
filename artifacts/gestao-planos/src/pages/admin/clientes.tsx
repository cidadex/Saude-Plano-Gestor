import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { clientesAtivos } from "@/data/clientes";
import { formatMoney, getStatusBadgeVariant } from "@/lib/format";
import {
  Search, SlidersHorizontal, ChevronDown, ChevronUp, UserPlus,
  PlayCircle, PauseCircle, MessageCircle, Pencil, Check,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CadastroCliente from "./cadastro-cliente";
import { WhatsappModal } from "@/components/whatsapp-modal";
import type { Cliente } from "@/data/types";

interface ClienteEditavel {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  cidade: string;
  estado: string;
  bairro: string;
  observacao: string;
}

export default function AdminClientes() {
  const [search, setSearch] = useState("");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [planoFilter, setPlanoFilter] = useState("TODOS");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [whatsappAberto, setWhatsappAberto] = useState(false);
  const [clienteWhatsapp, setClienteWhatsapp] = useState<Cliente | null>(null);
  const [editandoCliente, setEditandoCliente] = useState<ClienteEditavel | null>(null);
  const [editSalvo, setEditSalvo] = useState(false);
  const [edicaoMap, setEdicaoMap] = useState<Record<string, ClienteEditavel>>({});

  const vendedores = useMemo(() =>
    Array.from(new Set(clientesAtivos.map(c => c.representante || c.responsavel))).filter(Boolean), []);
  const planos = useMemo(() =>
    Array.from(new Set(clientesAtivos.map(c => c.plano))).sort(), []);

  const filteredClientes = useMemo(() => {
    return clientesAtivos.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
      const repOuResp = c.representante || c.responsavel;
      const matchVendedor = vendedorFilter === "TODOS" || repOuResp === vendedorFilter;
      const matchPlano = planoFilter === "TODOS" || c.plano === planoFilter;
      const matchTipo = tipoFilter === "TODOS" || c.tipo === tipoFilter;
      return matchSearch && matchVendedor && matchPlano && matchTipo;
    });
  }, [search, vendedorFilter, planoFilter, tipoFilter]);

  const getStatus = (cliente: Cliente) => statusMap[cliente.id] ?? cliente.status;

  const toggleStatus = (cliente: Cliente) => {
    const atual = getStatus(cliente);
    setStatusMap(prev => ({ ...prev, [cliente.id]: atual === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' }));
  };

  const handleAbrirWhatsapp = (cliente: Cliente) => {
    setClienteWhatsapp(cliente);
    setWhatsappAberto(true);
  };

  const handleAbrirEdicao = (cliente: Cliente) => {
    const override = edicaoMap[cliente.id];
    setEditandoCliente({
      id: cliente.id,
      nome: override?.nome ?? cliente.nome,
      cpf: cliente.cpf,
      dataNascimento: override?.dataNascimento ?? cliente.dataNascimento,
      telefone: override?.telefone ?? (cliente.telefone || ''),
      cidade: override?.cidade ?? (cliente.cidade || ''),
      estado: override?.estado ?? (cliente.estado || ''),
      bairro: override?.bairro ?? (cliente.bairro || ''),
      observacao: override?.observacao ?? cliente.observacao,
    });
    setEditSalvo(false);
  };

  const handleSalvarEdicao = () => {
    if (!editandoCliente) return;
    setEdicaoMap(prev => ({ ...prev, [editandoCliente.id]: editandoCliente }));
    setEditSalvo(true);
    setTimeout(() => { setEditandoCliente(null); setEditSalvo(false); }, 900);
  };

  const getClienteDisplay = (cliente: Cliente) => {
    const override = edicaoMap[cliente.id];
    return {
      nome: override?.nome ?? cliente.nome,
      telefone: override?.telefone ?? cliente.telefone,
      cidade: override?.cidade ?? cliente.cidade,
      estado: override?.estado ?? cliente.estado,
      bairro: override?.bairro ?? cliente.bairro,
      observacao: override?.observacao ?? cliente.observacao,
    };
  };

  const totalFiltrado = filteredClientes.length;
  const titularesFiltrados = filteredClientes.filter(c => c.tipo === 'TITULAR').length;
  const dependentesFiltrados = filteredClientes.filter(c => c.tipo === 'DEPENDENTE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Clientes Ativos</h2>
          <p className="text-muted-foreground">Gerencie a carteira de clientes ativos da corretora.</p>
        </div>
        <Button
          onClick={() => setCadastroAberto(true)}
          className="flex items-center gap-2 shrink-0"
          data-testid="btn-novo-cliente"
        >
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros</span>
          {(search || vendedorFilter !== 'TODOS' || planoFilter !== 'TODOS' || tipoFilter !== 'TODOS') && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalFiltrado} resultado{totalFiltrado !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome ou CPF..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search-clientes"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Vendedor</label>
            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger data-testid="select-vendedor">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Plano</label>
            <Select value={planoFilter} onValueChange={setPlanoFilter}>
              <SelectTrigger data-testid="select-plano">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os planos</SelectItem>
                {planos.map(p => <SelectItem key={p} value={p}>Plano {p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger data-testid="select-tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="TITULAR">Titular</SelectItem>
                <SelectItem value="DEPENDENTE">Dependente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumo dos resultados */}
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalFiltrado}</span> registros
          <span>•</span>
          <span className="text-blue-600 font-medium">{titularesFiltrados} titular{titularesFiltrados !== 1 ? 'es' : ''}</span>
          <span>•</span>
          <span className="text-purple-600 font-medium">{dependentesFiltrados} dependente{dependentesFiltrados !== 1 ? 's' : ''}</span>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[32px]"></TableHead>
              <TableHead>Nome / CPF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-center">Venc.</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredClientes.map((cliente) => {
                const statusAtual = getStatus(cliente);
                const display = getClienteDisplay(cliente);
                return (
                  <Collapsible
                    key={cliente.id}
                    asChild
                    open={expandedId === cliente.id}
                    onOpenChange={(open) => setExpandedId(open ? cliente.id : null)}
                  >
                    <>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30"
                        data-testid={`row-cliente-${cliente.id}`}
                      >
                        <TableCell className="pl-2 pr-0">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              {expandedId === cliente.id
                                ? <ChevronUp className="h-3.5 w-3.5" />
                                : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm leading-tight">{display.nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{cliente.cpf}</div>
                        </TableCell>
                        <TableCell>
                          {cliente.tipo === 'TITULAR' ? (
                            <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/20">
                              Titular
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/20">
                              Depend.
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{cliente.representante || cliente.responsavel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-muted/50">{cliente.plano}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">{formatMoney(cliente.valor)}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">Dia {cliente.vencimento}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getStatusBadgeVariant(statusAtual)}>
                            {statusAtual}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={8} className="p-0">
                            <div className="px-6 py-4 border-b">
                              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm mb-4">
                                {/* Coluna 1 — Identificação */}
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Identificação</p>
                                  <p><span className="text-muted-foreground">Código:</span> <span className="font-mono text-xs bg-muted px-1 rounded">{cliente.codigo}</span></p>
                                  <p><span className="text-muted-foreground">Nasc.:</span> {cliente.dataNascimento} <span className="text-muted-foreground">({cliente.idade} anos)</span></p>
                                  {cliente.sexo && <p><span className="text-muted-foreground">Sexo:</span> <span className="font-medium">{cliente.sexo === 'M' ? 'Masculino' : 'Feminino'}</span></p>}
                                  <p><span className="text-muted-foreground">Ativação:</span> {cliente.dataAtivacao}</p>
                                  {cliente.tipo === 'DEPENDENTE' && (
                                    <>
                                      <p><span className="text-muted-foreground">Vínculo:</span> <span className="font-semibold text-purple-600">{cliente.grauParentesco || 'Dependente'}</span></p>
                                      {cliente.titularNome && <p><span className="text-muted-foreground">Titular:</span> <span className="font-medium">{cliente.titularNome}</span></p>}
                                      {cliente.titularCpf && <p><span className="text-muted-foreground">CPF Titular:</span> <span className="font-mono text-xs">{cliente.titularCpf}</span></p>}
                                    </>
                                  )}
                                </div>

                                {/* Coluna 2 — Contato */}
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Contato & Endereço</p>
                                  <p><span className="text-muted-foreground">Telefone:</span> {display.telefone || <span className="italic text-muted-foreground/70">—</span>}</p>
                                  {cliente.email && <p><span className="text-muted-foreground">E-mail:</span> <span className="text-xs">{cliente.email}</span></p>}
                                  {cliente.cep && <p><span className="text-muted-foreground">CEP:</span> <span className="font-mono text-xs">{cliente.cep}</span></p>}
                                  {cliente.logradouro && (
                                    <p><span className="text-muted-foreground">Logradouro:</span> {cliente.logradouro}{cliente.numero ? `, ${cliente.numero}` : ''}</p>
                                  )}
                                  {cliente.complemento && <p><span className="text-muted-foreground">Compl.:</span> {cliente.complemento}</p>}
                                  <p><span className="text-muted-foreground">Bairro:</span> {display.bairro || '—'}</p>
                                  <p><span className="text-muted-foreground">Cidade/UF:</span> {display.cidade}/{display.estado}</p>
                                </div>

                                {/* Coluna 3 — Plano */}
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Plano & Contrato</p>
                                  <p><span className="text-muted-foreground">Plano:</span> <span className="font-semibold">{cliente.plano}</span></p>
                                  <p><span className="text-muted-foreground">Código Plano:</span> <span className="font-mono text-xs">{cliente.codigoPlano}</span></p>
                                  {cliente.matricula && <p><span className="text-muted-foreground">Carteirinha:</span> <span className="font-mono text-xs">{cliente.matricula}</span></p>}
                                  <p><span className="text-muted-foreground">Pagamento:</span> {cliente.formaPagamento}</p>
                                  <p><span className="text-muted-foreground">Vencimento:</span> <span className="font-medium">Dia {cliente.vencimento}</span></p>
                                  <p><span className="text-muted-foreground">Representante:</span> {cliente.representante || cliente.responsavel}</p>
                                </div>

                                {/* Coluna 4 — Financeiro */}
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-1 border-b">Financeiro</p>
                                  <p><span className="text-muted-foreground">Valor 2025:</span> {formatMoney(cliente.vrPl)}</p>
                                  <p><span className="text-muted-foreground">Valor 2026:</span> <span className="font-semibold">{formatMoney(cliente.valor2026)}</span></p>
                                  <p><span className="text-muted-foreground">Saldo Corretora:</span> <span className="font-semibold text-emerald-600">{formatMoney(cliente.saldo)}</span></p>
                                  {cliente.comissao > 0 && (
                                    <p><span className="text-muted-foreground">Comissão:</span> <span className="font-semibold text-amber-600">{formatMoney(cliente.comissao)}</span></p>
                                  )}
                                  {display.observacao ? (
                                    <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Observação</p>
                                      <p className="text-xs text-amber-700 font-medium">{display.observacao}</p>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex flex-wrap gap-2 pt-3 border-t">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                  onClick={() => handleAbrirEdicao(cliente)}
                                  data-testid={`btn-editar-cliente-${cliente.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar Dados
                                </Button>

                                <Button
                                  size="sm"
                                  variant={statusAtual === 'ATIVO' ? 'outline' : 'default'}
                                  className={`gap-1.5 ${statusAtual === 'ATIVO'
                                    ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                  onClick={() => toggleStatus(cliente)}
                                  data-testid={`btn-toggle-status-${cliente.id}`}
                                >
                                  {statusAtual === 'ATIVO'
                                    ? <><PauseCircle className="h-3.5 w-3.5" /> Suspender</>
                                    : <><PlayCircle className="h-3.5 w-3.5" /> Reativar</>
                                  }
                                </Button>

                                {(display.telefone || cliente.telefone) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500"
                                    onClick={() => handleAbrirWhatsapp(cliente)}
                                    data-testid={`btn-whatsapp-cliente-${cliente.id}`}
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    WhatsApp
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Editar Cliente */}
      <Dialog open={!!editandoCliente} onOpenChange={() => setEditandoCliente(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Editar Dados do Cliente
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{editandoCliente?.cpf}</DialogDescription>
          </DialogHeader>

          {editandoCliente && (
            <div className="grid gap-3 py-2 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome Completo</Label>
                  <Input
                    value={editandoCliente.nome}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, nome: e.target.value } : prev)}
                    data-testid="input-edit-nome"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                  <Input
                    value={editandoCliente.dataNascimento}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, dataNascimento: e.target.value } : prev)}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    value={editandoCliente.telefone}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, telefone: e.target.value } : prev)}
                    placeholder="(85) 99999-9999"
                    data-testid="input-edit-telefone"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input
                    value={editandoCliente.bairro}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, bairro: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input
                    value={editandoCliente.cidade}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, cidade: e.target.value } : prev)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Input
                    value={editandoCliente.estado}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, estado: e.target.value } : prev)}
                    placeholder="CE"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <Textarea
                    value={editandoCliente.observacao}
                    onChange={e => setEditandoCliente(prev => prev ? { ...prev, observacao: e.target.value } : prev)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {editSalvo && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <Check className="h-4 w-4" /> Dados atualizados com sucesso!
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditandoCliente(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={editSalvo} data-testid="btn-confirmar-edicao-cliente">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CadastroCliente open={cadastroAberto} onClose={() => setCadastroAberto(false)} />

      {clienteWhatsapp && (
        <WhatsappModal
          open={whatsappAberto}
          onClose={() => { setWhatsappAberto(false); setClienteWhatsapp(null); }}
          clienteNome={clienteWhatsapp.nome}
          telefone={clienteWhatsapp.telefone || ''}
          valor={clienteWhatsapp.valor}
          mesReferencia="Mês Atual"
          vencimento={`Dia ${clienteWhatsapp.vencimento}`}
        />
      )}
    </div>
  );
}
