import { ChangeDetectionStrategy, Component, inject, signal, effect, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MessageService } from 'primeng/api';
import { EngineeringApiService } from '../../shared/services/engineering-api.service';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { Engineering, DocumentCategory } from '../../shared/interfaces/engineering.interface';
import { Project } from '../../shared/interfaces/project.interface';

interface EngineeringWithProject extends Engineering {
  project?: Project;
}

interface FileWithCategory {
  file: File;
  categoryId?: string;
  newCategoryName?: string;
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
    AutoCompleteModule,
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
  projects = signal<{ label: string; value: string }[]>([]);
  categories = signal<DocumentCategory[]>([]);
  filteredCategories = signal<DocumentCategory[]>([]);
  query = signal('');
  showDialog = signal(false);
  showDetailsDialog = signal(false);
  editing = signal<EngineeringWithProject | null>(null);
  viewingEngineering = signal<EngineeringWithProject | null>(null);
  loading = signal(false);
  uploading = signal(false);

  // Archivos seleccionados con su categoría
  selectedFiles = signal<FileWithCategory[]>([]);

  // Para el selector de categoría al agregar archivos
  selectedCategory = signal<DocumentCategory | null>(null);
  newCategoryName = signal('');
  creatingCategory = signal(false);

  // Para editar/eliminar categorías
  showCategoryDialog = signal(false);
  editingCategory = signal<DocumentCategory | null>(null);
  editCategoryName = signal('');
  savingCategory = signal(false);
  deletingCategory = signal(false);

  // Referencia al componente de file upload para poder limpiarlo
  @ViewChild('fileUploader') fileUploader?: FileUpload;

  engineeringForm = this.fb.group({
    projectId: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.showDialog()) {
        this.editing.set(null);
        this.engineeringForm.reset();
        this.clearAllFiles();
        this.selectedCategory.set(null);
        this.newCategoryName.set('');
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
    this.loadCategories();
  }

  load() {
    this.loading.set(true);
    this.engineeringApi.getAllWithDocuments().subscribe({
      next: (engineeringProjects) => {
        const items: EngineeringWithProject[] = engineeringProjects.map((eng) => ({
          ...eng,
          project:
            typeof eng.projectId === 'object' ? (eng.projectId as unknown as Project) : undefined,
        }));
        this.items.set(items);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading engineering projects:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los proyectos de ingeniería',
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

  loadCategories() {
    this.engineeringApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.filteredCategories.set(categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      },
    });
  }

  filterCategories(event: { query: string }) {
    const query = event.query.toLowerCase();
    const filtered = this.categories().filter((cat) => cat.name.toLowerCase().includes(query));
    this.filteredCategories.set(filtered);
  }

  // Crear nueva categoría en el backend
  async createCategory() {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Ingrese un nombre para la categoría',
      });
      return;
    }

    // Verificar si ya existe
    const exists = this.categories().find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      this.messageService.add({
        severity: 'info',
        summary: 'Categoría existente',
        detail: 'Esta categoría ya existe, se ha seleccionado automáticamente',
      });
      this.selectedCategory.set(exists);
      this.newCategoryName.set('');
      return;
    }

