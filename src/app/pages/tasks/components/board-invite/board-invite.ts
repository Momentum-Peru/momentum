import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { UserOption } from '../../../../shared/interfaces/menu-permission.interface';
import { InviteUserRequest } from '../../../../shared/interfaces/board.interface';

/**
 * Componente de invitación de usuarios a tablero
 * Principio de Responsabilidad Única: Solo maneja la invitación de usuarios
 */
@Component({
  selector: 'app-board-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './board-invite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardInviteComponent implements OnInit {
  @Input() boardId = '';
  @Input() loading = signal<boolean>(false);
  @Input() existingMemberIds: string[] = [];
  @Output() invite = new EventEmitter<InviteUserRequest>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly usersApi = inject(UsersApiService);

  public readonly users = signal<UserOption[]>([]);
  public readonly loadingUsers = signal<boolean>(false);
  public selectedUserId = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.loadingUsers.set(true);
    this.usersApi.list().subscribe({
      next: (userOptions) => {
        // Filtrar usuarios que ya son miembros
        const filteredUsers = userOptions.filter(
          (user) => !this.existingMemberIds.includes(user._id)
        );
        this.users.set(filteredUsers);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });
  }

  onInvite(): void {
    if (!this.selectedUserId) {
      return;
    }

    this.invite.emit({ userId: this.selectedUserId });
  }
}
