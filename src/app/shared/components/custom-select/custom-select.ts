import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = unknown> {
    label: string;
    value: T;
}

@Component({
    selector: 'app-custom-select',
    standalone: true,
    imports: [CommonModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CustomSelectComponent),
            multi: true
        }
    ],
    template: `
    <div class="relative">
      <select
        [value]="selectedValue"
        (change)="onChange($event)"
        (blur)="onBlur()"
        [disabled]="disabled"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
        <option value="" disabled>{{ placeholder }}</option>
        <option 
          *ngFor="let option of options" 
          [value]="option.value">
          {{ option.label }}
        </option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `]
})
export class CustomSelectComponent implements ControlValueAccessor {
    @Input() options: SelectOption[] = [];
    @Input() placeholder = 'Selecciona una opción';
    @Input() disabled = false;
    @Output() selectionChange = new EventEmitter<unknown>();

    selectedValue: unknown = '';
    private onChangeCallback: (value: unknown) => void = () => {
        // Callback para ControlValueAccessor - se reemplaza con registerOnChange
    };
    private onTouchedCallback = (): void => {
        // Callback para ControlValueAccessor
    };

    onChange(event: Event): void {
        const target = event.target as HTMLSelectElement;
        this.selectedValue = target.value;
        this.onChangeCallback(this.selectedValue);
        this.selectionChange.emit(this.selectedValue);
    }

    onBlur(): void {
        this.onTouchedCallback();
    }

    // ControlValueAccessor implementation
    writeValue(value: unknown): void {
        this.selectedValue = value || '';
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}
