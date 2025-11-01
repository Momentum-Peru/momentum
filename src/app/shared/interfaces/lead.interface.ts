/**
 * Interfaces para el módulo de Leads (Posibles Clientes) del CRM
 */

export type LeadStatus =
    | 'NEW'
    | 'CONTACTED'
    | 'QUALIFIED'
    | 'PROPOSAL'
    | 'NEGOTIATION'
    | 'CONVERTED'
    | 'LOST';

export type LeadSource =
    | 'WEBSITE'
    | 'REFERRAL'
    | 'SOCIAL_MEDIA'
    | 'EMAIL'
    | 'PHONE'
    | 'EVENT'
    | 'OTHER';

export interface LeadContact {
    name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
}

export interface LeadCompany {
    name?: string;
    taxId?: string;
    sector?: string;
    companySize?: string;
    website?: string;
}

export interface LeadLocation {
    paisCodigo?: string;
    provinciaCodigo?: string;
    distritoCodigo?: string;
    direccion?: string;
}

export interface Lead {
    _id?: string;
    name: string;
    contact: LeadContact;
    company?: LeadCompany;
    location?: LeadLocation;
    status: LeadStatus;
    source: LeadSource;
    estimatedValue?: number;
    notes?: string;
    assignedTo?: string;
    documents?: string[];
    convertedToClientId?: string;
    convertedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateLeadRequest {
    name: string;
    contact: LeadContact;
    company?: LeadCompany;
    location?: LeadLocation;
    status?: LeadStatus;
    source?: LeadSource;
    estimatedValue?: number;
    notes?: string;
    assignedTo?: string;
}

export interface UpdateLeadRequest {
    name?: string;
    contact?: Partial<LeadContact>;
    company?: Partial<LeadCompany>;
    location?: Partial<LeadLocation>;
    status?: LeadStatus;
    source?: LeadSource;
    estimatedValue?: number;
    notes?: string;
    assignedTo?: string;
}

export interface LeadQueryParams {
    status?: LeadStatus;
    source?: LeadSource;
    assignedTo?: string;
    search?: string;
}

export interface LeadStatistics {
    total: number;
    byStatus: {
        NEW?: number;
        CONTACTED?: number;
        QUALIFIED?: number;
        PROPOSAL?: number;
        NEGOTIATION?: number;
        CONVERTED?: number;
        LOST?: number;
    };
    bySource: {
        WEBSITE?: number;
        REFERRAL?: number;
        SOCIAL_MEDIA?: number;
        EMAIL?: number;
        PHONE?: number;
        EVENT?: number;
        OTHER?: number;
    };
    totalValue: number;
}

export interface ConvertLeadToClientRequest {
    clientId: string;
}

