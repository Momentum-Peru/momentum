export interface Contact {
    _id: string;
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    notes?: string;
    source: 'local' | 'google_contacts';
    googleContactId?: string;
    metadata?: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface CreateContactRequest {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    notes?: string;
    source?: 'local' | 'google_contacts';
    googleContactId?: string;
    metadata?: Record<string, unknown>;
    userId: string;
}

export interface UpdateContactRequest {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    address?: string;
    notes?: string;
    source?: 'local' | 'google_contacts';
    googleContactId?: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
}

export interface ContactsListResponse {
    contacts: Contact[];
    total: number;
    page: number;
    limit: number;
}

export interface GoogleContactsOAuthRequest {
    code: string;
    state: string;
}

export interface GoogleContactsOAuthResponse {
    success: boolean;
    tokenId?: string;
    error?: string;
}

export interface GoogleContactsStatusResponse {
    connected: boolean;
    email?: string;
    lastSync?: Date | string;
    contactCount?: number;
}

export interface GoogleContactsSyncResponse {
    synced: number;
    errors: number;
}

export interface ContactsSearchParams {
    search?: string;
    source?: 'local' | 'google_contacts';
    isActive?: boolean;
    page?: number;
    limit?: number;
}

export interface ContactsAdvancedSearchParams {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
}
