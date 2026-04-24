import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";

import { AdminLayout } from "@/components/layout/admin-layout";
import { GerenteLayout, GerenteGuard } from "@/components/layout/gerente-layout";
import GerenteDashboard from "@/pages/gerente/dashboard";
import GerenteEquipe from "@/pages/gerente/equipe";
import GerenteClientes from "@/pages/gerente/clientes";
import GerentePropostas from "@/pages/gerente/propostas";
import GerenteFinanceiro from "@/pages/gerente/financeiro";
import GerenteComissoes from "@/pages/gerente/comissoes";
import GerenteCobranca from "@/pages/gerente/cobranca";
import GerenteRelatorios from "@/pages/gerente/relatorios";
import GerenteSemPermissao from "@/pages/gerente/sem-permissao";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClientes from "@/pages/admin/clientes";
import AdminCancelados from "@/pages/admin/cancelados";
import AdminPlanos from "@/pages/admin/planos";
import AdminVendedores from "@/pages/admin/vendedores";
import AdminPropostas from "@/pages/admin/propostas";
import AdminCobranca from "@/pages/admin/cobranca";
import AdminRelatorios from "@/pages/admin/relatorios";
import AdminFinanceiro from "@/pages/admin/financeiro";
import AdminComissoes from "@/pages/admin/comissoes";
import AdminGerentes from "@/pages/admin/gerentes";

import { ClienteLayout } from "@/components/layout/cliente-layout";
import ClienteDashboard from "@/pages/cliente/dashboard";
import ClienteFaturas from "@/pages/cliente/faturas";

import { VendedorLayout } from "@/components/layout/vendedor-layout";
import VendedorDashboard from "@/pages/vendedor/dashboard";
import VendedorPropostas from "@/pages/vendedor/propostas";
import VendedorComissoes from "@/pages/vendedor/comissoes";
import VendedorBoletos from "@/pages/vendedor/boletos";
import VendedorCobranca from "@/pages/vendedor/cobranca";
import VendedorPlanos from "@/pages/vendedor/planos";
import VendedorCarteira from "@/pages/vendedor/carteira";
import VendedorHistorico from "@/pages/vendedor/historico";
import VendedorPerfil from "@/pages/vendedor/perfil";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
    </div>
  );
}

function AdminRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "admin") return <Redirect to="/login" />;

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/clientes" component={AdminClientes} />
        <Route path="/admin/cancelados" component={AdminCancelados} />
        <Route path="/admin/planos" component={AdminPlanos} />
        <Route path="/admin/vendedores" component={AdminVendedores} />
        <Route path="/admin/propostas" component={AdminPropostas} />
        <Route path="/admin/cobranca" component={AdminCobranca} />
        <Route path="/admin/relatorios" component={AdminRelatorios} />
        <Route path="/admin/financeiro" component={AdminFinanceiro} />
        <Route path="/admin/comissoes" component={AdminComissoes} />
        <Route path="/admin/gerentes" component={AdminGerentes} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function GerenteRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "gerente") return <Redirect to="/login" />;

  return (
    <GerenteLayout>
      <Switch>
        <Route path="/gerente/sem-permissao" component={GerenteSemPermissao} />
        <Route path="/gerente">
          <GerenteGuard permissao="ver_dashboard"><GerenteDashboard /></GerenteGuard>
        </Route>
        <Route path="/gerente/equipe">
          <GerenteGuard permissao="ver_equipe"><GerenteEquipe /></GerenteGuard>
        </Route>
        <Route path="/gerente/clientes">
          <GerenteGuard permissao="ver_clientes"><GerenteClientes /></GerenteGuard>
        </Route>
        <Route path="/gerente/propostas">
          <GerenteGuard permissao="ver_propostas"><GerentePropostas /></GerenteGuard>
        </Route>
        <Route path="/gerente/financeiro">
          <GerenteGuard permissao="ver_financeiro"><GerenteFinanceiro /></GerenteGuard>
        </Route>
        <Route path="/gerente/comissoes">
          <GerenteGuard permissao="ver_comissoes"><GerenteComissoes /></GerenteGuard>
        </Route>
        <Route path="/gerente/cobranca">
          <GerenteGuard permissao="ver_cobranca"><GerenteCobranca /></GerenteGuard>
        </Route>
        <Route path="/gerente/relatorios">
          <GerenteGuard permissao="ver_relatorios"><GerenteRelatorios /></GerenteGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </GerenteLayout>
  );
}

function VendedorRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "vendedor") return <Redirect to="/login" />;

  return (
    <VendedorLayout>
      <Switch>
        <Route path="/vendedor" component={VendedorDashboard} />
        <Route path="/vendedor/carteira" component={VendedorCarteira} />
        <Route path="/vendedor/propostas" component={VendedorPropostas} />
        <Route path="/vendedor/comissoes" component={VendedorComissoes} />
        <Route path="/vendedor/boletos" component={VendedorBoletos} />
        <Route path="/vendedor/cobranca" component={VendedorCobranca} />
        <Route path="/vendedor/planos" component={VendedorPlanos} />
        <Route path="/vendedor/historico" component={VendedorHistorico} />
        <Route path="/vendedor/perfil" component={VendedorPerfil} />
        <Route component={NotFound} />
      </Switch>
    </VendedorLayout>
  );
}

function ClienteRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== "cliente") return <Redirect to="/login" />;

  return (
    <ClienteLayout>
      <Switch>
        <Route path="/cliente" component={ClienteDashboard} />
        <Route path="/cliente/faturas" component={ClienteFaturas} />
        <Route component={NotFound} />
      </Switch>
    </ClienteLayout>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  if (user.role === "vendedor") return <Redirect to="/vendedor" />;
  if (user.role === "gerente") return <Redirect to="/gerente" />;
  if (user.role === "cliente") return <Redirect to="/cliente" />;
  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/admin/:rest*" component={AdminRoutes} />
      <Route path="/vendedor" component={VendedorRoutes} />
      <Route path="/vendedor/:rest*" component={VendedorRoutes} />
      <Route path="/gerente" component={GerenteRoutes} />
      <Route path="/gerente/:rest*" component={GerenteRoutes} />
      <Route path="/cliente" component={ClienteRoutes} />
      <Route path="/cliente/:rest*" component={ClienteRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