    this.creatingCategory.set(true);
    try {
      const newCategory = await firstValueFrom(this.engineeringApi.createCategory({ name }));

      // Agregar a la lista y seleccionar
      this.categories.update((cats) => [...cats, newCategory]);
      this.selectedCategory.set(newCategory);
      this.newCategoryName.set('');

      this.messageService.add({
        severity: 'success',
        summary: 'Categoría creada',
        detail: `"${name}" está lista para usar`,
        life: 2000,
      });
    } catch (error) {
      console.error('Error creating category:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.getErrorMessage(error),
      });
    } finally {
      this.creatingCategory.set(false);
    }
  }

  // Abrir diálogo para editar categoría
  openEditCategoryDialog(category: DocumentCategory) {
    this.editingCategory.set(category);
    this.editCategoryName.set(category.name);
    this.showCategoryDialog.set(true);
  }

  // Guardar cambios de categoría
  async saveCategory() {
    const category = this.editingCategory();
    const newName = this.editCategoryName().trim();

    if (!category || !newName) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Ingrese un nombre para la categoría',
      });
      return;
    }

    // Verificar si ya existe otra con el mismo nombre
    const exists = this.categories().find(
      (c) => c._id !== category._id && c.name.toLowerCase() === newName.toLowerCase()
    );
    if (exists) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nombre duplicado',
        detail: 'Ya existe otra categoría con ese nombre',
      });
      return;
    }

    this.savingCategory.set(true);
    try {
      const updated = await firstValueFrom(
        this.engineeringApi.updateCategory(category._id, { name: newName })
      );

      // Actualizar en la lista de categorías
      this.categories.update((cats) => cats.map((c) => (c._id === updated._id ? updated : c)));

      // Si estaba seleccionada, actualizar también
      if (this.selectedCategory()?._id === updated._id) {
        this.selectedCategory.set(updated);
      }

      // Actualizar también en los items de la tabla (documentsByCategory)
      this.items.update((items) =>
        items.map((item) => ({
          ...item,
          documentsByCategory: item.documentsByCategory?.map((group) =>
            group.category._id === updated._id
              ? { ...group, category: { ...group.category, name: updated.name } }
              : group
          ),
        }))
      );
      this.applyFilters();

      this.showCategoryDialog.set(false);
      this.editingCategory.set(null);
      this.editCategoryName.set('');

      this.messageService.add({
        severity: 'success',
        summary: 'Categoría actualizada',
        detail: `"${newName}" guardada correctamente`,
        life: 2000,
      });
    } catch (error) {
      console.error('Error updating category:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.getErrorMessage(error),
      });
    } finally {
      this.savingCategory.set(false);
    }
  }

  // Eliminar categoría
  async deleteCategory(category: DocumentCategory) {
    this.deletingCategory.set(true);
    try {
      await firstValueFrom(this.engineeringApi.deleteCategory(category._id));

      // Quitar de la lista de categorías
      this.categories.update((cats) => cats.filter((c) => c._id !== category._id));

      // Si estaba seleccionada, deseleccionar
      if (this.selectedCategory()?._id === category._id) {
        this.selectedCategory.set(null);
      }

      // Actualizar también en los items de la tabla (quitar grupos de esa categoría)
      this.items.update((items) =>
        items.map((item) => ({
          ...item,
          documentsByCategory: item.documentsByCategory?.filter(
            (group) => group.category._id !== category._id
          ),
        }))
      );
      this.applyFilters();

      this.showCategoryDialog.set(false);
      this.editingCategory.set(null);

      this.messageService.add({
        severity: 'success',
        summary: 'Categoría eliminada',
        detail: `"${category.name}" eliminada correctamente`,
        life: 2000,
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: this.getErrorMessage(error),
      });
    } finally {
      this.deletingCategory.set(false);
    }
  }

  // Cerrar diálogo de categoría
  closeCategoryDialog() {
    this.showCategoryDialog.set(false);
    this.editingCategory.set(null);
    this.editCategoryName.set('');
  }

  applyFilters() {
    const q = this.query().toLowerCase();
    const filtered = this.items().filter((item) => {
      const projectName =
        typeof item.projectId === 'object' ? item.projectId.name : item.project?.name || '';
      const projectCode =
        typeof item.projectId === 'object' ? item.projectId.code : item.project?.code || '';
      // Buscar también en nombres de categorías
      const categoryNames =
        item.documentsByCategory?.map((g) => g.category.name.toLowerCase()).join(' ') || '';
      return (
        projectName.toLowerCase().includes(q) ||
        projectCode.toLowerCase().includes(q) ||
        categoryNames.includes(q)
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
    });
    this.clearAllFiles();
    this.showDialog.set(true);
  }

  editItem(item: EngineeringWithProject) {
    const projectId = typeof item.projectId === 'object' ? item.projectId._id : item.projectId;
    this.editing.set(item);
    this.engineeringForm.patchValue({
      projectId: projectId || '',
    });
    this.clearAllFiles();
    this.newCategoryName.set('');

    // Pre-seleccionar la primera categoría que tenga documentos en el proyecto
    const firstCategoryWithDocs = item.documentsByCategory?.[0]?.category;
    if (firstCategoryWithDocs) {
      // Buscar la categoría completa en la lista de categorías disponibles
      const fullCategory = this.categories().find(c => c._id === firstCategoryWithDocs._id);
      this.selectedCategory.set(fullCategory || firstCategoryWithDocs);
    } else {
      this.selectedCategory.set(null);
    }

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
      // Primero crear o actualizar el registro de ingeniería
      const editing = this.editing();
      const payload: Partial<Engineering> = {
        projectId,
        type: 'Mixto', // Tipo por defecto, ya que ahora se organizan por categorías de documentos
      };

      // Crear o actualizar el registro básico
      if (editing?._id) {
        await firstValueFrom(this.engineeringApi.update(projectId, payload));
      } else {
        await firstValueFrom(this.engineeringApi.create(payload));
      }

      // Subir los archivos con sus categorías
      const uploadPromises: Promise<void>[] = [];

      for (const fileWithCategory of this.selectedFiles()) {
        uploadPromises.push(
          firstValueFrom(
            this.engineeringApi.uploadDocument(
              projectId,
              fileWithCategory.file,
              fileWithCategory.categoryId,
              undefined
            )
          ).then(() => undefined)
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
      this.loadCategories(); // Recargar categorías por si se crearon nuevas
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

  // Handler para selección de archivos con categoría
  onFilesSelect(event: { files: File[] | FileList; currentFiles?: File[] }) {
    // PrimeNG pasa los archivos recién seleccionados en event.files
    // event.currentFiles incluye todos los archivos acumulados, lo cual causa duplicados
    const filesArray: File[] = Array.isArray(event.files)
      ? event.files
      : Array.from(event.files);

    if (filesArray && filesArray.length > 0) {
      const category = this.selectedCategory();

      if (!category) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atención',
          detail: 'Debe seleccionar o crear una categoría antes de agregar archivos',
        });
        return;
      }

      // Filtrar archivos que ya existen para evitar duplicados
      const existingFiles = this.selectedFiles();
      const uniqueNewFiles = filesArray.filter(
        (newFile) =>
          !existingFiles.some(
            (existing) =>
              existing.file.name === newFile.name &&
              existing.file.size === newFile.size &&
              existing.categoryId === category._id
          )
      );

      if (uniqueNewFiles.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'Información',
          detail: 'Los archivos seleccionados ya están en la lista',
          life: 2000,
        });
        return;
      }

      const newFiles: FileWithCategory[] = uniqueNewFiles.map((file) => ({
        file,
        categoryId: category._id,
      }));

      this.selectedFiles.update((files) => [...files, ...newFiles]);

      this.messageService.add({
        severity: 'success',
        summary: 'Archivos agregados',
        detail: `${uniqueNewFiles.length} archivo(s) en "${category.name}"`,
        life: 2000,
      });

      // Limpiar el componente de file upload después de agregar los archivos
      // para evitar acumulación interna de PrimeNG
      if (this.fileUploader) {
        this.fileUploader.clear();
      }
    }
  }

  // Método para eliminar un archivo de la lista de seleccionados
  removeSelectedFile(index: number) {
    this.selectedFiles.update((files) => files.filter((_, i) => i !== index));
  }

  // Método para eliminar un documento existente del servidor (nuevo sistema con ID)
  async deleteDocumentById(documentId: string) {
    const viewing = this.viewingEngineering();
    if (!viewing) return;

    const projectId =
      typeof viewing.projectId === 'object' ? viewing.projectId._id : viewing.projectId;
    if (!projectId) return;

    try {
      await firstValueFrom(this.engineeringApi.deleteDocument(projectId, documentId));
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Documento eliminado correctamente',
      });
      // Recargar los datos
      this.load();
      // Si estamos viendo detalles, recargar también
      if (this.showDetailsDialog()) {
        const updated = await firstValueFrom(this.engineeringApi.getByProjectFull(projectId));
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

  // DEPRECATED: Método legacy para eliminar documentos por URL
  async deleteDocument(url: string) {
    const viewing = this.viewingEngineering();
    if (!viewing) return;

    const projectId =
      typeof viewing.projectId === 'object' ? viewing.projectId._id : viewing.projectId;
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
        const updated = await firstValueFrom(this.engineeringApi.getByProjectFull(projectId));
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
    this.selectedFiles.set([]);
    this.selectedCategory.set(null);
    this.newCategoryName.set('');
    // Limpiar el componente de file upload de PrimeNG
    if (this.fileUploader) {
      this.fileUploader.clear();
    }
  }

  getCategoryName(fileWithCategory: FileWithCategory): string {
    if (fileWithCategory.categoryId) {
      const category = this.categories().find((c) => c._id === fileWithCategory.categoryId);
      return category?.name || 'Sin categoría';
    }
    return 'Sin categoría';
  }

  getCategoryColor(categoryId: string): string {
    const category = this.categories().find((c) => c._id === categoryId);
    return category?.color || '#3B82F6';
  }

  // Agrupa los archivos seleccionados por categoría para mostrarlos
  getSelectedFilesByCategory(): { categoryName: string; files: FileWithCategory[] }[] {
    const grouped: Record<string, { categoryName: string; files: FileWithCategory[] }> = {};

    for (const fileWithCat of this.selectedFiles()) {
      const key = fileWithCat.categoryId || fileWithCat.newCategoryName || 'sin-categoria';
      if (!grouped[key]) {
        grouped[key] = {
          categoryName: this.getCategoryName(fileWithCat),
          files: [],
        };
      }
      grouped[key].files.push(fileWithCat);
    }

    return Object.values(grouped);
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

  onFileUploadError(event: { error?: { message?: string } }) {
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
