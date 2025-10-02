import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    role?: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'moderator' | 'admin';
    isActive: boolean;
    googleId?: string;
    profilePicture?: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GoogleTokenInfo {
    id: string;
    email: string;
    scope: string;
    tokenType: string;
    expiresIn: number;
    tokenCreatedAt: string;
    lastRefreshedAt: string;
    isActive: boolean;
    isExpired: boolean;
}

export interface GoogleStatus {
    hasGoogleConnected: boolean;
    email?: string;
}

export interface GoogleAssociationRequest {
    userId: string;
    tokenId: string;
    email: string;
}

export interface GoogleAssociationResponse {
    email: string;
    id: string;
    isActive: boolean;
    tokenId: string;
    userId: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    // Estado del usuario autenticado
    private currentUserSubject = new BehaviorSubject<User | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    // Token JWT
    private tokenSubject = new BehaviorSubject<string | null>(null);
    public token$ = this.tokenSubject.asObservable();

    /**
     * Inicializa el estado de autenticación desde localStorage
     */

    /**
     * Obtiene el token actual
     */
    getToken(): string | null {
        return this.tokenSubject.value;
    }

    /**
     * Obtiene el usuario actual
     */
    getCurrentUser(): User | null {
        return JSON.parse(localStorage.getItem('user') || 'null');
    }

    /**
     * Establece el token actual
     */
    setToken(token: string): void {
        this.tokenSubject.next(token);
    }

    /**
     * Establece el usuario actual
     */
    setUser(user: User): void {
        this.currentUserSubject.next(user);
    }

    loadAppConfig(): boolean {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        if (token && user) {
            this.tokenSubject.next(token);
            this.currentUserSubject.next(user as unknown as User);
            return true;
        }
        return false;
    }

    /**
     * Verifica la autenticación de manera más robusta
     * Incluye verificación de localStorage como respaldo
     */
    isAuthenticated(): boolean {
        // Primero verificar los BehaviorSubjects
        const token = this.tokenSubject.value;
        const user = this.currentUserSubject.value;

        if (token && user) {
            return true;
        }

        return false;
    }

    /**
     * Obtiene los headers con autorización
     */
    private getAuthHeaders(): HttpHeaders {
        const token = this.getToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        });
    }

    /**
     * Login tradicional con email y contraseña
     */
    login(credentials: LoginRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials)
            .pipe(
                tap(response => {
                    // Guardar token y usuario
                    this.tokenSubject.next(response.access_token);
                    this.currentUserSubject.next(response.user);
                    localStorage.setItem('auth_token', response.access_token);
                    localStorage.setItem('user', JSON.stringify(response.user));

                    console.log('AuthService - Login successful, user:', response.user);
                    console.log('AuthService - Token saved:', response.access_token);
                })
            );
    }

    /**
     * Registro de nuevo usuario
     */
    register(userData: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, userData)
            .pipe(
                tap(response => {
                    // Guardar token y usuario
                    this.tokenSubject.next(response.access_token);
                    this.currentUserSubject.next(response.user);
                    localStorage.setItem('auth_token', response.access_token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                })
            );
    }

    /**
     * Obtener perfil del usuario autenticado
     */
    getProfile(): Observable<User> {
        return this.http.get<User>(`${environment.apiUrl}/auth/profile`, {
            headers: this.getAuthHeaders()
        }).pipe(
            tap(user => this.currentUserSubject.next(user))
        );
    }

    /**
     * Iniciar autenticación con Google OAuth2
     */
    loginWithGoogle(): void {
        window.location.href = `${environment.apiUrl}/auth/google`;
    }

    /**
     * Manejar el callback de Google OAuth2
     */
    handleGoogleCallback(token: string, user: User): void {
        this.tokenSubject.next(token);
        this.currentUserSubject.next(user);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Verificar estado de conexión con Google
     */
    getGoogleStatus(): Observable<GoogleStatus> {
        return this.http.get<GoogleStatus>(`${environment.apiUrl}/auth/google/status`, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Obtener información de tokens de Google
     */
    getGoogleTokenInfo(): Observable<GoogleTokenInfo> {
        return this.http.get<GoogleTokenInfo>(`${environment.apiUrl}/auth/google/token-info`, {
            headers: this.getAuthHeaders()
        });
    }

    /**
     * Renovar access token de Google
     */
    refreshGoogleToken(): Observable<{ accessToken: string; expiresIn: number; refreshedAt: string }> {
        return this.http.post<{ accessToken: string; expiresIn: number; refreshedAt: string }>(
            `${environment.apiUrl}/auth/google/refresh-token`,
            {},
            { headers: this.getAuthHeaders() }
        );
    }

    /**
     * Asociar Google Calendar con usuario autenticado
     */
    associateGoogleCalendar(payload: GoogleAssociationRequest): Observable<GoogleAssociationResponse> {
        return this.http.post<GoogleAssociationResponse>(
            `${environment.apiUrl}/auth/associations/associate`,
            payload,
            { headers: this.getAuthHeaders() }
        );
    }

    /**
     * Desconectar cuenta de Google
     */
    disconnectGoogle(): Observable<{ message: string; disconnectedAt: string }> {
        const currentUser = this.getCurrentUser();
        if (!currentUser?.id) {
            throw new Error('Usuario no autenticado para desconectar Google');
        }

        return this.http.post<{ message: string; disconnectedAt: string }>(
            `${environment.apiUrl}/auth/google/disconnect/${currentUser.id}`,
            {},
            { headers: this.getAuthHeaders() }
        );
    }

    /**
     * Verificar configuración de Google OAuth2
     */
    getGoogleConfigStatus(): Observable<{
        isConfigured: boolean;
        message: string;
        setupInstructions: string[];
    }> {
        return this.http.get<{
            isConfigured: boolean;
            message: string;
            setupInstructions: string[];
        }>(`${environment.apiUrl}/auth/google/config-status`);
    }


    /**
     * Cerrar sesión
     */
    logout(): void {
        this.tokenSubject.next(null);
        this.currentUserSubject.next(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        this.router.navigate(['/ingreso']);
    }

    /**
     * Verificar si el usuario tiene rol específico
     */
    hasRole(role: 'user' | 'moderator' | 'admin'): boolean {
        const user = this.getCurrentUser();
        return user?.role === role;
    }

    /**
     * Verificar si el usuario es admin o moderator
     */
    isAdminOrModerator(): boolean {
        const user = this.getCurrentUser();
        return user?.role === 'admin' || user?.role === 'moderator';
    }

    /**
     * Ejemplo de método que convierte Observable a Promise usando firstValueFrom
     * Útil cuando necesitas usar async/await con Observables
     */
    async loginAsync(credentials: LoginRequest): Promise<AuthResponse> {
        return firstValueFrom(this.login(credentials));
    }

    /**
     * Ejemplo de método que convierte Observable a Promise usando lastValueFrom
     * Útil cuando necesitas el último valor emitido por el Observable
     */
    async getProfileAsync(): Promise<User> {
        return firstValueFrom(this.getProfile());
    }
}
