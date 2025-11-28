# Guía de Uso de Permisos de Edición

Este documento explica cómo usar el sistema de permisos de edición en los componentes del frontend.

## Tipos de Permisos

El sistema soporta dos tipos de permisos:
- **`view`**: Solo lectura - El usuario puede ver el contenido pero no puede crear, editar o eliminar
- **`edit`**: Edición completa - El usuario tiene acceso completo a todas las funcionalidades

## Uso Básico

### 1. Inyectar el MenuService

```typescript
import { MenuService } from '../../shared/services/menu.service';

export class MyComponent {
  private readonly menuService = inject(MenuService);
  
  // Computed para verificar si tiene permiso de edición
  protected readonly canEdit = computed(() => 
    this.menuService.canEdit('/clients')
  );
}
```

### 2. Ocultar/Mostrar Botones en el Template

```html
<!-- Botón de crear -->
<button
  pButton
  label="Nuevo Cliente"
  icon="pi pi-plus"
  *ngIf="canEdit()"
  (click)="newItem()"
></button>

<!-- Botones de editar y eliminar en tabla -->
<button
  pButton
  icon="pi pi-pencil"
  class="p-button-text p-button-sm"
  *ngIf="canEdit()"
  (click)="editItem(row)"
></button>

<button
  pButton
  icon="pi pi-trash"
  class="p-button-text p-button-sm p-button-danger"
  *ngIf="canEdit()"
  (click)="remove(row)"
></button>
```

### 3. Ejemplo Completo en un Componente

```typescript
import { Component, inject, computed, signal } from '@angular/core';
import { MenuService } from '../../shared/services/menu.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.html',
})
export class ClientsPage {
  private readonly menuService = inject(MenuService);
  
  // Verificar permiso de edición para la ruta actual
  protected readonly canEdit = computed(() => 
    this.menuService.canEdit('/clients')
  );
  
  // Obtener el tipo de permiso
  protected readonly permissionType = computed(() => 
    this.menuService.getPermissionType('/clients')
  );
  
  newItem() {
    if (!this.canEdit()) {
      console.warn('No tiene permiso de edición');
      return;
    }
    // Lógica para crear nuevo item
  }
  
  editItem(item: any) {
    if (!this.canEdit()) {
      console.warn('No tiene permiso de edición');
      return;
    }
    // Lógica para editar item
  }
  
  remove(item: any) {
    if (!this.canEdit()) {
      console.warn('No tiene permiso de edición');
      return;
    }
    // Lógica para eliminar item
  }
}
```

### 4. Ejemplo en Template HTML

```html
<div class="p-4 space-y-4">
  <!-- Header con botón de crear -->
  <div class="flex justify-between items-center">
    <h1>Gestión de Clientes</h1>
    <button
      pButton
      label="Nuevo Cliente"
      icon="pi pi-plus"
      *ngIf="canEdit()"
      (click)="newItem()"
    ></button>
  </div>

  <!-- Tabla con acciones -->
  <p-table [value]="items()">
    <ng-template pTemplate="body" let-row>
      <tr>
        <td>{{ row.name }}</td>
        <td>
          <div class="flex gap-2">
            <!-- Botón de ver (siempre visible) -->
            <button
              pButton
              icon="pi pi-eye"
              class="p-button-text p-button-sm"
              (click)="viewDetails(row)"
            ></button>
            
            <!-- Botones de editar y eliminar (solo si tiene permiso) -->
            <button
              pButton
              icon="pi pi-pencil"
              class="p-button-text p-button-sm"
              *ngIf="canEdit()"
              (click)="editItem(row)"
            ></button>
            
            <button
              pButton
              icon="pi pi-trash"
              class="p-button-text p-button-sm p-button-danger"
              *ngIf="canEdit()"
              (click)="remove(row)"
            ></button>
          </div>
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>
```

## Métodos Disponibles en MenuService

### `canEdit(route: string): boolean`
Verifica si el usuario tiene permiso de edición para una ruta específica.

```typescript
const canEdit = this.menuService.canEdit('/clients');
if (canEdit) {
  // Mostrar botones de crear/editar/eliminar
}
```

### `canAccess(route: string): boolean`
Verifica si el usuario tiene acceso (lectura o edición) a una ruta.

```typescript
const canAccess = this.menuService.canAccess('/clients');
if (canAccess) {
  // Mostrar contenido
}
```

### `getPermissionType(route: string): 'view' | 'edit' | null`
Obtiene el tipo de permiso específico para una ruta.

```typescript
const permissionType = this.menuService.getPermissionType('/clients');
if (permissionType === 'edit') {
  // Tiene permiso de edición
} else if (permissionType === 'view') {
  // Solo tiene permiso de lectura
}
```

## Notas Importantes

1. **Rol Gerencia**: Los usuarios con rol `gerencia` siempre tienen permiso de edición en todas las rutas.

2. **Dashboard**: El dashboard siempre tiene permiso de edición sin restricciones.

3. **Rutas sin permiso**: Si un usuario no tiene permiso para una ruta, el guard `MenuPermissionGuard` lo redirigirá automáticamente.

4. **Actualización de permisos**: Los permisos se cargan al inicializar el servicio. Si se actualizan los permisos, llama a `menuService.refreshPermissions()`.

## Ejemplo de Migración

### Antes (sin permisos de edición):
```html
<button pButton label="Nuevo" (click)="newItem()"></button>
<button pButton icon="pi pi-pencil" (click)="editItem(row)"></button>
<button pButton icon="pi pi-trash" (click)="remove(row)"></button>
```

### Después (con permisos de edición):
```html
<button 
  pButton 
  label="Nuevo" 
  *ngIf="canEdit()"
  (click)="newItem()"
></button>
<button 
  pButton 
  icon="pi pi-pencil" 
  *ngIf="canEdit()"
  (click)="editItem(row)"
></button>
<button 
  pButton 
  icon="pi pi-trash" 
  *ngIf="canEdit()"
  (click)="remove(row)"
></button>
```

## Verificación en el Backend

El backend también verifica permisos de edición. Puedes usar el endpoint:

```
GET /menu-permissions/check-edit/:userId/:route
```

Retorna:
```json
{
  "hasEditPermission": true,
  "userId": "...",
  "route": "/clients"
}
```

