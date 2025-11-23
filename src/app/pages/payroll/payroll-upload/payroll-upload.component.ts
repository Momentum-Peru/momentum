import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FileUploadModule } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { PayrollService } from '../../../core/services/payroll.service';
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
    FormsModule,
  ],
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
          <p class="mb-4 text-gray-600">
            Descarga el formato Excel para llenar los datos de los pagos.
          </p>

          <div class="flex flex-col gap-4">
            <p-button
              label="Plantilla Planilla"
              icon="pi pi-download"
              styleClass="p-button-outlined"
              (onClick)="downloadTemplate('PLANILLA')"
            ></p-button>
            <p-button
              label="Plantilla RxH"
              icon="pi pi-download"
              styleClass="p-button-outlined p-button-warning"
              (onClick)="downloadTemplate('RXH')"
            ></p-button>
          </div>
        </div>

        <!-- Upload Section -->
        <div class="border rounded-lg p-6 bg-white shadow-sm">
          <h2 class="text-xl font-semibold mb-4">2. Subir Archivo</h2>
          <p class="mb-4 text-gray-600">Sube el archivo Excel completado.</p>

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

          <p-fileUpload
            mode="advanced"
            chooseLabel="Seleccionar Excel"
            uploadLabel="Procesar"
            cancelLabel="Cancelar"
            [customUpload]="true"
            (uploadHandler)="onUpload($event)"
            accept=".xlsx,.xls"
            [maxFileSize]="1000000"
          >
          </p-fileUpload>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para empleados faltantes -->
    <p-dialog
      [(visible)]="showMissingEmployeesDialog"
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
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Se encontraron {{ missingEmployees().length }} empleado(s) no registrados en el sistema.</strong>
            ¿Desea agregarlos automáticamente con los datos del Excel?
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
            <strong>Nota:</strong> Los empleados se crearán con:
            <br />- Correo: [dni]@empresa.com (temporal, puede modificarse después)
            <br />- Número de Seguro Social: Se generará automáticamente
            <br />- Usuario: Se creará un usuario básico asociado
          </p>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button
          pButton
          label="Cancelar"
          class="p-button-text"
          (click)="cancelEmployeeCreation()"
          [disabled]="creatingEmployees()"
          aria-label="Cancelar"
        ></button>
        <button
          pButton
          label="Agregar Empleados y Continuar"
          (click)="confirmAndCreateEmployees()"
          [disabled]="creatingEmployees()"
          [loading]="creatingEmployees()"
          aria-label="Agregar empleados y continuar"
        ></button>
      </ng-template>
    </p-dialog>
  `,
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

  downloadTemplate(type: string) {
    this.payrollService.downloadTemplate(type as 'PLANILLA' | 'RXH').subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = type === 'RXH' ? 'plantilla_rxh.xlsx' : 'plantilla_planilla.xlsx';
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({
          severity: 'success',
          summary: 'Descarga exitosa',
          detail: `Plantilla ${type} descargada correctamente`,
        });
      },
      error: (err: unknown) => {
        console.error('Error al descargar plantilla:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al descargar la plantilla',
        });
      },
    });
  }

  onUpload(event: { files: File[] }) {
    const file = event.files[0];
    if (!file) return;

    // Guardar el archivo para procesarlo después de la validación
    this.pendingFile.set(file);

    // Leer el Excel y validar empleados
    this.validateEmployeesFromExcel(file);
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
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];

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
          detail: 'No se pudo encontrar la fila de encabezados en el archivo Excel. Verifique que el archivo tenga el formato correcto.',
        });
        return;
      }

      console.log(`Fila de encabezados encontrada en el índice: ${headerRowIndex}`);
      console.log('Encabezados:', headerRow);

      // Buscar índices de columnas con múltiples variaciones
      // Priorizar búsquedas específicas para el formato de planilla peruana
      let dniIndex = findColumnIndex(headerRow, [
        'dni/c.ext', 'dni/ce', 'dni/cext', 'dni c.ext', 'dni ce',
        'dni', 'documento', 'cedula', 'doc', 'numdoc', 'numero documento',
        'nro documento', 'nro doc', 'numero de documento', 'nro de documento',
        'documento de identidad', 'cedula de identidad'
      ]);
      
      let firstNameIndex = findColumnIndex(headerRow, [
        'nombres', 'nombre', 'firstname', 'primer nombre', 'name',
        'nombre1', 'nombre empleado'
      ]);
      
      let lastNameIndex = findColumnIndex(headerRow, [
        'apellidos', 'apellido', 'lastname', 'apellido paterno', 'apellido materno',
        'apellido1', 'apellido2', 'apellido empleado'
      ]);
      
      let fullNameIndex = findColumnIndex(headerRow, [
        'nombre completo', 'fullname', 'nombre y apellido', 'nombre completo',
        'nombrecompleto', 'nombre completo empleado', 'empleado', 'trabajador'
      ]);
      
      const cargoIndex = findColumnIndex(headerRow, [
        'cargo', 'puesto', 'position', 'trabajo', 'ocupacion',
        'cargo empleado', 'puesto trabajo', 'funcion'
      ]);

      // Si no se encontró DNI por nombre, intentar detectarlo por patrón de datos
      if (dniIndex === -1 && data.length > headerRowIndex + 1) {
        // Buscar en las siguientes filas una columna que tenga DNI (8 dígitos)
        for (let rowIdx = headerRowIndex + 1; rowIdx < Math.min(headerRowIndex + 5, data.length); rowIdx++) {
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
      if ((firstNameIndex === -1 && lastNameIndex === -1 && fullNameIndex === -1) && data.length > headerRowIndex + 1) {
        // Buscar columnas que tengan texto (nombres) en las siguientes filas
        for (let rowIdx = headerRowIndex + 1; rowIdx < Math.min(headerRowIndex + 5, data.length); rowIdx++) {
          const row = data[rowIdx] as unknown[];
          if (!row) continue;
          
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cell = row[colIdx];
            if (!cell) continue;
            const cellStr = String(cell).trim();
            // Si es texto (no número) y tiene más de 2 caracteres, podría ser nombre
            if (cellStr.length > 2 && !/^\d+$/.test(cellStr) && !/^\d{8}$/.test(cellStr.replace(/[-\s]/g, ''))) {
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

      console.log('Índices encontrados:', { dniIndex, firstNameIndex, lastNameIndex, fullNameIndex, cargoIndex });
      console.log('Fila de encabezados:', headerRow);

      if (dniIndex === -1) {
        console.error('No se pudo encontrar la columna DNI');
        console.error('Primeras filas:', data.slice(headerRowIndex, headerRowIndex + 5));
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se encontró la columna DNI en el archivo Excel. Verifique que el archivo tenga el formato correcto.',
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
          if (idx === dniIndex || idx === firstNameIndex || idx === lastNameIndex || idx === fullNameIndex) {
            return cell !== null && cell !== undefined && cell !== '';
          }
          return false;
        });

        if (!hasData) continue;

        // Extraer DNI y limpiarlo (quitar espacios, guiones, etc.)
        // El DNI puede venir como número o string
        let dni = '';
        if (dniIndex >= 0 && row[dniIndex] !== null && row[dniIndex] !== undefined && row[dniIndex] !== '') {
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
          detail: 'No se encontraron empleados válidos en el archivo Excel. Verifique que el formato sea correcto.',
        });
        console.error('Datos procesados:', { headerRowIndex, totalRows: data.length, employeesData });
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
        })
      )
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
        const createRequests = missing.map((emp, index) => {
          // Generar correo temporal único
          const timestamp = Date.now();
          const correo = `${emp.dni}${index}@empresa.com`;
          // Generar número de seguro social temporal único (usar DNI + timestamp + índice)
          const numeroSeguroSocial = `${emp.dni}${timestamp.toString().slice(-6)}${index.toString().padStart(2, '0')}`;

          const createData: CreateEmployeeRequest = {
            nombre: emp.firstName,
            apellido: emp.lastName,
            dni: emp.dni,
            correo: correo,
            numeroSeguroSocial: numeroSeguroSocial,
            userId: defaultUserId,
            cargo: emp.cargo,
            telefono: emp.telefono,
            direccion: emp.direccion,
          };

          return this.employeesApi.create(createData).pipe(
            catchError((err) => {
              console.error(`Error al crear empleado ${emp.dni}:`, err);
              return of(null);
            })
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
                detail: `${successCount} empleado(s) creado(s) exitosamente${failedCount > 0 ? `. ${failedCount} fallaron.` : ''}`,
              });
            }

            if (failedCount > 0 && successCount === 0) {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron crear los empleados. Verifique los datos e intente nuevamente.',
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
