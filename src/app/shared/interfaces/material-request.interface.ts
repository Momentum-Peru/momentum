/**
 * Interfaz para el usuario relacionado con la solicitud (populado desde el backend)
 */
export interface MaterialRequestUser {
  _id: string;
  name: string;
  email: string;
}

/**
 * Interfaz para el proyecto relacionado (populado desde el backend)
 */
export interface MaterialRequestProject {
  _id: string;
  name: string;
}

/**
 * Interfaz para un item de la solicitud de materiales
 * Sigue el principio de responsabilidad única: solo define la estructura de datos
 */
export interface MaterialRequestItem {
  description: string;
  quantity: number;
  unit: string;
}

/**
 * Interfaz para una actualización de la solicitud
 */
export interface MaterialRequestUpdate {
  message: string;
  updatedBy: string | MaterialRequestUser; // Puede ser ID (string) o usuario populado (MaterialRequestUser)
  attachments?: string[];
  createdAt: string | Date;
}

/**
 * Interfaz para la entidad de Solicitud de Materiales
 * Sigue el principio de responsabilidad única: solo define la estructura de datos
 */
export interface MaterialRequest {
  _id?: string;
  tenantId?: string;
  requestedBy: string | MaterialRequestUser; // Puede ser ID (string) o usuario populado (MaterialRequestUser)
  title: string;
  items: MaterialRequestItem[];
  status: 'pendiente' | 'aprobado' | 'rechazado' | 'en_compra' | 'completado';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  projectId?: string | MaterialRequestProject; // Puede ser ID (string) o proyecto populado (MaterialRequestProject)
  approvedBy?: string | MaterialRequestUser;
  approvedAt?: string | Date;
  rejectedBy?: string | MaterialRequestUser;
  rejectedAt?: string | Date;
  rejectionReason?: string;
  attachments?: string[]; // URLs de archivos adjuntos iniciales
  updates?: MaterialRequestUpdate[]; // Historial de actualizaciones
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * DTO para crear una nueva solicitud de materiales
 */
export interface CreateMaterialRequestRequest {
  requestedBy: string;
  title: string;
  items: MaterialRequestItem[];
  priority?: 'baja' | 'media' | 'alta' | 'urgente';
  projectId?: string;
  attachments?: string[];
}

/**
 * DTO para actualizar una solicitud existente
 */
export interface UpdateMaterialRequestRequest {
  title?: string;
  items?: MaterialRequestItem[];
  priority?: 'baja' | 'media' | 'alta' | 'urgente';
  status?: 'pendiente' | 'aprobado' | 'rechazado' | 'en_compra' | 'completado';
  projectId?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  attachments?: string[];
}

/**
 * DTO para agregar una actualización a la solicitud
 */
export interface AddUpdateRequest {
  message: string;
  updatedBy: string;
  attachments?: string[];
}

/**
 * Respuesta de estadísticas de solicitudes
 */
export interface MaterialRequestStatsResponse {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  inPurchaseRequests: number;
  completedRequests: number;
  urgentRequests: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

/**
 * Parámetros de consulta para listar solicitudes
 */
export interface MaterialRequestQueryParams {
  q?: string;
  status?: 'pendiente' | 'aprobado' | 'rechazado' | 'en_compra' | 'completado';
  priority?: 'baja' | 'media' | 'alta' | 'urgente';
  requestedBy?: string;
  projectId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'status' | 'priority';
  sortOrder?: 'asc' | 'desc';
}
