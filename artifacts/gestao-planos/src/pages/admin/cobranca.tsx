import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Search, MessageCircle, AlertTriangle, Clock, Ban, Loader2, RefreshCw } from "lucide-react";
import { WhatsappModal } from "@/components/whatsapp-modal";

type BoletoAdminAPI = {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCpf: string;
  clienteTelefone?: string | null;
  vendedorNome?: string | null;
  planoCode?: string | null;
  valor: string;
  vencimento: string;
  status: string;
  codigoBarras?: string | null;
  mesReferencia: string;
  linkPagamento?: string | null;
  dataPagamento?: string | null;
  createdAt: string;
};

function badgeCobranca(status: string) {
  if (status === "VENCIDO") return "border-red-300 bg-red-50 text-red-700";
  if (status === "PENDENTE") return "border-amber-300 bg-amber-50 text-amber-700";
  return "";
}

function labelStatus(status: string) {
  if (status === "VENCIDO") return "Vencido";
  if (status === "PENDENTE") return "Pendente";
  return status;
}

function formatDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default function AdminCobranca() {
  const [boletos, setBoletos] = useState<BoletoAdminAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [vendedorFilter, setVendedorFilter] = useState("TODOS");
  const [modalAberto, setModalAberto] = useState(false);
  const [boletoSelecionado, setBoletoSelecionado] = useState<BoletoAdminAPI | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/boletos") as { boletos: BoletoAdminAPI[] };
      // cobrança = somente boletos pendentes ou vencidos
      const inadimplentes = (data.boletos ?? []).filter(b => b.status === "PENDENTE" || b.status === "VENCIDO");
      setBoletos(inadimplentes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const vendedores = useMemo(() =>
    Array.from(new Set(boletos.map(b => b.vendedorNome ?? "—"))).filter(v => v !== "—").sort(), [boletos]);

  const filtrados = useMemo(() => boletos.filter(b => {
    const matchSearch = b.clienteNome.toLowerCase().includes(search.toLowerCase()) || b.clienteCpf.includes(search);
    const matchStatus = statusFilter === "TODOS" || b.status === statusFilter;
    const matchVendedor = vendedorFilter === "TODOS" || (b.vendedorNome ?? "—") === vendedorFilter;
    return matchSearch && matchStatus && matchVendedor;
  }), [search, statusFilter, vendedorFilter, boletos]);

  const qtdPendente = boletos.filter(b => b.status === "PENDENTE").length;
  const totalPendente = boletos.filter(b => b.status === "PENDENTE").reduce((a, b) => a + parseFloat(b.valor), 0);
  const qtdVencido = boletos.filter(b => b.status === "VENCIDO").length;
  const totalVencido = boletos.filter(b => b.status === "VENCIDO").reduce((a, b) => a + parseFloat(b.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Cobrança</h2>
          <p className="text-muted-foreground">Gestão de inadimplência e envio de notificações via WhatsApp.</p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{qtdPendente}</div>
            <p className="text-sm text-muted-foreground mt-1">{formatMoney(totalPendente)} em aberto</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" /> Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{qtdVencido}</div>
            <p className="text-sm text-muted-foreground mt-1">{formatMoney(totalVencido)} em atraso</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-600">
              <Ban className="h-4 w-4" /> Total Inadimplente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{qtdPendente + qtdVencido}</div>
            <p className="text-sm text-muted-foreground mt-1">{formatMoney(totalPendente + totalVencido)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente ou CPF..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-cobranca" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44" data-testid="select-status-cobranca">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger className="w-full md:w-44" data-testid="select-vendedor-cobranca">
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os vendedores</SelectItem>
                {vendedores.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Mês Ref.</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">WhatsApp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : filtrados.map(boleto => (
                <TableRow key={boleto.id} data-testid={`row-cobranca-${boleto.id}`} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{boleto.clienteNome}</span>
                      <span className="text-xs text-muted-foreground font-mono">{boleto.clienteCpf}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{boleto.vendedorNome ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{boleto.planoCode ?? "—"}</TableCell>
                  <TableCell className="text-sm">{boleto.mesReferencia}</TableCell>
                  <TableCell className="text-sm">{formatDate(boleto.vencimento)}</TableCell>
                  <TableCell className="text-right font-bold">{formatMoney(parseFloat(boleto.valor))}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={badgeCobranca(boleto.status)}>
                      {labelStatus(boleto.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="outline"
                      className="h-8 gap-1.5 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500"
                      onClick={() => { setBoletoSelecionado(boleto); setModalAberto(true); }}
                      data-testid={`btn-whatsapp-${boleto.id}`}>
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {boletoSelecionado && (
        <WhatsappModal
          open={modalAberto}
          onClose={() => { setModalAberto(false); setBoletoSelecionado(null); }}
          clienteNome={boletoSelecionado.clienteNome}
          telefone={boletoSelecionado.clienteTelefone ?? ""}
          valor={parseFloat(boletoSelecionado.valor)}
          mesReferencia={boletoSelecionado.mesReferencia}
          vencimento={formatDate(boletoSelecionado.vencimento)}
          clienteId={boletoSelecionado.clienteId}
          boletoId={boletoSelecionado.id}
        />
      )}
    </div>
  );
}
