import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Menu } from '../../components/menu/menu';
import { AuthService } from '../../pages/login/services/auth.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';


@Component({
  selector: 'app-main',
  imports: [
    RouterOutlet,
    Menu,
    ConfirmDialogModule,
    Button
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
  providers: [ConfirmationService]
})
export class Main {
  authService = inject(AuthService);
  confirmationService = inject(ConfirmationService);

  confirmLogout() {
    this.confirmationService.confirm({
      message: '¿Estás seguro de querer cerrar sesión?',
      acceptLabel: 'Si',
      rejectLabel: 'No',
      accept: () => {
        this.authService.logout();
      }
    });
  }
}
