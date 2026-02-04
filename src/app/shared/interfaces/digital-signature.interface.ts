
export interface DigitalSignature {
  _id: string;
  userId: string;
  companyId: string;
  signatureUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDigitalSignatureRequest {
  file: File;
  companyId: string;
}
