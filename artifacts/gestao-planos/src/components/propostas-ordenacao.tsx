import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type OrdemProposta = "recentes" | "antigas" | "nome_az" | "nome_za" | "valor_desc" | "valor_asc" | "status";

const OPCOES: { value: OrdemProposta; label: string }[] = [
  { value: "recentes", label: "Data de cadastro (mais recentes)" },
  { value: "antigas", label: "Data de cadastro (mais antigas)" },
  { value: "nome_az", label: "Nome (A–Z)" },
  { value: "nome_za", label: "Nome (Z–A)" },
  { value: "valor_desc", label: "Valor (maior primeiro)" },
  { value: "valor_asc", label: "Valor (menor primeiro)" },
  { value: "status", label: "Status" },
];

interface Ordenavel {
  createdAt?: string | null;
  status: string;
  valorTotal?: string | null;
}

export function ordenarPropostas<T extends Ordenavel>(list: T[], ordem: OrdemProposta, getNome: (p: T) => string): T[] {
  const time = (p: T) => (p.createdAt ? new Date(p.createdAt).getTime() : 0);
  const valor = (p: T) => parseFloat(p.valorTotal ?? "0") || 0;
  const copia = [...list];
  switch (ordem) {
    case "antigas": return copia.sort((a, b) => time(a) - time(b));
    case "nome_az": return copia.sort((a, b) => getNome(a).localeCompare(getNome(b), "pt-BR"));
    case "nome_za": return copia.sort((a, b) => getNome(b).localeCompare(getNome(a), "pt-BR"));
    case "valor_desc": return copia.sort((a, b) => valor(b) - valor(a));
    case "valor_asc": return copia.sort((a, b) => valor(a) - valor(b));
    case "status": return copia.sort((a, b) => a.status.localeCompare(b.status) || time(b) - time(a));
    default: return copia.sort((a, b) => time(b) - time(a));
  }
}

/** de/ate em YYYY-MM-DD, comparados com a data de cadastro no fuso local. */
export function dentroDoPeriodo(createdAt: string | null | undefined, de: string, ate: string): boolean {
  if (!de && !ate) return true;
  if (!createdAt) return false;
  const d = new Date(createdAt);
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return (!de || dia >= de) && (!ate || dia <= ate);
}

export function OrdenacaoFiltros({ ordem, onOrdem, de, onDe, ate, onAte }: {
  ordem: OrdemProposta; onOrdem: (o: OrdemProposta) => void;
  de: string; onDe: (v: string) => void; ate: string; onAte: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Ordenar por</label>
        <Select value={ordem} onValueChange={v => onOrdem(v as OrdemProposta)}>
          <SelectTrigger className="bg-background" data-testid="select-ordem-propostas"><SelectValue /></SelectTrigger>
          <SelectContent>{OPCOES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Cadastro de</label>
        <Input type="date" className="bg-background" value={de} onChange={e => onDe(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">Cadastro até</label>
        <Input type="date" className="bg-background" value={ate} onChange={e => onAte(e.target.value)} />
      </div>
    </>
  );
}
