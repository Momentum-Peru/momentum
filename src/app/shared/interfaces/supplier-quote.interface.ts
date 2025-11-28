export type SupplierQuoteStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface SupplierQuote {
  _id?: string;
  projectId: string | { _id: string; name: string; code: string };
  providerId: string | { _id: string; name: string; ruc?: string };
  requirementId?: string | { _id: string; codigo: string; title: string };
  items: string;
  totalCost?: number;
  deadline?: string | Date;
  status?: SupplierQuoteStatus;
  createdAt?: string;
  updatedAt?: string;
}

