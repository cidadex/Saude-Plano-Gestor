export interface MensagemWhatsapp {
  tipo: 'BOLETO' | 'ATRASO' | 'SUSPENSAO';
  titulo: string;
  descricao: string;
  cor: string;
}

export const tiposMensagem: MensagemWhatsapp[] = [
  {
    tipo: 'BOLETO',
    titulo: 'Envio de Boleto',
    descricao: 'Avisa que o boleto será enviado em breve',
    cor: 'text-blue-600',
  },
  {
    tipo: 'ATRASO',
    titulo: 'Cobrança de Atraso',
    descricao: 'Cobra pagamento de boleto em atraso',
    cor: 'text-amber-600',
  },
  {
    tipo: 'SUSPENSAO',
    titulo: 'Aviso de Suspensão',
    descricao: 'Informa risco de suspensão do plano',
    cor: 'text-red-600',
  },
];

export function gerarMensagem(
  tipo: MensagemWhatsapp['tipo'],
  nomeCliente: string,
  valor: string,
  mesReferencia: string,
  vencimento: string
): string {
  const nome = nomeCliente.split(' ')[0];

  if (tipo === 'BOLETO') {
    return `Olá, ${nome}! Tudo bem? 🙂

Seu boleto de plano de saúde referente ao mês de *${mesReferencia}* já está disponível.

💰 *Valor:* ${valor}
📅 *Vencimento:* ${vencimento}

Em breve enviaremos o código de barras por aqui. Qualquer dúvida, é só chamar!`;
  }

  if (tipo === 'ATRASO') {
    return `Olá, ${nome}! Tudo bem?

Identificamos que o boleto do seu plano de saúde referente ao mês de *${mesReferencia}* ainda não foi pago.

💰 *Valor:* ${valor}
📅 *Vencimento original:* ${vencimento}

Para regularizar, entre em contato conosco para receber a 2ª via do boleto atualizado.

⚠️ Não deixe seu plano ser suspenso! Qualquer dúvida, estamos à disposição.`;
  }

  return `Olá, ${nome}! Tudo bem?

Informamos que seu plano de saúde está prestes a ser *SUSPENSO* por falta de pagamento.

📋 *Mês em atraso:* ${mesReferencia}
💰 *Valor:* ${valor}

Para evitar a suspensão e manter seu atendimento médico sem interrupção, regularize o pagamento o quanto antes.

⛔ Após a suspensão, o plano só poderá ser reativado mediante nova análise. Entre em contato agora!`;
}

export function abrirWhatsapp(telefone: string, mensagem: string): void {
  const numeroLimpo = telefone.replace(/\D/g, '');
  const codigosPais = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
  const textoEncoded = encodeURIComponent(mensagem);
  window.open(`https://wa.me/${codigosPais}?text=${textoEncoded}`, '_blank');
}
