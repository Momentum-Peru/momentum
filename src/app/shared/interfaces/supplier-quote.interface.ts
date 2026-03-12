export type SupplierQuoteStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface SupplierQuoteItem {
  productId?: string | { _id: string; name: string; code?: string };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  includesIgv?: boolean;
  brandOrModel?: string;
}

export interface SupplierQuote {
  _id?: string;
  projectId: string | { _id: string; name: string; code: string };
  providerId: string | { _id: string; name: string; ruc?: string; businessName?: string };
  requirementId?: string | { _id: string; title: string };
  rfqId?: string | { _id: string; title: string; code: string };
  items: SupplierQuoteItem[];
  totalCost?: number;
  currency?: string;
  subtotal?: number;
  igv?: number;
  paymentTerms?: string;
  deliveryTime?: string;
  validityDays?: number;
  deadline?: string | Date;
  status?: SupplierQuoteStatus;
  documentUrl?: string;
  documents?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
