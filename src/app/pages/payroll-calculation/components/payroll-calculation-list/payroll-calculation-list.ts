import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { PayrollCalculation } from '../../../../shared/interfaces/payroll-calculation.interface';
import { Employee } from '../../../../shared/interfaces/employee.interface';

/**
 * Componente de Lista para Cálculo de Planilla
 * Principio de Responsabilidad Única: Solo maneja la visualización de la lista de registros
 */
@Component({
  selector: 'app-payroll-calculation-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, TagModule],
  templateUrl: './payroll-calculation-list.html',
  styleUrl: './payroll-calculation-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollCalculationListComponent {
  @Input({ required: true }) items: PayrollCalculation[] = [];
  @Input({ required: true }) loading = false;
  @Input({ required: true }) canEdit = false;
  @Input({ required: true }) employees: Employee[] = [];
  @Output() edit = new EventEmitter<PayrollCalculation>();
  @Output() delete = new EventEmitter<PayrollCalculation>();
  @Output() getEmployeeName = new EventEmitter<string | { nombre: string; apellido: string }>();
  @Output() formatDate = new EventEmitter<string | undefined>();
  @Output() formatTime = new EventEmitter<string | undefined>();
  @Output() formatWorkedHours = new EventEmitter<number | undefined>();

  /**
   * Obtener nombre del empleado
   */
  getEmployeeNameValue(employeeId: string | { nombre: string; apellido: string }): string {
    if (typeof employeeId === 'string') {
      const employee = this.employees.find((e) => e._id === employeeId);
      return employee ? `${employee.nombre} ${employee.apellido}` : 'N/A';
    }
    return `${employeeId.nombre} ${employeeId.apellido}`;
  }

  /**
   * Formatear fecha
   */
  formatDateValue(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Formatear hora
   */
  formatTimeValue(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatear horas trabajadas
   */
  formatWorkedHoursValue(hours: number | undefined): string {
    if (hours === undefined || hours === null) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  /**
   * Obtener severidad del tag según el estado
   */
  getAbsentSeverity(isAbsent: boolean): 'success' | 'danger' {
    return isAbsent ? 'danger' : 'success';
  }

  /**
   * Obtener texto del tag según el estado
   */
  getAbsentLabel(isAbsent: boolean): string {
    return isAbsent ? 'Falta' : 'Asistencia';
  }

  /**
   * Obtener severidad del tag según si es manual
   */
  getManualSeverity(isManual: boolean): 'info' | 'secondary' {
    return isManual ? 'info' : 'secondary';
  }

  /**
   * Obtener texto del tag según si es manual
   */
  getManualLabel(isManual: boolean): string {
    return isManual ? 'Manual' : 'Automático';
  }
}
