export interface Project {
    _id?: string;
    name: string;
    description?: string;
    code: string;
    clientId: string; // Relacionado con el _id del cliente
    status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
    startDate?: string;
    endDate?: string;
    location?: string;
    budget?: number;
    notes?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectOption {
    label: string;
    value: string;
}