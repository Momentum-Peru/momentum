export interface Document {
    _id?: string;
    numeroDocumento: number;
    serie?: number;
    proyectoId: string | ProjectReference;
    categoria?: string;
    tipo?: 'compra' | 'venta';
    fechaEmision?: Date | string;
    fechaVencimiento?: Date | string;
    documentoReferencia?: number;
    total: number;
    documentos: string[];
    isActive?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export interface ProjectReference {
    _id: string;
    name: string;
    code: string;
}

export interface DocumentOption {
    label: string;
    value: string;
}

export interface DocumentFilters {
    proyectoId?: string;
    categoria?: string;
    tipo?: 'compra' | 'venta';
    numeroDocumento?: number;
    serie?: string;
    fechaEmisionDesde?: string;
    fechaEmisionHasta?: string;
    fechaVencimientoDesde?: string;
    fechaVencimientoHasta?: string;
    totalMinimo?: number;
    totalMaximo?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface DocumentResponse {
    documents: Document[];
    total: number;
    page: number;
    totalPages: number;
}

export interface DocumentTotalResponse {
    projectId: string;
    total: number;
}

export interface DocumentUploadRequest {
    files: File[];
}

export interface DocumentFileDeleteRequest {
    fileUrl: string;
}
