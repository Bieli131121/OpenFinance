/**
 * Utilitários de data no fuso do Brasil.
 *
 * Por que isso existe: o servidor (Vercel) roda em UTC. Usar `new Date().getMonth()`
 * ou `toISOString().slice(0, 7)` faz o "mês atual" virar o mês seguinte às 21h
 * (horário de Brasília) do último dia, e `new Date('2026-11-01').toISOString()`
 * grava 31/10 às 21h. Aqui todo cálculo de mês/dia usa America/Sao_Paulo.
 *
 * O Brasil não adota horário de verão desde 2019, então o offset é fixo (-03:00).
 * Se isso mudar, é só trocar BR_OFFSET.
 */

export const APP_TIMEZONE = 'America/Sao_Paulo';
const BR_OFFSET = '-03:00';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

const pad = (n: number) => String(n).padStart(2, '0');

export interface DateParts { year: number; month: number; day: number } // month: 1-12

/** Ano/mês/dia de um instante, no fuso do Brasil. */
export function localParts(date: Date = new Date()): DateParts {
  const parts = dateFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** 'YYYY-MM-DD' de hoje (ou de `date`) no fuso do Brasil. */
export function todayISODate(date: Date = new Date()): string {
  const { year, month, day } = localParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1-12; dia 0 do mês seguinte
}

/** Valida e decompõe 'YYYY-MM-DD'. Retorna null para datas inexistentes (ex: 2026-02-30). */
export function parseDateOnly(value: string): DateParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

/** Primeiro dia do mês (com deslocamento em meses a partir de hoje) como 'YYYY-MM-01'. */
export function monthStartDate(offset = 0, now: Date = new Date()): string {
  const { year, month } = localParts(now);
  const index = year * 12 + (month - 1) + offset;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
}

export interface MonthBounds {
  /** 'YYYY-MM-01' — útil para colunas `date` (reference_month, due_date). */
  startDate: string;
  /** 'YYYY-MM-01' do mês seguinte (limite superior EXCLUSIVO). */
  endDate: string;
  /** Instantes ISO (UTC) para colunas `timestamptz`: use `.gte(start)` e `.lt(end)`. */
  start: string;
  end: string;
}

/**
 * Limites do mês [start, end). SEMPRE use os dois lados do intervalo:
 * `.gte('occurred_at', start).lt('occurred_at', end)`. Só com o limite inferior,
 * parcelas futuras e lançamentos de meses seguintes entram na conta do mês atual.
 */
export function monthBounds(offset = 0, now: Date = new Date()): MonthBounds {
  const startDate = monthStartDate(offset, now);
  const endDate = monthStartDate(offset + 1, now);
  return { startDate, endDate, start: dateOnlyToStartISO(startDate), end: dateOnlyToStartISO(endDate) };
}

/** Meia-noite (horário de Brasília) de 'YYYY-MM-DD', em ISO/UTC. */
export function dateOnlyToStartISO(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00${BR_OFFSET}`).toISOString();
}

/**
 * Converte a data de um <input type="date"> em timestamp ao MEIO-DIA de Brasília.
 * Meio-dia evita que qualquer diferença de fuso empurre o lançamento para o dia
 * anterior/seguinte na hora de exibir ou de filtrar por mês.
 */
export function dateOnlyToISO(dateOnly: string): string {
  if (!isValidDateOnly(dateOnly)) throw new Error('Data inválida');
  return new Date(`${dateOnly}T12:00:00${BR_OFFSET}`).toISOString();
}

/** Dia seguinte a 'YYYY-MM-DD' (para limite superior exclusivo de filtros "até a data"). */
export function nextDayDate(dateOnly: string): string {
  const p = parseDateOnly(dateOnly);
  if (!p) throw new Error('Data inválida');
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Soma meses preservando o "dia do mês" sempre que possível e limitando ao
 * último dia quando o mês de destino é menor. `setMonth` não faz isso:
 * 31/01 + 1 mês vira 03/03 (pula fevereiro inteiro). Aqui vira 28/02 (ou 29/02).
 *
 * Sempre calcule a partir da data ORIGINAL (`addMonthsClamped(base, i)`), nunca
 * encadeando — assim 31/01, 28/02, 31/03 em vez de 31/01, 28/02, 28/03.
 */
export function addMonthsClamped(dateOnly: string, months: number): string {
  const p = parseDateOnly(dateOnly);
  if (!p) throw new Error('Data inválida');
  const index = p.year * 12 + (p.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const day = Math.min(p.day, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 'YYYY-MM-DD' para um dia específico de um mês, limitando ao último dia do mês. */
export function clampedDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`;
}

/** Diferença em dias inteiros (b - a) entre duas datas 'YYYY-MM-DD'. */
export function daysBetween(a: string, b: string): number {
  const pa = parseDateOnly(a);
  const pb = parseDateOnly(b);
  if (!pa || !pb) throw new Error('Data inválida');
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000);
}

/** Rótulo 'outubro de 2026' do mês (com deslocamento) no fuso do Brasil. */
export function monthLabel(offset = 0, now: Date = new Date()): string {
  const start = monthStartDate(offset, now);
  return new Date(`${start}T12:00:00${BR_OFFSET}`).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric', timeZone: APP_TIMEZONE,
  });
}

/** Formata 'YYYY-MM-DD' como dd/mm/aaaa sem passar por fuso horário. */
export function formatDateOnly(dateOnly: string): string {
  const p = parseDateOnly(dateOnly);
  if (!p) return dateOnly;
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}
