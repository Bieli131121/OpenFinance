export type ConnectionStatus = 'pending' | 'connected' | 'expired' | 'revoked' | 'error';
export interface OFInstitution { externalId: string; name: string; logoUrl?: string; }
export interface OFConnectInitResult { redirectUrl?: string; externalConnectionId?: string; status: ConnectionStatus; }
export interface OFAccount { externalAccountId: string; name: string; type: 'checking' | 'savings' | 'salary' | 'payment' | 'investment' | 'cash' | 'other'; }
export interface OFBalance { externalAccountId: string; currentBalance: number; availableBalance?: number; recordedAt: string; }
export interface OFTransaction { externalId: string; externalAccountId?: string; externalCardId?: string; occurredAt: string; description: string; amount: number; merchant?: string; installmentNumber?: number; installmentTotal?: number; }
export interface OFCard { externalCardId: string; name: string; brand?: string; lastFour?: string; creditLimit?: number; availableLimit?: number; closingDay?: number; dueDay?: number; }
export interface OFInvoice { externalCardId: string; referenceMonth: string; totalAmount: number; dueDate?: string; closingDate?: string; status: 'open' | 'closed' | 'paid' | 'overdue'; }
export interface OFConnectionRef { connectionId: string; externalConnectionId: string; accessToken?: string; refreshToken?: string; }
export interface OpenFinanceProvider {
  readonly key: string;
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
