import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../login/services/auth.service';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center p-6 bg-white rounded-lg shadow-md">
        <p class="text-lg font-semibold text-gray-800">Procesando inicio de sesión con Google...</p>
        <p class="text-gray-600 mt-2">Por favor, espera un momento.</p>
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
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const userString = params['user'];

      if (token && userString) {
        try {
          const user = JSON.parse(decodeURIComponent(userString));
          this.authService.handleGoogleCallback(token, user);
          this.router.navigate(['/calendario'], {
            queryParams: { google_connected: 'true' }
          });
        } catch (error) {
          console.error('Error parsing user data from Google callback:', error);
          this.router.navigate(['/ingreso']);
        }
      } else {
        console.error('Missing token or user data in Google callback');
        this.router.navigate(['/ingreso']);
      }
    });
  }
}