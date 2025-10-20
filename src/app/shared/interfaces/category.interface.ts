export interface ExpenseCategory {
    _id?: string;
    name: string;
    description?: string;
    code: string;
    color?: string; // Para representación visual
    sortOrder?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CategoryOption {
    label: string;
    value: string;
}
