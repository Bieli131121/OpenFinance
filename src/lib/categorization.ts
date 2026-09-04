// Categorização automática baseada em palavras-chave na descrição.
// Cobre o caso comum (regra padrão embutida). Regras personalizadas do
// usuário (tabela financial_rules) têm prioridade e devem ser checadas
// antes de cair nesse fallback -- ver applyCategorization().

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

/**
 * Sugere um nome de categoria com base na descrição bruta da transação.
 * Retorna null se nenhuma regra padrão bater (a transação fica sem
 * categoria e o usuário categoriza manualmente, ensinando o sistema).
 */
export function suggestCategoryName(descriptionRaw: string): string | null {
  const rule = DEFAULT_RULES.find((r) => r.pattern.test(descriptionRaw));
  return rule?.categoryName ?? null;
}
