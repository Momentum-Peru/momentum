import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { TimeTracking } from '../interfaces/time-tracking.interface';

@Injectable({
    providedIn: 'root',
})
export class TimeTrackingExcelService {
    /**
     * Exporta el resumen y detalle de marcaciones a un archivo Excel.
     */
    exportToExcel(summary: any[], startDate: string | null, endDate: string | null) {
        const wb = XLSX.utils.book_new();

        // 1. Hoja de Resumen
        const summaryData = summary.map((u) => ({
            Usuario: u.userName,
            Cargo: u.cargo,
            Asistencias: u.asistencias,
            Tardanzas: u.tardanzas,
            Faltas: u.faltas,
            'Total Marcaciones': u.totalMarcaciones,
        }));
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

        // 2. Hoja de Detalle (Todos los usuarios)
        const detailData: any[] = [];
        summary.forEach((u) => {
            u.dailyGroups.forEach((day: any) => {
                const allItems = [...day.ingresos, ...day.salidas].sort(
                    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                allItems.forEach((item: any) => {
                    detailData.push({
                        Usuario: u.userName,
                        Fecha: day.date,
                        Hora: new Date(item.date).toLocaleTimeString('es-PE', { hour12: false }),
                        Tipo: item.type,
                        Tardanza: item.type === 'INGRESO' && this.isTardanza(item.date) ? 'SÍ' : 'NO',
                        Ubicación: item.address || item.location || '-',
                    });
                });
            });
        });
        const wsDetail = XLSX.utils.json_to_sheet(detailData);
        XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle de Marcaciones');

        // Generar archivo y descargar
        const fileName = `reporte_asistencias_${startDate || 'inicio'}_${endDate || 'fin'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    private isTardanza(dateIso: string | undefined): boolean {
        if (!dateIso) return false;
        try {
            const d = new Date(dateIso);
            if (isNaN(d.getTime())) return false;
            const minutesSinceMidnight = d.getHours() * 60 + d.getMinutes();
            return minutesSinceMidnight > 8 * 60 + 15;
        } catch {
            return false;
        }
    }
}
