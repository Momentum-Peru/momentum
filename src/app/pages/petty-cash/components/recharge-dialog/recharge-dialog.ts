import { Component, output, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CreateRechargeRequest } from '../../../../shared/interfaces/petty-cash.interface';

/**
 * Diálogo de Recargar Dinero.
 * Responsabilidad única: presentar y emitir el formulario de recarga/apertura.
 */
@Component({
  selector: 'app-recharge-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
  ],
  templateUrl: './recharge-dialog.html',
  styleUrl: './recharge-dialog.scss',
})
export class RechargeDialogComponent {
  visible = input.required<boolean>();
  closeDialog = output<void>();
  rechargeSubmitted = output<CreateRechargeRequest>();

  amount = signal(0);
  description = signal('');

  onClose(): void {
    this.closeDialog.emit();
  }

  onSubmit(): void {
    const desc = this.description().trim();
    if (!desc) return;
    if (this.amount() <= 0) return;

    this.rechargeSubmitted.emit({
      amount: this.amount(),
      description: desc,
    });
  }

  reset(): void {
    this.amount.set(0);
    this.description.set('');
  }
}
