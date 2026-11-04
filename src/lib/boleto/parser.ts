/**
 * Leitura determinística de boletos brasileiros (FEBRABAN).
 *
 * Duas famílias de boleto:
 *  - Bancário (cobrança): linha digitável de 47 dígitos / código de barras de 44
 *    que começa com o código do banco. Traz VALOR e VENCIMENTO dentro do código.
 *  - Arrecadação / convênio (água, luz, telefone, tributos): linha digitável de
 *    48 dígitos / código de barras de 44 que começa com "8". Traz o VALOR e o
 *    SEGMENTO (tipo de empresa) — o vencimento não é padronizado no código.
 *
 * Tudo aqui é função pura (sem rede, sem banco): serve tanto para validar o que
 * a IA leu da foto quanto para quem digita/cola o código à mão. Os dígitos
 * verificadores (módulo 10 e 11) permitem detectar erro de leitura de OCR.
 */

export type BoletoKind = 'bank' | 'utility';

export interface ParsedBoleto {
  kind: BoletoKind;
  /** Linha digitável com 47 (bancário) ou 48 (arrecadação) dígitos, sem pontuação. */
  digitableLine: string;
  /** Código de barras canônico, 44 dígitos. Identifica o boleto de forma única. */
  barcode: string;
  /** true se TODOS os dígitos verificadores conferem. */
  checksOk: boolean;
  /** Problemas encontrados (dígito verificador inválido, tipo desconhecido...). */
  issues: string[];
  /** Valor em centavos; null quando o boleto é "valor livre" (zerado) ou o valor é referência. */
  amountCents: number | null;
  /** 'YYYY-MM-DD'; só existe em boleto bancário com fator de vencimento. */
  dueDate: string | null;
  /** Código do banco emissor (bancário). */
  bankCode?: string;
  /** Segmento (arrecadação): 1..9 */
  segmentCode?: string;
  segmentLabel?: string;
}

export const UTILITY_SEGMENTS: Record<string, string> = {
  '1': 'Prefeitura',
  '2': 'Saneamento',
  '3': 'Energia elétrica e gás',
  '4': 'Telecomunicações',
  '5': 'Órgão governamental',
  '6': 'Empresa/órgão identificado por CNPJ',
  '7': 'Multa de trânsito',
  '9': 'Uso exclusivo do banco',
};

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// ---------------------------------------------------------------- dígitos verificadores

/** Módulo 10: pesos 2,1,2,1... da direita para a esquerda; soma os algarismos dos produtos. */
export function mod10(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    const product = Number(digits[i]) * weight;
    sum += product > 9 ? product - 9 : product;
    weight = weight === 2 ? 1 : 2;
  }
  return (10 - (sum % 10)) % 10;
}

function mod11Sum(digits: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  return sum;
}

/** Módulo 11 do código de barras BANCÁRIO: resultado 0, 10 ou 11 vira 1. */
export function mod11Bank(digits: string): number {
  const dv = 11 - (mod11Sum(digits) % 11);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/** Módulo 11 de ARRECADAÇÃO: resto 0 ou 1 vira 0. */
export function mod11Utility(digits: string): number {
  const rest = mod11Sum(digits) % 11;
  return rest <= 1 ? 0 : 11 - rest;
}

function utilityDv(digits: string, valueType: string): number | null {
  if (valueType === '6' || valueType === '7') return mod10(digits);
  if (valueType === '8' || valueType === '9') return mod11Utility(digits);
  return null;
}

// ---------------------------------------------------------------- fator de vencimento

const BASE_DATE_UTC = Date.UTC(1997, 9, 7); // 07/10/1997 = fator 0
const DAY_MS = 86_400_000;
const FACTOR_CYCLE_DAYS = 9000; // fatores 1000..9999

function ymd(utcMs: number): string {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Converte o fator de vencimento em data.
 *
 * ATENÇÃO: em 22/02/2025 o fator chegou a 9999 e VOLTOU para 1000. Por isso o
 * mesmo número de 4 dígitos pode ser uma data de 2000 ou de 2025 (ou 2049...).
 * Escolhemos, entre as datas possíveis (a cada 9.000 dias), a mais próxima de hoje.
 * Fator 0000 = sem vencimento (pagável à vista).
 */
export function dueDateFromFactor(factor: number, today: Date = new Date()): string | null {
  if (!Number.isInteger(factor) || factor < 1000 || factor > 9999) return null;
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const first = BASE_DATE_UTC + factor * DAY_MS;
  let best = first;
  for (let cycle = 1; cycle <= 4; cycle++) {
    const candidate = first + cycle * FACTOR_CYCLE_DAYS * DAY_MS;
    if (Math.abs(candidate - todayUtc) < Math.abs(best - todayUtc)) best = candidate;
  }
  return ymd(best);
}

/** Inverso (usado em testes e para gerar exemplos): data -> fator mais recente dentro do ciclo. */
export function factorFromDueDate(dateOnly: string): number {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - BASE_DATE_UTC) / DAY_MS);
  return ((days - 1000) % FACTOR_CYCLE_DAYS) + 1000;
}

// ---------------------------------------------------------------- conversões

function bankLineToBarcode(line: string): string {
  return line.slice(0, 4) + line.slice(32, 33) + line.slice(33, 47) + line.slice(4, 9) + line.slice(10, 20) + line.slice(21, 31);
}

function bankBarcodeToLine(barcode: string): string {
  const free = barcode.slice(19, 44);
  const f1 = barcode.slice(0, 4) + free.slice(0, 5);
  const f2 = free.slice(5, 15);
  const f3 = free.slice(15, 25);
  return f1 + mod10(f1) + f2 + mod10(f2) + f3 + mod10(f3) + barcode.slice(4, 5) + barcode.slice(5, 19);
}

