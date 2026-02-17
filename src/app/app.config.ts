import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { IPublicClientApplication } from '@azure/msal-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import type { Translation } from 'primeng/api';
import MayaPreset from './themes/maya-preset';
import {
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalService,
  MsalGuard,
  MsalBroadcastService,
  MsalModule,
  MsalInterceptor
} from '@azure/msal-angular';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import {
  MSALInstanceFactory,
  MSALGuardConfigFactory,
  MSALInterceptorConfigFactory
} from './core/configs/msal.config';

/** Traducción global de PrimeNG a español (datepicker, filtros, etc.) */
const primeNgLocaleEs: Translation = {
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  firstDayOfWeek: 0,
  today: 'Hoy',
  weekHeader: 'Sem',
  dateFormat: 'dd/mm/yy',
  chooseYear: 'Elegir año',
  chooseMonth: 'Elegir mes',
  chooseDate: 'Elegir fecha',
  prevDecade: 'Década anterior',
  nextDecade: 'Década siguiente',
  prevYear: 'Año anterior',
  nextYear: 'Año siguiente',
  prevMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  prevHour: 'Hora anterior',
  nextHour: 'Hora siguiente',
  prevMinute: 'Minuto anterior',
  nextMinute: 'Minuto siguiente',
  prevSecond: 'Segundo anterior',
  nextSecond: 'Segundo siguiente',
  am: 'a.m.',
  pm: 'p.m.',
  clear: 'Limpiar',
  apply: 'Aplicar',
  accept: 'Aceptar',
  reject: 'Rechazar',
  cancel: 'Cancelar'
};
import { authInterceptor } from './interceptors/auth.interceptor';
import { tokenInterceptor } from './interceptors/token.interceptor';
import { tenantInterceptor } from './interceptors/tenant.interceptor';
import { logsInterceptor } from './interceptors/logs.interceptor';
import { AuthService } from './pages/login/services/auth.service';
import { TenantService } from './core/services/tenant.service';


export function initializeApp(authService: AuthService) {
  return () => authService.loadAppConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([tokenInterceptor, tenantInterceptor, authInterceptor, logsInterceptor])
    ),
    MessageService,
    providePrimeNG({
      theme: {
        preset: MayaPreset,
        options: {
          darkModeSelector: false, // Desactivar modo dark completamente
        }
      },
      ripple: false,
      inputStyle: 'outlined',
      translation: primeNgLocaleEs
    }),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (tenant: TenantService) => () => tenant.loadFromStorage(),
      deps: [TenantService],
    },
    importProvidersFrom(MsalModule),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (msal: IPublicClientApplication) => () => msal.initialize(),
      deps: [MSAL_INSTANCE],
      multi: true
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService
  ]
};
