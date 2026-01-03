/**
 * Interfaz para el usuario asistente (populado desde el backend)
 */
export interface AttendeeUser {
  _id: string;
  name: string;
  email: string;
}

/**
 * Interfaz para la entidad de Reunión (Meeting)
 * Sigue el principio de responsabilidad única: solo define la estructura de datos
 */
export interface Meeting {
  _id?: string;
  tenantId?: string;
  meetingDate: string | Date;
  title: string;
  videoLinks?: string[];
  agreements?: string;
  attendees?: string[] | AttendeeUser[]; // Puede ser IDs (string[]) o usuarios populados (AttendeeUser[])
  description?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * DTO para crear una nueva reunión
 */
export interface CreateMeetingRequest {
  meetingDate: string;
  title: string;
  videoLinks?: string[];
  agreements?: string;
  attendees?: string[];
  description?: string;
}

/**
 * DTO para actualizar una reunión existente
 */
export interface UpdateMeetingRequest {
  meetingDate?: string;
  title?: string;
  videoLinks?: string[];
  agreements?: string;
  attendees?: string[];
  description?: string;
}

/**
 * Respuesta de estadísticas de reuniones
 */
export interface MeetingStatsResponse {
  totalMeetings: number;
  meetingsWithVideos: number;
  meetingsWithAgreements: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

/**
 * Parámetros de consulta para listar reuniones
 */
export interface MeetingQueryParams {
  q?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'meetingDate' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}
