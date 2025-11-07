/**
 * Interfaces para el Dashboard con KPIs
 * Basado en la API de dashboard-api.md
 */

export interface DashboardKpi {
    title: string;
    value: number;
    change: number;
    changeType: 'increase' | 'decrease' | 'neutral';
    icon: string;
    color: string;
}

export interface DashboardKpis {
    totalClients: DashboardKpi;
    totalProjects: DashboardKpi;
    totalQuotes: DashboardKpi;
    totalOrders: DashboardKpi;
    totalUsers: DashboardKpi;
    totalRequirements: DashboardKpi;
    totalDailyReports: DashboardKpi;
    averageDailyReports: DashboardKpi;
    totalDailyReportsValue: DashboardKpi;
}

export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
}

export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface DashboardCharts {
    dailyReports: ChartData;
    projectReports: ChartData;
    quotesByStatus: ChartData;
    clientsByProject?: ChartData;
    quotesByProject?: ChartData;
    requirementsByProject?: ChartData;
    projectsByStatus?: ChartData;
    requirementsByStatus?: ChartData;
}

export interface TableData {
    date?: string;
    projectId?: string;
    projectName?: string;
    clientId?: string;
    clientName?: string;
    count: number;
    value: number;
}

export interface DashboardTables {
    dailyReports: TableData[];
    projectReports: TableData[];
    clientsByProject: TableData[];
}

export interface ChartRecommendations {
    dailyReports: string;
    projectReports: string;
    clientsByProject: string;
    quotesByProject: string;
    requirementsByProject: string;
    quotesByStatus: string;
    projectsByStatus: string;
    requirementsByStatus: string;
}

export interface DashboardFilters {
    startDate?: string | null;
    endDate?: string | null;
    projectId?: string | null;
    clientId?: string | null;
}

export interface DashboardMetadata {
    generatedAt: string;
    period: string;
    filters: DashboardFilters;
    chartRecommendations: ChartRecommendations;
    performance: {
        processingTimeMs: number;
        dataPoints: number;
    };
}

export interface DashboardData {
    kpis: DashboardKpis;
    charts: DashboardCharts;
    tables: DashboardTables;
}

export interface DashboardResponse {
    success: boolean;
    data: DashboardData;
    metadata: DashboardMetadata;
}

export interface DashboardFiltersParams {
    period?: '7d' | '30d' | '90d' | '1y' | 'custom';
    startDate?: string;
    endDate?: string;
    projectId?: string;
    clientId?: string;
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut';
    timezone?: string;
}

/**
 * Tipos específicos para cada tipo de gráfico según Chart.js
 */
export interface LineChartData extends ChartData {
    datasets: (ChartDataset & {
        fill?: boolean;
        tension?: number;
        pointBackgroundColor?: string[];
        pointBorderColor?: string[];
        pointRadius?: number;
    })[];
}

export interface BarChartData extends ChartData {
    datasets: (ChartDataset & {
        barThickness?: number;
        maxBarThickness?: number;
    })[];
}

export interface PieChartData extends ChartData {
    datasets: (ChartDataset & {
        hoverOffset?: number;
    })[];
}

export interface DoughnutChartData extends ChartData {
    datasets: (ChartDataset & {
        hoverOffset?: number;
        cutout?: string;
    })[];
}
