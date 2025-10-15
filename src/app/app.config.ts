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
import { AuthService } from './pages/login/services/auth.service';


export function initializeApp(authService: AuthService) {
  return () => authService.loadAppConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([tokenInterceptor, authInterceptor])
    ),
    MessageService,
    providePrimeNG({
      theme: {
        preset: MayaPreset,
      }
    }),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    }
  ]
};
