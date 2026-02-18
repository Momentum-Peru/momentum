import { Injectable, inject, signal } from '@angular/core';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus, AuthenticationResult, EventMessage, EventType } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../pages/login/services/auth.service';

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
    private readonly msalService = inject(MsalService);
    private readonly msalBroadcastService = inject(MsalBroadcastService);
    private readonly appAuthService = inject(AuthService);

    readonly isSpecialized = signal(false);
    readonly isLoggedIn = signal(false);

    private readonly _destroying$ = new Subject<void>();

    private initialized = false;

    constructor() {
        // Monitorea el estado de la interacción
        this.msalBroadcastService.inProgress$
            .pipe(takeUntil(this._destroying$))
            .subscribe((status: InteractionStatus) => {
                // interactionInProgress logic handled natively by MSAL components usually, 
                // but we keep sync for isLoggedIn
            });

        this.msalBroadcastService.msalSubject$
            .pipe(
                filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS || msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS),
                takeUntil(this._destroying$)
            )
            .subscribe((result: EventMessage) => {
                const payload = result.payload as AuthenticationResult;
                if (payload?.account) {
                    this.msalService.instance.setActiveAccount(payload.account);
                    this.checkAccount();
                }
            });

        // Inicialización y recuperación de sesión
        this.msalService.instance.initialize().then(() => {
            this.initialized = true;
            this.msalService.instance.handleRedirectPromise().then(() => {
                this.checkAccount();
            }).catch(err => {
                console.error('[MSAL] Error en handleRedirectPromise:', err);
            });
        });
    }

    checkAccount(): void {
        const activeAccount = this.msalService.instance.getActiveAccount();
        const allAccounts = this.msalService.instance.getAllAccounts() as any[];

        if (!activeAccount && allAccounts.length > 0) {
            this.msalService.instance.setActiveAccount(allAccounts[0]);
            this.isLoggedIn.set(true);
        } else {
            this.isLoggedIn.set(!!activeAccount);
        }
    }

    async login(): Promise<void> {
        if (this.isLoggedIn()) return;

        if (!this.initialized) {
            await this.msalService.instance.initialize();
            this.initialized = true;
        }

        const currentUserEmail = this.appAuthService.getCurrentUser()?.email;

        this.msalService.loginRedirect({
            scopes: ['user.read', 'calendars.read'],
            prompt: 'select_account',
            loginHint: currentUserEmail || undefined
        });
    }

    async logout(): Promise<void> {
        this.msalService.logoutRedirect();
        this.isLoggedIn.set(false);
    }

    getCalendarView(startDate: string, endDate: string) {
        const headers = new HttpHeaders({
            'Prefer': 'outlook.timezone="SA Pacific Standard Time"'
        });
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
