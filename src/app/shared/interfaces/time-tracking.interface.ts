import { Project } from './project.interface';

export type TimeTrackingStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'PAUSADO';

export interface TimeTracking {
  _id?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  duration?: number; // minutos
  status: TimeTrackingStatus;
  description: string;
  notes?: string;
  documents?: string[]; // URLs
  userId: string | any; // puede venir populado
  projectId?: string | Project | null; // opcional
  attendanceRecordId?: string | any; // opcional, referencia a registro de asistencia
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTimeTrackingRequest {
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status?: TimeTrackingStatus;
  description: string;
  notes?: string;
  documents?: string[];
  userId: string;
  projectId?: string;
  attendanceRecordId?: string;
}

export interface UpdateTimeTrackingRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status?: TimeTrackingStatus;
  description?: string;
  notes?: string;
  documents?: string[];
  projectId?: string;
  attendanceRecordId?: string;
}

export interface TimeTrackingQueryParams {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  status?: TimeTrackingStatus;
  q?: string;
}

