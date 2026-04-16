import { Link } from "wouter";
import { ShieldAlert, UserCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { vendedorAtual } from "@/data/vendedores";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Hapvida Sales Management</h1>
          <p className="text-lg text-slate-600">Selecione o perfil de acesso para continuar</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/admin">
            <Card className="cursor-pointer hover:border-primary transition-all hover:shadow-md h-full flex flex-col items-center text-center p-6 border-2" data-testid="card-admin-login">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Administrador</CardTitle>
                <CardDescription className="text-base mt-2">
                  Acesso completo à carteira de clientes, comissionamento e relatórios gerais da corretora.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/vendedor">
            <Card className="cursor-pointer hover:border-primary transition-all hover:shadow-md h-full flex flex-col items-center text-center p-6 border-2" data-testid="card-vendedor-login">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <CardTitle className="text-2xl">Vendedor</CardTitle>
                <CardDescription className="text-base mt-2">
                  Acesso restrito ao painel pessoal de <strong>{vendedorAtual.nome}</strong>. Veja suas propostas, comissões e clientes.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
