export type AccionableEstado = 'pendiente' | 'cumplido';

export interface Fi {
  _id: string;
  titulo: string;
  description: string;
  atravesar: string;
  plan: string;
  startDate: string; // ISO Date (YYYY-MM-DD, sin hora)
  endDate: string; // ISO Date (YYYY-MM-DD, sin hora)
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFiRequest {
  titulo: string;
  description: string;
  atravesar: string;
  plan: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateFiRequest {
  titulo?: string;
  description?: string;
  atravesar?: string;
  plan?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface FiActionableAttachment {
  _id?: string;
  fileName: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  description?: string;
}

export interface FiActionableTask {
  _id?: string;
  title: string;
  completed: boolean;
  order?: number;
}

export interface Accionable {
  _id: string;
  fiId: string;
  fecha: string; // ISO
  descripcion: string;
  estado: AccionableEstado;
  attachments?: FiActionableAttachment[];
  tasks?: FiActionableTask[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccionableRequest {
  fecha: string; // ISO
  descripcion: string;
}

export interface UpdateAccionableRequest {
  fecha?: string;
  descripcion?: string;
  estado?: AccionableEstado;
}

export interface UpdateAccionableEstadoRequest {
  estado: AccionableEstado;
}

export interface CalendarDay {
  fecha: string; // YYYY-MM-DD
  accionable: Accionable | null;
}

export interface CalendarResponse {
  fiId: string;
  rango: { from: string; to: string };
  dias: CalendarDay[];
}