function utilityLineToBarcode(line: string): string {
  return [0, 1, 2, 3].map((i) => line.slice(i * 12, i * 12 + 11)).join('');
}

function utilityBarcodeToLine(barcode: string): string | null {
  const valueType = barcode[2];
  const blocks = [0, 1, 2, 3].map((i) => barcode.slice(i * 11, i * 11 + 11));
  const dvs = blocks.map((b) => utilityDv(b, valueType));
  if (dvs.some((dv) => dv === null)) return null;
  return blocks.map((b, i) => b + dvs[i]).join('');
}

// ---------------------------------------------------------------- parser

/**
 * Interpreta a linha digitável (47/48 dígitos) ou o código de barras (44).
 * Aceita pontuação/espaços. Retorna null se o tamanho não for de um boleto.
 * Nunca lança exceção: dígitos verificadores errados saem em `issues`/`checksOk`.
 */
export function parseBoletoCode(input: string, today: Date = new Date()): ParsedBoleto | null {
  const digits = onlyDigits(input);
  if (digits.length === 47) return parseBank(digits, bankLineToBarcode(digits), digits, today);
  if (digits.length === 48) return parseUtility(digits, utilityLineToBarcode(digits), digits);
  if (digits.length === 44) {
    if (digits[0] === '8') return parseUtility(utilityBarcodeToLine(digits) ?? '', digits, null);
    return parseBank(bankBarcodeToLine(digits), digits, null, today);
  }
  return null;
}

function parseBank(line: string, barcode: string, typedLine: string | null, today: Date): ParsedBoleto {
  const issues: string[] = [];

  if (typedLine) {
    // Cada campo da linha digitável tem o próprio DV (módulo 10).
    const fields: Array<[string, string, string]> = [
      ['campo 1', typedLine.slice(0, 9), typedLine[9]],
      ['campo 2', typedLine.slice(10, 20), typedLine[20]],
      ['campo 3', typedLine.slice(21, 31), typedLine[31]],
    ];
    for (const [name, data, dv] of fields) {
      if (String(mod10(data)) !== dv) issues.push(`Dígito verificador do ${name} não confere`);
    }
  }

  const general = mod11Bank(barcode.slice(0, 4) + barcode.slice(5));
  if (String(general) !== barcode[4]) issues.push('Dígito verificador geral do código de barras não confere');
  if (barcode[3] !== '9') issues.push('Moeda diferente de Real (9)');

  const factor = Number(barcode.slice(5, 9));
  const cents = Number(barcode.slice(9, 19));

  return {
    kind: 'bank',
    digitableLine: line,
    barcode,
    checksOk: issues.length === 0,
    issues,
    amountCents: cents > 0 ? cents : null,
    dueDate: factor === 0 ? null : dueDateFromFactor(factor, today),
    bankCode: barcode.slice(0, 3),
  };
}

function parseUtility(line: string, barcode: string, typedLine: string | null): ParsedBoleto {
  const issues: string[] = [];
  const valueType = barcode[2];
  const segmentCode = barcode[1];

  if (barcode[0] !== '8') issues.push('Boleto de arrecadação deve começar com 8');
  if (!'6789'.includes(valueType)) issues.push('Identificação de valor/módulo inválida');

  if (typedLine && '6789'.includes(valueType)) {
    for (let i = 0; i < 4; i++) {
      const data = typedLine.slice(i * 12, i * 12 + 11);
      if (String(utilityDv(data, valueType)) !== typedLine[i * 12 + 11]) {
        issues.push(`Dígito verificador do bloco ${i + 1} não confere`);
      }
    }
  }

  if ('6789'.includes(valueType)) {
    const general = utilityDv(barcode.slice(0, 3) + barcode.slice(4), valueType);
    if (String(general) !== barcode[3]) issues.push('Dígito verificador geral do código de barras não confere');
  }

  // 6 e 8 = valor efetivo em reais; 7 e 9 = valor de referência (não é dinheiro).
  const effective = valueType === '6' || valueType === '8';
  const cents = Number(barcode.slice(4, 15));

  return {
    kind: 'utility',
    digitableLine: line,
    barcode,
    checksOk: issues.length === 0,
    issues,
    amountCents: effective && cents > 0 ? cents : null,
    dueDate: null,
    segmentCode,
    segmentLabel: UTILITY_SEGMENTS[segmentCode],
  };
}

// ---------------------------------------------------------------- extração de texto livre

/**
 * Procura, num texto qualquer (resposta de OCR/IA), sequências de dígitos que
 * sejam um boleto válido. Retorna as candidatas com DVs corretos primeiro.
 * Janelas deslizantes de 48/47/44 dígitos cobrem o caso de o OCR "colar" o
 * código com um número vizinho.
 */
export function findBoletoCodes(text: string, today: Date = new Date()): ParsedBoleto[] {
  const found = new Map<string, ParsedBoleto>();
  const runs = text.match(/\d[\d\s.\-]{40,70}\d/g) ?? [];

  for (const run of runs) {
    const digits = onlyDigits(run);
    for (const size of [48, 47, 44]) {
      for (let start = 0; start + size <= digits.length; start++) {
        const parsed = parseBoletoCode(digits.slice(start, start + size), today);
        if (parsed && parsed.checksOk && !found.has(parsed.barcode)) found.set(parsed.barcode, parsed);
      }
    }
  }
  return [...found.values()];
}
