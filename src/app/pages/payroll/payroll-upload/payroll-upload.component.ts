import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { PayrollService, PdfAnalysisResult } from '../../../core/services/payroll.service';
import { EmployeesApiService } from '../../../shared/services/employees-api.service';
import { UsersApiService } from '../../../shared/services/users-api.service';
import { Payroll } from '../../../core/models/payroll.model';
import { CreateEmployeeRequest } from '../../../shared/interfaces/employee.interface';

interface ExcelEmployeeData {
  dni: string;
  firstName: string;
  lastName: string;
  cargo?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
}

@Component({
  selector: 'app-payroll-upload',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FileUploadModule,
    ButtonModule,
    CardModule,
    SelectModule,
    DialogModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
    FormsModule,
  ],
  template: `
    <div class="card p-4 sm:p-6 max-w-4xl mx-auto w-full overflow-hidden">
      <div class="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <p-button icon="pi pi-arrow-left" styleClass="p-button-text" routerLink=".."></p-button>
        <h1 class="text-xl sm:text-2xl font-bold text-gray-800 truncate">Nueva Carga de Pagos</h1>
      </div>

      <div class="max-w-xl mx-auto w-full min-w-0">
        <!-- Upload Section -->
        <div class="border rounded-lg p-4 sm:p-6 bg-white shadow-sm overflow-hidden">
          <h2 class="text-lg sm:text-xl font-semibold mb-4">Subir Archivo de Pagos</h2>
          <p class="mb-4 text-gray-600 text-sm sm:text-base">
            Sube el archivo Excel o PDF con los datos de la planilla o recibos por honorarios.
          </p>

          <div class="mb-4">
            <label for="payroll-type-select" class="block text-sm font-medium text-gray-700 mb-2"
              >Tipo de Carga</label
            >
            <p-select
              id="payroll-type-select"
              inputId="payroll-type-select"
              [options]="types"
              [(ngModel)]="selectedType"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full"
            ></p-select>
          </div>

          <div class="payroll-upload-filewrap min-w-0">
            <p-fileUpload
              mode="advanced"
              chooseLabel="Seleccionar Archivo"
              uploadLabel="Procesar"
              cancelLabel="Cancelar"
              [customUpload]="true"
              (uploadHandler)="onUpload($event)"
              accept=".xlsx,.xls,.pdf"
              [maxFileSize]="10000000"
              styleClass="w-full"
              [disabled]="analyzingPdf()"
            >
              <ng-template pTemplate="content" let-files>
                @if (analyzingPdf()) {
                  <div class="flex flex-col items-center justify-center p-8 text-center">
                    <p-progressSpinner
                      styleClass="w-16 h-16 mb-4"
                      strokeWidth="4"
                    ></p-progressSpinner>
                    <p class="text-gray-600 font-medium">Analizando PDF con IA...</p>
                    <p class="text-xs text-gray-400 mt-2">Esto puede tomar unos segundos</p>
                  </div>
                } @else if (files.length > 0) {
                  <div class="p-4">
                    @for (file of files; track file.name) {
                      <div
                        class="flex items-center justify-between p-3 border rounded-lg bg-gray-50 mb-2"
                      >
                        <div class="flex items-center gap-3">
                          <i
                            [class]="
                              file.name.toLowerCase().endsWith('.pdf')
                                ? 'pi pi-file-pdf text-red-600 text-xl'
                                : 'pi pi-file-excel text-green-600 text-xl'
                            "
                          ></i>
                          <div class="flex flex-col">
                            <span class="font-medium text-gray-800">{{ file.name }}</span>
                            <span class="text-xs text-gray-500"
                              >{{ file.size / 1024 | number: '1.0-2' }} KB</span
                            >
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div
                    class="flex flex-col items-center justify-center p-8 text-center cursor-pointer"
                    (click)="fileInput.click()"
                    (keydown.enter)="fileInput.click()"
                    (keydown.space)="$event.preventDefault(); fileInput.click()"
                    tabindex="0"
                    role="button"
                    aria-label="Seleccionar archivo Excel o PDF"
                  >
                    <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-2"></i>
                    <p class="text-sm text-gray-500">
                      Arrastra y suelta el archivo Excel o PDF aquí o haz clic en "Seleccionar
                      Archivo"
                    </p>
                    <input #fileInput type="file" class="hidden" accept=".xlsx,.xls,.pdf" />
                  </div>
                }
              </ng-template>
            </p-fileUpload>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para empleados faltantes -->
    <p-dialog
      [visible]="showMissingEmployeesDialog()"
      (visibleChange)="showMissingEmployeesDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <span class="font-semibold text-lg">Empleados no registrados encontrados</span>
      </ng-template>

      <div class="space-y-4">
        <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200">
          <p class="text-sm text-red-800 dark:text-red-200">
            <i class="pi pi-times-circle mr-2"></i>
            <strong
              >Se encontraron {{ missingEmployees().length }} empleado(s) no registrados en el
              sistema.</strong
            >
            <br />
            Debe registrar a estos empleados antes de poder subir la planilla.
          </p>
        </div>

        <div class="max-h-96 overflow-auto">
          <p-table
            [value]="missingEmployees()"
            styleClass="p-datatable-sm"
            [scrollable]="true"
            scrollHeight="300px"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Cargo</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-employee>
              <tr>
                <td>{{ employee.dni }}</td>
                <td>{{ employee.firstName }}</td>
                <td>{{ employee.lastName }}</td>
                <td>{{ employee.cargo || '-' }}</td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p class="text-xs text-blue-800 dark:text-blue-200">
            <strong>Instrucciones:</strong> Copie los DNIs listados arriba, regístrelos en el módulo
            de Empleados y luego intente subir el archivo nuevamente.
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          label="Cerrar"
          class="p-button-outlined"
          (click)="cancelEmployeeCreation()"
          aria-label="Cerrar"
        ></button>
      </ng-template>
    </p-dialog>

    <!-- Modal de Preview para PDF -->
    <p-dialog
      [visible]="showPdfPreviewDialog()"
      (visibleChange)="showPdfPreviewDialog.set($event)"
      [modal]="true"
      [style]="{ width: '95vw', maxWidth: '1000px' }"
      [draggable]="false"
      [resizable]="false"
      [closable]="true"
      appendTo="body"
    >
      <ng-template pTemplate="header">
        <span class="font-semibold text-lg">Vista Previa de Datos Extraídos del PDF</span>
      </ng-template>

      <div class="space-y-4">
        @if (pdfAnalysisResult(); as result) {
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-50 p-3 rounded-lg border">
              <span class="text-xs text-gray-500 block">Periodo Detectado</span>
              <span class="font-bold text-gray-600">{{
                result.summary.period || 'No detectado'
              }}</span>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg border">
              <span class="text-xs text-gray-500 block">Total Empleados</span>
              <span class="font-bold text-gray-600">{{ result.summary.totalEmployees }}</span>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg border">
              <span class="text-xs text-gray-500 block">Monto Total a Pagar</span>
              <span class="font-bold text-green-600">{{
                result.summary.totalAmount | currency: 'PEN' : 'S/ '
              }}</span>
            </div>
          </div>

          @if (result.missingEmployees.length > 0) {
            <div class="bg-red-50 p-4 rounded-lg border border-red-200">
              <p class="text-sm text-red-800 font-medium">
                <i class="pi pi-times-circle mr-2"></i>
                Se detectaron <strong>{{ result.missingEmployees.length }}</strong> empleados
                nuevos.
              </p>
              <p class="text-xs text-red-600 mt-1">
                Por favor, registre a estos empleados en el sistema antes de continuar.
              </p>
            </div>
          }

          <div class="border rounded-lg overflow-hidden">
            <p-table
              [value]="result.details"
              styleClass="p-datatable-sm p-datatable-striped"
              [scrollable]="true"
              scrollHeight="400px"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>DNI</th>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th class="text-right">Sueldo Base</th>
                  <th class="text-right">Ingreso Bruto</th>
                  <th class="text-right font-bold">Neto a Pagar</th>
                  <th>Estado</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-detail>
                <tr>
                  <td>{{ detail.dni }}</td>
                  <td>{{ detail.firstName }} {{ detail.lastName }}</td>
                  <td>{{ detail.cargo }}</td>
                  <td class="text-right">{{ detail.basicSalary | number: '1.2-2' }}</td>
                  <td class="text-right">{{ detail.totalIncome | number: '1.2-2' }}</td>
                  <td class="text-right font-bold">{{ detail.totalToPay | number: '1.2-2' }}</td>
                  <td>
                    @if (detail.isNew) {
                      <p-tag severity="warn" value="Nuevo" [rounded]="true"></p-tag>
                    } @else {
                      <p-tag severity="success" value="Registrado" [rounded]="true"></p-tag>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          class="p-button-text"
          (click)="cancelPdfImport()"
          [disabled]="confirmingPdf()"
        >
          Cancelar
        </button>
        @if (pdfAnalysisResult(); as result) {
          <button
            pButton
            label="Confirmar y Guardar"
            icon="pi pi-check"
            (click)="confirmAndSavePdfData()"
            [loading]="confirmingPdf()"
            [disabled]="result.missingEmployees.length > 0"
            [title]="
              result.missingEmployees.length > 0
                ? 'Debe registrar a todos los empleados antes de continuar'
                : ''
            "
          ></button>
        }
      </ng-template>
    </p-dialog>
  `,
  styles: [
    `
      :host .payroll-upload-filewrap ::ng-deep .p-fileupload {
        max-width: 100%;
        min-width: 0;
      }
      :host .payroll-upload-filewrap ::ng-deep .p-fileupload-header {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-width: 0;
      }
      :host .payroll-upload-filewrap ::ng-deep .p-fileupload-content {
        min-width: 0;
      }
    `,
  ],
})
export class PayrollUploadComponent {
  private payrollService = inject(PayrollService);
  private employeesApi = inject(EmployeesApiService);
  private usersApi = inject(UsersApiService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  types = [
    { label: 'Planilla de Sueldos', value: 'PLANILLA' },
    { label: 'Recibos por Honorarios', value: 'RXH' },
  ];
  selectedType: 'PLANILLA' | 'RXH' = 'PLANILLA';

  // Estados para validación de empleados
  showMissingEmployeesDialog = signal(false);
  missingEmployees = signal<ExcelEmployeeData[]>([]);
  pendingFile = signal<File | null>(null);
  creatingEmployees = signal(false);

  // Estados para PDF
  analyzingPdf = signal(false);
  showPdfPreviewDialog = signal(false);
  pdfAnalysisResult = signal<PdfAnalysisResult | null>(null);
  confirmingPdf = signal(false);
  pendingPayrollId = signal<string | null>(null);

  onUpload(event: { files: File[] }) {
    const file = event.files[0];
    if (!file) return;

    // Guardar el archivo para procesarlo después de la validación
    this.pendingFile.set(file);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      this.startPdfAnalysis(file);
    } else {
      // Leer el Excel y validar empleados localmente
      this.validateEmployeesFromExcel(file);
    }
  }

