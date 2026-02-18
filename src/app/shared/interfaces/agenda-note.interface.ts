export type AgendaNoteType = 'text' | 'voice' | 'drawing';

export type AgendaNoteStatus = 'pendiente' | 'en_proceso' | 'terminado';

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

export interface AgendaNoteExternal {
  name: string;
  email: string;
  phone?: string;
  createdAt?: string;
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
  assignedExternal?: AgendaNoteExternal[];
  /** Fecha y hora de vencimiento (ISO). */
  dueAt?: string | null;
  /** Fecha y hora de finalización (ISO) para eventos de Microsoft. */
  endAt?: string | null;
  /** Estado de la tarea: pendiente, en_proceso, terminado. */
  status?: AgendaNoteStatus;
  sharedVia?: AgendaNoteSharedVia[];
  teamsMeetingId?: string | null;
  /** Indica si es un evento importado de Microsoft Graph. */
  isMicrosoftEvent?: boolean;
  /** URL de la reunión de Teams. */
  onlineMeetingUrl?: string | null;
  /** Enlace a la reunión en la web (Outlook). */
  webLink?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgendaNotePayload {
  type: AgendaNoteType;
  content?: string;
  tenantId?: string;
  status?: AgendaNoteStatus;
  dueAt?: string | null;
}

export interface UpdateAgendaNotePayload {
  type?: AgendaNoteType;
  content?: string;
  /** Fecha y hora de vencimiento (ISO). null para quitar. */
  dueAt?: string | null;
  status?: AgendaNoteStatus;
}

export interface AssignAgendaNotePayload {
  userIds: string[];
  /** Fecha y hora de vencimiento (ISO). Opcional. */
  dueAt?: string | null;
  externalContacts?: AgendaNoteExternal[];
}

export interface ShareAgendaNotePayload {
  channel: 'email' | 'whatsapp';
  to?: string;
}
