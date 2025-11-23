/**
 * Interfaces para el análisis de audio con IA
 */

export interface PresignedUrlRequest {
    fileName: string;
    contentType: string;
    expirationTime?: number; // En segundos, mínimo 60, máximo 604800. Default: 3600
}

export interface PresignedUrlResponse {
    presignedUrl: string;
    publicUrl: string;
    key: string;
}

export interface AudioAnalysisRequest {
    audioUrl: string;
    leadId?: string;
}

export interface AudioAnalysisResponse {
    summary: string;
    agreements: string[];
    improvementPoints: string[];
    followUpActions: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number; // 0-1
}