  private startPdfAnalysis(file: File) {
    this.analyzingPdf.set(true);

    // Necesitamos crear una planilla base primero para tener un ID
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const initialData: Partial<Payroll> = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      comments: `Planilla PDF - ${file.name.replace('.pdf', '')}`,
      type: this.selectedType,
    };

    this.payrollService.createPayroll(initialData).subscribe({
      next: (payroll) => {
        this.pendingPayrollId.set(payroll.id);
        this.payrollService.analyzePdf(file, payroll.id).subscribe({
          next: (result) => {
            this.pdfAnalysisResult.set(result);
            this.showPdfPreviewDialog.set(true);
            this.analyzingPdf.set(false);
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error de Análisis',
              detail: 'No se pudo analizar el PDF. Asegúrese de que sea un formato legible.',
            });
            this.analyzingPdf.set(false);
            console.error(err);
          },
        });
      },
      error: (): void => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo inicializar la planilla para el análisis.',
        });
        this.analyzingPdf.set(false);
      },
    });
  }

  cancelPdfImport() {
    this.showPdfPreviewDialog.set(false);
    this.pdfAnalysisResult.set(null);
    this.pendingFile.set(null);
    // Opcionalmente borrar la planilla temporal creada
    const id = this.pendingPayrollId();
    if (id) {
      this.payrollService.deletePayroll(id).subscribe();
    }
    this.pendingPayrollId.set(null);
  }

  confirmAndSavePdfData() {
    const id = this.pendingPayrollId();
    const result = this.pdfAnalysisResult();
    if (!id || !result) return;

    this.confirmingPdf.set(true);
    this.payrollService.confirmPdfImport(id, result.details).subscribe({
      next: (payroll) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Planilla cargada correctamente desde el PDF',
        });
        this.confirmingPdf.set(false);
        this.showPdfPreviewDialog.set(false);
        setTimeout(() => {
          this.router.navigate(['/payroll/detail', payroll.id]);
        }, 1000);
      },
      error: (): void => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al guardar los datos del PDF.',
        });
        this.confirmingPdf.set(false);
      },
    });
  }

  private async validateEmployeesFromExcel(file: File) {
    try {
      this.messageService.add({
        severity: 'info',
        summary: 'Validando',
        detail: 'Leyendo archivo Excel y validando empleados...',
      });

      // Leer el archivo Excel
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
      } as unknown as XLSX.Sheet2JSONOpts) as unknown[][];

      if (!data || data.length < 2) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'El archivo Excel no tiene datos válidos',
        });
        return;
      }

      // Función auxiliar para normalizar texto (quitar acentos, espacios, convertir a minúsculas)
      const normalizeText = (text: string): string => {
        return text
          .toString()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
          .trim()
          .replace(/\s+/g, '');
      };

      // Función auxiliar para encontrar índice de columna
      const findColumnIndex = (headerRow: unknown[], searchTerms: string[]): number => {
        for (let i = 0; i < headerRow.length; i++) {
          const header = headerRow[i];
          if (!header) continue;
          const normalizedHeader = normalizeText(String(header));
          for (const term of searchTerms) {
            if (normalizedHeader.includes(normalizeText(term))) {
              return i;
            }
          }
        }
        return -1;
      };

      // Buscar la fila de encabezados (puede estar en las primeras 10 filas)
      let headerRowIndex = -1;
      let headerRow: unknown[] = [];

      // Estrategia 1: Buscar por nombres de columnas conocidos
      for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
        const row = data[rowIdx] as unknown[];
        if (!row || row.length === 0) continue;

        // Verificar si esta fila parece ser una fila de encabezados
        const hasDni = row.some((cell) => {
          if (!cell) return false;
          const normalized = normalizeText(String(cell));
          return (
            normalized.includes('dni') ||
            normalized.includes('documento') ||
            normalized.includes('cedula') ||
            normalized.includes('doc') ||
            normalized.includes('numdoc') ||
            normalized.includes('numerodocumento')
          );
        });

        const hasName = row.some((cell) => {
          if (!cell) return false;
          const normalized = normalizeText(String(cell));
          return (
            normalized.includes('nombre') ||
            normalized.includes('name') ||
            normalized.includes('apellido') ||
            normalized.includes('lastname') ||
            normalized.includes('nombres') ||
            normalized.includes('apellidos')
          );
        });

        if (hasDni && hasName) {
          headerRowIndex = rowIdx;
          headerRow = row;
          break;
        }
      }

      // Estrategia 2: Si no se encontró, usar la primera fila como encabezados si tiene suficientes columnas
      if (headerRowIndex === -1 && data.length > 0) {
        const firstRow = data[0] as unknown[];
        if (firstRow && firstRow.length >= 3) {
          // Verificar si la primera fila tiene al menos algunas celdas con texto (no números)
          const textCells = firstRow.filter((cell) => {
            if (!cell) return false;
            const str = String(cell).trim();
            // Si es un número de 8 dígitos, probablemente no es un encabezado
            if (/^\d{8}$/.test(str)) return false;
            return str.length > 0;
          }).length;

          if (textCells >= 2) {
            headerRowIndex = 0;
            headerRow = firstRow;
          }
        }
      }

      // Estrategia 3: Detectar por patrones de datos en las siguientes filas
      if (headerRowIndex === -1 && data.length > 1) {
        // Buscar una fila que tenga un patrón de DNI (8 dígitos) en alguna columna
        for (let rowIdx = 0; rowIdx < Math.min(10, data.length - 1); rowIdx++) {
          const row = data[rowIdx] as unknown[];
          const nextRow = data[rowIdx + 1] as unknown[];

          if (!row || !nextRow) continue;

          // Buscar en la siguiente fila si hay un DNI válido
          let foundDniColumn = -1;
          for (let colIdx = 0; colIdx < nextRow.length; colIdx++) {
            const cell = nextRow[colIdx];
            if (!cell) continue;
            const cellStr = String(cell).trim().replace(/[-\s]/g, '').replace(/[^\d]/g, '');
            if (/^\d{8}$/.test(cellStr)) {
              foundDniColumn = colIdx;
              break;
            }
          }

          if (foundDniColumn >= 0 && row.length > foundDniColumn) {
            // Esta fila podría ser la de encabezados
            headerRowIndex = rowIdx;
            headerRow = row;
            break;
          }
        }
      }

      if (headerRowIndex === -1 || headerRow.length === 0) {
        console.error('No se pudo encontrar la fila de encabezados');
        console.error('Primeras 10 filas del archivo:', data.slice(0, 10));
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'No se pudo encontrar la fila de encabezados en el archivo Excel. Verifique que el archivo tenga el formato correcto.',
        });
        return;
      }

      console.log(`Fila de encabezados encontrada en el índice: ${headerRowIndex}`);
      console.log('Encabezados:', headerRow);

      // Buscar índices de columnas con múltiples variaciones
      // Priorizar búsquedas específicas para el formato de planilla peruana
      let dniIndex = findColumnIndex(headerRow, [
        'dni/c.ext',
        'dni/ce',
        'dni/cext',
        'dni c.ext',
        'dni ce',
        'dni',
        'documento',
        'cedula',
        'doc',
        'numdoc',
        'numero documento',
        'nro documento',
        'nro doc',
        'numero de documento',
        'nro de documento',
        'documento de identidad',
        'cedula de identidad',
      ]);

      let firstNameIndex = findColumnIndex(headerRow, [
        'nombres',
        'nombre',
        'firstname',
        'primer nombre',
        'name',
        'nombre1',
        'nombre empleado',
      ]);

      let lastNameIndex = findColumnIndex(headerRow, [
        'apellidos',
        'apellido',
        'lastname',
        'apellido paterno',
        'apellido materno',
        'apellido1',
        'apellido2',
        'apellido empleado',
      ]);

      let fullNameIndex = findColumnIndex(headerRow, [
        'nombre completo',
        'fullname',
        'nombre y apellido',
        'nombre completo',
        'nombrecompleto',
        'nombre completo empleado',
        'empleado',
        'trabajador',
      ]);

      const cargoIndex = findColumnIndex(headerRow, [
        'cargo',
        'puesto',
        'position',
        'trabajo',
        'ocupacion',
        'cargo empleado',
        'puesto trabajo',
        'funcion',
      ]);

      // Si no se encontró DNI por nombre, intentar detectarlo por patrón de datos
      if (dniIndex === -1 && data.length > headerRowIndex + 1) {
        // Buscar en las siguientes filas una columna que tenga DNI (8 dígitos)
        for (
          let rowIdx = headerRowIndex + 1;
          rowIdx < Math.min(headerRowIndex + 5, data.length);
          rowIdx++
        ) {
          const row = data[rowIdx] as unknown[];
          if (!row) continue;

          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx];
            if (!cell) continue;
            const cellStr = String(cell).trim().replace(/[-\s]/g, '').replace(/[^\d]/g, '');
            if (/^\d{8}$/.test(cellStr)) {
              dniIndex = colIdx;
              console.log(`DNI detectado por patrón en columna ${colIdx}`);
              break;
            }
          }
          if (dniIndex >= 0) break;
        }
      }

      // Si no se encontró nombre/apellido por nombre, intentar detectarlo por contenido de texto
      if (
        firstNameIndex === -1 &&
        lastNameIndex === -1 &&
        fullNameIndex === -1 &&
        data.length > headerRowIndex + 1
      ) {
        // Buscar columnas que tengan texto (nombres) en las siguientes filas
        for (
          let rowIdx = headerRowIndex + 1;
          rowIdx < Math.min(headerRowIndex + 5, data.length);
          rowIdx++
        ) {
          const row = data[rowIdx] as unknown[];
          if (!row) continue;

          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx];
            if (!cell) continue;
            const cellStr = String(cell).trim();
            // Si es texto (no número) y tiene más de 2 caracteres, podría ser nombre
            if (
              cellStr.length > 2 &&
              !/^\d+$/.test(cellStr) &&
              !/^\d{8}$/.test(cellStr.replace(/[-\s]/g, ''))
            ) {
              if (fullNameIndex === -1) {
                fullNameIndex = colIdx;
                console.log(`Nombre completo detectado por patrón en columna ${colIdx}`);
              } else if (firstNameIndex === -1) {
                firstNameIndex = colIdx;
                console.log(`Nombre detectado por patrón en columna ${colIdx}`);
              } else if (lastNameIndex === -1) {
                lastNameIndex = colIdx;
                console.log(`Apellido detectado por patrón en columna ${colIdx}`);
                break;
              }
            }
          }
          if (fullNameIndex >= 0 || (firstNameIndex >= 0 && lastNameIndex >= 0)) break;
        }
      }

      console.log('Índices encontrados:', {
        dniIndex,
        firstNameIndex,
        lastNameIndex,
        fullNameIndex,
        cargoIndex,
      });
      console.log('Fila de encabezados:', headerRow);

      if (dniIndex === -1) {
        console.error('No se pudo encontrar la columna DNI');
        console.error('Primeras filas:', data.slice(headerRowIndex, headerRowIndex + 5));
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'No se encontró la columna DNI en el archivo Excel. Verifique que el archivo tenga el formato correcto.',
        });
        return;
      }

      const employeesData: ExcelEmployeeData[] = [];

      // Procesar filas de empleados (desde después de la fila de encabezados)
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i] as unknown[];
        if (!row || row.length === 0) continue;

        // Verificar si la fila tiene datos válidos (no solo encabezados repetidos)
        const hasData = row.some((cell, idx) => {
          if (
            idx === dniIndex ||
            idx === firstNameIndex ||
            idx === lastNameIndex ||
            idx === fullNameIndex
          ) {
            return cell !== null && cell !== undefined && cell !== '';
          }
          return false;
        });

        if (!hasData) continue;

        // Extraer DNI y limpiarlo (quitar espacios, guiones, etc.)
        // El DNI puede venir como número o string
        let dni = '';
        if (
          dniIndex >= 0 &&
          row[dniIndex] !== null &&
          row[dniIndex] !== undefined &&
          row[dniIndex] !== ''
        ) {
          const dniValue = row[dniIndex];
          // Si es número, convertirlo directamente a string sin notación científica
          if (typeof dniValue === 'number') {
            dni = Math.floor(dniValue).toString().padStart(8, '0');
          } else {
            dni = String(dniValue)
              .trim()
              .replace(/[-\s]/g, '') // Quitar guiones y espacios
              .replace(/[^\d]/g, ''); // Solo números
          }
          // Asegurar que tenga 8 dígitos (rellenar con ceros a la izquierda si es necesario)
          if (dni.length < 8 && /^\d+$/.test(dni)) {
            dni = dni.padStart(8, '0');
          }
        }

        // Extraer nombre y apellido
        let firstName = '';
        let lastName = '';

        if (fullNameIndex >= 0 && row[fullNameIndex]) {
          // Si hay una columna de nombre completo, dividirla
          const fullName = String(row[fullNameIndex]).trim();
          if (fullName && fullName !== 'NaN') {
            const nameParts = fullName.split(/\s+/).filter((p) => p.length > 0);
            if (nameParts.length >= 2) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(' ');
            } else if (nameParts.length === 1) {
              firstName = nameParts[0];
            }
          }
        } else {
          // Usar columnas separadas (APELLIDOS y NOMBRES)
          if (lastNameIndex >= 0 && row[lastNameIndex]) {
            const lastNameValue = String(row[lastNameIndex]).trim();
            if (lastNameValue && lastNameValue !== 'NaN') {
              lastName = lastNameValue;
            }
          }
          if (firstNameIndex >= 0 && row[firstNameIndex]) {
            const firstNameValue = String(row[firstNameIndex]).trim();
            if (firstNameValue && firstNameValue !== 'NaN') {
              firstName = firstNameValue;
            }
          }
        }

        const cargo = cargoIndex >= 0 && row[cargoIndex] ? String(row[cargoIndex]).trim() : '';

        // Validar DNI (8 dígitos) y que tenga al menos nombre o apellido
        if (dni && /^\d{8}$/.test(dni) && (firstName || lastName)) {
          // Si no hay apellido pero hay nombre, usar el nombre como apellido
          if (!lastName && firstName) {
            lastName = firstName;
            firstName = '';
          }
          // Si no hay nombre pero hay apellido, dejar nombre vacío
          if (!firstName && lastName) {
            firstName = '';
          }

          employeesData.push({
            dni,
            firstName: firstName || 'N/A',
            lastName: lastName || 'N/A',
            cargo: cargo || undefined,
          });
        }
      }

      if (employeesData.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Advertencia',
          detail:
            'No se encontraron empleados válidos en el archivo Excel. Verifique que el formato sea correcto.',
        });
        console.error('Datos procesados:', {
          headerRowIndex,
          totalRows: data.length,
          employeesData,
        });
        return;
      }

      console.log(`Se encontraron ${employeesData.length} empleados válidos en el Excel`);

      // Verificar qué empleados no están registrados
      this.checkMissingEmployees(employeesData);
    } catch (error) {
      console.error('Error al leer el archivo Excel:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al leer el archivo Excel. Verifique que el formato sea correcto.',
      });
    }
  }

  private checkMissingEmployees(employeesData: ExcelEmployeeData[]) {
    // Consultar todos los empleados por DNI
    const checkRequests = employeesData.map((emp) =>
      this.employeesApi.getByDni(emp.dni).pipe(
        catchError(() => {
          // Si no se encuentra, retornar null
          return of(null);
        }),
      ),
    );

    forkJoin(checkRequests).subscribe({
      next: (employees) => {
        const missing: ExcelEmployeeData[] = [];
        employees.forEach((employee, index) => {
          if (!employee) {
            missing.push(employeesData[index]);
          }
        });

        if (missing.length > 0) {
          // Mostrar modal de confirmación
          this.missingEmployees.set(missing);
          this.showMissingEmployeesDialog.set(true);
        } else {
          // Todos los empleados están registrados, continuar con el upload
          this.proceedWithUpload();
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al verificar empleados. Continuando con el proceso...',
        });
        // Continuar con el upload aunque haya error en la validación
        this.proceedWithUpload();
      },
    });
  }

  cancelEmployeeCreation() {
    this.showMissingEmployeesDialog.set(false);
    this.missingEmployees.set([]);
    this.pendingFile.set(null);
    this.messageService.add({
      severity: 'info',
      summary: 'Cancelado',
      detail: 'Proceso cancelado. Los empleados no fueron agregados.',
    });
  }

  confirmAndCreateEmployees() {
    const missing = this.missingEmployees();
    if (missing.length === 0) {
      this.proceedWithUpload();
      return;
    }

    this.creatingEmployees.set(true);

    // Obtener un usuario para asociar (usar el primero disponible o crear uno genérico)
    this.usersApi.list().subscribe({
      next: (users) => {
        const defaultUserId = users.length > 0 ? users[0]._id : null;

        if (!defaultUserId) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No hay usuarios disponibles. Debe crear al menos un usuario primero.',
          });
          this.creatingEmployees.set(false);
          return;
        }

        // Crear empleados faltantes
        const createRequests = missing.map((emp) => {
          const createData: Partial<CreateEmployeeRequest> = {
            nombre: emp.firstName,
            apellido: emp.lastName,
            dni: emp.dni,
            cargo: emp.cargo,
            telefono: emp.telefono,
            direccion: emp.direccion,
            // Solo enviar correo si existe
            ...(emp.correo ? { correo: emp.correo } : {}),
            // Solo enviar userId si es necesario/requerido por el backend,
            // de lo contrario intentar enviar sin usuario si el backend lo permite
            userId: defaultUserId,
            // No generar numeroSeguroSocial inventado
          };

          // Castear a CreateEmployeeRequest si estamos seguros de que el backend acepta campos opcionales
          // O ajustar la interfaz CreateEmployeeRequest si es necesario.
          // Por ahora asumimos que el backend puede recibir estos datos.

          return this.employeesApi.create(createData as CreateEmployeeRequest).pipe(
            catchError((err) => {
              console.error(`Error al crear empleado ${emp.dni}:`, err);
              return of(null);
            }),
          );
        });

        forkJoin(createRequests).subscribe({
          next: (results) => {
            const successCount = results.filter((r) => r !== null).length;
            const failedCount = results.length - successCount;

            this.creatingEmployees.set(false);
            this.showMissingEmployeesDialog.set(false);

            if (successCount > 0) {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `${successCount} empleado(s) creado(s) exitosamente${
                  failedCount > 0 ? `. ${failedCount} fallaron.` : ''
                }`,
              });
            }

            if (failedCount > 0 && successCount === 0) {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail:
                  'No se pudieron crear los empleados. Verifique los datos e intente nuevamente.',
              });
              return;
            }

            // Continuar con el upload
            this.proceedWithUpload();
          },
          error: () => {
            this.creatingEmployees.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al crear empleados. Continuando con el proceso...',
            });
            // Continuar con el upload aunque haya errores
            this.proceedWithUpload();
          },
        });
      },
      error: () => {
        this.creatingEmployees.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al obtener usuarios. No se pueden crear empleados.',
        });
      },
    });
  }

  private proceedWithUpload() {
    const file = this.pendingFile();
    if (!file) return;

    this.pendingFile.set(null);

    this.payrollService.uploadPayrollExcel(file, this.selectedType).subscribe({
      next: (payroll: Payroll) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Archivo procesado correctamente',
        });
        setTimeout(() => {
          this.router.navigate(['/payroll/detail', payroll.id]);
        }, 1000);
      },
      error: (err: unknown) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al procesar el archivo',
        });
        console.error(err);
      },
    });
  }
}
