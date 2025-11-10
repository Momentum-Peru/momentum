import { Project } from './project.interface';

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface PopulatedAttendanceRecord {
  _id: string;
  type: 'ENTRADA' | 'SALIDA';
  timestamp: string;
}

export type TimeTrackingStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'PAUSADO';
export type TimeTrackingType = 'INGRESO' | 'SALIDA';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface TimeTracking {
  _id?: string;
  date: string; // ISO datetime completo (YYYY-MM-DDTHH:mm:ss.sssZ)
  type: TimeTrackingType; // INGRESO o SALIDA
  userId: string | PopulatedUser; // puede venir populado
  projectId?: string | Project | null; // opcional
  attendanceRecordId: string | PopulatedAttendanceRecord; // requerido, referencia a registro de asistencia
  location?: Location; // opcional, coordenadas GPS
  createdAt?: string;
  updatedAt?: string;
  // Campos legacy para compatibilidad (deprecated)
  startTime?: string; // HH:mm (deprecated)
  endTime?: string; // HH:mm (deprecated)
  duration?: number; // minutos (deprecated)
  status?: TimeTrackingStatus; // deprecated
  description?: string; // deprecated
  notes?: string; // deprecated
  documents?: string[]; // URLs (deprecated)
}

export interface CreateTimeTrackingRequest {
  date: string; // ISO datetime completo (YYYY-MM-DDTHH:mm:ss.sssZ)
  type: TimeTrackingType; // INGRESO o SALIDA
  userId: string;
  projectId?: string;
  attendanceRecordId: string; // requerido
  location?: Location; // opcional
}

export interface UpdateTimeTrackingRequest {
  date?: string; // ISO datetime completo
  type?: TimeTrackingType;
  projectId?: string;
  location?: Location;
}

export interface TimeTrackingQueryParams {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  type?: TimeTrackingType;
  q?: string;
}

