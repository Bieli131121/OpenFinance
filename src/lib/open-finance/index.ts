import type { OpenFinanceProvider } from './types';
import { MockOpenFinanceProvider } from './providers/mock-provider';

/**
 * Resolve o provider ativo a partir da variável de ambiente OPEN_FINANCE_PROVIDER.
 * Para plugar um provider real (ex: Pluggy, Belvo), crie uma classe em ./providers
 * implementando OpenFinanceProvider e registre aqui.
 *
 * Se nenhum provider estiver configurado, o app deve mostrar claramente
 * "Open Finance ainda não configurado" — nunca simular uma conexão real.
 */
export function getOpenFinanceProvider(): OpenFinanceProvider | null {
  const key = process.env.OPEN_FINANCE_PROVIDER;

  switch (key) {
    case 'mock':
      return new MockOpenFinanceProvider();
    // case 'pluggy':
    //   return new PluggyProvider({ clientId: process.env.PLUGGY_CLIENT_ID!, clientSecret: process.env.PLUGGY_CLIENT_SECRET! });
    // case 'belvo':
    //   return new BelvoProvider({ ... });
    default:
      return null; // nenhum provider real configurado ainda
  }
}

export * from './types';
