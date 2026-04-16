import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Edit2, Check } from "lucide-react";
import { tiposMensagem, gerarMensagem, abrirWhatsapp, type MensagemWhatsapp } from "@/lib/whatsapp";
import { formatMoney } from "@/lib/format";

interface WhatsappModalProps {
  open: boolean;
  onClose: () => void;
  clienteNome: string;
  telefone: string;
  valor: number;
  mesReferencia: string;
  vencimento: string;
}

export function WhatsappModal({
  open,
  onClose,
  clienteNome,
  telefone,
  valor,
  mesReferencia,
  vencimento,
}: WhatsappModalProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<MensagemWhatsapp['tipo'] | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [editando, setEditando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSelecionarTipo = (tipo: MensagemWhatsapp['tipo']) => {
    setTipoSelecionado(tipo);
    const msg = gerarMensagem(tipo, clienteNome, formatMoney(valor), mesReferencia, vencimento);
    setMensagem(msg);
    setEditando(false);
    setEnviado(false);
  };

  const handleEnviar = () => {
    abrirWhatsapp(telefone, mensagem);
    setEnviado(true);
  };

  const handleFechar = () => {
    setTipoSelecionado(null);
    setMensagem("");
    setEditando(false);
    setEnviado(false);
    onClose();
  };

  const tipoAtual = tiposMensagem.find(t => t.tipo === tipoSelecionado);

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <MessageCircle className="h-5 w-5" />
            Enviar Mensagem WhatsApp
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{clienteNome}</span>
            {telefone && (
              <span className="ml-2 text-muted-foreground text-xs font-mono">{telefone}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Selecione o tipo de mensagem:</p>
            <div className="grid gap-2">
              {tiposMensagem.map(tipo => (
                <button
                  key={tipo.tipo}
                  onClick={() => handleSelecionarTipo(tipo.tipo)}
                  data-testid={`btn-msg-${tipo.tipo.toLowerCase()}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    tipoSelecionado === tipo.tipo
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                      : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${tipoSelecionado === tipo.tipo ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                      {tipo.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{tipo.descricao}</p>
                  </div>
                  {tipoSelecionado === tipo.tipo && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {tipoSelecionado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Prévia da mensagem:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditando(!editando)}
                  data-testid="btn-editar-mensagem"
                >
                  <Edit2 className="h-3 w-3" />
                  {editando ? 'Concluir' : 'Editar'}
                </Button>
              </div>
              <Textarea
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                readOnly={!editando}
                className={`min-h-[160px] text-sm font-mono leading-relaxed resize-none ${
                  editando ? 'border-primary' : 'bg-muted/30'
                }`}
                data-testid="textarea-mensagem-whatsapp"
              />
              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50 dark:bg-green-950/20">
                  {tipoAtual?.titulo}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleFechar}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={handleEnviar}
                    data-testid="btn-enviar-whatsapp"
                  >
                    {enviado ? (
                      <>
                        <Check className="h-4 w-4" />
                        Aberto no WhatsApp
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Abrir no WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
