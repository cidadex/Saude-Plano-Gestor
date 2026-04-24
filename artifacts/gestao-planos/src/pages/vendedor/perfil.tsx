import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { KeyRound, User, Loader2, Check } from "lucide-react";

export default function VendedorPerfil() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setSuccess(false); };

  const handleSave = async () => {
    if (!form.senhaAtual || !form.novaSenha || !form.confirmar) {
      return toast({ variant: "destructive", title: "Preencha todos os campos" });
    }
    if (form.novaSenha !== form.confirmar) {
      return toast({ variant: "destructive", title: "A nova senha e a confirmação não coincidem" });
    }
    if (form.novaSenha.length < 6) {
      return toast({ variant: "destructive", title: "A nova senha deve ter no mínimo 6 caracteres" });
    }
    setSaving(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
      });
      toast({ title: "Senha alterada com sucesso!" });
      setForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
      setSuccess(true);
    } catch (err: unknown) {
      toast({ variant: "destructive", title: String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="pb-4 border-b">
        <h2 className="text-3xl font-bold tracking-tight">Meu Perfil</h2>
        <p className="text-muted-foreground mt-1">Informações da sua conta e alteração de senha.</p>
      </div>

      {/* Info da conta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Dados da conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Nome</p>
            <p className="font-medium">{user?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">E-mail</p>
            <p className="font-medium font-mono text-sm">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Perfil</p>
            <p className="font-medium capitalize">{user?.role ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Troca de senha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </CardTitle>
          <CardDescription>Escolha uma senha com pelo menos 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input
              type="password"
              value={form.senhaAtual}
              onChange={e => set("senhaAtual", e.target.value)}
              placeholder="Digite sua senha atual"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={form.novaSenha}
              onChange={e => set("novaSenha", e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              value={form.confirmar}
              onChange={e => set("confirmar", e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              Senha alterada com sucesso!
            </div>
          )}

          <Button onClick={() => void handleSave()} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar nova senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
