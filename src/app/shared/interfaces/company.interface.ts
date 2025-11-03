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
    isActive?: boolean;
}

export interface CompanyQueryParams {
    search?: string;
    isActive?: boolean;
}

