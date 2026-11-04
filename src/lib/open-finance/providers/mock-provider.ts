import type {
  OpenFinanceProvider, OFInstitution, OFConnectInitResult, OFAccount,
  OFBalance, OFTransaction, OFCard, OFInvoice, OFConnectionRef,
} from '../types';

/**
 * Provider de demonstração — usado quando nenhum provider real está configurado
 * (ver OPEN_FINANCE_PROVIDER no .env) ou para popular o modo DEMO do app.
 * NUNCA deve ser usado silenciosamente em produção como se fosse uma conexão real:
 * a UI precisa deixar explícito que está em modo demo/mock.
 */
export class MockOpenFinanceProvider implements OpenFinanceProvider {
  readonly key = 'mock';

  async listInstitutions(): Promise<OFInstitution[]> {
    return [
      { externalId: 'mock-bank-a', name: 'Banco Demo A' },
      { externalId: 'mock-bank-b', name: 'Banco Demo B' },
    ];
  }

  async connectInstitution(): Promise<OFConnectInitResult> {
    return { status: 'connected', externalConnectionId: `mock-conn-${Date.now()}` };
  }

  async refreshConnection(ref: OFConnectionRef): Promise<OFConnectInitResult> {
    return { status: 'connected', externalConnectionId: ref.externalConnectionId };
  }

  async getAccounts(): Promise<OFAccount[]> {
    return [{ externalAccountId: 'mock-acc-1', name: 'Conta Corrente Demo', type: 'checking' }];
  }

  async getBalances(): Promise<OFBalance[]> {
    return [{ externalAccountId: 'mock-acc-1', currentBalance: 5230.42, availableBalance: 5230.42, recordedAt: new Date().toISOString() }];
  }

  async getTransactions(): Promise<OFTransaction[]> {
    return [
      { externalId: 'mock-tx-1', externalAccountId: 'mock-acc-1', occurredAt: new Date().toISOString(), description: 'IFOOD', amount: -45.9, merchant: 'IFOOD' },
      { externalId: 'mock-tx-2', externalAccountId: 'mock-acc-1', occurredAt: new Date().toISOString(), description: 'SALARIO', amount: 8000, merchant: 'Empregador' },
    ];
  }

  async getCards(): Promise<OFCard[]> {
    return [{ externalCardId: 'mock-card-1', name: 'Cartão Demo', brand: 'mastercard', lastFour: '4242', creditLimit: 10000, availableLimit: 7200, closingDay: 20, dueDay: 27 }];
  }

  async getInvoices(): Promise<OFInvoice[]> {
    const month = new Date().toISOString().slice(0, 7) + '-01';
    return [{ externalCardId: 'mock-card-1', referenceMonth: month, totalAmount: 2840, status: 'open' }];
  }

  async disconnectInstitution(): Promise<void> {
    return;
  }
}
