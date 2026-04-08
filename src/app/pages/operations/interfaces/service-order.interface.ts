export interface ServiceOrder {
  _id?: string;
  code: string;
  projectId: string | any;
  tenantId: string;
  description: string;
  receptionDate?: Date | string;
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
  emailReference?: string;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceOrderQueryParams {
  projectId?: string;
  status?: string;
  q?: string;
}
