import { Injectable, inject, signal } from '@angular/core';
import { MsalService, MsalBroadcastService, MSAL_GUARD_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { InteractionStatus, RedirectRequest, PopupRequest, AuthenticationResult, EventMessage, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface MicrosoftEvent {
    id: string;
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    webLink: string;
    organizer: { emailAddress: { name: string; address: string } };
    isOnlineMeeting: boolean;
    onlineMeetingUrl: string;
}

@Injectable({
    providedIn: 'root',
})
export class MicrosoftGraphService {
    private readonly http = inject(HttpClient);
    private readonly authService = inject(MsalService);
    private readonly msalBroadcastService = inject(MsalBroadcastService);

    readonly isSpecialized = signal(false); // Placeholder for now
    readonly isLoggedIn = signal(false);

    private readonly _destroying$ = new Subject<void>();

    private initialized = false;
    private interactionInProgress = false;

    constructor() {
        // Monitorea el estado de la interacción
        this.msalBroadcastService.inProgress$
            .pipe(takeUntil(this._destroying$))
            .subscribe((status: InteractionStatus) => {
                this.interactionInProgress = status !== InteractionStatus.None;
            });

        this.msalBroadcastService.msalSubject$
            .pipe(
                filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS || msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS),
                takeUntil(this._destroying$)
            )
            .subscribe((result: EventMessage) => {
                const payload = result.payload as AuthenticationResult;
                if (payload?.account) {
                    this.authService.instance.setActiveAccount(payload.account);
                    this.isLoggedIn.set(true);
                }
            });

        // Inicialización y recuperación de sesión
        console.log('[MSAL] Inicializando...');
        this.authService.instance.initialize().then(() => {
            this.initialized = true;
            console.log('[MSAL] Inicializado, manejando promesa de redirección...');
            this.authService.instance.handleRedirectPromise().then((result) => {
                console.log('[MSAL] Promesa de redirección manejada:', result ? 'ÉXITO' : 'Sin resultado de redirección');
                this.checkAccount();
            }).catch(err => {
                console.error('[MSAL] Error en handleRedirectPromise:', err);
            });
        });
    }

    checkAccount(): void {
        const activeAccount = this.authService.instance.getActiveAccount();
        const allAccounts = this.authService.instance.getAllAccounts();
        console.log('[MSAL] Cuentas encontradas:', allAccounts.length, 'Activa:', activeAccount?.username || 'Ninguna');

        if (!activeAccount && allAccounts.length > 0) {
            console.log('[MSAL] Estableciendo cuenta activa por defecto');
            this.authService.instance.setActiveAccount(allAccounts[0]);
            this.isLoggedIn.set(true);
        } else {
            this.isLoggedIn.set(!!activeAccount);
        }
        console.log('[MSAL] isLoggedIn signal set to:', this.isLoggedIn());
    }

    async login(): Promise<void> {
        if (this.isLoggedIn()) return;

        if (!this.initialized) {
            await this.authService.instance.initialize();
            this.initialized = true;
        }

        // Usamos loginRedirect para estabilidad absoluta
        this.authService.loginRedirect({
            scopes: ['user.read', 'calendars.read'],
            prompt: 'select_account'
        });
    }

    async logout(): Promise<void> {
        this.authService.logoutRedirect();
        this.isLoggedIn.set(false);
    }

    getCalendarView(startDate: string, endDate: string) {
        const headers = new HttpHeaders({
            'Prefer': 'outlook.timezone="SA Pacific Standard Time"'
        });
        // calendarView es mejor para filtrar por rango de fechas
        const url = `https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=${startDate}&endDateTime=${endDate}&$select=subject,start,end,webLink,organizer,isOnlineMeeting,onlineMeetingUrl&$orderby=start/dateTime`;
        return this.http.get<{ value: MicrosoftEvent[] }>(url, { headers });
    }

    getCalendarEvents() {
        const headers = new HttpHeaders({
            'Prefer': 'outlook.timezone="SA Pacific Standard Time"'
        });
        return this.http.get<{ value: MicrosoftEvent[] }>('https://graph.microsoft.com/v1.0/me/calendar/events?$select=subject,start,end,webLink,organizer,isOnlineMeeting,onlineMeetingUrl&$orderby=start/dateTime', { headers });
    }
}
