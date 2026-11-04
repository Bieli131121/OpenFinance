import type { CategorySource } from './categorize';

/** O que a IA de visão leu da foto (ainda NÃO confiável: é cruzado com o código de barras). */
export interface VisionBoletoResult {
  isBoleto: boolean;
  digitableLine: string | null;
  amount: number | null;
  /** 'YYYY-MM-DD' */
  dueDate: string | null;
  beneficiary: string | null;
  description: string | null;
  /** Nome de categoria sugerido (restrito às categorias do usuário). */
  category: string | null;
  /** 0..1 */
  confidence: number;
  notes: string | null;
}

export interface ScanCategory { id: string; name: string }

/** Resultado final mostrado ao usuário para CONFIRMAR (nada é salvo antes disso). */
export interface BoletoScanResult {
  origin: 'image' | 'code';
  description: string;
  beneficiary: string | null;
  amount: number | null;
  /** 'YYYY-MM-DD' */
  dueDate: string | null;
  categoryId: string | null;
  categoryName: string;
  categorySource: CategorySource;
  digitableLine: string | null;
  barcode: string | null;
  /** true/false = dígitos verificadores conferem; null = nenhum código encontrado. */
  codeValid: boolean | null;
  /** De onde vieram valor e vencimento. */
  amountSource: 'code' | 'image' | null;
  dueDateSource: 'code' | 'image' | null;
  confidence: number;
  warnings: string[];
  /** Id de um boleto já cadastrado com o mesmo código de barras. */
  duplicateBillId: string | null;
}
