import type { OpenFinanceProvider } from './types';
import { MockOpenFinanceProvider } from './providers/mock-provider';
export function getOpenFinanceProvider(): OpenFinanceProvider | null {
  const key = process.env.OPEN_FINANCE_PROVIDER;
  switch (key) { case 'mock': return new MockOpenFinanceProvider(); default: return null; }
}
export * from './types';
