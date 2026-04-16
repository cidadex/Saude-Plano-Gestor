import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";

import { AdminLayout } from "@/components/layout/admin-layout";
// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminClientes from "@/pages/admin/clientes";
import AdminCancelados from "@/pages/admin/cancelados";
import AdminPlanos from "@/pages/admin/planos";
import AdminVendedores from "@/pages/admin/vendedores";
import AdminPropostas from "@/pages/admin/propostas";

import { VendedorLayout } from "@/components/layout/vendedor-layout";
// Vendedor Pages
import VendedorDashboard from "@/pages/vendedor/dashboard";
import VendedorPropostas from "@/pages/vendedor/propostas";
import VendedorComissoes from "@/pages/vendedor/comissoes";
import VendedorBoletos from "@/pages/vendedor/boletos";

const queryClient = new QueryClient();

function AdminRoutes() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/clientes" component={AdminClientes} />
        <Route path="/admin/cancelados" component={AdminCancelados} />
        <Route path="/admin/planos" component={AdminPlanos} />
        <Route path="/admin/vendedores" component={AdminVendedores} />
        <Route path="/admin/propostas" component={AdminPropostas} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function VendedorRoutes() {
  return (
    <VendedorLayout>
      <Switch>
        <Route path="/vendedor" component={VendedorDashboard} />
        <Route path="/vendedor/propostas" component={VendedorPropostas} />
        <Route path="/vendedor/comissoes" component={VendedorComissoes} />
        <Route path="/vendedor/boletos" component={VendedorBoletos} />
        <Route component={NotFound} />
      </Switch>
    </VendedorLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/*" component={AdminRoutes} />
      <Route path="/admin" component={AdminRoutes} />
      <Route path="/vendedor/*" component={VendedorRoutes} />
      <Route path="/vendedor" component={VendedorRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
