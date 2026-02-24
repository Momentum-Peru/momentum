/**
 * Interfaces para el módulo Caja Chica.
 * Responsabilidad única: definir tipos de datos del dominio.
 */

export interface PettyCashBox {
  _id: string;
  tenantId: string;
  name: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashBalance {
  balance: number;
  currency: string;
}

export interface PettyCashCreatedBy {
  _id: string;
  name?: string;
  email?: string;
}

export interface PettyCashMovement {
  _id: string;
  tenantId: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  category?: string;
  documentNumber?: string;
  receiptAttachmentUrl?: string;
  createdBy: PettyCashCreatedBy | string;
  status: 'active' | 'anulado';
  voidedAt?: string;
  voidedBy?: PettyCashCreatedBy | string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashPaginatedMovements {
  data: PettyCashMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PettyCashCategoryStat {
  category: string;
  total: number;
  count: number;
}

export interface CreateExpenseRequest {
  amount: number;
  description: string;
  category?: string;
  documentNumber?: string;
  receiptAttachmentUrl?: string;
}

export interface CreateRechargeRequest {
  amount: number;
  description: string;
}

export interface MovementQueryParams {
  boxId?: string;
  q?: string;
  type?: 'ingreso' | 'egreso';
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  includeVoided?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export const EXPENSE_CATEGORIES = ['Transporte', 'Útiles', 'Alimentación', 'Otros'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
