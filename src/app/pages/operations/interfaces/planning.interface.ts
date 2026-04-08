export interface TechnicalFile {
  _id?: string;
  tenantId: string;
  serviceOrderId: string;
  name: string;
  url: string;
  type: 'PLANO' | 'CRONOGRAMA' | 'PRESUPUESTO' | 'OTRO';
  size?: number;
  mimeType?: string;
  uploadedBy?: any;
  createdAt?: Date;
}

export interface ProjectCharter {
  _id?: string;
  serviceOrderId: string;
  projectGoal: string;
  objectives: string[];
  scope: string;
  constraints?: string[];
  assumptions?: string[];
  stakeholders?: {
    role: string;
    name: string;
    responsibility: string;
  }[];
  approvedAt?: Date;
  approvedBy?: any;
}

export interface ProjectRoster {
  _id?: string;
  serviceOrderId: string;
  employeeId: any;
  role: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface SafetyDocument {
  _id?: string;
  serviceOrderId: string;
  type: 'PETS' | 'IPERC';
  name: string;
  url: string;
  description?: string;
  version?: string;
  status: 'PENDIENTE' | 'EN_REVISION' | 'APROBADO' | 'RECHAZADO';
  uploadedBy?: any;
  reviewedBy?: any;
  reviewedAt?: Date;
  approvedBy?: any;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt?: Date;
}
