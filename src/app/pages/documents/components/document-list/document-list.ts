import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';

import { Document } from '../../../../shared/interfaces/document.interface';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    PaginatorModule,
    CardModule,
    BadgeModule,
  ],
  templateUrl: './document-list.html',
  styleUrl: './document-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentListComponent {
  @Input({ required: true }) documents: Document[] = [];
  @Input({ required: true }) loading: boolean = false;
  @Input({ required: true }) totalRecords: number = 0;
  @Input({ required: true }) currentPage: number = 1;
  @Input({ required: true }) pageSize: number = 10;
  @Input({ required: true }) first: number = 0;
  @Input({ required: true }) trackByFn!: (index: number, item: Document) => string;

  @Output() pageChange = new EventEmitter<{ page: number; first: number; rows: number }>();
  @Output() editDocument = new EventEmitter<Document>();
  @Output() deleteDocument = new EventEmitter<Document>();
  @Output() viewDetails = new EventEmitter<Document>();
  @Output() manageFiles = new EventEmitter<Document>();

  /**
   * Formatear fecha para mostrar
   */
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-PE');
  }

  /**
   * Formatear número de documento con serie
   */
  formatDocumentNumber(document: Document): string {
    const numero = document.numeroDocumento;
    const serie = document.serie;
    return serie ? `${serie}-${numero}` : numero.toString();
  }

  /**
   * Formatear total como moneda
   */
  formatCurrency(total: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(total);
  }

  /**
   * Obtener el nombre del proyecto
   */
  getProjectName(document: Document): string {
    if (typeof document.proyectoId === 'string') {
      return 'Proyecto no encontrado';
    }
    return document.proyectoId.name;
  }

  /**
   * Obtener el código del proyecto
   */
  getProjectCode(document: Document): string {
    if (typeof document.proyectoId === 'string') {
      return '';
    }
    return document.proyectoId.code;
  }

  /**
   * Verificar si el documento está vencido
   */
  isOverdue(document: Document): boolean {
    if (!document.fechaVencimiento) return false;
    const vencimiento =
      typeof document.fechaVencimiento === 'string'
        ? new Date(document.fechaVencimiento)
        : document.fechaVencimiento;
    return vencimiento < new Date();
  }

  /**
   * Obtener severidad del estado del documento
   */
  getStatusSeverity(document: Document): 'success' | 'warn' | 'danger' | 'info' {
    if (!document.isActive) return 'danger';
    if (this.isOverdue(document)) return 'warn';
    return 'success';
  }

  /**
   * Obtener texto del estado del documento
   */
  getStatusText(document: Document): string {
    if (!document.isActive) return 'Inactivo';
    if (this.isOverdue(document)) return 'Vencido';
    return 'Activo';
  }

  /**
   * Manejar cambio de página
   */
  onPageChange(event: any): void {
    // Prevenir loop: si el evento coincide con el estado actual, no hacer nada
    if (event.first === this.first && event.rows === this.pageSize) {
      return;
    }

    // Calcular el número de página basándose en first y rows
    const page = event.first >= 0 && event.rows > 0 ? Math.floor(event.first / event.rows) : 0;

    this.pageChange.emit({
      page: page,
      first: event.first,
      rows: event.rows,
    });
  }

  /**
   * Manejar edición de documento
   */
  onEdit(document: Document): void {
    this.editDocument.emit(document);
  }

  /**
   * Manejar eliminación de documento
   */
  onDelete(document: Document): void {
    this.deleteDocument.emit(document);
  }

  /**
   * Manejar visualización de detalles
   */
  onViewDetails(document: Document): void {
    this.viewDetails.emit(document);
  }

  /**
   * Manejar gestión de archivos
   */
  onManageFiles(document: Document): void {
    this.manageFiles.emit(document);
  }

  /**
   * Obtener nombre del archivo desde URL
   */
  getFileName(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Archivo';
  }

  /**
   * Verificar si hay documentos
   */
  hasDocuments(): boolean {
    return this.documents.length > 0;
  }
}
