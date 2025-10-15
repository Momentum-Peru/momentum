import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    EmailAccount,
    CreateEmailAccountRequest,
    UpdateEmailAccountRequest,
    EmailAccountsResponse,
    EmailAccountsQueryParams,
    SmtpTestRequest,
    SmtpTestResponse,
    SmtpVerifyResponse,
    OAuth2AuthorizationRequest,
    OAuth2AuthorizationResponse,
    OAuth2ExchangeRequest,
    OAuth2ExchangeResponse,
    RefreshTokenResponse
} from '../interfaces/email-account.interface';

@Injectable({
    providedIn: 'root'
})
export class EmailAccountService {
    private http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/email-accounts`;

    /**
     * Crear una nueva cuenta de email
     */
    createAccount(account: CreateEmailAccountRequest): Observable<EmailAccount> {
        return this.http.post<EmailAccount>(this.baseUrl, account);
    }

    /**
     * Obtener todas las cuentas con filtros opcionales
     */
    getAccounts(params?: EmailAccountsQueryParams): Observable<EmailAccountsResponse> {
        let httpParams = new HttpParams();

        if (params) {
            Object.keys(params).forEach(key => {
                const value = params[key as keyof EmailAccountsQueryParams];
                if (value !== undefined && value !== null) {
                    httpParams = httpParams.set(key, value.toString());
                }
            });
        }

        return this.http.get<EmailAccountsResponse>(this.baseUrl, { params: httpParams });
    }

    /**
     * Obtener cuentas del usuario autenticado
     */
    getMyAccounts(): Observable<EmailAccount[]> {
        return this.http.get<EmailAccount[]>(`${this.baseUrl}/my-accounts`);
    }

    /**
     * Obtener una cuenta específica por ID
     */
    getAccountById(id: string): Observable<EmailAccount> {
        return this.http.get<EmailAccount>(`${this.baseUrl}/${id}`);
    }

    /**
     * Actualizar una cuenta existente
     */
    updateAccount(id: string, account: UpdateEmailAccountRequest): Observable<EmailAccount> {
        return this.http.put<EmailAccount>(`${this.baseUrl}/${id}`, account);
    }

    /**
     * Eliminar una cuenta
     */
    deleteAccount(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    /**
     * Testear conexión SMTP y enviar email de prueba
     */
    testSmtpConnection(id: string, testData: SmtpTestRequest): Observable<SmtpTestResponse> {
        return this.http.post<SmtpTestResponse>(`${this.baseUrl}/${id}/test-smtp`, testData);
    }

    /**
     * Verificar conexión SMTP sin enviar email
     */
    verifySmtpConnection(id: string): Observable<SmtpVerifyResponse> {
        return this.http.post<SmtpVerifyResponse>(`${this.baseUrl}/${id}/verify-smtp`, {});
    }

    /**
     * Generar URL de autorización OAuth2
     */
    getOAuth2AuthorizationUrl(request: OAuth2AuthorizationRequest): Observable<OAuth2AuthorizationResponse> {
        return this.http.post<OAuth2AuthorizationResponse>(`${this.baseUrl}/oauth2/authorization-url`, request);
    }

    /**
     * Intercambiar código de autorización por tokens
     */
    exchangeOAuth2Tokens(request: OAuth2ExchangeRequest): Observable<OAuth2ExchangeResponse> {
        return this.http.post<OAuth2ExchangeResponse>(`${this.baseUrl}/oauth2/exchange-tokens`, request);
    }

    /**
     * Refrescar access token OAuth2
     */
    refreshOAuth2Token(id: string): Observable<RefreshTokenResponse> {
        return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/${id}/refresh-token`, {});
    }
}
