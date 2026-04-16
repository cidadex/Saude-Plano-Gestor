import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FileText, 
  DollarSign, 
  Receipt,
  LogOut
} from "lucide-react";
import { vendedorAtual } from "@/data/vendedores";

export function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/vendedor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vendedor/propostas", label: "Propostas", icon: FileText },
    { href: "/vendedor/comissoes", label: "Comissões", icon: DollarSign },
    { href: "/vendedor/boletos", label: "Boletos", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Hapvida Gestão</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Painel do Vendedor</p>
          <div className="mt-4 pt-4 border-t border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
                {vendedorAtual.nome.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-sidebar-foreground">{vendedorAtual.nome}</span>
                <span className="text-xs text-sidebar-foreground/70">Vendedor</span>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`} data-testid={`nav-${item.label.toLowerCase()}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-testid="nav-sair">
            <LogOut className="h-4 w-4" />
            Sair
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
