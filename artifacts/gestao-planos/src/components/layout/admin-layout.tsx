import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  UserMinus, 
  ClipboardList, 
  FileText, 
  Briefcase,
  LogOut,
  BellRing
} from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/clientes", label: "Clientes", icon: Users },
    { href: "/admin/cancelados", label: "Cancelados", icon: UserMinus },
    { href: "/admin/planos", label: "Planos", icon: ClipboardList },
    { href: "/admin/vendedores", label: "Vendedores", icon: Briefcase },
    { href: "/admin/propostas", label: "Propostas", icon: FileText },
    { href: "/admin/cobranca", label: "Cobrança", icon: BellRing },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Hapvida Gestão</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Painel Administrativo</p>
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
