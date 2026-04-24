import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// POST /api/ai/parse-cliente
// Recebe texto livre com dados do cliente e retorna estrutura JSON para preencher o formulário
router.post("/ai/parse-cliente", async (req, res) => {
  try {
    const { texto } = req.body as { texto: string };
    if (!texto || texto.trim().length < 5) {
      return res.status(400).json({ error: "Texto muito curto para análise" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [
        {
          role: "system",
          content: `Você é um assistente que extrai dados cadastrais de clientes de plano de saúde a partir de textos não estruturados (mensagens, e-mails, WhatsApp, planilhas coladas, etc.).

Retorne APENAS um JSON válido com os campos abaixo. Use null para campos não encontrados no texto.
Nunca invente dados. Use exatamente o formato abaixo:

{
  "nome": "NOME COMPLETO EM MAIÚSCULAS ou null",
  "cpf": "000.000.000-00 formatado ou null",
  "dataNascimento": "YYYY-MM-DD ou null",
  "sexo": "M ou F ou null",
  "telefone": "(XX) XXXXX-XXXX ou null",
  "email": "email@exemplo.com ou null",
  "cep": "00000-000 ou null",
  "logradouro": "nome da rua ou null",
  "numero": "número ou null",
  "complemento": "complemento ou null",
  "bairro": "bairro ou null",
  "cidade": "cidade ou null",
  "estado": "UF ou null",
  "nomeMae": "nome da mãe ou null",
  "cns": "número CNS ou null"
}`,
        },
        {
          role: "user",
          content: `Extraia os dados de cadastro deste texto:\n\n${texto}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    // Extrai o JSON mesmo se vier com texto ao redor
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: "Não foi possível extrair dados do texto" });

    const dados = JSON.parse(jsonMatch[0]);
    res.json({ dados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
