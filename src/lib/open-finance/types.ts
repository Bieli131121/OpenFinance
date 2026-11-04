// Tipos compartilhados por qualquer implementação de OpenFinanceProvider.
// Um provider real (Pluggy, Belvo, Quanto, etc.) deve mapear a resposta dele para estes tipos.

export type ConnectionStatus = 'pending' | 'connected' | 'expired' | 'revoked' | 'error';

export interface OFInstitution {
  externalId: string;
  name: string;
  logoUrl?: string;
}

export interface OFConnectInitResult {
  /** URL para redirecionar o usuário no fluxo OAuth/consentimento do provider. */
  redirectUrl?: string;
  /** Alguns providers retornam a conexão já pronta em modo widget/embutido. */
  externalConnectionId?: string;
  status: ConnectionStatus;
}

export interface OFAccount {
  externalAccountId: string;
  name: string;
  type: 'checking' | 'savings' | 'salary' | 'payment' | 'investment' | 'cash' | 'other';
}

export interface OFBalance {
  externalAccountId: string;
  currentBalance: number;
  availableBalance?: number;
  recordedAt: string; // ISO date
}

export interface OFTransaction {
  externalId: string;
  externalAccountId?: string;
  externalCardId?: string;
  occurredAt: string; // ISO date
  description: string;
  amount: number; // positivo = entrada, negativo = saída
  merchant?: string;
  installmentNumber?: number;
  installmentTotal?: number;
}

export interface OFCard {
  externalCardId: string;
  name: string;
  brand?: string;
  lastFour?: string;
  creditLimit?: number;
  availableLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface OFInvoice {
  externalCardId: string;
  referenceMonth: string; // 'YYYY-MM-01'
  totalAmount: number;
  dueDate?: string;
  closingDate?: string;
  status: 'open' | 'closed' | 'paid' | 'overdue';
}

export interface OFConnectionRef {
  connectionId: string;          // id interno (open_finance_connections.id)
  externalConnectionId: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Contrato que qualquer provedor de Open Finance deve implementar.
 * Trocar de provider = trocar a implementação injetada, nada mais no resto do sistema muda.
 */
export interface OpenFinanceProvider {
  readonly key: string; // ex: 'mock', 'pluggy', 'belvo'

  listInstitutions(): Promise<OFInstitution[]>;

  connectInstitution(institutionExternalId: string, userId: string): Promise<OFConnectInitResult>;

  refreshConnection(ref: OFConnectionRef): Promise<OFConnectInitResult>;

  getAccounts(ref: OFConnectionRef): Promise<OFAccount[]>;

  getBalances(ref: OFConnectionRef): Promise<OFBalance[]>;

  getTransactions(ref: OFConnectionRef, since?: string): Promise<OFTransaction[]>;

  getCards(ref: OFConnectionRef): Promise<OFCard[]>;

  getInvoices(ref: OFConnectionRef): Promise<OFInvoice[]>;

  disconnectInstitution(ref: OFConnectionRef): Promise<void>;
}
