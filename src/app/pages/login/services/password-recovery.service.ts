import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ForgotPasswordRequest {
    email: string;
}

export interface VerifyResetCodeRequest {
    email: string;
    code: string;
}

export interface ResetPasswordRequest {
    email: string;
    code: string;
    newPassword: string;
}

export interface ForgotPasswordResponse {
    message: string;
}

export interface VerifyResetCodeResponse {
    message: string;
    valid: boolean;
}

export interface ResetPasswordResponse {
    message: string;
}

/**
 * Servicio responsable de manejar la recuperación de contraseña
 * Principio de Responsabilidad Única: Solo se encarga de las operaciones de recuperación de contraseña
 */
@Injectable({
    providedIn: 'root'
})
export class PasswordRecoveryService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/auth`;

    /**
     * Solicita un código de recuperación de contraseña
     * @param email Email del usuario
     * @returns Observable con la respuesta del servidor
     */
    requestResetCode(email: string): Observable<ForgotPasswordResponse> {
        const request: ForgotPasswordRequest = { email };
        return this.http.post<ForgotPasswordResponse>(
            `${this.apiUrl}/forgot-password`,
            request
        );
    }

    /**
     * Verifica el código de recuperación
     * @param email Email del usuario
     * @param code Código de verificación
     * @returns Observable con la respuesta de verificación
     */
    verifyResetCode(email: string, code: string): Observable<VerifyResetCodeResponse> {
        const request: VerifyResetCodeRequest = { email, code };
        return this.http.post<VerifyResetCodeResponse>(
            `${this.apiUrl}/verify-reset-code`,
            request
        );
    }

    /**
     * Resetea la contraseña del usuario
     * @param email Email del usuario
     * @param code Código de verificación
     * @param newPassword Nueva contraseña
     * @returns Observable con la respuesta del servidor
     */
    resetPassword(email: string, code: string, newPassword: string): Observable<ResetPasswordResponse> {
        const request: ResetPasswordRequest = { email, code, newPassword };
        return this.http.post<ResetPasswordResponse>(
            `${this.apiUrl}/reset-password`,
            request
        );
    }
}

