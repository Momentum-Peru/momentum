import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TimeTrackingReportKpis {
  /** Días con al menos un ingreso (para mostrar como "X días") */
  asistencias: number;
  totalTardanzas: number;
  faltas: number;
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
  itemsByDay: { date: string; items: TimeTrackingReportMark[] }[];
}

export interface TimeTrackingReportData {
  startDate: string;
  endDate: string;
  kpis: TimeTrackingReportKpis;
  users: TimeTrackingReportUser[];
}

const LOGO_URL = '/images/logo.png';
const MARGIN = 14;
const LOGO_WIDTH = 35;
const LOGO_HEIGHT = 12;
const HEADER_Y = 8;
/** Altura del membrete (logo) para continuar contenido en nuevas hojas */
const MEMBRETE_HEIGHT = LOGO_HEIGHT + 6;
/** Margen superior en todas las hojas para no cruzar con el logo (autoTable) */
const TOP_MARGIN_PAGES = HEADER_Y + LOGO_HEIGHT + 6;

/**
 * Servicio para generar el PDF del reporte de asistencias.
 */
@Injectable({ providedIn: 'root' })
export class TimeTrackingPdfService {
  /**
   * Genera el PDF con logo en todas las hojas (membrete), datos de la empresa,
   * resumen general y detalle por usuario.
   */
  async generateReport(data: TimeTrackingReportData): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoBase64 = await this.loadLogoBase64();
    let y = this.drawMembrete(doc, logoBase64, true);

    // Primera hoja: información de la empresa
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('RUC: 20548168393', MARGIN, y);
    y += 6;
    doc.text('Razón Social: TECMEING PERU S.A.C', MARGIN, y);
    y += 10;

    // Título del reporte
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Asistencias', MARGIN, y);
    y += 8;

    // Período (con nombre del mes: Enero, Febrero, etc.)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const nombreMes = this.getNombreMesDesdeYmd(data.startDate);
    const fechasRango = `${this.formatDateDisplay(data.startDate)} - ${this.formatDateDisplay(data.endDate)}`;
    const periodo = nombreMes
      ? `Período: ${nombreMes} (${fechasRango})`
      : `Período: ${fechasRango}`;
    doc.text(periodo, MARGIN, y);
    y += 10;

    // Información del empleado: nombre (grande) si es un solo usuario
    if (data.users.length === 1) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(data.users[0].userName, MARGIN, y);
      y += 10;
    }

    // Resumen general
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Resumen general', MARGIN, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Asistencias', `${data.kpis.asistencias} días`],
        ['Tardanzas (ingresos después de 8:00am)', String(data.kpis.totalTardanzas)],
        ['Faltas (días sin asistencia)', `${data.kpis.faltas} días`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold' },
      margin: { top: TOP_MARGIN_PAGES, left: MARGIN },
      didDrawPage: (hookData) => this.drawLogoOnPage(hookData.doc, hookData.pageNumber, logoBase64),
    });
    y = this.getFinalY(doc) + 12;

    // Resumen por usuario (solo cuando hay más de un usuario)
    if (data.users.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Resumen por usuario', MARGIN, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [['Usuario', 'Asistencias', 'Tardanzas', 'Faltas']],
        body: data.users.map((u) => [
          u.userName,
          String(u.asistencias),
          String(u.tardanzas),
          String(u.faltas),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontStyle: 'bold' },
        margin: { top: TOP_MARGIN_PAGES, left: MARGIN },
        didDrawPage: (hookData) => this.drawLogoOnPage(hookData.doc, hookData.pageNumber, logoBase64),
      });
      y = this.getFinalY(doc) + 12;
    }

    // Detalle por usuario (cada usuario en su sección)
    for (const user of data.users) {
      if (y > 250) {
        doc.addPage();
        y = this.drawMembrete(doc, logoBase64, false);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Detalle: ${user.userName}`, MARGIN, y);
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
          margin: { top: TOP_MARGIN_PAGES, left: MARGIN },
          tableLineWidth: 0.1,
          didDrawPage: (hookData) => this.drawLogoOnPage(hookData.doc, hookData.pageNumber, logoBase64),
        });
        y = this.getFinalY(doc) + 10;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Sin marcaciones en este período.', MARGIN, y);
        y += 8;
      }
    }

    return doc.output('blob');
  }

  /**
   * Dibuja el membrete (logo) en la parte superior de la página.
   * Debe llamarse al inicio de la primera hoja y tras cada addPage().
   * @returns Posición Y después del membrete para continuar el contenido.
   */
  private drawMembrete(doc: jsPDF, logoBase64: string | null, _isFirstPage: boolean): number {
    const y = HEADER_Y;
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', MARGIN, y, LOGO_WIDTH, LOGO_HEIGHT);
    }
    return y + MEMBRETE_HEIGHT;
  }

  /**
   * Dibuja el logo en la página indicada (para didDrawPage de autoTable).
   * Garantiza que todas las hojas generadas por autoTable tengan el logo.
   */
  private drawLogoOnPage(
    doc: jsPDF,
    pageNumber: number,
    logoBase64: string | null
  ): void {
    if (!logoBase64) return;
    doc.setPage(pageNumber);
    doc.addImage(logoBase64, 'PNG', MARGIN, HEADER_Y, LOGO_WIDTH, LOGO_HEIGHT);
  }

  /** Carga el logo de la empresa desde /images/logo.png y devuelve base64 o null. */
  private async loadLogoBase64(): Promise<string | null> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${baseUrl}${LOGO_URL}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string | null>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          resolve(typeof dataUrl === 'string' ? dataUrl : null);
        };
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
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

  /** Devuelve el nombre del mes y año en español (ej. "Enero 2026") desde una fecha YYYY-MM-DD. */
  private getNombreMesDesdeYmd(ymd: string): string {
    if (!ymd || ymd.length < 7) return '';
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const y = ymd.slice(0, 4);
    const m = parseInt(ymd.slice(5, 7), 10);
    if (m < 1 || m > 12) return '';
    return `${meses[m - 1]} ${y}`;
  }
}
