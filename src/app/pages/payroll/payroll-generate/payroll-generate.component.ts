import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { PayrollService } from '../../../core/services/payroll.service';

@Component({
  selector: 'app-payroll-generate',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule, 
    DatePickerModule, 
    CardModule, 
    FormsModule,
    TooltipModule
  ],
  template: `
    <div class="flex items-center justify-center min-h-[60vh]">
      <div class="card p-8 w-full max-w-lg shadow-lg border rounded-xl bg-white">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="pi pi-cog text-3xl text-blue-600"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Generar Planilla</h1>
          <p class="text-gray-500 text-sm">Seleccione el periodo para calcular la planilla automática.</p>
        </div>

        <!-- Form Content -->
        <div class="mb-8">
            <label for="range" class="block font-medium text-gray-700 mb-2 text-center">Rango de Fechas</label>
            <p-datepicker 
              [(ngModel)]="rangeDates" 
              selectionMode="range" 
              [readonlyInput]="true" 
              inputId="range" 
              styleClass="w-full"
              inputStyleClass="w-full p-3 text-center"
              dateFormat="dd/mm/yy"
              [showIcon]="true"
              placeholder="Seleccionar fechas">
            </p-datepicker>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3">
            <p-button 
                label="Generar Planilla" 
                [loading]="loading()" 
                (onClick)="generate()"
                [disabled]="!isValidRange()"
                styleClass="w-full p-button-primary p-3 font-medium">
            </p-button>

            <p-button 
                label="Cancelar" 
                styleClass="w-full p-button-secondary p-button-text p-3" 
                (onClick)="cancel()">
            </p-button>
        </div>

      </div>
    </div>
  `
})
export class PayrollGenerateComponent {
  private payrollService = inject(PayrollService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  rangeDates: Date[] | undefined;
  loading = signal(false);

  isValidRange(): boolean {
      return !!(this.rangeDates && this.rangeDates.length === 2 && this.rangeDates[0] && this.rangeDates[1]);
  }

  generate() {
    if (!this.isValidRange()) return;

    this.loading.set(true);
    const [start, end] = this.rangeDates!;
    
    const dto = {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end)
    };

    this.payrollService.generatePayroll(dto).subscribe({
      next: (payroll) => {
        this.messageService.add({severity:'success', summary:'Éxito', detail:'Planilla generada correctamente'});
        this.router.navigate(['/payroll/detail', payroll.id]);
      },
      error: (err) => {
        this.messageService.add({severity:'error', summary:'Error', detail:'No se pudo generar la planilla'});
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  cancel() {
      this.router.navigate(['/payroll']);
  }

  private formatDate(date: Date): string {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }
}
