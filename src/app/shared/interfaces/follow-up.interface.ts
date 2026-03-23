/**
 * Interfaces para el módulo de Seguimientos (Follow-ups) del CRM
 */

export type FollowUpType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'PROPOSAL' | 'OTHER';
export type FollowUpStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface FollowUp {
  _id?: string;
  title?: string;
  description?: string;
  type?: FollowUpType;
  status?: FollowUpStatus;
  scheduledDate?: string;
  leadId?: string;
  contactId?: string;
  clientId?: string;
  userId?: string;
  attachments?: string[];
  outcome?: string;
  nextFollowUpDate?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateFollowUpRequest {
  title?: string;
  description?: string;
  type?: FollowUpType;
  status?: FollowUpStatus;
  scheduledDate?: string;
  leadId?: string;
  contactId?: string;
  clientId?: string;
  userId?: string;
  attachments?: string[];
  outcome?: string;
  nextFollowUpDate?: string;
}

export interface UpdateFollowUpRequest {
  title?: string;
  description?: string;
  type?: FollowUpType;
  status?: FollowUpStatus;
  scheduledDate?: string;
  leadId?: string;
  contactId?: string;
  clientId?: string;
  userId?: string;
  attachments?: string[];
  outcome?: string;
  nextFollowUpDate?: string;
}

export interface FollowUpQueryParams {
  leadId?: string;
  contactId?: string;
  clientId?: string;
  userId?: string;
  status?: FollowUpStatus;
  type?: FollowUpType;
  startDate?: string;
  endDate?: string;
}

export interface UpcomingFollowUpsParams {
  userId?: string;
  days?: number;
}
