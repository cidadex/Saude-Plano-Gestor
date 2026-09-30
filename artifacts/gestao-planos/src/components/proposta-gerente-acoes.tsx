import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

export interface PropostaDetalhe {
  id: string;
  status: string;
  dadosTitular?: Record<string, unknown>;
  dadosDependentes?: Record<string, unknown>[];
  codigoOperadora?: string | null;
  motivoRecusa?: string | null;
}

const ROTULOS: [string, string][] = [
  ["nome", "Nome"], ["cpf", "CPF"], ["rg", "RG"], ["rgOrgaoEmissor", "Órgão emissor"], ["rgUf", "UF do RG"],
  ["dataNascimento", "Data de nascimento"], ["sexo", "Sexo"], ["estadoCivil", "Estado civil"], ["nomeMae", "Nome da mãe"],
  ["grauParentesco", "Vínculo"], ["telefone", "Telefone"], ["email", "E-mail"],
  ["cep", "CEP"], ["logradouro", "Logradouro"], ["numero", "Número"], ["complemento", "Complemento"],
  ["bairro", "Bairro"], ["cidade", "Cidade"], ["estado", "UF"],
  ["plano", "Plano"], ["codigoPlano", "Código do plano"], ["planoNome", "Plano"], ["valor", "Valor"],
  ["formaPagamento", "Forma de pagamento"], ["diaVencimento", "Dia de vencimento"], ["observacao", "Observação"],
];

function Dados({ titulo, dados }: { titulo: string; dados: Record<string, unknown> }) {
  const linhas = ROTULOS
    .filter(([k]) => dados[k] !== undefined && dados[k] !== null && String(dados[k]).trim() !== "")
    .map(([k, r]) => [r, String(dados[k])] as const);
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-semibold">{titulo}</p>
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 select-text">
        {linhas.map(([r, v]) => (
          <div key={r}>
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{r}</dt>
            <dd className="text-sm break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PropostaDetalheDialog({ proposta, onClose }: { proposta: PropostaDetalhe | null; onClose: () => void }) {
  return (
    <Dialog open={!!proposta} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados da proposta</DialogTitle>
          <DialogDescription>Informações do cadastro para consulta e transcrição no site da operadora.</DialogDescription>
        </DialogHeader>
        {proposta && (
          <div className="space-y-3">
            {proposta.codigoOperadora && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm select-text">
                Código na operadora: <strong className="font-mono">{proposta.codigoOperadora}</strong>
              </div>
            )}
            {proposta.motivoRecusa && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm select-text">Motivo da recusa: {proposta.motivoRecusa}</div>
            )}
            <Dados titulo="Titular" dados={proposta.dadosTitular ?? {}} />
            {(proposta.dadosDependentes ?? []).map((d, i) => (
              <Dados key={i} titulo={`Dependente ${i + 1}`} dados={d} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AlterarStatusDialog({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaDetalhe | null; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  return (
    <Dialog open={!!proposta} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar status</DialogTitle>
          <DialogDescription>{String(proposta?.dadosTitular?.nome ?? "")}</DialogDescription>
        </DialogHeader>
        {proposta && <StatusForm key={proposta.id} proposta={proposta} basePath={basePath} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function StatusForm({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaDetalhe; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  const aguardando = proposta.status === "AGUARDANDO_ENVIO";
  const [destino, setDestino] = useState(aguardando ? "ENVIADA_OPERADORA" : "ACEITA");
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const opcoes = aguardando
    ? [["ENVIADA_OPERADORA", "Enviada à operadora"]]
    : [["ACEITA", "Aceita"], ["RECUSADA", "Recusada"]];
  const ok = destino === "ENVIADA_OPERADORA" ? codigo.trim() !== "" : destino === "RECUSADA" ? motivo.trim() !== "" : true;
  const salvar = async () => {
    setSaving(true); setErro("");
    try {
      await apiFetch(`${basePath}/propostas/${proposta.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: destino, codigoOperadora: codigo, motivoRecusa: motivo }),
      });
      onSaved(); onClose();
    } catch (err) { setErro(String(err)); } finally { setSaving(false); }
  };
  return (
    <>
      <div className="space-y-1.5">
        <Label>Novo status</Label>
        <select className="w-full h-9 rounded-md border bg-background px-3 text-sm" value={destino} onChange={e => setDestino(e.target.value)}>
          {opcoes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {destino === "ENVIADA_OPERADORA" && (
        <div className="space-y-1.5">
          <Label htmlFor="cod-op">Código do beneficiário na operadora *</Label>
          <Input id="cod-op" value={codigo} className="font-mono uppercase" placeholder="Ex.: 086NV"
            onChange={e => setCodigo(e.target.value.toUpperCase())} />
        </div>
      )}
      {destino === "RECUSADA" && (
        <div className="space-y-1.5">
          <Label htmlFor="mot">Motivo da recusa *</Label>
          <Textarea id="mot" value={motivo} onChange={e => setMotivo(e.target.value)} />
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void salvar()} disabled={saving || !ok}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
        </Button>
      </DialogFooter>
    </>
  );
}
