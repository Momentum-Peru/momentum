import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { PayrollService } from '../../../core/services/payroll.service';
import { Payroll, PayrollDetail } from '../../../core/models/payroll.model';
import { BcpGenerator } from '../../../core/utils/bcp-generator';

@Component({
  selector: 'app-payroll-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    FileUploadModule,
    FormsModule,
  ],
  template: `
    @if (payroll(); as payrollData) {
    <div class="card p-6">
      <div class="flex justify-between items-start mb-6">
        <div class="flex items-center gap-4">
          <p-button
            icon="pi pi-arrow-left"
            styleClass="p-button-text"
            routerLink="/payroll"
          ></p-button>
          <div>
            <h1 class="text-2xl font-bold text-gray-800">{{ payrollData.name }}</h1>
            <p class="text-gray-600">
              Periodo: {{ payrollData.period }} | Tipo: {{ payrollData.type }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <p-button
            label="Generar TXT BCP"
            icon="pi pi-file"
            styleClass="p-button-success"
            (onClick)="generateTxt()"
          ></p-button>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <span class="text-sm text-gray-600">Total a Pagar</span>
          <div class="text-2xl font-bold text-blue-700">
            {{ totalAmount() | currency : 'PEN' : 'symbol' }}
          </div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <span class="text-sm text-gray-600">Registros</span>
          <div class="text-2xl font-bold text-gray-700">{{ detailsCount() }}</div>
        </div>
      </div>

      <p-table
        [value]="payrollData.details || []"
        dataKey="id"
        editMode="row"
        styleClass="p-datatable-sm"
      >
        <ng-template pTemplate="header">
          <tr>
            <th>Empleado/Proveedor</th>
            <th>Doc. Identidad</th>
            <th>Cuenta</th>
            <th>Monto</th>
            <th>Constancia</th>
            <th style="width:8rem"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-detail let-editing="editing" let-ri="rowIndex">
          <tr [pEditableRow]="detail">
            <td>
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <input pInputText type="text" [(ngModel)]="detail.employeeName" class="w-full" />
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.employeeName }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <div class="flex gap-1">
                    <input
                      pInputText
                      type="text"
                      [(ngModel)]="detail.documentNumber"
                      class="w-full"
                    />
                  </div>
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.documentType }} - {{ detail.documentNumber }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <input pInputText type="text" [(ngModel)]="detail.accountNumber" class="w-full" />
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.accountNumber }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <p-inputNumber
                    [(ngModel)]="detail.amount"
                    mode="currency"
                    currency="PEN"
                    locale="es-PE"
                  ></p-inputNumber>
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.amount | currency : 'PEN' : 'symbol' }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              @if (detail.proofUrl) {
              <div class="flex items-center gap-2">
                <i class="pi pi-check-circle text-green-500"></i>
                <span class="text-xs">Subido</span>
              </div>
              } @else {
              <p-fileUpload
                mode="basic"
                chooseLabel="Subir"
                [auto]="true"
                (onUpload)="onProofUpload($event, detail)"
                [customUpload]="true"
                (uploadHandler)="uploadProofHandler($event, detail)"
              ></p-fileUpload>
              }
            </td>
            <td>
              <div class="flex align-items-center justify-content-center gap-2">
                @if (!editing) {
                <button
                  pButton
                  pRipple
                  type="button"
                  pInitEditableRow
                  icon="pi pi-pencil"
                  class="p-button-rounded p-button-text"
                  aria-label="Editar"
                ></button>
                } @if (editing) {
                <button
                  pButton
                  pRipple
                  type="button"
                  pSaveEditableRow
                  icon="pi pi-check"
                  (click)="onRowEditSave(detail)"
                  class="p-button-rounded p-button-text p-button-success mr-2"
                  aria-label="Guardar"
                ></button>
                <button
                  pButton
                  pRipple
                  type="button"
                  pCancelEditableRow
                  icon="pi pi-times"
                  class="p-button-rounded p-button-text p-button-danger"
                  aria-label="Cancelar"
                ></button>
                }
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
    }
  `,
})
export class PayrollDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private payrollService = inject(PayrollService);
  private messageService = inject(MessageService);

  // Main payroll signal
  payroll = signal<Payroll | undefined>(undefined);

  // Computed values
  totalAmount = computed(() => {
    const payrollData = this.payroll();
    return payrollData?.totalAmount ?? 0;
  });

  detailsCount = computed(() => {
    const payrollData = this.payroll();
    return payrollData?.details?.length ?? 0;
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPayroll(id);
    }
  }

  private loadPayroll(id: string) {
    this.payrollService.getPayrollById(id).subscribe({
      next: (data) => {
        this.payroll.set(data);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la planilla',
        });
      },
    });
  }

  onRowEditSave(detail: PayrollDetail) {
    this.payrollService.updatePayrollDetail(detail.id, detail).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Actualizado',
          detail: 'Registro actualizado',
        });
        // Update payroll signal with recalculated total
        const currentPayroll = this.payroll();
        if (currentPayroll) {
          const updatedPayroll: Payroll = {
            ...currentPayroll,
            totalAmount: currentPayroll.details?.reduce((sum, d) => sum + d.amount, 0) ?? 0,
          };
          this.payroll.set(updatedPayroll);
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar',
        });
      },
    });
  }

  generateTxt() {
    const payrollData = this.payroll();
    if (!payrollData) return;

    // Mock company data
    const companyAccount = '191-9999999-0-99';
    const companyRuc = '20123456789';

    const txtContent = BcpGenerator.generateTxt(payrollData, companyAccount, companyRuc);

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BCP_PAGOS_${payrollData.period}_${payrollData.type}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.messageService.add({
      severity: 'success',
      summary: 'Generado',
      detail: 'Archivo TXT generado correctamente',
    });
  }

  uploadProofHandler(event: { files: File[] }, detail: PayrollDetail) {
    // Mock upload
    setTimeout(() => {
      detail.proofUrl = 'mock-url-to-proof.pdf';
      this.payrollService.updatePayrollDetail(detail.id, { proofUrl: detail.proofUrl }).subscribe();
      this.messageService.add({
        severity: 'success',
        summary: 'Subido',
        detail: 'Constancia subida',
      });
    }, 1000);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onProofUpload(_event: { files: File[] }, _detail: PayrollDetail) {
    // This is called by default upload, but we use customHandler
  }
}
