import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="mb-6">
          <i class="pi pi-ban text-6xl text-red-500 mb-4 block"></i>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p class="text-gray-600">No tienes permisos para acceder a esta sección del sistema.</p>
        </div>

        <div class="space-y-3">
          <button
            pButton
            type="button"
            (click)="goToDashboard()"
            label="Ir al Dashboard"
            icon="pi pi-home"
            class="w-full"
            aria-label="Ir al Dashboard"
          ></button>
          <button
            pButton
            type="button"
            (click)="goBack()"
            label="Volver Atrás"
            icon="pi pi-arrow-left"
            class="p-button-outlined w-full"
            aria-label="Volver Atrás"
          ></button>
        </div>

        <div class="mt-6 text-sm text-gray-500">
          <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
        </div>
      </div>
    </div>
  `,
})
export class UnauthorizedPage {
  private readonly router = inject(Router);

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }
}
