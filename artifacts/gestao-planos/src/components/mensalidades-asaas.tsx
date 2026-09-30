import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { Loader2, Receipt } from "lucide-react";

type Estado = {
  rodando: boolean; mes: string; total: number; processados: number; criados: number;
  jaExistentes: number; semContrato: number; erros: { clienteNome: string; erro: string }[];
  finalizadoEm: string | null; mesPadrao: string;
};
type Contrato = { id: string; nome: string; asaasApiKeyConfigured: boolean };

export function MensalidadesAsaas({ onDone }: { onDone: () => void }) {
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [contratoId, setContratoId] = useState("TODOS");
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const tinhaRodando = useRef(false);

  const buscar = useCallback(async () => {
    const e = await apiFetch<Estado>("/admin/asaas/mensalidades/status");
    setEstado(e);
    if (tinhaRodando.current && !e.rodando) onDone();
    tinhaRodando.current = e.rodando;
  }, [onDone]);

  useEffect(() => {
    apiFetch<{ contratos: Contrato[] }>("/admin/contratos").then(r => setContratos((r.contratos ?? []).filter(c => c.asaasApiKeyConfigured))).catch(() => undefined);
    buscar().catch(e => setErro(String(e)));
  }, [buscar]);
  useEffect(() => {
    if (!estado?.rodando) return;
    const t = setInterval(() => void buscar().catch(() => undefined), 2000);
    return () => clearInterval(t);
  }, [estado?.rodando, buscar]);

  const gerar = async () => {
    const [a, m] = mes.split("-");
    if (!window.confirm(`Gerar no Asaas os boletos de ${m}/${a} para os clientes ativos? Clientes que já têm boleto no mês serão ignorados.`)) return;
    setErro("");
    try {
      await apiFetch("/admin/asaas/mensalidades/gerar", { method: "POST", body: JSON.stringify({ mes: `${m}/${a}`, contratoId: contratoId === "TODOS" ? undefined : contratoId }) });
      tinhaRodando.current = true;
      await buscar();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  };

  const concluido = estado && !estado.rodando && estado.finalizadoEm;
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2"><Receipt className="h-4 w-4" /> Mensalidades (Asaas)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Mês</label>
            <Input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-44" data-testid="input-mes-mensalidades" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Contrato</label>
            <Select value={contratoId} onValueChange={setContratoId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos com chave Asaas</SelectItem>
                {contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void gerar()} disabled={!!estado?.rodando || !mes} data-testid="btn-gerar-mensalidades">
            {estado?.rodando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Gerar mensalidades do mês
          </Button>
        </div>
        {estado?.rodando && <p className="text-sm">Gerando {estado.mes}: {estado.processados}/{estado.total} clientes · {estado.criados} boletos criados…</p>}
        {concluido && (
          <div className="text-sm space-y-1">
            <p>Último lote ({estado.mes}): <strong>{estado.criados}</strong> criados · {estado.jaExistentes} já existiam · {estado.semContrato} clientes ativos sem contrato com chave Asaas · <span className={estado.erros.length ? "text-red-600 font-semibold" : ""}>{estado.erros.length} com erro</span></p>
            {estado.erros.slice(0, 20).map((e, i) => <p key={i} className="text-xs text-red-600">{e.clienteNome}: {e.erro}</p>)}
            {estado.erros.length > 20 && <p className="text-xs text-muted-foreground">… e mais {estado.erros.length - 20} erros.</p>}
          </div>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </CardContent>
    </Card>
  );
}
