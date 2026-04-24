import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Copy, Check, Loader2, AlertCircle, FileText, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Boleto = {
  id: string;
  valor: string;
  vencimento: string;
  status: "PENDENTE" | "PAGO" | "VENCIDO" | "CANCELADO";
  codigoBarras?: string | null;
  mesReferencia: string;
  linkPagamento?: string | null;
  dataPagamento?: string | null;
};

const STATUS_BOLETO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE: { label: "Pendente", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  PAGO: { label: "Pago", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  VENCIDO: { label: "Vencido", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  CANCELADO: { label: "Cancelado", color: "bg-slate-100 text-slate-500 border-slate-200", icon: Ban },
};

function formatDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}
function formatMoney(v: string) {
  return `R$ ${parseFloat(v).toFixed(2).replace(".", ",")}`;
}

function CopiaBoleto({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = codigo;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Linha Digitável</p>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
        <code className="text-xs font-mono text-slate-600 flex-1 break-all leading-relaxed">{codigo}</code>
        <button
          onClick={handleCopiar}
          className={`shrink-0 p-2 rounded-md transition-all ${copiado ? "bg-green-100 text-green-600" : "bg-white border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600"}`}
          title="Copiar código de barras"
          data-testid="btn-copiar-codigo"
        >
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {copiado && <p className="text-xs text-green-600 font-medium">Código copiado!</p>}
    </div>
  );
}

export default function ClienteFaturas() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    (apiFetch("/cliente/boletos") as Promise<{ boletos: Boleto[] }>)
      .then(d => setBoletos(d.boletos ?? []))
      .catch(err => setErro(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
    </div>
  );

  if (erro) return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
      <AlertCircle className="h-5 w-5 shrink-0" />
      <span className="text-sm">{erro}</span>
    </div>
  );

  const pendentes = boletos.filter(b => b.status === "PENDENTE");
  const outros = boletos.filter(b => b.status !== "PENDENTE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Minhas Faturas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Histórico de cobranças do seu plano.</p>
      </div>

      {boletos.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma fatura encontrada</p>
          <p className="text-sm mt-1">Seus boletos aparecerão aqui quando disponíveis.</p>
        </div>
      )}

      {/* Pendentes primeiro, com destaque */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Em Aberto</h2>
          {pendentes.map(b => <BoletoCard key={b.id} boleto={b} destaque />)}
        </div>
      )}

      {/* Histórico */}
      {outros.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Histórico</h2>
          {outros.map(b => <BoletoCard key={b.id} boleto={b} />)}
        </div>
      )}
    </div>
  );
}

function BoletoCard({ boleto, destaque = false }: { boleto: Boleto; destaque?: boolean }) {
  const status = STATUS_BOLETO[boleto.status] ?? STATUS_BOLETO["PENDENTE"];
  const StatusIcon = status.icon;

  return (
    <Card className={`border shadow-sm transition-shadow ${destaque ? "border-rose-200 shadow-rose-100" : "border-slate-200"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-lg">{formatMoney(boleto.valor)}</span>
              <Badge className={`${status.color} border text-xs font-semibold gap-1 flex items-center`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Ref. <strong>{boleto.mesReferencia}</strong>
              {boleto.status === "PENDENTE" && <> · Vence <strong>{formatDate(boleto.vencimento)}</strong></>}
              {boleto.status === "PAGO" && boleto.dataPagamento && <> · Pago em <strong>{formatDate(boleto.dataPagamento)}</strong></>}
              {boleto.status === "VENCIDO" && <> · Venceu em <strong>{formatDate(boleto.vencimento)}</strong></>}
            </p>
          </div>
          {boleto.linkPagamento && boleto.status === "PENDENTE" && (
            <Button size="sm" asChild className="bg-rose-500 hover:bg-rose-600 text-white shrink-0">
              <a href={boleto.linkPagamento} target="_blank" rel="noopener noreferrer">Pagar</a>
            </Button>
          )}
        </div>

        {/* Código de barras */}
        {boleto.codigoBarras && boleto.status === "PENDENTE" && (
          <CopiaBoleto codigo={boleto.codigoBarras} />
        )}
      </CardContent>
    </Card>
  );
}
