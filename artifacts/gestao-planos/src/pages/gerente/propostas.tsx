import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { OrdenacaoFiltros, ordenarPropostas, dentroDoPeriodo, type OrdemProposta } from "@/components/propostas-ordenacao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { PropostaDetalheDialog, AlterarStatusDialog, type PropostaDetalhe } from "@/components/proposta-gerente-acoes";
import { AtivarPropostaDialog, EditarComissaoMensalDialog, type PropostaComissao } from "@/components/comissao-mensal";

interface DadosTitular {
  nome?: string; cpf?: string; plano?: string; valor?: number;
}

interface Proposta {
  id: string; vendedorId: string; status: string;
  dadosTitular?: DadosTitular; valorTotal?: string | null;
  createdAt?: string; dataAtivacao?: string | null;
  dadosDependentes?: Record<string, unknown>[]; comissaoMensalTitular?: string | null;
  codigoOperadora?: string | null; motivoRecusa?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  AGUARDANDO_ENVIO: { label: "Aguardando envio", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  ENVIADA_OPERADORA: { label: "Enviada à operadora", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  ACEITA: { label: "Aceita", cls: "bg-teal-100 text-teal-700 border-teal-200" },
  RECUSADA: { label: "Recusada", cls: "bg-red-100 text-red-700 border-red-200" },
  ATIVA: { label: "Ativa", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function GerentePropostas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [ordem, setOrdem] = useState<OrdemProposta>("recentes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const qc = useQueryClient();
  const { user } = useAuth();
  const podeAtivar = (user?.permissoes ?? []).includes("ativar_propostas") || user?.role === "admin";
  const [detalhe, setDetalhe] = useState<PropostaDetalhe | null>(null);
  const [alterando, setAlterando] = useState<PropostaDetalhe | null>(null);
  const [ativando, setAtivando] = useState<PropostaComissao | null>(null);
  const [editandoCom, setEditandoCom] = useState<PropostaComissao | null>(null);
  const recarregar = () => void qc.invalidateQueries({ queryKey: ["gerente-propostas"] });

  const { data, isLoading } = useQuery({
    queryKey: ["gerente-propostas"],
    queryFn: () => apiFetch("/gerente/propostas") as Promise<{ propostas: Proposta[] }>,
  });

  const propostas = (data as { propostas: Proposta[] } | undefined)?.propostas ?? [];
  const filtradas = ordenarPropostas(
    propostas.filter(p => {
      const nome = (p.dadosTitular as DadosTitular)?.nome ?? "";
      const matchBusca =
        nome.toLowerCase().includes(search.toLowerCase()) ||
        p.vendedorId.toLowerCase().includes(search.toLowerCase()) ||
        p.status.toLowerCase().includes(search.toLowerCase());
      return matchBusca
        && (statusFilter === "TODOS" || p.status === statusFilter)
        && dentroDoPeriodo(p.createdAt, de, ate);
    }),
    ordem,
    p => p.dadosTitular?.nome ?? "",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
        <p className="text-muted-foreground mt-1">{propostas.length} propostas no sistema</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {Object.values(STATUS_BADGE).map(s => (
          <Badge key={s.label} className={s.cls}>{s.label}: {propostas.filter(p => STATUS_BADGE[p.status]?.label === s.label).length}</Badge>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="relative md:col-span-2 lg:col-span-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, consultor ou status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os status</SelectItem>
              {Object.entries(STATUS_BADGE).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <OrdenacaoFiltros ordem={ordem} onOrdem={setOrdem} de={de} onDe={setDe} ate={ate} onAte={setAte} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : (
        <Card className="border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhuma proposta encontrada
                  </TableCell>
                </TableRow>
              ) : filtradas.map(p => {
                const dt = p.dadosTitular as DadosTitular | undefined;
                const badge = STATUS_BADGE[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{dt?.nome ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.vendedorId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{dt?.plano ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMoney(parseFloat(p.valorTotal ?? "0"))}</TableCell>
                    <TableCell>
                      {badge ? (
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      ) : (
                        <Badge variant="outline">{p.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(p as PropostaDetalhe)}>Ver dados</Button>
                      {podeAtivar && (p.status === "AGUARDANDO_ENVIO" || p.status === "ENVIADA_OPERADORA") && (
                        <Button size="sm" variant="outline" onClick={() => setAlterando(p as PropostaDetalhe)}>Status</Button>
                      )}
                      {podeAtivar && (<>
                        {p.status === "ACEITA" && (
                          <Button size="sm" variant="outline" onClick={() => setAtivando(p)}>Ativar</Button>
                        )}
                        {p.status === "ATIVA" && (
                          <Button size="sm" variant="outline" onClick={() => setEditandoCom(p)}>Comissão</Button>
                        )}
                      </>)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <PropostaDetalheDialog proposta={detalhe} onClose={() => setDetalhe(null)} />
      <AlterarStatusDialog proposta={alterando} basePath="/gerente" onClose={() => setAlterando(null)} onSaved={recarregar} />
      <AtivarPropostaDialog proposta={ativando} basePath="/gerente" onClose={() => setAtivando(null)} onSaved={recarregar} />
      <EditarComissaoMensalDialog proposta={editandoCom} basePath="/gerente" onClose={() => setEditandoCom(null)} onSaved={recarregar} />
    </div>
  );
}
