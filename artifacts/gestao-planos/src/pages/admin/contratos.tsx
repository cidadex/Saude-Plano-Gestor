import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { FileText, Plus, Pencil, Trash2, KeyRound, Users, ShieldCheck, ShieldAlert } from "lucide-react";

type Contrato = {
  id: string;
  nome: string;
  descricao: string | null;
  asaasModo: "SANDBOX" | "PRODUCAO";
  asaasApiKeyMasked: string | null;
  asaasApiKeyConfigured: boolean;
  ativo: boolean;
  totalBeneficiarios: number;
};

type FormState = {
  nome: string;
  descricao: string;
  asaasApiKey: string;
  asaasModo: "SANDBOX" | "PRODUCAO";
  ativo: boolean;
};

const empty: FormState = { nome: "", descricao: "", asaasApiKey: "", asaasModo: "SANDBOX", ativo: true };

export default function AdminContratos() {
  const { toast } = useToast();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ contratos: Contrato[] }>("/admin/contratos");
      setContratos(data.contratos);
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha ao carregar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const abrirNovo = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const abrirEdicao = (c: Contrato) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      descricao: c.descricao ?? "",
      asaasApiKey: "",
      asaasModo: c.asaasModo,
      ativo: c.ativo,
    });
    setOpen(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<FormState> = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        asaasModo: form.asaasModo,
        ativo: form.ativo,
      };
      if (form.asaasApiKey.trim()) payload.asaasApiKey = form.asaasApiKey.trim();

      if (editing) {
        await apiFetch(`/admin/contratos/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Contrato atualizado" });
      } else {
        await apiFetch(`/admin/contratos`, { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Contrato criado" });
      }
      setOpen(false);
      await carregar();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remover = async (c: Contrato) => {
    if (c.totalBeneficiarios > 0) {
      toast({ title: "Não permitido", description: "Existem beneficiários vinculados — desative o contrato no lugar.", variant: "destructive" });
      return;
    }
    if (!confirm(`Excluir contrato "${c.nome}"?`)) return;
    try {
      await apiFetch(`/admin/contratos/${c.id}`, { method: "DELETE" });
      toast({ title: "Contrato excluído" });
      await carregar();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "Falha", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Contratos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cada contrato carrega sua própria chave da Asaas. Os boletos serão emitidos sob a chave do contrato do beneficiário.
          </p>
        </div>
        <Button onClick={abrirNovo} data-testid="btn-novo-contrato" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contratos cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : contratos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum contrato cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-semibold">Nome</th>
                    <th className="py-2 pr-4 font-semibold">Modo</th>
                    <th className="py-2 pr-4 font-semibold">Chave Asaas</th>
                    <th className="py-2 pr-4 font-semibold">Beneficiários</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-2 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map(c => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-4 align-top">
                        <div className="font-medium">{c.nome}</div>
                        {c.descricao && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-md">{c.descricao}</div>}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Badge variant={c.asaasModo === "PRODUCAO" ? "default" : "outline"}>
                          {c.asaasModo === "PRODUCAO" ? "PRODUÇÃO" : "SANDBOX"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {c.asaasApiKeyConfigured ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-mono">
                            <KeyRound className="h-3.5 w-3.5" /> {c.asaasApiKeyMasked}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 text-xs">
                            <ShieldAlert className="h-3.5 w-3.5" /> Não configurada
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" /> {c.totalBeneficiarios}
                        </span>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        {c.ativo ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="h-3 w-3 mr-1" />Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-right align-top">
                        <Button size="sm" variant="ghost" onClick={() => abrirEdicao(c)} data-testid={`btn-editar-${c.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void remover(c)} className="text-rose-600 hover:text-rose-700" data-testid={`btn-excluir-${c.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
            <DialogDescription>
              Configure o nome, a chave de API da Asaas e o modo de operação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome do contrato *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Contrato PJ ACME" data-testid="input-nome-contrato" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Notas internas sobre este contrato" rows={2} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Modo Asaas</Label>
                <Select value={form.asaasModo} onValueChange={(v: "SANDBOX" | "PRODUCAO") => setForm({ ...form, asaasModo: v })}>
                  <SelectTrigger data-testid="select-modo-asaas"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SANDBOX">SANDBOX (testes)</SelectItem>
                    <SelectItem value="PRODUCAO">PRODUÇÃO (real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border">
                  <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
                  <span className="text-sm">{form.ativo ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Chave de API (Asaas)</Label>
              <Input
                value={form.asaasApiKey}
                onChange={e => setForm({ ...form, asaasApiKey: e.target.value })}
                placeholder={editing?.asaasApiKeyConfigured ? `Atual: ${editing.asaasApiKeyMasked} — deixe vazio para manter` : "$aact_..."}
                className="font-mono text-xs"
                data-testid="input-chave-asaas"
              />
              <p className="text-xs text-muted-foreground">
                {editing?.asaasApiKeyConfigured
                  ? "A chave atual será mantida se o campo estiver vazio."
                  : "A chave fica armazenada no banco e nunca é retornada — só sua máscara."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={saving} data-testid="btn-salvar-contrato">
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
