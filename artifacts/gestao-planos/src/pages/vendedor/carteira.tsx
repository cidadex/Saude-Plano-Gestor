import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useClientes, useBoletos, type ClienteAPI } from "@/hooks/useVendedorData";
import { formatMoney } from "@/lib/format";
import { WhatsappModal } from "@/components/whatsapp-modal";
import {
  Search, ChevronDown, ChevronUp, MessageCircle, Users,
  UserCheck, DollarSign, CheckCircle2, AlertCircle, Clock, Loader2,
} from "lucide-react";

const MES_ATUAL = (() => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
})();

export default function VendedorCarteira() {
  const { clientes, loading: lC } = useClientes();
  const { boletos, loading: lB } = useBoletos();
  const [search, setSearch] = useState("");
  const [planoFilter, setPlanoFilter] = useState("TODOS");
  const [tipoFilter, setTipoFilter] = useState("TODOS");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whatsappAberto, setWhatsappAberto] = useState(false);
  const [clienteWpp, setClienteWpp] = useState<ClienteAPI | null>(null);

  const planos = Array.from(new Set(clientes.map(c => c.planoCode ?? ""))).filter(Boolean).sort();

  const filtrados = useMemo(() =>
    clientes.filter(c => {
      const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search);
      const matchPlano = planoFilter === "TODOS" || c.planoCode === planoFilter;
      const matchTipo = tipoFilter === "TODOS" || c.tipo === tipoFilter;
      return matchSearch && matchPlano && matchTipo;
    }), [search, planoFilter, tipoFilter, clientes]);

  const totalAtivos = clientes.length;
  const titulares = clientes.filter(c => c.tipo === "TITULAR").length;
  const dependentes = clientes.filter(c => c.tipo === "DEPENDENTE").length;
  const receita = clientes.reduce((a, c) => a + parseFloat(c.valorMensal ?? "0"), 0);
  const saldo = clientes.reduce((a, c) => a + parseFloat(c.saldo ?? "0"), 0);

  const getBoletoStatus = (clienteId: string) => {
    const b = boletos.find(b => b.clienteId === clienteId && b.mesReferencia === MES_ATUAL);
    return b?.status ?? null;
  };

  if (lC || lB) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Minha Carteira</h2>
        <p className="text-muted-foreground">Todos os seus beneficiários ativos com situação detalhada.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{totalAtivos}</p>
            <p className="text-xs text-muted-foreground">beneficiários</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Titulares</p>
              <UserCheck className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{titulares}</p>
            <p className="text-xs text-muted-foreground">{dependentes} dependente{dependentes !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita</p>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{formatMoney(receita)}</p>
            <p className="text-xs text-muted-foreground">mensal</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Corretora</p>
              <DollarSign className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatMoney(saldo)}</p>
            <p className="text-xs text-muted-foreground">spread mensal</p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Nome ou CPF..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Plano</label>
            <Select value={planoFilter} onValueChange={setPlanoFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {planos.map(p => <SelectItem key={p} value={p}>Plano {p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="TITULAR">Titular</SelectItem>
                <SelectItem value="DEPENDENTE">Dependente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span><span className="font-semibold text-foreground">{filtrados.length}</span> resultado{filtrados.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-8" />
              <TableHead>Nome / CPF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="text-center">Venc.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-center">Pagto</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado.</TableCell>
              </TableRow>
            ) : filtrados.map(c => {
              const pagtoStatus = getBoletoStatus(c.id);
              return (
                <Collapsible key={c.id} asChild open={expandedId === c.id} onOpenChange={(open) => setExpandedId(open ? c.id : null)}>
                  <>
                    <TableRow className="cursor-pointer hover:bg-muted/20">
                      <TableCell className="pl-2 pr-0">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            {expandedId === c.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{c.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.cpf}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${c.tipo === "TITULAR" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-purple-300 bg-purple-50 text-purple-700"}`}>
                          {c.tipo === "TITULAR" ? "Titular" : "Depend."}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{c.planoCode ?? "—"}</Badge></TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">Dia {c.diaVencimento ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{formatMoney(parseFloat(c.valorMensal ?? "0"))}</TableCell>
                      <TableCell className="text-right text-sm text-emerald-600">{formatMoney(parseFloat(c.saldo ?? "0"))}</TableCell>
                      <TableCell className="text-center">
                        {pagtoStatus === "PAGO" && <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />}
                        {pagtoStatus === "VENCIDO" && <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />}
                        {pagtoStatus === "PENDENTE" && <Clock className="h-4 w-4 text-amber-500 mx-auto" />}
                        {!pagtoStatus && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${c.status === "ATIVO" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : c.status === "SUSPENSO" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-red-300 bg-red-50 text-red-700"}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-6 py-4 border-b">
                            <div className="grid md:grid-cols-4 gap-x-6 gap-y-2 text-sm mb-4">
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Identificação</p>
                                {c.codigo && <p><span className="text-muted-foreground">Código:</span> <span className="font-mono text-xs">{c.codigo}</span></p>}
                                {c.dataNascimento && <p><span className="text-muted-foreground">Nasc.:</span> {new Date(c.dataNascimento).toLocaleDateString("pt-BR")}</p>}
                                {c.sexo && <p><span className="text-muted-foreground">Sexo:</span> {c.sexo === "M" ? "Masculino" : "Feminino"}</p>}
                                {c.dataAtivacao && <p><span className="text-muted-foreground">Ativação:</span> {new Date(c.dataAtivacao).toLocaleDateString("pt-BR")}</p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Contato</p>
                                <p><span className="text-muted-foreground">Telefone:</span> {c.telefone || "—"}</p>
                                {c.email && <p><span className="text-muted-foreground">E-mail:</span> {c.email}</p>}
                                {c.cidade && <p><span className="text-muted-foreground">Cidade/UF:</span> {c.cidade}/{c.estado}</p>}
                                {c.bairro && <p><span className="text-muted-foreground">Bairro:</span> {c.bairro}</p>}
                                {c.cep && <p><span className="text-muted-foreground">CEP:</span> {c.cep}</p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Plano</p>
                                {c.codigoPlano && <p><span className="text-muted-foreground">Código Plano:</span> <span className="font-mono text-xs">{c.codigoPlano}</span></p>}
                                {c.matricula && <p><span className="text-muted-foreground">Carteirinha:</span> <span className="font-mono text-xs">{c.matricula}</span></p>}
                                {c.vrPl && <p><span className="text-muted-foreground">Vr. Plano 2025:</span> {formatMoney(parseFloat(c.vrPl))}</p>}
                                {c.valor2026 && <p><span className="text-muted-foreground">Vr. 2026:</span> <span className="font-semibold">{formatMoney(parseFloat(c.valor2026))}</span></p>}
                                {c.saldo && <p><span className="text-muted-foreground">Saldo Corretora:</span> <span className="text-emerald-600 font-semibold">{formatMoney(parseFloat(c.saldo))}</span></p>}
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Pagamento</p>
                                {c.diaVencimento && <p><span className="text-muted-foreground">Vencimento:</span> Dia {c.diaVencimento}</p>}
                                {c.formaPagamento && <p><span className="text-muted-foreground">Forma:</span> {c.formaPagamento}</p>}
                                {c.observacao && <p><span className="text-muted-foreground">Obs:</span> <span className="text-amber-600 font-medium">{c.observacao}</span></p>}
                              </div>
                            </div>
                            {c.telefone && (
                              <div className="pt-3 border-t flex gap-2">
                                <Button size="sm" variant="outline" className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 text-xs" onClick={() => { setClienteWpp(c); setWhatsappAberto(true); }}>
                                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {clienteWpp && (
        <WhatsappModal
          open={whatsappAberto}
          onClose={() => { setWhatsappAberto(false); setClienteWpp(null); }}
          clienteNome={clienteWpp.nome}
          telefone={clienteWpp.telefone ?? ""}
          valor={parseFloat(clienteWpp.valorMensal ?? "0")}
          mesReferencia="Mês atual"
          vencimento={`Dia ${clienteWpp.diaVencimento ?? "—"}`}
        />
      )}
    </div>
  );
}
