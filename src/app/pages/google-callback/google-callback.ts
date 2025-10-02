import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, GoogleAssociationRequest, GoogleAssociationResponse } from '../login/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
        <div class="mb-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <p class="text-lg font-semibold text-gray-800">Conectando Google Calendar...</p>
        <p class="text-gray-600 mt-2">Por favor, espera mientras procesamos tu solicitud.</p>
        <div class="mt-4 text-sm text-gray-500">
          <p>Este proceso puede tomar unos segundos.</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
      console.log('GoogleCallbackComponent - Query params recibidos:', params);

      const email = params['email'];
      const result = params['result'];
      const tokenId = params['tokenId'];
      const error = params['error'];

      // Verificar si hay un error en el callback
      if (error) {
        console.error('GoogleCallbackComponent - Error en callback de Google:', error);
        this.router.navigate(['/ingreso'], {
          queryParams: { error: 'google_auth_failed' }
        });
        return;
      }

      // Verificar si tenemos los parámetros necesarios para la asociación
      if (email && tokenId && result) {
        console.log('GoogleCallbackComponent - Procesando asociación de Google Calendar:', { email, tokenId, result });
        await this.handleGoogleCalendarAssociation(email, tokenId);
      }
      // Si no tenemos los parámetros necesarios, mostrar error detallado
      else {
        console.error('GoogleCallbackComponent - Missing required parameters for Google Calendar association');
        console.error('GoogleCallbackComponent - Parámetros disponibles:', Object.keys(params));
        console.error('GoogleCallbackComponent - Parámetros esperados: email, tokenId, result');
        this.router.navigate(['/ingreso'], {
          queryParams: { error: 'missing_association_data' }
        });
      }
    });
  }

  private async handleGoogleCalendarAssociation(email: string, tokenId: string): Promise<void> {
    try {
      // Obtener el usuario actual autenticado
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser) {
        console.error('GoogleCallbackComponent - No hay usuario autenticado para asociar Google Calendar');
        this.router.navigate(['/ingreso'], {
          queryParams: { error: 'user_not_authenticated' }
        });
        return;
      }

      console.log('GoogleCallbackComponent - Usuario autenticado encontrado:', currentUser);

      // Preparar los datos para la asociación
      const associationData: GoogleAssociationRequest = {
        userId: currentUser.id,
        tokenId: tokenId,
        email: email
      };

      console.log('GoogleCallbackComponent - Enviando datos de asociación:', associationData);

      // Llamar al servicio de asociación
      const response: GoogleAssociationResponse = await firstValueFrom(
        this.authService.associateGoogleCalendar(associationData)
      );

      console.log('GoogleCallbackComponent - Respuesta de asociación:', response);

      // Verificar que la respuesta tenga los datos esperados
      if (response && response.id && response.isActive) {
        console.log('GoogleCallbackComponent - Google Calendar asociado exitosamente');
        console.log('GoogleCallbackComponent - Datos de la asociación:', {
          id: response.id,
          email: response.email,
          userId: response.userId,
          tokenId: response.tokenId,
          isActive: response.isActive
        });

        this.router.navigate(['/calendario'], {
          queryParams: {
            google_connected: 'true',
            message: 'Google Calendar conectado exitosamente',
            association_id: response.id
          }
        });
      } else {
        console.error('GoogleCallbackComponent - Respuesta de asociación inválida:', response);
        this.router.navigate(['/ingreso'], {
          queryParams: { error: 'invalid_association_response' }
        });
      }

    } catch (error: any) {
      console.error('GoogleCallbackComponent - Error al procesar asociación de Google Calendar:', error);

      let errorMessage = 'Error al conectar Google Calendar';

      if (error.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente';
      } else if (error.status === 400) {
        errorMessage = 'Datos de asociación inválidos';
      } else if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor';
      }

      this.router.navigate(['/ingreso'], {
        queryParams: {
          error: 'association_error',
          message: errorMessage
        }
      });
    }
  }
}