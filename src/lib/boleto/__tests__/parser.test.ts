import { describe, expect, it } from 'vitest';
import { dueDateFromFactor, factorFromDueDate, findBoletoCodes, mod10, parseBoletoCode } from '../parser';

// Exemplos gerados por uma implementação independente (Python), não pelo próprio parser.
const TODAY = new Date('2026-10-29T15:00:00Z');

const BANK_LINE = '23793812846000000000400004000006416260000018990';
const BANK_BARCODE = '23794162600000189903812860000000000000400000';

const UTIL_ENERGY_LINE = '836200000013534700012345567890123456678901234503';
const UTIL_ENERGY_BARCODE = '83620000001534700012345678901234567890123450';
const UTIL_WATER_LINE = '828300000007892098765437210987654322109876543298'; // mod 11
const UTIL_TELECOM_REF_LINE = '847900000005010011111118111111111113111111111113'; // valor de referência (7)

describe('parseBoletoCode — boleto bancário (47 dígitos)', () => {
  it('lê valor, vencimento e banco e valida os dígitos', () => {
    const r = parseBoletoCode(BANK_LINE, TODAY)!;
    expect(r.kind).toBe('bank');
    expect(r.checksOk).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.amountCents).toBe(18990);
    expect(r.dueDate).toBe('2026-11-10');
    expect(r.bankCode).toBe('237');
    expect(r.barcode).toBe(BANK_BARCODE);
  });

  it('aceita pontuação e espaços (como vem impresso no boleto)', () => {
    const printed = `${BANK_LINE.slice(0, 5)}.${BANK_LINE.slice(5, 10)} ${BANK_LINE.slice(10, 15)}.${BANK_LINE.slice(15, 21)} ${BANK_LINE.slice(21, 26)}.${BANK_LINE.slice(26, 32)} ${BANK_LINE[32]} ${BANK_LINE.slice(33)}`;
    const r = parseBoletoCode(printed, TODAY)!;
    expect(r.checksOk).toBe(true);
    expect(r.digitableLine).toBe(BANK_LINE);
  });

  it('o mesmo boleto digitado como código de barras (44) dá a mesma linha digitável', () => {
    const r = parseBoletoCode(BANK_BARCODE, TODAY)!;
    expect(r.digitableLine).toBe(BANK_LINE);
    expect(r.checksOk).toBe(true);
    expect(r.amountCents).toBe(18990);
  });

  it('detecta dígito errado (erro típico de OCR)', () => {
    const wrong = BANK_LINE.slice(0, 12) + (BANK_LINE[12] === '9' ? '0' : String(Number(BANK_LINE[12]) + 1)) + BANK_LINE.slice(13);
    const r = parseBoletoCode(wrong, TODAY)!;
    expect(r.checksOk).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('valor zerado = valor livre; fator 0 = sem vencimento', () => {
    const r = parseBoletoCode('00190123435678901234356789012343100000000000000', TODAY)!;
    expect(r.checksOk).toBe(true);
    expect(r.amountCents).toBeNull();
    expect(r.dueDate).toBeNull();
  });
});

describe('parseBoletoCode — arrecadação / convênio (48 dígitos)', () => {
  it('energia (módulo 10): valor e segmento', () => {
    const r = parseBoletoCode(UTIL_ENERGY_LINE, TODAY)!;
    expect(r.kind).toBe('utility');
    expect(r.checksOk).toBe(true);
    expect(r.amountCents).toBe(15347);
    expect(r.segmentCode).toBe('3');
    expect(r.segmentLabel).toBe('Energia elétrica e gás');
    expect(r.barcode).toBe(UTIL_ENERGY_BARCODE);
    expect(r.dueDate).toBeNull();
  });

  it('água (módulo 11)', () => {
    const r = parseBoletoCode(UTIL_WATER_LINE, TODAY)!;
    expect(r.checksOk).toBe(true);
    expect(r.amountCents).toBe(8920);
    expect(r.segmentLabel).toBe('Saneamento');
  });

  it('valor de referência (tipo 7) não é tratado como dinheiro', () => {
    const r = parseBoletoCode(UTIL_TELECOM_REF_LINE, TODAY)!;
    expect(r.checksOk).toBe(true);
    expect(r.amountCents).toBeNull();
  });

  it('código de barras de 44 dígitos começando com 8 vira linha de 48', () => {
    const r = parseBoletoCode(UTIL_ENERGY_BARCODE, TODAY)!;
    expect(r.digitableLine).toBe(UTIL_ENERGY_LINE);
    expect(r.checksOk).toBe(true);
  });

  it('dígito errado é detectado', () => {
    const wrong = UTIL_ENERGY_LINE.slice(0, 20) + '9' + UTIL_ENERGY_LINE.slice(21);
    expect(parseBoletoCode(wrong, TODAY)!.checksOk).toBe(false);
  });
});

describe('fator de vencimento', () => {
  it('a contagem reiniciou: fator 1000 = 22/02/2025 (e não 03/07/2000)', () => {
    expect(dueDateFromFactor(1000, TODAY)).toBe('2025-02-22');
  });
  it('fator 1626 em 2026 = 10/11/2026', () => {
    expect(dueDateFromFactor(1626, TODAY)).toBe('2026-11-10');
  });
  it('boleto antigo (fator 9999) ainda resolve para fev/2025', () => {
    expect(dueDateFromFactor(9999, new Date('2025-02-10T12:00:00Z'))).toBe('2025-02-21');
  });
  it('ida e volta', () => {
    expect(dueDateFromFactor(factorFromDueDate('2026-12-31'), TODAY)).toBe('2026-12-31');
    expect(dueDateFromFactor(factorFromDueDate('2025-02-22'), TODAY)).toBe('2025-02-22');
  });
  it('fatores inválidos', () => {
    expect(dueDateFromFactor(0)).toBeNull();
    expect(dueDateFromFactor(999)).toBeNull();
  });
});

describe('entradas inválidas e texto livre', () => {
  it('tamanho errado => null', () => {
    expect(parseBoletoCode('1234')).toBeNull();
    expect(parseBoletoCode('')).toBeNull();
  });
  it('mod10 conhecido', () => {
    expect(mod10('001905009')).toBe(5); // exemplo clássico da documentação FEBRABAN
  });
  it('encontra a linha digitável no meio de um texto de OCR', () => {
    const text = `Beneficiário: ENEL SP\nVencimento 10/11/2026\nProtocolo 12345678901234567890`;
    // formato de exibição correto da mesma linha:
    const display = `${BANK_LINE.slice(0, 5)}.${BANK_LINE.slice(5, 10)} ${BANK_LINE.slice(10, 15)}.${BANK_LINE.slice(15, 21)} ${BANK_LINE.slice(21, 26)}.${BANK_LINE.slice(26, 32)} ${BANK_LINE[32]} ${BANK_LINE.slice(33)}`;
    expect(findBoletoCodes(`Ref 123\n${display}\nCPF 000`, TODAY)[0]?.barcode).toBe(BANK_BARCODE);
    expect(findBoletoCodes(text, TODAY)).toEqual([]);
  });
});
