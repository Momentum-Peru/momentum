/**
 * Interfaz para el usuario que reportó o actualizó el ticket (populado desde el backend)
 */
export interface TicketUser {
  _id: string;
  name: string;
  email: string;
}

/**
 * Interfaz para una actualización del ticket
 */
export interface TicketUpdate {
  message: string;
  updatedBy: string | TicketUser; // Puede ser ID (string) o usuario populado (TicketUser)
  attachments?: string[];
  createdAt: string | Date;
}

/**
 * Interfaz para la entidad de Ticket
 * Sigue el principio de responsabilidad única: solo define la estructura de datos
 */
export interface Ticket {
  _id?: string;
  tenantId?: string;
  reportedBy: string | TicketUser; // Puede ser ID (string) o usuario populado (TicketUser)
  problem: string;
  status: 'abierto' | 'cerrado';
  attachments?: string[]; // URLs de archivos adjuntos iniciales
  updates?: TicketUpdate[]; // Historial de actualizaciones
  createdAt?: string | Date;
  updatedAt?: string | Date;
  closedAt?: string | Date;
}

/**
 * DTO para crear un nuevo ticket
 */
export interface CreateTicketRequest {
  reportedBy: string;
  problem: string;
  attachments?: string[];
}

/**
 * DTO para actualizar un ticket existente
 */
export interface UpdateTicketRequest {
  reportedBy?: string;
  problem?: string;
  status?: 'abierto' | 'cerrado';
  attachments?: string[];
}

/**
 * DTO para agregar una actualización al ticket
 */
export interface AddUpdateRequest {
  message: string;
  updatedBy: string;
  attachments?: string[];
}

/**
 * Respuesta de estadísticas de tickets
 */
export interface TicketStatsResponse {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  ticketsWithUpdates: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

/**
 * Parámetros de consulta para listar tickets
 */
export interface TicketQueryParams {
  q?: string;
  status?: 'abierto' | 'cerrado';
  reportedBy?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}
