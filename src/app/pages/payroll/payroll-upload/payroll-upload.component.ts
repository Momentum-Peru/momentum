import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PayrollService } from '../../../core/services/payroll.service';

@Component({
    selector: 'app-payroll-upload',
    standalone: true,
    imports: [CommonModule, RouterModule, FileUploadModule, ButtonModule, CardModule, SelectModule, FormsModule],
    template: `
    <div class="card p-6 max-w-4xl mx-auto">
      <div class="flex items-center gap-4 mb-6">
        <p-button icon="pi pi-arrow-left" styleClass="p-button-text" routerLink=".."></p-button>
        <h1 class="text-2xl font-bold text-gray-800">Nueva Carga de Pagos</h1>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Download Template Section -->
        <div class="border rounded-lg p-6 bg-gray-50">
          <h2 class="text-xl font-semibold mb-4">1. Descargar Plantilla</h2>
          <p class="mb-4 text-gray-600">Descarga el formato Excel para llenar los datos de los pagos.</p>
          
          <div class="flex flex-col gap-4">
            <p-button label="Plantilla Planilla" icon="pi pi-download" styleClass="p-button-outlined" 
                      (onClick)="downloadTemplate('PLANILLA')"></p-button>
            <p-button label="Plantilla RxH" icon="pi pi-download" styleClass="p-button-outlined p-button-warning" 
                      (onClick)="downloadTemplate('RXH')"></p-button>
          </div>
        </div>

        <!-- Upload Section -->
        <div class="border rounded-lg p-6 bg-white shadow-sm">
          <h2 class="text-xl font-semibold mb-4">2. Subir Archivo</h2>
          <p class="mb-4 text-gray-600">Sube el archivo Excel completado.</p>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Carga</label>
            <p-select [options]="types" [(ngModel)]="selectedType" optionLabel="label" optionValue="value" 
                        styleClass="w-full"></p-select>
          </div>

          <p-fileUpload mode="advanced" 
                        chooseLabel="Seleccionar Excel"
                        uploadLabel="Procesar"
                        cancelLabel="Cancelar"
                        [customUpload]="true"
                        (uploadHandler)="onUpload($event)"
                        accept=".xlsx,.xls"
                        [maxFileSize]="1000000">
          </p-fileUpload>
        </div>
      </div>
    </div>
  `
})
export class PayrollUploadComponent {
    private payrollService = inject(PayrollService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    types = [
        { label: 'Planilla de Sueldos', value: 'PLANILLA' },
        { label: 'Recibos por Honorarios', value: 'RXH' }
    ];
    selectedType: 'PLANILLA' | 'RXH' = 'PLANILLA';

    downloadTemplate(type: string) {
        // In a real app, this would download a static asset or call an API
        // For now we mock it by creating a dummy CSV/Excel
        const content = type === 'PLANILLA'
            ? 'DNI,Nombre,Cuenta,Monto\n12345678,Juan Perez,191-12345678,1500'
            : 'RUC,Razon Social,Cuenta,Monto\n10123456789,Consultor SAC,191-87654321,2000';

        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_${type.toLowerCase()}.csv`; // Using CSV for simplicity in mock
        a.click();
        window.URL.revokeObjectURL(url);
    }

    onUpload(event: any) {
        const file = event.files[0];
        if (!file) return;

        this.payrollService.uploadPayrollExcel(file, this.selectedType).subscribe({
            next: (payroll) => {
                this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Archivo procesado correctamente' });
                setTimeout(() => {
                    this.router.navigate(['/payroll/detail', payroll.id]);
                }, 1000);
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al procesar el archivo' });
                console.error(err);
            }
        });
    }
}
