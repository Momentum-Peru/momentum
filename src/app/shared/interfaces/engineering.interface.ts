export type EngineeringType = 'Mantenimiento' | 'Fabricación' | 'Montaje' | 'Mixto';

export type EngineeringDocumentType = 'structural' | 'schedule' | 'fabrication' | 'assembly' | 'bom' | 'other';

export interface Engineering {
  _id?: string;
  projectId: string | { _id: string; name: string; code: string; status?: string };
  type: EngineeringType;
  structuralCalculations?: string[]; // Array de URLs
  schedules?: string[]; // Array de URLs
  fabricationPlans?: string[]; // Array de URLs
  assemblyPlans?: string[]; // Array de URLs
  billOfMaterials?: string[]; // Array de URLs
  otherDocuments?: string[]; // Array de URLs
  createdAt?: string;
  updatedAt?: string;
}

