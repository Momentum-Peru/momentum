import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../login/services/auth.service';

@Component({
    selector: 'app-google-callback',
    standalone: true,
    template: `
    <div class="min-h-screen bg-black flex items-center justify-center">
      <div class="text-center text-white">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Procesando autenticación con Google...</p>
      </div>
    </div>
  `
})
export class GoogleCallbackComponent implements OnInit {
    private readonly authService = inject(AuthService);

    ngOnInit(): void {
        this.authService.handleGoogleCallback();
    }
}
