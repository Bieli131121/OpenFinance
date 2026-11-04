/**
 * Sugestão de categoria para boletos.
 *
 * Ordem de decisão (a primeira que acertar vence):
 *   1. regras do próprio usuário (financial_rules) — aplicadas por quem chama;
 *   2. segmento do boleto de arrecadação (água/luz/telefone/tributo): é um dado
 *      do código de barras, não palpite;
 *   3. palavras-chave no nome do beneficiário (Enel, Sabesp, Vivo, IPTU...);
 *   4. sugestão da IA — só aceita se for uma categoria que o usuário realmente tem;
 *   5. "Outros (despesa)".
 */

export type CategorySource = 'rule' | 'segment' | 'keyword' | 'ai' | 'fallback';

export const FALLBACK_CATEGORY = 'Outros (despesa)';

export const BILL_CATEGORY_NAMES = {
  utilities: 'Contas de consumo',
  telecom: 'Internet e Telefone',
  taxes: 'Impostos e Taxas',
  insurance: 'Seguros',
  loans: 'Financiamentos e Empréstimos',
  housing: 'Moradia',
  health: 'Saúde',
  education: 'Educação',
  gym: 'Academia',
  card: 'Cartão',
  subscriptions: 'Assinaturas',
  transport: 'Transporte',
} as const;

/** Segmento (2º dígito do código de arrecadação) -> categoria. */
const SEGMENT_CATEGORY: Record<string, string> = {
  '1': BILL_CATEGORY_NAMES.taxes,      // prefeitura (IPTU, ISS, taxas)
  '2': BILL_CATEGORY_NAMES.utilities,  // saneamento (água/esgoto)
  '3': BILL_CATEGORY_NAMES.utilities,  // energia elétrica e gás
  '4': BILL_CATEGORY_NAMES.telecom,    // telecomunicações
  '5': BILL_CATEGORY_NAMES.taxes,      // órgãos governamentais (DARF, GPS, DAS)
  '7': BILL_CATEGORY_NAMES.taxes,      // multas de trânsito
};

interface KeywordRule { pattern: RegExp; category: string }

// Textos já normalizados (minúsculo, sem acento). \b evita "oi" casar com "boi".
const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /\b(enel|cpfl|cemig|light|equatorial|energisa|neoenergia|copel|celesc|elektro|ceee|rge|edp|coelba|celpe|cosern|energia|eletric\w*|sabesp|copasa|sanepar|cedae|embasa|cagece|caesb|compesa|saneago|aegea|dmae|casan|agua|esgoto|saneamento|comgas|naturgy|ultragaz|liquigas|gas natural)\b/, category: BILL_CATEGORY_NAMES.utilities },
  { pattern: /\b(vivo|claro|tim|oi|nextel|telefonica|brisanet|algar|desktop|vero|internet|fibra|banda larga|telecom\w*|net virtua|sky|telefone|celular)\b/, category: BILL_CATEGORY_NAMES.telecom },
  { pattern: /\b(iptu|ipva|itbi|iss|das|darf|gps|inss|fgts|simples nacional|receita federal|prefeitura|detran|sefaz|licenciamento|dpvat|taxa|multa|tributo\w*|imposto\w*|governo|fazenda)\b/, category: BILL_CATEGORY_NAMES.taxes },
  { pattern: /\b(unimed|amil|hapvida|notre dame|bradesco saude|plano de saude|clinica|hospital|laboratorio|odonto\w*|dentista|farmacia|drogaria|medic\w*)\b/, category: BILL_CATEGORY_NAMES.health },
  { pattern: /\b(seguro\w*|porto seguro|sulamerica seguros|tokio marine|mapfre|allianz|azul seguros|liberty|hdi|suhai|youse)\b/, category: BILL_CATEGORY_NAMES.insurance },
  { pattern: /\b(financiamento|emprestimo|consignado|cdc|leasing|consorcio|caixa economica|parcela do contrato)\b/, category: BILL_CATEGORY_NAMES.loans },
  { pattern: /\b(escola|colegio|faculdade|universidade|curso\w*|mensalidade|unip|estacio|anhanguera|kroton|pitagoras|ensino|educacao|idiomas|wizard|fisk|ccaa)\b/, category: BILL_CATEGORY_NAMES.education },
  { pattern: /\b(condominio|aluguel|imobiliaria|locacao|administradora de imoveis|iptu)\b/, category: BILL_CATEGORY_NAMES.housing },
  { pattern: /\b(academia|smart ?fit|bodytech|bluefit|crossfit|pilates)\b/, category: BILL_CATEGORY_NAMES.gym },
  { pattern: /\b(fatura|cartao de credito|nubank|inter cartoes|itau cartoes|credicard|mastercard|visa)\b/, category: BILL_CATEGORY_NAMES.card },
  { pattern: /\b(netflix|spotify|disney|hbo|globoplay|prime video|youtube premium|assinatura)\b/, category: BILL_CATEGORY_NAMES.subscriptions },
];

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface BillCategorySuggestion { categoryName: string; source: Exclude<CategorySource, 'rule'> }

export function suggestBillCategory(input: {
  beneficiary?: string | null;
  description?: string | null;
  segmentCode?: string | null;
  aiCategory?: string | null;
  /** Nomes de categoria de despesa que o usuário realmente tem. */
  availableNames: ReadonlySet<string>;
}): BillCategorySuggestion {
  const { availableNames } = input;
  const has = (name: string) => availableNames.has(name);

  const segmentCategory = input.segmentCode ? SEGMENT_CATEGORY[input.segmentCode] : undefined;
  if (segmentCategory && has(segmentCategory)) return { categoryName: segmentCategory, source: 'segment' };

  const text = normalizeText(`${input.beneficiary ?? ''} ${input.description ?? ''}`);
  if (text) {
    const rule = KEYWORD_RULES.find((r) => r.pattern.test(text) && has(r.category));
    if (rule) return { categoryName: rule.category, source: 'keyword' };
  }

  if (input.aiCategory && has(input.aiCategory) && input.aiCategory !== FALLBACK_CATEGORY) {
    return { categoryName: input.aiCategory, source: 'ai' };
  }

  return { categoryName: FALLBACK_CATEGORY, source: 'fallback' };
}
