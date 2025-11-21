import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PayrollService } from '../../../core/services/payroll.service';
import { Payroll } from '../../../core/models/payroll.model';

@Component({
    selector: 'app-payroll-list',
    standalone: true,
    imports: [CommonModule, RouterModule, TableModule, ButtonModule, TagModule],
    template: `
    <div class="card p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Gestión de Planillas y RxH</h1>
        <p-button label="Nueva Planilla" icon="pi pi-plus" routerLink="upload"></p-button>
      </div>

      <p-table [value]="payrolls" [loading]="loading" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Nombre</th>
            <th>Periodo</th>
            <th>Tipo</th>
            <th>Monto Total</th>
            <th>Estado</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-payroll>
          <tr>
            <td>{{ payroll.name }}</td>
            <td>{{ payroll.period }}</td>
            <td>
              <p-tag [value]="payroll.type" [severity]="payroll.type === 'PLANILLA' ? 'info' : 'warn'"></p-tag>
            </td>
            <td>{{ payroll.totalAmount | currency:'PEN':'symbol' }}</td>
            <td>
              <p-tag [value]="payroll.status" [severity]="getStatusSeverity(payroll.status)"></p-tag>
            </td>
            <td>{{ payroll.createdAt | date:'short' }}</td>
            <td>
              <div class="flex gap-2">
                <p-button icon="pi pi-eye" styleClass="p-button-text p-button-sm" 
                          [routerLink]="['detail', payroll.id]" pTooltip="Ver Detalles"></p-button>
                <p-button icon="pi pi-trash" styleClass="p-button-text p-button-danger p-button-sm" 
                          (onClick)="deletePayroll(payroll.id)" pTooltip="Eliminar"></p-button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center p-4">No hay planillas registradas.</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class PayrollListComponent implements OnInit {
    private payrollService = inject(PayrollService);
    payrolls: Payroll[] = [];
    loading = true;

    ngOnInit() {
        this.loadPayrolls();
    }

    loadPayrolls() {
        this.loading = true;
        this.payrollService.getPayrolls().subscribe({
            next: (data) => {
                this.payrolls = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    deletePayroll(id: string) {
        if (confirm('¿Está seguro de eliminar esta planilla?')) {
            this.payrollService.deletePayroll(id).subscribe(() => {
                this.loadPayrolls();
            });
        }
    }

    getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
        switch (status) {
            case 'PROCESSED': return 'success';
            case 'DRAFT': return 'secondary';
            case 'PAID': return 'info';
            default: return 'info';
        }
    }
}
