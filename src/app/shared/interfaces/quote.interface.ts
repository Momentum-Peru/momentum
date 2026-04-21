export interface QuoteVehicle {
  description: string;
  unit: string;
  unitCost: number;
  days: number;
  subtotal?: number;
}

export interface QuoteVehicleGroup {
  title: string;
  items: QuoteVehicle[];
}

export interface QuotePayrollEmployee {
  type: 'Planilla' | 'Rxh';
  position?: string;
  baseRemuneration?: number;
  familyAssignment?: number;
  qtyPersons: number;
  qtyDays: number;
  valVacations?: number;
  valGratification?: number;
  valCts?: number;
  valEsSalud?: number;
  valLifeInsurance?: number;
  valVacationProvisions?: number;
  subtotal?: number;
}

export interface QuotePayrollGroup {
  title: string;
  items: QuotePayrollEmployee[];
}

export interface QuoteTool {
  description: string;
  unit: string;
  unitPrice: number;
  qty: number;
  usefulLifeMonths: number;
  subtotal?: number;
}

export interface QuoteMaterialItem {
  description: string;
  unit: string;
  metrado: number;
  unitCost: number;
  totalCost?: number;
}

export interface QuoteMaterialCategory {
  title: string;
  items: QuoteMaterialItem[];
  categoryTotal?: number;
}

export interface QuoteUniformItem {
  description: string;
  unitCost: number;
  type: 'Planilla' | 'Rxh';
  qty: number;
  usefulLifeMonths: number;
  totalEmployee?: number;
  totalWorker?: number;
}

export interface QuoteUniformCategory {
  title: string;
  items: QuoteUniformItem[];
}

export interface QuoteExpenseItem {
  description: string;
  unit: string;
  cuadrilla: number;
  qty: number;
  unitPrice: number;
  subtotal?: number;
}

export interface QuoteExpenseCategory {
  title: string;
  type: 'Fijo' | 'Variable';
  items: QuoteExpenseItem[];
}

export interface QuoteAccommodationItem {
  type: 'Alojamiento' | 'Alimentación';
  description: string;
  unit: string;
  cuadrilla: number;
  qty: number;
  unitPrice: number;
  subtotal?: number;
}

export interface QuoteCosts {
  vehicles?: QuoteVehicleGroup[];
  payrolls?: QuotePayrollGroup[];
  tools?: QuoteTool[];
  materials?: QuoteMaterialCategory[];
  uniforms?: QuoteUniformCategory[];
  expenses?: QuoteExpenseCategory[];
  accommodations?: QuoteAccommodationItem[];
  
  totalVehicles?: number;
  totalPayrolls?: number;
  totalTools?: number;
  totalMaterials?: number;
  totalUniforms?: number;
  totalExpenses?: number;
  totalAccommodations?: number;
  grandTotalCosts?: number;
}

export interface QuoteSubItem {
  description: string;
  qty: number;
  unit: string;
  price: number;
  subtotal?: number;
}

export interface QuoteMainItem {
  number: string;
  description: string;
  qty: number;
  unit: string;
  price: number;
  subtotal?: number;
  finalTotal?: number;
  subItems?: QuoteSubItem[];
}

export interface ComplianceItem {
  description: string;
}

export interface Quote {
  _id?: string;
  clientId: string | { _id: string; name: string; taxId?: string };
  state: QuoteState;
  projectId: string | { _id: string; name: string; code: string };
  requirementId?: string | { _id: string; codigo: string; title: string };
  number: string;
  createDate: string | Date;
  sendDate?: string | Date;
  expirationDate?: string | Date;
  documents: string[];
  
  location?: string;
  area?: number;
  
  costs?: QuoteCosts;
  items: QuoteMainItem[];
  grandTotalQuote?: number;

  notes?: string;

  clientCompliance?: ComplianceItem[];
  coordCompliance?: ComplianceItem[];
  tecmeingCompliance?: ComplianceItem[];

  includeExpenses?: boolean;
  includeIgv?: boolean;
  percentageGeneralExpenses?: number;
  percentageAccommodationFood?: number;
  percentageUtilities?: number;

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
  byState: {
    _id: QuoteState;
    count: number;
    totalValue: number;
  }[];
  totalQuotes: number;
  totalValue: number;
}
