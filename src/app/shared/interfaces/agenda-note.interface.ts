export type AgendaNoteType = 'text' | 'voice' | 'drawing';

export interface AgendaNoteUser {
  _id: string;
  name: string;
  email: string;
}

export interface AgendaNoteSharedVia {
  channel: 'email' | 'whatsapp';
  at: string;
  to?: string;
}

export interface AgendaNote {
  _id: string;
  tenantId?: string;
  createdBy: AgendaNoteUser | string;
  type: AgendaNoteType;
  content?: string;
  voiceUrl?: string[];
  drawingUrl?: string[];
  assignedTo?: (AgendaNoteUser | string)[];
  /** Fecha y hora de vencimiento (ISO). */
  dueAt?: string | null;
  sharedVia?: AgendaNoteSharedVia[];
  teamsMeetingId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgendaNotePayload {
  type: AgendaNoteType;
  content?: string;
  tenantId?: string;
}

export interface UpdateAgendaNotePayload {
  type?: AgendaNoteType;
  content?: string;
  /** Fecha y hora de vencimiento (ISO). null para quitar. */
  dueAt?: string | null;
}

export interface AssignAgendaNotePayload {
  userIds: string[];
  /** Fecha y hora de vencimiento (ISO). Opcional. */
  dueAt?: string | null;
}

export interface ShareAgendaNotePayload {
  channel: 'email' | 'whatsapp';
  to?: string;
}
