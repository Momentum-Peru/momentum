# Componente de Gestión de Permisos de Menú

Este componente permite gestionar los permisos de acceso a diferentes secciones del sistema basado en rutas de menú.

## Características

- ✅ **Gestión Completa**: Crear, leer, actualizar y eliminar permisos
- ✅ **Asignación Masiva**: Asignar múltiples permisos a un usuario de una vez
- ✅ **Filtros Avanzados**: Filtrar por usuario, estado y búsqueda de texto
- ✅ **Estadísticas**: Vista general de permisos activos e inactivos
- ✅ **Validación**: Validación completa de formularios
- ✅ **Responsive**: Diseño adaptativo para móviles y desktop
- ✅ **PrimeNG 20**: Componentes UI modernos y accesibles
- ✅ **Tailwind CSS**: Estilos consistentes y mantenibles

## Estructura del Componente

```
menu-permissions/
├── menu-permissions.ts          # Lógica del componente
├── menu-permissions.html        # Template HTML
├── menu-permissions.scss        # Estilos específicos
└── README.md                    # Este archivo
```

## Servicios Relacionados

- `MenuPermissionsApiService`: Comunicación con la API del backend
- `UsersApiService`: Gestión de usuarios para el selector
- `MenuService`: Servicio para generar menús dinámicos
- `AuthService`: Autenticación y gestión de usuarios

## Uso del Componente

### 1. Acceso a la Página

La página está disponible en la ruta `/menu-permissions` y está protegida por el guard de permisos:

```typescript
{
  path: 'menu-permissions',
  loadComponent: () => import('./pages/menu-permissions/menu-permissions').then((m) => m.MenuPermissionsPage),
  canActivate: [MenuPermissionGuard],
  data: { menuPermission: '/menu-permissions' }
}
```

### 2. Funcionalidades Principales

#### Gestión Individual de Permisos
- **Crear**: Nuevo permiso para un usuario específico
- **Editar**: Modificar permisos existentes
- **Eliminar**: Remover permisos individuales
- **Filtrar**: Buscar por usuario, ruta o descripción

#### Asignación Masiva
- **Seleccionar Usuario**: Elegir el usuario objetivo
- **Agregar Permisos**: Múltiples permisos en una sola operación
- **Validación**: Verificación automática de datos

#### Estadísticas
- **Total de Permisos**: Contador general
- **Permisos Activos**: Permisos habilitados
- **Permisos Inactivos**: Permisos deshabilitados

### 3. Campos del Formulario

#### Campos Requeridos
- **Usuario**: Selección de usuario del sistema
- **Ruta**: Ruta del menú (predefinidas disponibles)
- **Nombre del Menú**: Nombre para mostrar
- **Descripción**: Descripción del permiso

#### Campos Opcionales
- **Icono**: Icono de PrimeNG (ej: `pi pi-home`)
- **Orden**: Orden de visualización (numérico)
- **Estado**: Activo/Inactivo

### 4. Rutas Predefinidas

El sistema incluye rutas predefinidas comunes:

```typescript
const predefinedRoutes = [
  { route: '/dashboard', name: 'Dashboard', icon: 'pi pi-chart-line' },
  { route: '/projects', name: 'Proyectos', icon: 'pi pi-folder' },
  { route: '/clients', name: 'Clientes', icon: 'pi pi-users' },
  { route: '/quotes', name: 'Cotizaciones', icon: 'pi pi-file' },
  { route: '/orders', name: 'Órdenes', icon: 'pi pi-shopping-cart' },
  { route: '/requirements', name: 'Requerimientos', icon: 'pi pi-list' },
  { route: '/tasks', name: 'Tareas', icon: 'pi pi-check-circle' },
  { route: '/tdrs', name: 'TDRs', icon: 'pi pi-book' },
  { route: '/users', name: 'Usuarios', icon: 'pi pi-user' },
  { route: '/daily-reports', name: 'Reportes Diarios', icon: 'pi pi-calendar' },
  { route: '/admin/settings', name: 'Configuración', icon: 'pi pi-cog' },
]
```

## Integración con el Sistema de Menú

### 1. Servicio de Menú

El `MenuService` genera automáticamente el menú basado en los permisos del usuario:

```typescript
// Inyectar el servicio
private readonly menuService = inject(MenuService)

// Obtener elementos del menú
const menuItems = this.menuService.getMenu()

// Verificar permisos
const canAccess = this.menuService.hasPermission('/dashboard')
```

