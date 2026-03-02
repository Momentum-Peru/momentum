import { Component, inject, computed, signal, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { DocumentationMenuComponent } from '../../components/documentation-menu/documentation-menu';
import { NotificationsBellComponent } from '../../components/notifications-bell/notifications-bell';
import { AuthService } from '../../pages/login/services/auth.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { TenantService } from '../../core/services/tenant.service';
import { ProfileApiService } from '../../shared/services/profile-api.service';
import { UserProfile } from '../../shared/interfaces/profile.interface';

@Component({
  selector: 'app-documentation-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    DocumentationMenuComponent,
    NotificationsBellComponent,
    ConfirmDialogModule,
    ToastModule,
    Button,
  ],
  templateUrl: './documentation.html',
  styleUrl: './documentation.scss',
  providers: [ConfirmationService],
})
export class DocumentationLayout implements OnInit {
  authService = inject(AuthService);
  confirmationService = inject(ConfirmationService);
  tenant = inject(TenantService);
  router = inject(Router);
  profileApi = inject(ProfileApiService);

  tenantName = computed(() => this.tenant.tenantName());
  userProfile = signal<UserProfile | null>(null);
  userName = signal<string>('');
  userEmail = signal<string>('');
  userProfilePicture = signal<string | null>(null);
  showUserMenu = signal<boolean>(false);

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName.set(user.name || user.email || 'Usuario');
      this.userEmail.set(user.email || '');
      this.userProfilePicture.set(user.profilePicture || null);
      this.profileApi.getProfile().subscribe({
        next: (profile) => this.userProfile.set(profile),
        error: () => {},
      });
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu.update((value) => !value);
  }

  closeUserMenu(): void {
    this.showUserMenu.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu()) {
      const target = event.target as HTMLElement;
      const menuElement = document.querySelector('[data-user-menu]');
      const buttonElement = document.querySelector('[data-user-menu-button]');
      if (menuElement && buttonElement) {
        const clickedInsideMenu = menuElement.contains(target);
        const clickedOnButton = buttonElement.contains(target);
        if (!clickedInsideMenu && !clickedOnButton) {
          this.closeUserMenu();
        }
      }
    }
  }

  goToProfile(): void {
    this.closeUserMenu();
    this.router.navigate(['/profile']);
  }

  goToApp(): void {
    this.closeUserMenu();
    this.router.navigate(['/dashboard']);
  }

  confirmLogout(): void {
    this.confirmationService.confirm({
      message: '¿Estás seguro de querer cerrar sesión?',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => this.authService.logout(),
    });
  }

  changeCompany(): void {
    this.tenant.clearTenant();
    this.router.navigateByUrl('/select-company');
  }
}
