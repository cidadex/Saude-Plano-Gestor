import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Plus, Pencil, KeyRound, Power, PowerOff, Loader2, Search, ShieldCheck } from "lucide-react";

const TODAS_PERMISSOES = [
  { id: "ver_dashboard", label: "Dashboard" },
  { id: "ver_clientes", label: "Clientes" },
  { id: "ver_financeiro", label: "Financeiro" },
  { id: "ver_comissoes", label: "Comissões" },
  { id: "ver_relatorios", label: "Relatórios" },
  { id: "ver_equipe", label: "Equipe de vendas" },
  { id: "ver_propostas", label: "Propostas" },
  { id: "ver_cobranca", label: "Cobrança" },
];

interface Gerente {
  id: string;
  userId: string;
  nome: string;
  email: string;
  telefone?: string | null;
  permissoes: string[];
  active: boolean;
  createdAt: string;
}

function GerenteModal({
  open,
  onClose,
  gerente,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  gerente?: Gerente;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!gerente;
  const [form, setForm] = useState({
    nome: gerente?.nome ?? "",
    email: gerente?.email ?? "",
    telefone: gerente?.telefone ?? "",
    permissoes: gerente?.permissoes ?? [],
    senha: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const togglePerm = (perm: string) => {
    setForm(f => ({
      ...f,
      permissoes: f.permissoes.includes(perm)
        ? f.permissoes.filter(p => p !== perm)
        : [...f.permissoes, perm],
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (!form.nome || !form.email) { toast({ variant: "destructive", title: "Nome e e-mail são obrigatórios" }); return; }
    if (!isEdit && !form.senha) { toast({ variant: "destructive", title: "Informe a senha inicial" }); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/admin/gerentes/${gerente.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast({ title: "Gerente atualizado com sucesso" });
      } else {
        await apiFetch("/admin/gerentes", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Gerente cadastrado com sucesso" });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Gerente" : "Novo Gerente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome do gerente" />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="gerente@seacec.com.br" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone ?? ""} onChange={e => set("telefone", e.target.value)} placeholder="(85) 99999-0000" />
          </div>
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Senha inicial *</Label>
              <Input type="password" value={form.senha} onChange={e => set("senha", e.target.value)} placeholder="Mín. 6 caracteres" />
            </div>
          )}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Permissões de acesso</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
              {TODAS_PERMISSOES.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox
                    id={p.id}
                    checked={form.permissoes.includes(p.id)}
                    onCheckedChange={() => togglePerm(p.id)}
                  />
                  <label htmlFor={p.id} className="text-sm cursor-pointer">{p.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({ open, onClose, userId, nome }: { open: boolean; onClose: () => void; userId: string; nome: string }) {
  const { toast } = useToast();
  const [nova, setNova] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (): Promise<void> => {
    if (nova.length < 6) { toast({ variant: "destructive", title: "A senha deve ter no mínimo 6 caracteres" }); return; }
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${userId}/reset-password`, { method: "PATCH", body: JSON.stringify({ novaSenha: nova }) });
      toast({ title: `Senha de ${nome} redefinida com sucesso` });
      setNova("");
      onClose();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Redefinir Senha — {nome}</DialogTitle></DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Nova senha</Label>
          <Input type="password" value={nova} onChange={e => setNova(e.target.value)} placeholder="Mín. 6 caracteres" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Redefinir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminGerentes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Gerente | undefined>();
  const [resetTarget, setResetTarget] = useState<{ userId: string; nome: string } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Gerente | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-gerentes"],
    queryFn: () => apiFetch("/admin/gerentes") as Promise<{ gerentes: Gerente[] }>,
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      apiFetch(`/admin/users/${userId}/status`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["admin-gerentes"] });
      toast({ title: v.active ? "Conta ativada" : "Conta suspensa" });
      setSuspendTarget(null);
    },
    onError: (err) => toast({ variant: "destructive", title: String(err) }),
  });

  const gerentes = (data?.gerentes ?? []).filter(g =>
    g.nome.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerentes</h2>
          <p className="text-muted-foreground mt-1">Cadastro e permissões de acesso dos gerentes.</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Gerente
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total de Gerentes</p>
            <p className="text-2xl font-bold">{data?.gerentes.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contas Ativas</p>
            <p className="text-2xl font-bold">{data?.gerentes.filter(g => g.active).length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar gerente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Gerente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gerentes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {data?.gerentes.length === 0 ? "Nenhum gerente cadastrado ainda." : "Nenhum resultado para a busca."}
                </TableCell>
              </TableRow>
            ) : gerentes.map(g => (
              <TableRow key={g.id} className={!g.active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${g.active ? "bg-violet-600" : "bg-slate-400"}`}>
                      {g.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{g.nome}</p>
                      <p className="text-xs text-muted-foreground">{g.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.telefone ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {g.permissoes.length === 0
                      ? <span className="text-xs text-muted-foreground">Sem permissões</span>
                      : g.permissoes.slice(0, 3).map(p => (
                        <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          {TODAS_PERMISSOES.find(x => x.id === p)?.label ?? p}
                        </Badge>
                      ))}
                    {g.permissoes.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">+{g.permissoes.length - 3}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {g.active
                    ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">Ativo</Badge>
                    : <Badge variant="secondary" className="text-xs">Suspenso</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                      onClick={() => { setEditing(g); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Redefinir senha"
                      onClick={() => setResetTarget({ userId: g.userId, nome: g.nome })}>
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${g.active ? "text-red-500 hover:text-red-600" : "text-emerald-600 hover:text-emerald-700"}`}
                      title={g.active ? "Suspender conta" : "Ativar conta"}
                      onClick={() => setSuspendTarget(g)}>
                      {g.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <GerenteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        gerente={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-gerentes"] })}
      />

      {resetTarget && (
        <ResetPasswordModal
          open={!!resetTarget}
          onClose={() => setResetTarget(null)}
          userId={resetTarget.userId}
          nome={resetTarget.nome}
        />
      )}

      {suspendTarget && (
        <AlertDialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{suspendTarget.active ? "Suspender conta" : "Ativar conta"}</AlertDialogTitle>
              <AlertDialogDescription>
                {suspendTarget.active
                  ? `${suspendTarget.nome} não poderá fazer login até ser reativado.`
                  : `${suspendTarget.nome} poderá fazer login novamente.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className={suspendTarget.active ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => statusMutation.mutate({ userId: suspendTarget.userId, active: !suspendTarget.active })}
              >
                {suspendTarget.active ? "Suspender" : "Ativar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
