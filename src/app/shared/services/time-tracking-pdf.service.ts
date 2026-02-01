import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TimeTrackingReportKpis {
  total: number;
  totalTardanzas: number;
  faltas: number;
  diasEnRango: number;
  usuariosConMarcacion: number;
}

export interface TimeTrackingReportMark {
  fecha: string;
  hora: string;
  tipo: string;
  tardanza: boolean;
  ubicacion: string;
}

export interface TimeTrackingReportUser {
  userName: string;
  asistencias: number;
  tardanzas: number;
  faltas: number;
  totalMarcaciones: number;
  itemsByDay: { date: string; items: TimeTrackingReportMark[] }[];
}

export interface TimeTrackingReportData {
  startDate: string;
  endDate: string;
  kpis: TimeTrackingReportKpis;
  users: TimeTrackingReportUser[];
}

/**
 * Servicio para generar el PDF del reporte de marcaciones para gerencia.
 */
@Injectable({ providedIn: 'root' })
export class TimeTrackingPdfService {
  /**
   * Genera el PDF con la información resumida, KPIs y detalle por usuario.
   */
  generateReport(data: TimeTrackingReportData): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 15;

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Marcaciones - Gerencia', 14, y);
    y += 10;

    // Período
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const periodo = `Período: ${this.formatDateDisplay(data.startDate)} - ${this.formatDateDisplay(data.endDate)}`;
    doc.text(periodo, 14, y);
    y += 10;

    // KPIs
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumen general (KPIs)', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total marcaciones', String(data.kpis.total)],
        ['Tardanzas (ingresos después de 8:00)', String(data.kpis.totalTardanzas)],
        ['Faltas (días sin asistencia)', String(data.kpis.faltas)],
        ['Días seleccionados', String(data.kpis.diasEnRango)],
        ['Usuarios con marcación', String(data.kpis.usuariosConMarcacion)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold' },
      margin: { left: 14 },
    });
    y = this.getFinalY(doc) + 12;

    // Por usuario
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumen por usuario', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Usuario', 'Días asist.', 'Tardanzas', 'Faltas', 'Total marc.']],
      body: data.users.map((u) => [
        u.userName,
        String(u.asistencias),
        String(u.tardanzas),
        String(u.faltas),
        String(u.totalMarcaciones),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold' },
      margin: { left: 14 },
    });
    y = this.getFinalY(doc) + 12;

    // Detalle por usuario (cada usuario en su sección)
    for (const user of data.users) {
      if (y > 250) {
        doc.addPage();
        y = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Detalle: ${user.userName}`, 14, y);
      y += 6;

      const rows: string[][] = [];
      for (const day of user.itemsByDay) {
        for (const item of day.items) {
          rows.push([
            day.date,
            item.hora,
            item.tipo,
            item.tardanza ? 'Sí' : 'No',
            item.ubicacion.length > 35 ? item.ubicacion.slice(0, 35) + '…' : item.ubicacion,
          ]);
        }
      }

      if (rows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Hora', 'Tipo', 'Tardanza', 'Ubicación']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [100, 100, 100], fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14 },
          tableLineWidth: 0.1,
        });
        y = this.getFinalY(doc) + 10;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Sin marcaciones en este período.', 14, y);
        y += 8;
      }
    }

    return doc.output('blob');
  }

  private getFinalY(doc: jsPDF): number {
    const d = doc as unknown as { lastAutoTable?: { finalY: number } };
    return d.lastAutoTable?.finalY ?? 20;
  }

  private formatDateDisplay(ymd: string): string {
    if (!ymd || ymd.length < 10) return ymd;
    const [y, m, d] = [ymd.slice(0, 4), ymd.slice(5, 7), ymd.slice(8, 10)];
    return `${d}/${m}/${y}`;
  }
}
