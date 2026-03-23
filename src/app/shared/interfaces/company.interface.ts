/**
 * Interfaces para el módulo de Empresas de Momentum
 */

export interface Company {
    _id: string;
    name: string;
    code?: string;
    taxId?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CompanyOption {
    _id: string;
    name: string;
    code?: string;
}

export interface CreateCompanyRequest {
    name: string;
    code?: string;
    taxId?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive?: boolean;
}

export interface UpdateCompanyRequest {
    name?: string;
    code?: string;
    taxId?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive?: boolean;
}

export interface CompanyQueryParams {
    search?: string;
    isActive?: boolean;
}

/** Empresa CRM (`crm_companies`): sin código interno; RUC obligatorio al crear. */
export interface CrmCompany {
    _id: string;
    name: string;
    taxId: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateCrmCompanyRequest {
    name: string;
    taxId: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive?: boolean;
}

export interface UpdateCrmCompanyRequest {
    name?: string;
    taxId?: string;
    description?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    isActive?: boolean;
}

