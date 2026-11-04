/** Helpers de dinheiro. Cálculos de divisão/soma de parcelas usam centavos inteiros. */

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Divide `totalCents` em `parts` parcelas sem perder centavo: as parcelas são
 * iguais (arredondadas para baixo) e a ÚLTIMA absorve a diferença.
 * Ex: 100,00 em 3x -> [33,33, 33,33, 33,34].
 */
export function splitInstallmentsCents(totalCents: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts < 1) throw new Error('Número de parcelas inválido');
  const base = Math.floor(totalCents / parts);
  const result = Array<number>(parts).fill(base);
  result[parts - 1] = totalCents - base * (parts - 1);
  return result;
}
