/**
 * Interfaces para el módulo de Contactos del CRM
 * Diferente del Contact existente que es para Google Contacts
 */

export interface ContactCrm {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  clientId?: string;
  isPrimary?: boolean;
  notes?: string;
  assignedTo?: string;
  lastFollowUpDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateContactCrmRequest {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  clientId?: string;
  isPrimary?: boolean;
  notes?: string;
  assignedTo?: string;
}

export interface UpdateContactCrmRequest {
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  isPrimary?: boolean;
  notes?: string;
  assignedTo?: string;
}

export interface ContactCrmQueryParams {
  clientId?: string;
  assignedTo?: string;
  isPrimary?: boolean;
  search?: string;
}
