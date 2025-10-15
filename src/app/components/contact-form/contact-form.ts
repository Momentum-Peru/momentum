import { Component, signal, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Contact, CreateContactRequest, UpdateContactRequest } from '../../shared/interfaces/contact.interface';

@Component({
    selector: 'app-contact-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, Button, InputText, Textarea],
    templateUrl: './contact-form.html',
    styleUrl: './contact-form.scss'
})
export class ContactFormComponent implements OnInit {
    private fb = inject(FormBuilder);

    // Inputs
    contact = input<Contact | null>(null);
    isEditing = input<boolean>(false);
    isLoading = input<boolean>(false);

    // Outputs
    onSubmit = output<CreateContactRequest | UpdateContactRequest>();
    onCancel = output<void>();

    // Formulario reactivo
    contactForm!: FormGroup;

    ngOnInit(): void {
        this.initializeForm();
        this.loadContactData();
    }

    /**
     * Inicializa el formulario reactivo
     */
    private initializeForm(): void {
        this.contactForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            email: ['', [Validators.email]],
            phone: ['', [Validators.maxLength(20)]],
            company: ['', [Validators.maxLength(100)]],
            jobTitle: ['', [Validators.maxLength(100)]],
            address: ['', [Validators.maxLength(200)]],
            notes: ['', [Validators.maxLength(500)]]
        });
    }

    /**
     * Carga los datos del contacto en el formulario
     */
    private loadContactData(): void {
        const contact = this.contact();
        if (contact) {
            this.contactForm.patchValue({
                name: contact.name,
                email: contact.email || '',
                phone: contact.phone || '',
                company: contact.company || '',
                jobTitle: contact.jobTitle || '',
                address: contact.address || '',
                notes: contact.notes || ''
            });
        }
    }

    /**
     * Maneja el envío del formulario
     */
    onSubmitForm(): void {
        if (this.contactForm.valid) {
            const formData = this.contactForm.value;

            // Limpiar campos vacíos
            Object.keys(formData).forEach(key => {
                if (formData[key] === '' || formData[key] === null) {
                    delete formData[key];
                }
            });

            this.onSubmit.emit(formData);
        } else {
            // Marcar todos los campos como tocados para mostrar errores
            Object.keys(this.contactForm.controls).forEach(key => {
                this.contactForm.get(key)?.markAsTouched();
            });
        }
    }

    /**
     * Verifica si un campo tiene error
     */
    hasFieldError(fieldName: string): boolean {
        const field = this.contactForm.get(fieldName);
        return !!(field && field.invalid && field.touched);
    }

    /**
     * Obtiene el mensaje de error de un campo
     */
    getFieldError(fieldName: string): string {
        const field = this.contactForm.get(fieldName);
        if (field && field.invalid && field.touched) {
            if (field.errors?.['required']) {
                return 'Este campo es requerido';
            }
            if (field.errors?.['minlength']) {
                return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
            }
            if (field.errors?.['maxlength']) {
                return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
            }
            if (field.errors?.['email']) {
                return 'Formato de email inválido';
            }
        }
        return '';
    }

    /**
     * Cancela la operación
     */
    onCancelForm(): void {
        this.onCancel.emit();
    }
}
