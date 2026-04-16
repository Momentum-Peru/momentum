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

export interface ProjectCreator {
  _id: string;
  name: string;
  email?: string;
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
  createdBy?: string | ProjectCreator; // Usuario que creó el proyecto
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectOption {
  _id: string;
  name: string;
  code: string;
}
