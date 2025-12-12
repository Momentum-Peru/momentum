export interface ProjectAttachment {
  _id?: string;
  fileName: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  description?: string;
}

export interface Project {
  _id?: string;
  name: string;
  description?: string;
  code: string;
  clientId: string | { _id: string; name: string; taxId?: string }; // Relacionado con el _id del cliente
  status:
    | 'PENDIENTE'
    | 'EN_COTIZACION'
    | 'APROBADO'
    | 'EN_EJECUCION'
    | 'EN_OBSERVACION'
    | 'TERMINADO'
    | 'CANCELADO';
  startDate?: string | Date;
  endDate?: string | Date;
  location?: string;
  budget?: number;
  notes?: string;
  isActive?: boolean;
  attachments?: ProjectAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectOption {
  label: string;
  value: string;
}
