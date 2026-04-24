import { Link } from "wouter";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SemPermissao() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
        <ShieldAlert className="w-10 h-10 text-amber-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso não autorizado</h1>
        <p className="text-muted-foreground max-w-sm">
          Você não tem permissão para acessar esta seção. Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/gerente">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Link>
      </Button>
    </div>
  );
}
