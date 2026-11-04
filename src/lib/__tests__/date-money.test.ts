import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped, dateOnlyToISO, daysBetween, localParts, monthBounds,
  monthStartDate, nextDayDate, parseDateOnly, todayISODate,
} from '../date';
import { splitInstallmentsCents, toCents } from '../money';
import { getInvoiceDates, getInvoiceReferenceMonth } from '../supabase/queries/invoice-recalc';

describe('addMonthsClamped (substitui setMonth)', () => {
  it('31/01 + 1 mês = 28/02, não 03/03', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('ano bissexto', () => {
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
  });
  it('volta ao dia 31 quando o mês comporta (calculando sempre a partir da data original)', () => {
    expect(['2026-01-31', ...[1, 2, 3, 4].map((i) => addMonthsClamped('2026-01-31', i))]).toEqual(
      ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  });
  it('vira o ano', () => {
    expect(addMonthsClamped('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonthsClamped('2026-12-31', 12)).toBe('2027-12-31');
  });
  it('12x gera 12 meses consecutivos sem pular nenhum', () => {
    const months = Array.from({ length: 12 }, (_, i) => addMonthsClamped('2026-08-31', i).slice(0, 7));
    expect(new Set(months).size).toBe(12);
  });
});

describe('limites de mês (fuso de Brasília)', () => {
  it('às 23h de 31/10 em Brasília (02h UTC de 01/11) ainda é outubro', () => {
    const now = new Date('2026-11-01T02:00:00Z');
    expect(localParts(now)).toEqual({ year: 2026, month: 10, day: 31 });
    expect(monthStartDate(0, now)).toBe('2026-10-01');
    expect(todayISODate(now)).toBe('2026-10-31');
  });
  it('intervalo [início, fim) cobre o mês inteiro e não vaza para o seguinte', () => {
    const b = monthBounds(0, new Date('2026-10-15T15:00:00Z'));
    expect(b.start).toBe('2026-10-01T03:00:00.000Z');
    expect(b.end).toBe('2026-11-01T03:00:00.000Z');
    // lançamento do último dia (meio-dia local) está dentro; o do dia 1º do mês seguinte, fora
    const last = dateOnlyToISO('2026-10-31');
    const next = dateOnlyToISO('2026-11-01');
    expect(last >= b.start && last < b.end).toBe(true);
    expect(next >= b.start && next < b.end).toBe(false);
  });
  it('deslocamentos negativos e virada de ano', () => {
    const now = new Date('2026-01-10T15:00:00Z');
    expect(monthStartDate(-1, now)).toBe('2025-12-01');
    expect(monthStartDate(12, now)).toBe('2027-01-01');
    expect(monthBounds(-1, now).endDate).toBe('2026-01-01');
  });
  it('filtro "até a data" inclui o dia inteiro', () => {
    expect(nextDayDate('2026-10-31')).toBe('2026-11-01');
    expect(nextDayDate('2026-12-31')).toBe('2027-01-01');
    expect(nextDayDate('2028-02-28')).toBe('2028-02-29');
  });
  it('datas inexistentes são rejeitadas', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('2026-13-01')).toBeNull();
    expect(parseDateOnly('26-01-01')).toBeNull();
    expect(() => dateOnlyToISO('2026-02-30')).toThrow();
  });
  it('daysBetween', () => {
    expect(daysBetween('2026-10-29', '2026-11-10')).toBe(12);
    expect(daysBetween('2026-11-10', '2026-10-29')).toBe(-12);
  });
});

describe('parcelas em centavos', () => {
  it('100,00 em 3x soma exatamente 100,00', () => {
    const parts = splitInstallmentsCents(toCents(100), 3);
    expect(parts).toEqual([3333, 3333, 3334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
  });
  it('valores que quebram com float (0,1 + 0,2)', () => {
    const parts = splitInstallmentsCents(toCents(1999.99), 7);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(199999);
  });
  it('1 parcela', () => {
    expect(splitInstallmentsCents(12345, 1)).toEqual([12345]);
  });
});

describe('fatura do cartão', () => {
  it('compra até o fechamento entra no mês; depois, no seguinte', () => {
    expect(getInvoiceReferenceMonth(new Date('2026-10-10T15:00:00Z'), 10)).toBe('2026-10-01');
    expect(getInvoiceReferenceMonth(new Date('2026-10-11T15:00:00Z'), 10)).toBe('2026-11-01');
    expect(getInvoiceReferenceMonth(new Date('2026-12-20T15:00:00Z'), 10)).toBe('2027-01-01');
  });
  it('compra às 22h do dia 10 em Brasília (01h UTC do dia 11) ainda é dia 10', () => {
    expect(getInvoiceReferenceMonth(new Date('2026-10-11T01:00:00Z'), 10)).toBe('2026-10-01');
  });
  it('vencimento antes do fechamento cai no mês seguinte; dia 31 é limitado ao fim do mês', () => {
    expect(getInvoiceDates('2026-10-01', 20, 27)).toEqual({ closingDate: '2026-10-20', dueDate: '2026-10-27' });
    expect(getInvoiceDates('2026-10-01', 25, 5)).toEqual({ closingDate: '2026-10-25', dueDate: '2026-11-05' });
    expect(getInvoiceDates('2026-02-01', 10, 31)).toEqual({ closingDate: '2026-02-10', dueDate: '2026-02-28' });
  });
});
