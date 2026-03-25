export interface Project3dPlanSummary {
  modelingProjectId: string;
  name: string;
  fileCount: number;
  lastUploadedAt: string;
}

/** Proyecto de modelado 3D (independiente del centro de costo). */
export interface Modeling3dProjectDto {
  _id: string;
  name: string;
  createdAt: string;
}

export interface Project3dPlanFile {
  _id: string;
  modelingProjectId: string;
  url: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project3dPlanPresignedFileSpec {
  fileName: string;
  contentType: string;
}

export interface Project3dPlanPresignedResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

export interface Project3dPlanConfirmAttachment {
  publicUrl: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
}
