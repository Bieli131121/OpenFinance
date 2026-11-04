import { describe, expect, it } from 'vitest';
import { suggestBillCategory } from '../categorize';

const ALL = new Set([
  'Contas de consumo', 'Internet e Telefone', 'Impostos e Taxas', 'Seguros', 'Financiamentos e Empréstimos',
  'Moradia', 'Saúde', 'Educação', 'Academia', 'Cartão', 'Assinaturas', 'Transporte', 'Outros (despesa)', 'Lazer',
]);

describe('suggestBillCategory', () => {
  it('usa o segmento do código de barras', () => {
    expect(suggestBillCategory({ segmentCode: '3', availableNames: ALL })).toEqual({ categoryName: 'Contas de consumo', source: 'segment' });
    expect(suggestBillCategory({ segmentCode: '4', availableNames: ALL }).categoryName).toBe('Internet e Telefone');
    expect(suggestBillCategory({ segmentCode: '7', availableNames: ALL }).categoryName).toBe('Impostos e Taxas');
  });
  it('usa o nome do beneficiário', () => {
    expect(suggestBillCategory({ beneficiary: 'ENEL DISTRIBUIÇÃO SÃO PAULO', availableNames: ALL }).categoryName).toBe('Contas de consumo');
    expect(suggestBillCategory({ beneficiary: 'Vivo S.A.', availableNames: ALL }).categoryName).toBe('Internet e Telefone');
    expect(suggestBillCategory({ beneficiary: 'PREFEITURA MUNICIPAL - IPTU 2026', availableNames: ALL }).categoryName).toBe('Impostos e Taxas');
    expect(suggestBillCategory({ beneficiary: 'Condomínio Edifício Aurora', availableNames: ALL }).categoryName).toBe('Moradia');
    expect(suggestBillCategory({ beneficiary: 'Unimed Seguros Saúde', availableNames: ALL }).categoryName).toBe('Saúde');
  });
  it('"oi" não casa dentro de outras palavras', () => {
    expect(suggestBillCategory({ beneficiary: 'Boicote Comércio Ltda', availableNames: ALL }).source).toBe('fallback');
  });
  it('aceita a IA só se a categoria existir para o usuário', () => {
    expect(suggestBillCategory({ beneficiary: 'Empresa X', aiCategory: 'Lazer', availableNames: ALL })).toEqual({ categoryName: 'Lazer', source: 'ai' });
    expect(suggestBillCategory({ beneficiary: 'Empresa X', aiCategory: 'Categoria Inventada', availableNames: ALL }).source).toBe('fallback');
  });
  it('não sugere categoria que o usuário não tem', () => {
    const sem = new Set(['Outros (despesa)']);
    expect(suggestBillCategory({ segmentCode: '3', availableNames: sem }).categoryName).toBe('Outros (despesa)');
  });
});
