import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

export interface PropostaComissao {
  id: string;
  dadosTitular?: { nome?: string };
  dadosDependentes?: Record<string, unknown>[];
  comissaoMensalTitular?: string | null;
  contratoId?: string | null;
}

export interface ContratoOpcao { id: string; nome: string; asaasModo?: string }

export function ContratoAtivacaoSelect({ contratos, value, onChange }: {
  contratos: ContratoOpcao[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Contrato *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-ativacao-contrato"><SelectValue placeholder="Selecione o contrato..." /></SelectTrigger>
        <SelectContent>
          {contratos.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.nome} {c.asaasModo === "SANDBOX" && "(sandbox)"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ComissaoMensalFields({
  titular,
  onTitular,
  dependentes,
  dependentesValores,
  onDependente,
}: {
  titular: string;
  onTitular: (v: string) => void;
  dependentes: Record<string, unknown>[];
  dependentesValores: string[];
  onDependente: (i: number, v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div>
        <Label className="text-amber-900">Comissão mensal por beneficiário (R$)</Label>
        <p className="mt-1 text-xs text-amber-800/80">
          Valor pago ao vendedor a cada mensalidade paga. Varia conforme idade, plano e tipo de captação.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="com-titular">Titular</Label>
        <Input id="com-titular" type="number" min="0" step="0.01" value={titular}
          onChange={e => onTitular(e.target.value)} placeholder="Ex.: 25,00" data-testid="input-comissao-titular" />
      </div>
      {dependentes.map((d, i) => (
        <div key={i} className="space-y-1.5">
          <Label htmlFor={`com-dep-${i}`}>Dependente: {String(d.nome ?? i + 1)}</Label>
          <Input id={`com-dep-${i}`} type="number" min="0" step="0.01" value={dependentesValores[i] ?? ""}
            onChange={e => onDependente(i, e.target.value)} placeholder="Ex.: 15,00"
            data-testid={`input-comissao-dep-${i}`} />
        </div>
      ))}
    </div>
  );
}

function useComissaoState(p: PropostaComissao | null) {
  const deps = p?.dadosDependentes ?? [];
  const [titular, setTitular] = useState(p?.comissaoMensalTitular ?? "");
  const [valores, setValores] = useState<string[]>(deps.map(d => String(d.comissaoMensal ?? "")));
  return { titular, setTitular, valores, setValor: (i: number, v: string) => setValores(a => a.map((x, j) => j === i ? v : x)), deps };
}

/** Edita a comissão mensal de uma proposta já ativada. basePath: "/admin" ou "/gerente". */
function EditarForm({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaComissao; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  const st = useComissaoState(proposta);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const salvar = async () => {
    setSaving(true); setErro("");
    try {
      await apiFetch(`${basePath}/propostas/${proposta.id}/comissao-mensal`, {
        method: "PATCH",
        body: JSON.stringify({ comissaoMensalTitular: st.titular, comissaoMensalDependentes: st.valores }),
      });
      onSaved(); onClose();
    } catch (err) { setErro(String(err)); } finally { setSaving(false); }
  };
  return (
    <>
      <ComissaoMensalFields titular={st.titular} onTitular={st.setTitular} dependentes={st.deps}
        dependentesValores={st.valores} onDependente={st.setValor} />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void salvar()} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditarComissaoMensalDialog({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaComissao | null; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  return (
    <Dialog open={!!proposta} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comissão mensal</DialogTitle>
          <DialogDescription>{proposta ? proposta.dadosTitular?.nome ?? "" : ""}</DialogDescription>
        </DialogHeader>
        {proposta && <EditarForm key={proposta.id} proposta={proposta} basePath={basePath} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function AtivarForm({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaComissao; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  const st = useComissaoState(proposta);
  const [matricula, setMatricula] = useState("");
  const [dataAtivacao, setDataAtivacao] = useState(new Date().toISOString().split("T")[0]);
  const [contratoId, setContratoId] = useState(proposta.contratoId ?? "");
  const [contratos, setContratos] = useState<ContratoOpcao[]>([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  useEffect(() => {
    apiFetch<{ contratos: ContratoOpcao[] }>("/contratos")
      .then(d => setContratos(d.contratos ?? []))
      .catch(err => setErro(String(err)));
  }, []);
  const ok = matricula.trim().length === 14 && !!dataAtivacao && !!contratoId;
  const ativar = async () => {
    setSaving(true); setErro("");
    try {
      await apiFetch(`${basePath}/propostas/${proposta.id}/ativar`, {
        method: "PATCH",
        body: JSON.stringify({
          matricula, dataAtivacao, contratoId,
          comissaoMensalTitular: st.titular, comissaoMensalDependentes: st.valores,
        }),
      });
      onSaved(); onClose();
    } catch (err) { setErro(String(err)); } finally { setSaving(false); }
  };
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="ativ-matricula">Código do Usuário (14 caracteres)</Label>
        <Input id="ativ-matricula" maxLength={14} value={matricula} className="font-mono"
          onChange={e => setMatricula(e.target.value.toUpperCase())} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ativ-data">Data de Ativação</Label>
        <Input id="ativ-data" type="date" value={dataAtivacao} onChange={e => setDataAtivacao(e.target.value)} />
      </div>
      <ContratoAtivacaoSelect contratos={contratos} value={contratoId} onChange={setContratoId} />
      <ComissaoMensalFields titular={st.titular} onTitular={st.setTitular} dependentes={st.deps}
        dependentesValores={st.valores} onDependente={st.setValor} />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => void ativar()} disabled={saving || !ok} className="bg-emerald-600 hover:bg-emerald-700">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ativar
        </Button>
      </DialogFooter>
    </>
  );
}

export function AtivarPropostaDialog({ proposta, basePath, onClose, onSaved }: {
  proposta: PropostaComissao | null; basePath: string; onClose: () => void; onSaved: () => void;
}) {
  return (
    <Dialog open={!!proposta} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ativar proposta</DialogTitle>
          <DialogDescription>{proposta ? proposta.dadosTitular?.nome ?? "" : ""}</DialogDescription>
        </DialogHeader>
        {proposta && <AtivarForm key={proposta.id} proposta={proposta} basePath={basePath} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}
