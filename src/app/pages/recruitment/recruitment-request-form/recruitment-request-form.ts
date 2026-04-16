import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { RecruitmentApiService, RecruitmentRequestStatus } from '../../../shared/services/recruitment-api.service';
import { ProjectsApiService } from '../../../shared/services/projects-api.service';
import { ProjectOption } from '../../../shared/interfaces/project.interface';

@Component({
  selector: 'app-recruitment-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    SelectModule,
    ToastModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './recruitment-request-form.html',
  styleUrl: './recruitment-request-form.scss',
  providers: [MessageService],
})
export class RecruitmentRequestForm implements OnInit {
  private fb = inject(FormBuilder);
  private recruitmentApi = inject(RecruitmentApiService);
  private projectsApi = inject(ProjectsApiService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form!: FormGroup;
  isEdit = signal(false);
  requestId = signal<string | null>(null);
  loading = signal(false);
  submitting = signal(false);

  projects = signal<ProjectOption[]>([]);
  requestNumber = signal('RE-2024-XXX'); // Placeholder
  today = new Date();

  selectedProjectId = signal<string | null>(null);

  ppeOptions = [
    { label: 'Casco de Seguridad (Tipo II)', value: 'Casco' },
    { label: 'Botas con Punta de Acero', value: 'Botas' },
    { label: 'Chaleco Reflectante de Alta Visibilidad', value: 'Chaleco' },
    { label: 'Protección Auditiva (Orejeras)', value: 'Proteccion Auditiva' },
    { label: 'Guantes de Seguridad', value: 'Guantes' },
    { label: 'Lentes de Seguridad', value: 'Lentes' },
  ];

  // Secciones para la navegación interna
  activeSection = signal('general');

  // El formulario sólo se habilita si hay un proyecto seleccionado
  projectSelected = computed(() => !!this.selectedProjectId());

  ngOnInit() {
    this.initForm();
    this.loadProjects();
    this.checkRoute();
  }

  private initForm() {
    this.form = this.fb.group({
      projectId: [null, Validators.required],
      requestDate: [new Date(), Validators.required],
      supervisorName: ['', Validators.required],
      jobTitle: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      startDate: [null, Validators.required],
      proposedSalary: [0, [Validators.min(0)]],
      workLocation: [''],
      businessJustification: [''],
      ppeRequirements: [[]],
      ipercLinks: [''],
      status: [RecruitmentRequestStatus.PENDING],
    });

    // Sincronizar el signal con el valor del form para que projectSelected sea reactivo
    this.form.get('projectId')?.valueChanges.subscribe(val => {
      this.selectedProjectId.set(val || null);
    });
  }

  private loadProjects() {
    this.projectsApi.getOptions().subscribe({
      next: (data) => this.projects.set(data),
      error: () => this.toastError('Error al cargar proyectos'),
    });
  }

  private checkRoute() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEdit.set(true);
        this.requestId.set(id);
        this.loadRequest(id);
      }
    });
  }

  private loadRequest(id: string) {
    this.loading.set(true);
    this.recruitmentApi.get(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          ...data,
          requestDate: new Date(data.requestDate),
          startDate: data.startDate ? new Date(data.startDate) : null,
        });
        if (data.requestNumber) this.requestNumber.set(data.requestNumber);
        this.loading.set(false);
      },
      error: () => {
        this.toastError('Error al cargar la solicitud');
        this.loading.set(false);
      },
    });
  }

  saveDraft() {
    this.toastSuccess('Borrador guardado localmente');
  }

  onSubmit() {
    if (this.form.invalid) {
      this.toastError('Por favor complete todos los campos requeridos');
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const data = this.form.value;

    if (this.isEdit() && this.requestId()) {
      this.recruitmentApi.update(this.requestId()!, data).subscribe({
        next: () => {
          this.toastSuccess('Solicitud actualizada con éxito');
          this.router.navigate(['/recruitment']);
        },
        error: (err) => {
          this.toastError(err?.error?.message || 'Error al actualizar');
          this.submitting.set(false);
        },
      });
    } else {
      this.recruitmentApi.create(data).subscribe({
        next: () => {
          this.toastSuccess('Solicitud enviada con éxito');
          this.router.navigate(['/recruitment']);
        },
        error: (err) => {
          this.toastError(err?.error?.message || 'Error al enviar');
          this.submitting.set(false);
        },
      });
    }
  }

  scrollToSection(sectionId: string) {
    this.activeSection.set(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private toastSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Éxito', detail: message });
  }

  private toastError(message: string) {
    this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
  }

  goBack() {
    this.router.navigate(['/hub/rrhh']);
  }
}
