import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { lerPlanilha, textoCelula } from "@/lib/importar-planilha";
import { Loader2, Upload } from "lucide-react";

type Relatorio = {
  titulares: number; dependentes: number; responsaveis: number; vendedoresCriados: string[];
  removidos: Record<string, number> | null; avisos: string[]; erros: { cpf: string; nome: string; erro: string }[];
};

export function ImportarVitalgestorDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [linhas, setLinhas] = useState<Record<string, string>[]>([]);
  const [substituir, setSubstituir] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [rel, setRel] = useState<Relatorio | null>(null);

  const fechar = () => { setLinhas([]); setSubstituir(false); setErro(""); setRel(null); onClose(); };

  const escolher = async (f: File | undefined) => {
    if (!f) return;
    setErro("");
    try {
      const { cabecalho, linhas: l } = await lerPlanilha(f);
      setLinhas(l.map(r => Object.fromEntries(cabecalho.map((c, i) => [c, textoCelula(r[i])]))));
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  };

  const importar = async () => {
    setEnviando(true); setErro("");
    try {
      setRel(await apiFetch<Relatorio>("/admin/clientes/importar-vitalgestor", { method: "POST", body: JSON.stringify({ linhas, substituir }) }));
      onDone();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); } finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) fechar(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar planilha Vitalgestor</DialogTitle>
          <DialogDescription>
            Cada titular vira beneficiário e responsável financeiro. Os dependentes ficam vinculados ao titular do mesmo CPF.
          </DialogDescription>
        </DialogHeader>
        {!rel ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm hover:bg-muted/40">
              <Upload className="h-4 w-4" />
              <span>{linhas.length ? `${linhas.length} linhas lidas. Clique para trocar.` : "Escolher arquivo .xlsx"}</span>
              <input type="file" accept=".xlsx" className="hidden" data-testid="input-vital-arquivo" onChange={e => void escolher(e.target.files?.[0])} />
            </label>
            <label className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={substituir} onChange={e => setSubstituir(e.target.checked)} data-testid="check-vital-substituir" />
              <span>
                <strong>Apagar antes todos os beneficiários, responsáveis, propostas, boletos e comissões atuais</strong> (dados de teste).
                Esta ação não pode ser desfeita.
              </span>
            </label>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
          </div>
        ) : (
          <div className="space-y-2 text-sm" data-testid="resultado-vital">
            <p><strong>{rel.titulares}</strong> titulares, <strong>{rel.dependentes}</strong> dependentes e <strong>{rel.responsaveis}</strong> responsáveis novos.</p>
            {rel.removidos && <p>Removidos: {Object.entries(rel.removidos).map(([k, v]) => `${v} ${k}`).join(", ")}.</p>}
            {rel.vendedoresCriados.length > 0 && <p>Vendedores criados (sem acesso até definir e-mail e senha): {rel.vendedoresCriados.join(", ")}.</p>}
            {rel.avisos.map((a, i) => <p key={i} className="text-amber-700">{a}</p>)}
            {rel.erros.map((e, i) => <p key={i} className="text-red-600">{e.nome || e.cpf}: {e.erro}</p>)}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={fechar}>{rel ? "Fechar" : "Cancelar"}</Button>
          {!rel && (
            <Button onClick={() => void importar()} disabled={!linhas.length || enviando} data-testid="btn-vital-importar">
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
