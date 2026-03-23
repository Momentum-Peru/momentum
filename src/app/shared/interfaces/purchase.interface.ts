/**
 * Interfaces del módulo de compras (alineadas con purchases-api.md).
 * Un contrato por dominio para mantener SRP en servicios.
 */

export type PurchaseRequirementStatus =
  | 'borrador'
  | 'cotizaciones_pendientes'
  | 'listo_para_comparar'
  | 'adjudicado'
  | 'cerrado';

export type PurchaseRequirementPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface PurchaseRequirementItem {
  productCode?: string;
  description: string;
  quantity: number;
  unit: string;
  centerCostId?: string;
  specifications?: string;
}

export interface PurchaseRequirement {
  _id: string;
  tenantId?: string;
  number?: string;
  title: string;
  description?: string;
  items: PurchaseRequirementItem[];
  status: PurchaseRequirementStatus;
  priority: PurchaseRequirementPriority;
  requestedBy: { _id: string; name?: string; email?: string } | string;
  projectId?: { _id: string; name?: string } | string;
  dueDate?: string;
  approvedBy?: { _id: string; name?: string } | string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseRequirementRequest {
  title: string;
  description?: string;
  items: PurchaseRequirementItem[];
  requestedBy: string;
  priority?: PurchaseRequirementPriority;
  projectId?: string;
  dueDate?: string;
  attachments?: string[];
}

export interface PurchaseQuoteLine {
  requirementItemIndex: number;
  unitPrice: number;
  quantity: number;
  includesIgv?: boolean;
  discount?: number;
  brandOrModel?: string;
  deliveryDays?: number;
}

export interface RegisterQuoteRequest {
  providerId: string;
  lines: PurchaseQuoteLine[];
  totalAmount: number;
  deliveryDays?: number;
  validUntil?: string;
  notes?: string;
  attachmentUrls?: string[];
  paymentTerms?: string;
  warranty?: string;
}

export interface PurchaseQuote {
  _id: string;
  requirementId: string | { _id: string; title?: string; items?: PurchaseRequirementItem[] };
  providerId: { _id: string; name?: string; taxId?: string; address?: string } | string;
  lines: PurchaseQuoteLine[];
  totalAmount: number;
  deliveryDays?: number;
  validUntil?: string;
  status: string;
  notes?: string;
  attachmentUrls?: string[];
  paymentTerms?: string;
  warranty?: string;
  projectId?: string | { _id: string; name?: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdjudicateSelection {
  itemIndex: number;
  providerId: string;
  quantity: number;
  unitPrice: number;
  includesIgv?: boolean;
}

export interface AdjudicateRequest {
  selections: AdjudicateSelection[];
  notes?: string;
}

export interface PurchaseCompareQuoteSummary {
  quoteId: string;
  providerId: string;
  provider: { name?: string; taxId?: string };
  totalAmount: number;
  deliveryDays?: number;
  linesByItemIndex: Record<
    string,
    { unitPrice: number; quantity: number; total: number; deliveryDays?: number }
  >;
}

export interface PurchaseCompareResponse {
  requirement: PurchaseRequirement;
  items: PurchaseRequirementItem[];
  quotes: PurchaseCompareQuoteSummary[];
  summary: {
    lowestTotalProvider: { quoteId: string; provider: unknown; totalAmount: number } | null;
    fastestDeliveryProvider: { quoteId: string; provider: unknown; deliveryDays?: number } | null;
    recommended: { quoteId: string; provider: unknown; totalAmount: number } | null;
  };
}

export interface PurchaseOrderLine {
  requirementItemIndex: number;
  productCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  includesIgv?: boolean;
  discount?: number;
  centerCostId?: string;
  productId?: string;
}

export interface PurchaseOrder {
  _id: string;
  number: string;
  requirementId?: string | { _id: string; title?: string };
  providerId: { _id: string; name?: string; taxId?: string } | string;
  lines: PurchaseOrderLine[];
  totalAmount: number;
  currency: string;
  exchangeRate?: number;
  issueDate: string;
  dueDate?: string;
  status: string;
  paymentTerms?: string;
  notes?: string;
  quoteId?: string;
  projectId?: string | { _id: string; name?: string };
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderRequest {
  number?: string;
  providerId: string;
  createdBy?: string;
  providerName: string;
  providerRuc?: string;
  providerAddress?: string;
  lines: PurchaseOrderLine[];
  subtotal: number;
  igvAmount: number;
  totalAmount: number;
  currency?: string;
  exchangeRate?: number;
  issueDate: string;
  dueDate?: string;
  quoteId?: string;
  projectId?: string;
  paymentTerms?: string;
  notes?: string;
  attachments?: string[];
}

export interface PurchaseVoucherLine {
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  includesIgv?: boolean;
  discount?: number;
  centerCostId?: string;
}

export interface PurchaseVoucher {
  _id: string;
  providerId: { _id: string; name?: string; taxId?: string } | string;
  purchaseOrderId?: string | { _id: string; number?: string };
  goodsReceiptIds?: string[] | { _id: string; number?: string }[];
  guideId?: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  moneda: string;
  tipoCambio?: number;
  lines: PurchaseVoucherLine[];
  valorVentaAfecto?: number;
  valorVentaExonerado?: number;
  valorVentaInafecto?: number;
  igv?: number;
  percepcion?: number;
  retencion?: number;
  subjectToDetraction?: boolean;
  detractionCode?: string;
  detractionPercent?: number;
  detractionAmount?: number;
  importeTotal: number;
  rightToTaxCredit: boolean;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterVoucherRequest {
  providerId: string;
  purchaseOrderId?: string;
  goodsReceiptIds?: string[];
  guideId?: string;
  tipoComprobante: string;
  serie: string;
  numero: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  moneda?: string;
  tipoCambio?: number;
  lines: PurchaseVoucherLine[];
  valorVentaAfecto?: number;
  valorVentaExonerado?: number;
  valorVentaInafecto?: number;
  igv?: number;
  percepcion?: number;
  retencion?: number;
  subjectToDetraction?: boolean;
  detractionCode?: string;
  detractionPercent?: number;
  detractionAmount?: number;
  importeTotal: number;
  rightToTaxCredit?: boolean;
  notes?: string;
}

// --- Goods Receipt ---

export interface GoodsReceiptLine {
  purchaseOrderLineIndex: number;
  productCode?: string;
  description: string;
  quantityReceived: number;
  unit: string;
  centerCostId?: string;
}

export interface GoodsReceipt {
  _id: string;
  tenantId?: string;
  number: string;
  purchaseOrderId: { _id: string; number?: string; lines?: PurchaseOrderLine[] } | string;
  providerId: { _id: string; name?: string; taxId?: string } | string;
  guideNumber?: string;
  receiptDate: string;
  lines: GoodsReceiptLine[];
  status: 'borrador' | 'recibida' | 'anulada';
  notes?: string;
  receivedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoodsReceiptRequest {
  purchaseOrderId: string;
  providerId: string;
  guideNumber?: string;
  receiptDate: string;
  lines: GoodsReceiptLine[];
  notes?: string;
}
