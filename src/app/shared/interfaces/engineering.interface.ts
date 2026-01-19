export type EngineeringType = 'Mantenimiento' | 'Fabricación' | 'Montaje' | 'Mixto';

// DEPRECATED: Tipo legacy para compatibilidad
export type EngineeringDocumentType = 'structural' | 'schedule' | 'fabrication' | 'assembly' | 'bom' | 'other';

// Categoría de documentos
export interface DocumentCategory {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  order?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Documento de ingeniería con categoría
export interface EngineeringDocument {
  _id: string;
  engineeringProjectId: string;
  categoryId: string | DocumentCategory;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Documentos agrupados por categoría
export interface DocumentsByCategory {
  category: DocumentCategory;
  documents: EngineeringDocument[];
}

export interface Engineering {
  _id?: string;
  projectId: string | { _id: string; name: string; code: string; status?: string };
  type: EngineeringType;
  // DEPRECATED: Campos legacy para compatibilidad con datos existentes
  structuralCalculations?: string[]; // Array de URLs
  schedules?: string[]; // Array de URLs
  fabricationPlans?: string[]; // Array de URLs
  assemblyPlans?: string[]; // Array de URLs
  billOfMaterials?: string[]; // Array de URLs
  otherDocuments?: string[]; // Array de URLs
  // Nuevo: Documentos agrupados por categoría
  documentsByCategory?: DocumentsByCategory[];
  createdAt?: string;
  updatedAt?: string;
}

