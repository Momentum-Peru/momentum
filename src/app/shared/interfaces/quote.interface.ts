export interface QuoteItem {
  description: string;
  qty: number;
  price: number;
}

export interface Quote {
  _id?: string;
  clientId: string | { _id: string; name: string; taxId?: string };
  state: QuoteState;
  projectId: string | { _id: string; name: string; code: string };
  number: string;
  createDate: string | Date;
  sendDate?: string | Date;
  expirationDate?: string | Date;
  documents: string[];
  items: QuoteItem[];
  total: number;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type QuoteState =
  | 'Pendiente'
  | 'Enviada'
  | 'Rechazada'
  | 'Cancelada'
  | 'Observada'
  | 'Aprobada';

export interface QuoteOption {
  _id: string;
  number: string;
  clientName: string;
  total: number;
  state: QuoteState;
}

export interface QuoteQueryParams {
  q?: string;
  clientId?: string;
  projectId?: string;
  state?: QuoteState;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface QuoteListResponse {
  data: Quote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QuoteStatistics {
  byState: Array<{
    _id: QuoteState;
    count: number;
    totalValue: number;
  }>;
  totalQuotes: number;
  totalValue: number;
}
