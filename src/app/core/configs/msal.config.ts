import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
    IPublicClientApplication,
    PublicClientApplication,
    InteractionType,
    BrowserCacheLocation,
    LogLevel,
} from '@azure/msal-browser';
import {
    MsalInterceptor,
    MsalGuard,
    MsalBroadcastService,
    MsalService,
    MSAL_INSTANCE,
    MSAL_GUARD_CONFIG,
    MSAL_INTERCEPTOR_CONFIG,
    MsalGuardConfiguration,
    MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

export const MSAL_CONFIG = {
    auth: {
        clientId: '3ff54580-5b1c-407a-b434-887770ce231f', // Reemplazar con el ID de cliente de Azure
        authority: 'https://login.microsoftonline.com/common', // "common" para multi-tenant
        redirectUri: window.location.origin + '/agenda', // Sin barra final para coincidir con Azure
        navigateToLoginRequestUrl: true, // Permitir que MSAL maneje el regreso a la URL original
    },
    cache: {
        cacheLocation: BrowserCacheLocation.LocalStorage,
        storeAuthStateInCookie: true, // set to true for IE 11
    },
    system: {
        loggerOptions: {
            loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        return; // Ignorar logs informativos para reducir ruido en consola
                    case LogLevel.Verbose:
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
        },
    },
};

export function MSALInstanceFactory(): IPublicClientApplication {
    return new PublicClientApplication(MSAL_CONFIG);
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
    return {
        interactionType: InteractionType.Redirect,
        authRequest: {
            scopes: ['user.read', 'calendars.read'],
        },
    };
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
    const protectedResourceMap = new Map<string, Array<string>>();
    protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read', 'calendars.read']);

    return {
        interactionType: InteractionType.Redirect,
        protectedResourceMap,
    };
}
