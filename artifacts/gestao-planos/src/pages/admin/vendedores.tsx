import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { vendedores } from "@/data/vendedores";
import { formatMoney } from "@/lib/format";
import { DollarSign, Users, Briefcase, Mail, Phone } from "lucide-react";

export default function AdminVendedores() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Equipe de Vendas</h2>
        <p className="text-muted-foreground">Performance, carteira de clientes e comissionamento por vendedor.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vendedores.map((vendedor) => (
          <Card key={vendedor.id} className={`overflow-hidden transition-all hover:shadow-md ${!vendedor.comissionado ? 'border-dashed border-muted-foreground/30 bg-muted/20' : ''}`} data-testid={`card-vendedor-${vendedor.id}`}>
            <CardHeader className="pb-3 border-b bg-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${vendedor.comissionado ? 'bg-primary' : 'bg-muted-foreground'}`}>
                    {vendedor.nome.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{vendedor.nome}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {vendedor.comissionado ? (
                        <Badge variant="default" className="text-[10px] h-5 px-1.5 py-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Comissionado ({vendedor.tipoComissao})
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 py-0">Parceiro Fixo</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-card">
                <div className="p-4 flex flex-col gap-1 items-center justify-center text-center">
                  <Users className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold text-foreground">{vendedor.totalAtivos}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Ativos</span>
                </div>
                <div className="p-4 flex flex-col gap-1 items-center justify-center text-center">
                  <Briefcase className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-2xl font-bold text-foreground">{vendedor.totalCancelados}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Cancelados</span>
                </div>
              </div>
              
              <div className="p-4 space-y-4 bg-muted/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Receita da Carteira</span>
                  <span className="text-sm font-bold">{formatMoney(vendedor.receitaTotal)}</span>
                </div>
                
                {vendedor.comissionado && (
                  <div className="flex justify-between items-center pt-3 border-t border-border/50">
                    <span className="text-sm font-medium text-primary flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> Comissão Paga/Pendente
                    </span>
                    <span className="text-sm font-bold text-primary">{formatMoney(vendedor.comissaoTotal)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{vendedor.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{vendedor.telefone}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
