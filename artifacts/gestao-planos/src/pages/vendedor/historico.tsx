import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useComunicacoes } from "@/hooks/useVendedorData";
import { formatMoney } from "@/lib/format";
import { Search, MessageCircle, CheckCheck, AlertTriangle, BellRing, Loader2 } from "lucide-react";

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BOLETO_EMITIDO: { label: "Envio de Boleto", color: "border-blue-300 bg-blue-50 text-blue-700", icon: MessageCircle },
  ATRASO: { label: "Cobrança de Atraso", color: "border-amber-300 bg-amber-50 text-amber-700", icon: AlertTriangle },
  AVISO_SUSPENSAO: { label: "Aviso de Suspensão", color: "border-red-300 bg-red-50 text-red-700", icon: BellRing },
  SUSPENSO: { label: "Suspenso", color: "border-gray-300 bg-gray-50 text-gray-700", icon: BellRing },
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VendedorHistorico() {
  const { comunicacoes, loading } = useComunicacoes();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("TODOS");

  const filtrados = useMemo(() => comunicacoes.filter(c => {
    const matchSearch = c.clienteNome.toLowerCase().includes(search.toLowerCase()) || c.clienteCpf.includes(search);
    const matchTipo = tipoFilter === "TODOS" || c.tipo === tipoFilter;
    return matchSearch && matchTipo;
  }), [search, tipoFilter, comunicacoes]);

  const porTipo = useMemo(() => ({
    BOLETO_EMITIDO: comunicacoes.filter(c => c.tipo === "BOLETO_EMITIDO").length,
    ATRASO: comunicacoes.filter(c => c.tipo === "ATRASO").length,
    AVISO_SUSPENSAO: comunicacoes.filter(c => c.tipo === "AVISO_SUSPENSAO").length,
  }), [comunicacoes]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Histórico de Comunicações</h2>
        <p className="text-muted-foreground">Registro de todas as mensagens WhatsApp enviadas para os seus clientes.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Boletos Enviados</p>
              <MessageCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{porTipo.BOLETO_EMITIDO}</p>
            <p className="text-xs text-muted-foreground">notificações de boleto</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Cobranças</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{porTipo.ATRASO}</p>
            <p className="text-xs text-muted-foreground">cobranças de atraso</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avisos de Suspensão</p>
              <BellRing className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{porTipo.AVISO_SUSPENSAO}</p>
            <p className="text-xs text-muted-foreground">avisos críticos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1">Buscar cliente</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Nome ou CPF..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Tipo de mensagem</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os tipos</SelectItem>
                <SelectItem value="BOLETO_EMITIDO">Envio de Boleto</SelectItem>
                <SelectItem value="ATRASO">Cobrança de Atraso</SelectItem>
                <SelectItem value="AVISO_SUSPENSAO">Aviso de Suspensão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{filtrados.length}</span> registro{filtrados.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {comunicacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <CheckCheck className="h-10 w-10 opacity-20" />
            <div className="text-center">
              <p className="font-medium">Nenhuma comunicação registrada</p>
              <p className="text-sm mt-1">As mensagens enviadas via WhatsApp aparecerão aqui automaticamente.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Data / Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Mensagem</TableHead>
                <TableHead>Boleto Ref.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado com esses filtros.
                  </TableCell>
                </TableRow>
              ) : filtrados.map(c => {
                const cfg = TIPO_CONFIG[c.tipo];
                const Icon = cfg?.icon ?? MessageCircle;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{c.clienteNome}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.clienteCpf}</div>
                      {c.clienteTelefone && (
                        <div className="text-xs text-muted-foreground">{c.clienteTelefone}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1.5 ${cfg?.color ?? ""}`}>
                        <Icon className="h-3 w-3" />
                        {cfg?.label ?? c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.boleto ? (
                        <div>
                          <span className="font-medium">{c.boleto.mesReferencia}</span>
                          <span className="text-muted-foreground ml-2">{formatMoney(parseFloat(c.boleto.valor))}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
