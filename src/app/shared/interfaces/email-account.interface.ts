export type EmailProvider = 'smtp' | 'imap' | 'gmail_oauth2' | 'outlook_oauth2';
export type EmailAccountStatus = 'active' | 'inactive' | 'error' | 'testing';

export interface EmailAccount {
    _id: string;
    userId: string;
    name: string;
    provider: EmailProvider;
    status: EmailAccountStatus;
    host?: string;
    port?: number;
    email?: string;
    secure?: boolean;
    lastTestAt?: Date;
    lastTestResult?: string;
    createdAt: Date;
    updatedAt: Date;
    // Campos específicos para OAuth2
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    metadata?: any;
}

export interface CreateEmailAccountRequest {
    name: string;
    provider: EmailProvider;
    host?: string;
    port?: number;
    email?: string;
    password?: string;
    secure?: boolean;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    metadata?: any;
}

export interface UpdateEmailAccountRequest {
    name?: string;
    provider?: EmailProvider;
    host?: string;
    port?: number;
    email?: string;
    password?: string;
    secure?: boolean;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    metadata?: any;
}

export interface EmailAccountsResponse {
    accounts: EmailAccount[];
    total: number;
    page: number;
    limit: number;
}

export interface EmailAccountsQueryParams {
    userId?: string;
    provider?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface SmtpTestRequest {
    testEmail: string;
    subject?: string;
    message?: string;
}

export interface SmtpTestResponse {
    success: boolean;
    message: string;
    details?: {
        messageId: string;
        accepted: string[];
        rejected: string[];
    };
}

export interface SmtpVerifyResponse {
    success: boolean;
    message: string;
}

export interface OAuth2AuthorizationRequest {
    provider: 'gmail_oauth2' | 'outlook_oauth2';
}

export interface OAuth2AuthorizationResponse {
    authorizationUrl: string;
    state: string;
}

export interface OAuth2ExchangeRequest {
    code: string;
    state: string;
    provider: 'gmail_oauth2' | 'outlook_oauth2';
}

export interface OAuth2ExchangeResponse {
    success: boolean;
    accountId: string;
    message: string;
}

export interface RefreshTokenResponse {
    success: boolean;
    accessToken: string;
    message: string;
}
