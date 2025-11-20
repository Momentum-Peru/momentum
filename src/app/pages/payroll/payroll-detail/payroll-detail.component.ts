import { Component, OnInit, inject } from '@angular/core';
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
        CommonModule, RouterModule, TableModule, ButtonModule,
        InputTextModule, InputNumberModule, SelectModule,
        ToastModule, FileUploadModule, FormsModule
    ],
    template: `
    <div class="card p-6" *ngIf="payroll">
      <div class="flex justify-between items-start mb-6">
        <div class="flex items-center gap-4">
          <p-button icon="pi pi-arrow-left" styleClass="p-button-text" routerLink="/payroll"></p-button>
          <div>
            <h1 class="text-2xl font-bold text-gray-800">{{ payroll.name }}</h1>
            <p class="text-gray-600">Periodo: {{ payroll.period }} | Tipo: {{ payroll.type }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <p-button label="Generar TXT BCP" icon="pi pi-file" styleClass="p-button-success" 
                    (onClick)="generateTxt()"></p-button>
        </div>
      </div>

      <div class="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <span class="text-sm text-gray-600">Total a Pagar</span>
          <div class="text-2xl font-bold text-blue-700">{{ payroll.totalAmount | currency:'PEN':'symbol' }}</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <span class="text-sm text-gray-600">Registros</span>
          <div class="text-2xl font-bold text-gray-700">{{ payroll.details?.length || 0 }}</div>
        </div>
      </div>

      <p-table [value]="payroll.details || []" dataKey="id" editMode="row" styleClass="p-datatable-sm">
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
                  <input pInputText type="text" [(ngModel)]="detail.employeeName" class="w-full">
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
                    <input pInputText type="text" [(ngModel)]="detail.documentNumber" class="w-full">
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
                  <input pInputText type="text" [(ngModel)]="detail.accountNumber" class="w-full">
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.accountNumber }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              <p-cellEditor>
                <ng-template pTemplate="input">
                  <p-inputNumber [(ngModel)]="detail.amount" mode="currency" currency="PEN" locale="es-PE"></p-inputNumber>
                </ng-template>
                <ng-template pTemplate="output">
                  {{ detail.amount | currency:'PEN':'symbol' }}
                </ng-template>
              </p-cellEditor>
            </td>
            <td>
              <div *ngIf="detail.proofUrl; else uploadBtn" class="flex items-center gap-2">
                <i class="pi pi-check-circle text-green-500"></i>
                <span class="text-xs">Subido</span>
              </div>
              <ng-template #uploadBtn>
                <p-fileUpload mode="basic" chooseLabel="Subir" [auto]="true" 
                              (onUpload)="onProofUpload($event, detail)"
                              [customUpload]="true" (uploadHandler)="uploadProofHandler($event, detail)"></p-fileUpload>
              </ng-template>
            </td>
            <td>
              <div class="flex align-items-center justify-content-center gap-2">
                <button *ngIf="!editing" pButton pRipple type="button" pInitEditableRow icon="pi pi-pencil" 
                        class="p-button-rounded p-button-text"></button>
                <button *ngIf="editing" pButton pRipple type="button" pSaveEditableRow icon="pi pi-check" 
                        (click)="onRowEditSave(detail)" class="p-button-rounded p-button-text p-button-success mr-2"></button>
                <button *ngIf="editing" pButton pRipple type="button" pCancelEditableRow icon="pi pi-times" 
                        class="p-button-rounded p-button-text p-button-danger"></button>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class PayrollDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private payrollService = inject(PayrollService);
    private messageService = inject(MessageService);

    payroll: Payroll | undefined;

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadPayroll(id);
        }
    }

    loadPayroll(id: string) {
        this.payrollService.getPayrollById(id).subscribe(data => {
            this.payroll = data;
        });
    }

    onRowEditSave(detail: PayrollDetail) {
        this.payrollService.updatePayrollDetail(detail.id, detail).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Actualizado', detail: 'Registro actualizado' });
                if (this.payroll) {
                    // Recalculate total locally to reflect UI immediately
                    this.payroll.totalAmount = this.payroll.details?.reduce((sum, d) => sum + d.amount, 0) || 0;
                }
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
            }
        });
    }

    generateTxt() {
        if (!this.payroll) return;

        // Mock company data
        const companyAccount = '191-9999999-0-99';
        const companyRuc = '20123456789';

        const txtContent = BcpGenerator.generateTxt(this.payroll, companyAccount, companyRuc);

        const blob = new Blob([txtContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BCP_PAGOS_${this.payroll.period}_${this.payroll.type}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({ severity: 'success', summary: 'Generado', detail: 'Archivo TXT generado correctamente' });
    }

    uploadProofHandler(event: any, detail: PayrollDetail) {
        // Mock upload
        setTimeout(() => {
            detail.proofUrl = 'mock-url-to-proof.pdf';
            this.payrollService.updatePayrollDetail(detail.id, { proofUrl: detail.proofUrl }).subscribe();
            this.messageService.add({ severity: 'success', summary: 'Subido', detail: 'Constancia subida' });
        }, 1000);
    }

    onProofUpload(event: any, detail: PayrollDetail) {
        // This is called by default upload, but we use customHandler
    }
}
