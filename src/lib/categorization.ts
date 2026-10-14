type KeywordRule = { pattern: RegExp; categoryName: string };
const DEFAULT_RULES: KeywordRule[] = [
  { pattern: /ifood|rappi|uber\s*eats/i, categoryName: 'Alimentação' },
  { pattern: /supermercado|mercado|atacad[ãa]o|carrefour|assai|extra/i, categoryName: 'Mercado' },
  { pattern: /uber|99app|taxi|combust[ií]vel|posto\s/i, categoryName: 'Transporte' },
  { pattern: /netflix|spotify|disney|hbo|prime\s*video|youtube\s*premium/i, categoryName: 'Assinaturas' },
  { pattern: /farmacia|farmácia|drogaria/i, categoryName: 'Saúde' },
  { pattern: /academia|smartfit|bodytech/i, categoryName: 'Academia' },
  { pattern: /aluguel|condominio|condomínio/i, categoryName: 'Moradia' },
  { pattern: /salario|salário|pagamento\s*mensal|folha/i, categoryName: 'Salário' },
];
export function suggestCategoryName(descriptionRaw: string): string | null {
  const rule = DEFAULT_RULES.find((r) => r.pattern.test(descriptionRaw));
  return rule?.categoryName ?? null;
}
