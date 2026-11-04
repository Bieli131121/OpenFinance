import { describe, expect, it } from 'vitest';
import { reconcileBoleto } from '../reconcile';
import { normalizeDate, parseMoneyValue, toVisionResult } from '../extract';
import type { ScanCategory, VisionBoletoResult } from '../types';

const NOW = new Date('2026-10-29T15:00:00Z');
const TODAY = '2026-10-29';
const BANK_LINE = '23793812846000000000400004000006416260000018990'; // R$ 189,90 — 10/11/2026
const UTIL_LINE = '836200000013534700012345567890123456678901234503'; // energia R$ 153,47

const CATS: ScanCategory[] = [
  ['c1', 'Contas de consumo'], ['c2', 'Internet e Telefone'], ['c3', 'Impostos e Taxas'], ['c4', 'Moradia'], ['c9', 'Outros (despesa)'],
].map(([id, name]) => ({ id, name }));

const vision = (over: Partial<VisionBoletoResult> = {}): VisionBoletoResult => ({
  isBoleto: true, digitableLine: null, amount: null, dueDate: null, beneficiary: null, description: null,
  category: null, confidence: 0.9, notes: null, ...over,
});

describe('reconcileBoleto', () => {
  it('código válido manda: valor e vencimento vêm do código, mesmo que a IA erre', () => {
    const r = reconcileBoleto({
      origin: 'image', now: NOW, today: TODAY, categories: CATS,
      vision: vision({ digitableLine: BANK_LINE, amount: 198.9, dueDate: '2026-11-12', beneficiary: 'ENEL SP', description: 'Enel - energia' }),
    });
    expect(r.amount).toBe(189.9);
    expect(r.amountSource).toBe('code');
    expect(r.dueDate).toBe('2026-11-10');
    expect(r.dueDateSource).toBe('code');
    expect(r.codeValid).toBe(true);
    expect(r.categoryName).toBe('Contas de consumo');
    expect(r.warnings.some((w) => w.includes('valor lido na imagem'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('vencimento lido na imagem'))).toBe(true);
    expect(r.confidence).toBeLessThanOrEqual(0.75);
  });

  it('código com dígito errado: usa a imagem e avisa', () => {
    const wrong = BANK_LINE.slice(0, 12) + '9' + BANK_LINE.slice(13);
    const r = reconcileBoleto({
      origin: 'image', now: NOW, today: TODAY, categories: CATS,
      vision: vision({ digitableLine: wrong, amount: 189.9, dueDate: '2026-11-10', beneficiary: 'Enel' }),
    });
    expect(r.codeValid).toBe(false);
    expect(r.amountSource).toBe('image');
    expect(r.amount).toBe(189.9);
    expect(r.warnings.some((w) => w.includes('não conferem'))).toBe(true);
    expect(r.confidence).toBeLessThanOrEqual(0.7);
  });

  it('conta de consumo: valor e segmento do código; vencimento da imagem', () => {
    const r = reconcileBoleto({
      origin: 'image', now: NOW, today: TODAY, categories: CATS,
      vision: vision({ digitableLine: UTIL_LINE, dueDate: '2026-11-05', beneficiary: 'Fornecedor desconhecido' }),
    });
    expect(r.amount).toBe(153.47);
    expect(r.dueDate).toBe('2026-11-05');
    expect(r.dueDateSource).toBe('image');
    expect(r.categoryName).toBe('Contas de consumo');
    expect(r.categorySource).toBe('segment');
  });

  it('só código digitado (sem foto): funciona sem IA', () => {
    const r = reconcileBoleto({ origin: 'code', vision: null, typedCode: BANK_LINE, now: NOW, today: TODAY, categories: CATS });
    expect(r.amount).toBe(189.9);
    expect(r.dueDate).toBe('2026-11-10');
    expect(r.description).toBe('Boleto');
    expect(r.confidence).toBe(0.97);
  });

  it('boleto vencido gera aviso', () => {
    const r = reconcileBoleto({ origin: 'code', vision: null, typedCode: BANK_LINE, now: new Date('2026-11-20T15:00:00Z'), today: '2026-11-20', categories: CATS });
    expect(r.warnings.some((w) => w.includes('venceu há 10 dias'))).toBe(true);
  });

  it('categoria da IA inventada é descartada; regra do usuário vence', () => {
    const base = { origin: 'image' as const, now: NOW, today: TODAY, categories: CATS };
    expect(reconcileBoleto({ ...base, vision: vision({ beneficiary: 'Xyz', category: 'Viagens' }) }).categoryName).toBe('Outros (despesa)');
    const rule = reconcileBoleto({ ...base, vision: vision({ beneficiary: 'Enel' }), userRuleCategoryId: 'c4' });
    expect(rule.categoryName).toBe('Moradia');
    expect(rule.categorySource).toBe('rule');
  });

  it('nada legível: tudo nulo, com avisos, sem quebrar', () => {
    const r = reconcileBoleto({ origin: 'image', now: NOW, today: TODAY, categories: CATS, vision: vision({ confidence: 0.2 }) });
    expect(r.amount).toBeNull();
    expect(r.dueDate).toBeNull();
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });
});

describe('extract helpers', () => {
  it('parseMoneyValue', () => {
    expect(parseMoneyValue('R$ 1.234,56')).toBe(1234.56);
    expect(parseMoneyValue('189,90')).toBe(189.9);
    expect(parseMoneyValue(189.9)).toBe(189.9);
    expect(parseMoneyValue(0)).toBeNull();
    expect(parseMoneyValue('abc')).toBeNull();
  });
  it('normalizeDate', () => {
    expect(normalizeDate('10/11/2026')).toBe('2026-11-10');
    expect(normalizeDate('2026-11-10')).toBe('2026-11-10');
    expect(normalizeDate('amanhã')).toBeNull();
  });
  it('toVisionResult limpa a linha digitável e limita a confiança', () => {
    const r = toVisionResult({ is_boleto: true, linha_digitavel: '23793.81284 60000.000004', valor: '189,90', vencimento: '10/11/2026', confianca: 5 });
    expect(r.digitableLine).toBe('2379381284' + '60000000004');
    expect(r.amount).toBe(189.9);
    expect(r.dueDate).toBe('2026-11-10');
    expect(r.confidence).toBe(1);
  });
});