### 2. Componente de Menú Dinámico

El `DynamicMenuComponent` muestra automáticamente las opciones disponibles:

```html
<app-dynamic-menu></app-dynamic-menu>
```

### 3. Guard de Permisos

Protege rutas específicas verificando permisos:

```typescript
{
  path: 'protected-route',
  component: SomeComponent,
  canActivate: [MenuPermissionGuard],
  data: { menuPermission: '/protected-route' }
}
```

## Validaciones

### Validaciones del Frontend
- Campos requeridos no pueden estar vacíos
- El orden debe ser un número positivo
- Las rutas deben ser únicas por usuario
- Validación de formato de iconos

### Validaciones del Backend
- Verificación de ObjectId válidos
- Validación de longitud de campos
- Verificación de unicidad de permisos
- Validación de tipos de datos

## Manejo de Errores

### Errores Comunes
- **400**: Datos de entrada inválidos
- **401**: No autenticado
- **403**: Sin permisos para acceder
- **404**: Recurso no encontrado
- **409**: Permiso duplicado

### Mensajes de Error
Los errores se muestran mediante toast notifications de PrimeNG con:
- Severidad (error, warning, info, success)
- Título descriptivo
- Detalle del error
- Traducción automática de mensajes comunes

## Estilos y Temas

### Tailwind CSS
- Clases utilitarias para espaciado, colores y layout
- Diseño responsive con breakpoints
- Estados hover y focus
- Transiciones suaves

### PrimeNG 20
- Componentes modernos y accesibles
- Temas consistentes
- Iconos de PrimeIcons
- Funcionalidades avanzadas (paginación, filtros, etc.)

## Responsive Design

### Desktop (≥768px)
- Tabla completa con todas las columnas
- Filtros en una fila horizontal
- Diálogos de tamaño completo

### Mobile (<768px)
- Tabla adaptativa con columnas esenciales
- Filtros apilados verticalmente
- Diálogos de ancho completo
- Menú móvil colapsable

## Mejores Prácticas

### 1. Principios SOLID
- **Responsabilidad Única**: Cada servicio tiene una función específica
- **Abierto/Cerrado**: Fácil extensión sin modificación
- **Sustitución de Liskov**: Interfaces bien definidas
- **Segregación de Interfaces**: Servicios especializados
- **Inversión de Dependencias**: Inyección de dependencias

### 2. Gestión de Estado
- Uso de signals para reactividad
- Computed properties para datos derivados
- Efectos para sincronización
- Estado inmutable

### 3. Performance
- Lazy loading de componentes
- Paginación en tablas grandes
- Debounce en búsquedas
- Caching de datos de usuario

### 4. Accesibilidad
- Etiquetas semánticas
- Navegación por teclado
- Contraste adecuado
- Screen reader friendly

## Troubleshooting

### Problemas Comunes

#### 1. "No tienes permiso para acceder a este menú"
- Verificar que el usuario tenga el permiso asignado
- Comprobar que el permiso esté activo
- Verificar la ruta exacta en el guard

#### 2. "Error al cargar los permisos de menú"
- Verificar conexión con el backend
- Comprobar autenticación del usuario
- Revisar logs del navegador

#### 3. "Ya existe un permiso para este usuario y ruta"
- Verificar permisos duplicados
- Usar edición en lugar de creación
- Revisar la lista de permisos existentes

### Debugging

#### 1. Logs del Navegador
```typescript
// Habilitar logs detallados
console.log('User permissions:', this.menuService.getUserPermissions())
console.log('Allowed routes:', this.menuService.getAllowedRoutes())
```

#### 2. Verificación de Estado
```typescript
// Verificar estado del usuario
const user = this.authService.getCurrentUser()
console.log('Current user:', user)

// Verificar permisos cargados
const permissions = this.menuService.getUserPermissions()
console.log('User permissions:', permissions)
```

## Contribución

Para agregar nuevas funcionalidades:

1. **Crear interfaces** en `shared/interfaces/`
2. **Actualizar servicios** con nuevos métodos
3. **Modificar el componente** con nuevas funcionalidades
4. **Actualizar validaciones** según sea necesario
5. **Agregar tests** para nuevas funcionalidades
6. **Actualizar documentación** en este README

## Changelog

### v1.0.0
- Implementación inicial del componente
- Gestión completa de permisos
- Asignación masiva
- Filtros y búsqueda
- Integración con sistema de menú
- Guard de permisos
- Página de "No autorizado"
