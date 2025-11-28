import { ChangeDetectionStrategy, Component, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EngineeringApiService } from '../../shared/services/engineering-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { Engineering, EngineeringType } from '../../shared/interfaces/engineering.interface';
import { Project } from '../../shared/interfaces/project.interface';

interface EngineeringWithProject extends Engineering {
  project?: Project;
}

@Component({
  selector: 'app-engineering',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    DialogModule,
    SelectModule,
    FileUploadModule,
    TooltipModule,
    ToastModule,
  ],
  templateUrl: './engineering.html',
  styleUrl: './engineering.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class EngineeringPage implements OnInit {
  private readonly engineeringApi = inject(EngineeringApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  items = signal<EngineeringWithProject[]>([]);
  filteredItems = signal<EngineeringWithProject[]>([]);
  projects = signal<Array<{ label: string; value: string }>>([]);
  query = signal('');
  showDialog = signal(false);
  showDetailsDialog = signal(false);
  editing = signal<EngineeringWithProject | null>(null);
  viewingEngineering = signal<EngineeringWithProject | null>(null);
  loading = signal(false);
  uploading = signal(false);

  // Archivos seleccionados para cada tipo de documento (arrays para permitir múltiples)
  structuralCalculationsFiles = signal<File[]>([]);
  scheduleFiles = signal<File[]>([]);
  fabricationPlansFiles = signal<File[]>([]);
  assemblyPlansFiles = signal<File[]>([]);
  billOfMaterialsFiles = signal<File[]>([]);
  otherDocumentsFiles = signal<File[]>([]);

  typeOptions: Array<{ label: string; value: EngineeringType }> = [
    { label: 'Mantenimiento', value: 'Mantenimiento' },
    { label: 'Fabricación', value: 'Fabricación' },
    { label: 'Montaje', value: 'Montaje' },
    { label: 'Mixto', value: 'Mixto' },
  ];

  engineeringForm = this.fb.group({
    projectId: ['', Validators.required],
    type: ['Mantenimiento' as EngineeringType, Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.engineeringForm.reset();
        this.clearAllFiles();
      }
    });

    effect(() => {
      if (!this.showDetailsDialog()) {
        this.viewingEngineering.set(null);
      }
    });
  }

  ngOnInit() {
    this.load();
    this.loadProjects();
  }

  load() {
    this.loading.set(true);
    this.projectsApi.list().subscribe({
      next: (projects) => {
        const items: EngineeringWithProject[] = [];

        // Para cada proyecto, intentar cargar su información de ingeniería
        const loadPromises = projects
          .filter((p) => p._id)
          .map((project) => {
            return new Promise<void>((resolve) => {
              this.engineeringApi.getByProject(project._id!).subscribe({
                next: (engineering) => {
                  items.push({
                    ...engineering,
                    project,
                    projectId: project._id!,
                  });
                  resolve();
                },
                error: () => {
                  // Si no existe ingeniería, no agregar a la lista
                  resolve();
                },
              });
            });
          });

        Promise.all(loadPromises).then(() => {
          this.items.set(items);
          this.applyFilters();
          this.loading.set(false);
        });
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos',
        });
        this.loading.set(false);
      },
    });
  }

  loadProjects() {
    this.projectsApi.list().subscribe({
      next: (projects) => {
        this.projects.set(
          projects.map((p) => ({
            label: `${p.code} - ${p.name}`,
            value: p._id || '',
          }))
        );
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      },
    });
  }

  applyFilters() {
    const q = this.query().toLowerCase();
    const filtered = this.items().filter((item) => {
      const projectName = typeof item.projectId === 'object' ? item.projectId.name : item.project?.name || '';
      const projectCode = typeof item.projectId === 'object' ? item.projectId.code : item.project?.code || '';
      return (
        projectName.toLowerCase().includes(q) ||
        projectCode.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
    this.filteredItems.set(filtered);
  }

  newItem() {
    this.editing.set({
      projectId: '',
      type: 'Mantenimiento',
    });
    this.engineeringForm.reset({
      projectId: '',
      type: 'Mantenimiento',
    });
    this.clearAllFiles();
    this.showDialog.set(true);
  }

  editItem(item: EngineeringWithProject) {
    const projectId = typeof item.projectId === 'object' ? item.projectId._id : item.projectId;
    this.editing.set(item);
    this.engineeringForm.patchValue({
      projectId: projectId || '',
      type: item.type || 'Mantenimiento',
    });
    this.clearAllFiles();
    this.showDialog.set(true);
  }

  async save() {
    if (this.engineeringForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    const formValue = this.engineeringForm.value;
    const projectId = formValue.projectId || '';

    if (!projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar un proyecto',
      });
      return;
    }

    this.uploading.set(true);

    try {
      // Primero crear o actualizar el registro de ingeniería (clasificación)
      const editing = this.editing();
      const payload: Partial<Engineering> = {
        projectId,
        type: formValue.type as EngineeringType,
      };

      // Crear o actualizar el registro básico
      if (editing?._id) {
        await firstValueFrom(this.engineeringApi.update(projectId, payload));
      } else {
        await firstValueFrom(this.engineeringApi.create(payload));
      }

      // Luego subir los archivos usando el endpoint correcto
      const uploadPromises: Promise<void>[] = [];

      // Subir archivos de cálculos estructurales
      for (const file of this.structuralCalculationsFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'structural')).then(() => {})
        );
      }

      // Subir archivos de cronograma
      for (const file of this.scheduleFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'schedule')).then(() => {})
        );
      }

      // Subir archivos de planos de fabricación
      for (const file of this.fabricationPlansFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'fabrication')).then(() => {})
        );
      }

      // Subir archivos de planos de montaje
      for (const file of this.assemblyPlansFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'assembly')).then(() => {})
        );
      }

      // Subir archivos de lista de materiales
      for (const file of this.billOfMaterialsFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'bom')).then(() => {})
        );
      }

      // Subir otros documentos
      for (const file of this.otherDocumentsFiles()) {
        uploadPromises.push(
          firstValueFrom(this.engineeringApi.uploadFile(projectId, file, 'other')).then(() => {})
        );
      }

      // Esperar a que se suban todos los archivos
      await Promise.all(uploadPromises);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Información de ingeniería guardada correctamente',
      });
      this.load();
      this.closeDialog();
    } catch (error) {
      console.error('Error saving engineering:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.getErrorMessage(error),
      });
    } finally {
      this.uploading.set(false);
    }
  }

  // Handlers para file upload - ahora manejan arrays
  onStructuralCalculationsSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.structuralCalculationsFiles.update((files) => [...files, ...event.files]);
    }
  }

  onScheduleSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.scheduleFiles.update((files) => [...files, ...event.files]);
    }
  }

  onFabricationPlansSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.fabricationPlansFiles.update((files) => [...files, ...event.files]);
    }
  }

  onAssemblyPlansSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.assemblyPlansFiles.update((files) => [...files, ...event.files]);
    }
  }

  onBillOfMaterialsSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.billOfMaterialsFiles.update((files) => [...files, ...event.files]);
    }
  }

  onOtherDocumentsSelect(event: { files: File[] }) {
    if (event.files && event.files.length > 0) {
      this.otherDocumentsFiles.update((files) => [...files, ...event.files]);
    }
  }

  // Métodos para eliminar archivos seleccionados
  removeStructuralCalculationFile(index: number) {
    this.structuralCalculationsFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeScheduleFile(index: number) {
    this.scheduleFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeFabricationPlanFile(index: number) {
    this.fabricationPlansFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeAssemblyPlanFile(index: number) {
    this.assemblyPlansFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeBillOfMaterialFile(index: number) {
    this.billOfMaterialsFiles.update((files) => files.filter((_, i) => i !== index));
  }

  removeOtherDocumentFile(index: number) {
    this.otherDocumentsFiles.update((files) => files.filter((_, i) => i !== index));
  }

  // Método para eliminar un documento existente del servidor
  async deleteDocument(url: string) {
    const viewing = this.viewingEngineering();
    if (!viewing) return;

    const projectId = typeof viewing.projectId === 'object' ? viewing.projectId._id : viewing.projectId;
    if (!projectId) return;

    try {
      await firstValueFrom(this.engineeringApi.deleteFile(projectId, url));
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Documento eliminado correctamente',
      });
      // Recargar los datos
      this.load();
      // Si estamos viendo detalles, recargar también
      if (this.showDetailsDialog()) {
        const updated = await firstValueFrom(this.engineeringApi.getByProject(projectId));
        this.viewingEngineering.set({ ...updated, project: viewing.project });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al eliminar el documento',
      });
    }
  }

  clearAllFiles() {
    this.structuralCalculationsFiles.set([]);
    this.scheduleFiles.set([]);
    this.fabricationPlansFiles.set([]);
    this.assemblyPlansFiles.set([]);
    this.billOfMaterialsFiles.set([]);
    this.otherDocumentsFiles.set([]);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  viewDetails(item: EngineeringWithProject) {
    this.viewingEngineering.set(item);
    this.showDetailsDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  closeDetails() {
    this.showDetailsDialog.set(false);
  }

  getProjectName(item: EngineeringWithProject): string {
    if (typeof item.projectId === 'object') {
      return item.projectId.name;
    }
    return item.project?.name || 'N/A';
  }

  getProjectCode(item: EngineeringWithProject): string {
    if (typeof item.projectId === 'object') {
      return item.projectId.code;
    }
    return item.project?.code || 'N/A';
  }

  getTypeLabel(type: EngineeringType): string {
    return this.typeOptions.find((opt) => opt.value === type)?.label || type;
  }

  downloadDocument(url: string) {
    window.open(url, '_blank');
  }

  getDocumentName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || url;
    } catch {
      return url.split('/').pop() || url;
    }
  }

  getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const err = error.error as { message?: string; error?: string };
      return err.message || err.error || 'Error desconocido';
    }
    return 'Error desconocido';
  }

  onFileUploadError(event: any) {
    console.error('File upload error:', event);
    // Si el error es sobre tipo de archivo, intentar procesar de todas formas
    if (event.error && event.error.message && event.error.message.includes('Invalid file type')) {
      // Ignorar el error de tipo de archivo ya que aceptamos cualquier tipo
      // Los archivos se procesarán en onSelect
      return;
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Error al seleccionar archivo',
      detail: event.error?.message || 'Error desconocido al seleccionar el archivo',
    });
  }
}
