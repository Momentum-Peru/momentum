export interface Project3dPlanSummary {
  projectId: string;
  name: string;
  code: string;
  fileCount: number;
  lastUploadedAt: string;
}

export interface Project3dPlanFile {
  _id: string;
  projectId: string;
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
