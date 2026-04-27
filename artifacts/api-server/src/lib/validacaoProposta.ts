const ESTADOS_CIVIS = new Set(["SOLTEIRO", "CASADO", "DIVORCIADO", "VIUVO", "UNIAO_ESTAVEL"]);
const FORMAS_PAGAMENTO = new Set(["BOLETO", "PIX", "CARTAO", "CARTÃO"]);

export function validarDadosTitular(
  dadosTitular: Record<string, unknown> | undefined,
): string | null {
  if (!dadosTitular) return null;

  const dv = dadosTitular.diaVencimento;
  if (dv !== undefined && dv !== null && dv !== "") {
    const n = typeof dv === "number" ? dv : Number(dv);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      return "diaVencimento deve ser inteiro entre 1 e 31";
    }
  }

  const ec = dadosTitular.estadoCivil;
  if (ec !== undefined && ec !== null && ec !== "") {
    if (typeof ec !== "string" || !ESTADOS_CIVIS.has(ec.toUpperCase())) {
      return "estadoCivil inválido (use SOLTEIRO|CASADO|DIVORCIADO|VIUVO|UNIAO_ESTAVEL)";
    }
  }

  const fp = dadosTitular.formaPagamento;
  if (fp !== undefined && fp !== null && fp !== "") {
    if (typeof fp !== "string" || !FORMAS_PAGAMENTO.has(fp.toUpperCase())) {
      return "formaPagamento inválido (use BOLETO|PIX|CARTAO)";
    }
  }

  return null;
}
