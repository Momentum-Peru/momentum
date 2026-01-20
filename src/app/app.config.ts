import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import MayaPreset from './themes/maya-preset';
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
      inputStyle: 'outlined'
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
    }
  ]
};
