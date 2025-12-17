# DESCRIPCIÓN DETALLADA DEL MENÚ - PLATAFORMA TECMEING

## ÍNDICE
1. [Dashboard](#1-dashboard)
2. [Proyectos](#2-proyectos)
3. [Futuros Imposibles](#3-futuros-imposibles)
4. [Administración](#4-administración)
5. [Talento Humano](#5-talento-humano)
6. [CRM](#6-crm)
7. [Configuración](#7-configuración)

---

## 1. DASHBOARD

**Ruta:** `/dashboard`

### Funcionalidades Principales

#### KPIs (Indicadores Clave de Rendimiento)
- **Total Clientes**: Cantidad total de clientes registrados en el sistema
- **Total Proyectos**: Proyectos activos en el sistema
- **Total Cotizaciones**: Propuestas comerciales generadas
- **Total Órdenes**: Órdenes de servicio recibidas (conversión exitosa)
- **Total Usuarios**: Usuarios registrados en el sistema
- **Total Requerimientos**: Oportunidades de negocio ingresadas
- **Total Reportes Diarios**: Cantidad de reportes diarios registrados
- **Promedio de Reportes Diarios**: Promedio de reportes por período
- **Valor Total de Reportes Diarios**: Suma del valor monetario de los reportes

**Nota:** Los KPIs se filtran automáticamente según los permisos del usuario. El rol "gerencia" puede ver todos los KPIs.

#### Gráficos y Visualizaciones
- **Reportes Diarios**: Gráfico de reportes diarios por fecha
- **Proyectos por Estado**: Distribución de proyectos según su estado (Pie/Doughnut Chart)
- **Cotizaciones por Estado**: Ratio de éxito (Aprobadas vs Rechazadas/Pendientes)
- **Clientes por Proyecto**: Distribución de clientes según proyectos asociados
- **Cotizaciones por Proyecto**: Identifica qué proyectos generan más actividad comercial
- **Requerimientos por Proyecto**: Control del pipeline de entrada
- **Requerimientos por Estado**: Distribución de requerimientos según estado

#### Tablas Detalladas
- **Reportes Diarios**: Tabla con fecha, cantidad y valor de reportes
- **Reportes por Proyecto**: Tabla con proyecto, cantidad y valor de reportes
- **Clientes por Proyecto**: Tabla con distribución de clientes

#### Reportes de Horas (Solo Gerencia)
- **Detalles de Marcación**: Tabla con información detallada de cada marcación:
  - Usuario
  - Fecha y hora
  - Tipo (INGRESO/SALIDA)
  - Ubicación (con geocodificación inversa para mostrar dirección)
- **Marcación por Usuario**: Resumen de marcaciones agrupadas por usuario

#### Filtros Disponibles
- **Rango de Fechas**: Personalizado o periodos predefinidos (últimos 7, 30, 90 días)
- **Empresa/Tenant**: (Solo Gerencia) Para ver el desempeño de unidades de negocio específicas

#### Características Técnicas
- Filtrado automático por permisos de usuario
- Carga asíncrona de datos
- Geocodificación inversa para mostrar direcciones legibles de coordenadas GPS
- Visualización responsiva con gráficos interactivos

---

## 2. PROYECTOS

**Ruta base:** `/projects`

### Subitems del Menú

#### 2.1. RQ Requerimiento
**Ruta:** `/requirements`

**Funcionalidades:**
- **Gestión de Requerimientos**: CRUD completo de requerimientos de clientes
- **Campos principales:**
  - Código (generado automáticamente o manual)
  - Título
  - Descripción
  - Fecha de requerimiento
  - Fecha de aprobación (opcional)
  - Estado: VIGENTE, ANULADO, ACTIVACIÓN
  - Cliente asociado
  - Solicitante (nombre, código, cargo)
  - Aprobador (opcional: nombre, código, cargo)
- **Gestión de Documentos:**
  - Subida de múltiples archivos (drag & drop o selección)
  - Validación de tamaño máximo: 10MB por archivo
  - Visualización y descarga de documentos
  - Eliminación de documentos
  - Soporte para múltiples formatos (PDF, Word, Excel, imágenes, etc.)
- **Búsqueda y Filtrado:**
  - Búsqueda por texto en código, título y descripción
  - Filtrado por estado
  - Vista expandible de detalles (accordion)
- **Validaciones:**
  - Código requerido
  - Título requerido
  - Descripción requerida
  - Fecha de requerimiento requerida
  - Solicitante requerido (nombre y cargo obligatorios)
  - Aprobador completamente opcional

#### 2.2. TDR Cliente
**Ruta:** `/tdrs?type=client`

**Funcionalidades:**
- **Gestión de TDRs entregados por clientes**
- **Campos principales:**
  - Cliente asociado (requerido)
  - Tipo: "client" (TDR entregado por cliente)
  - Resumen/descripción
  - Estado de aprobación (boolean)
- **Gestión de Documentos:**
  - Subida de múltiples archivos (hasta 50MB por archivo)
  - Visualización y descarga
  - Eliminación de documentos
- **Funcionalidades especiales:**
  - Botón de aprobación rápida
  - Filtrado automático por tipo "client"
  - Búsqueda por texto
- **Validaciones:**
  - Cliente requerido
  - Tipo requerido

#### 2.3. TDR Tecmeing
**Ruta:** `/tdrs?type=tecmeing`

**Funcionalidades:**
- **Gestión de TDRs elaborados internamente por Tecmeing**
- Similar a TDR Cliente pero con tipo "tecmeing"
- Filtrado automático por tipo "tecmeing"

#### 2.4. Proyecto Cotización
**Ruta:** `/projects?status=EN_COTIZACION`

**Funcionalidades:**
- Lista de proyectos filtrados por estado "EN_COTIZACION"
- Vista completa de proyectos en etapa de cotización
- Acceso rápido a proyectos que requieren cotización

#### 2.5. Proyecto Aprobado
**Ruta:** `/projects?status=APROBADO`

**Funcionalidades:**
- Lista de proyectos con estado "APROBADO"
- Proyectos que han sido aprobados y están listos para ejecución

#### 2.6. Proyecto en Ejecución
**Ruta:** `/projects?status=EN_EJECUCION`

**Funcionalidades:**
- Lista de proyectos actualmente en ejecución
- Seguimiento de proyectos activos

#### 2.7. Proyecto en Observación
**Ruta:** `/projects?status=EN_OBSERVACION`

**Funcionalidades:**
- Lista de proyectos que requieren atención o revisión
- Proyectos con observaciones pendientes

#### 2.8. Proyecto Culminado al 100%
**Ruta:** `/projects?status=TERMINADO`

**Funcionalidades:**
- Lista de proyectos finalizados completamente
- Historial de proyectos terminados

#### 2.9. Proyecto Archivados
**Ruta:** `/projects?isActive=false`

**Funcionalidades:**
- Lista de proyectos archivados (no activos)
- Proyectos históricos que ya no están en uso activo

### Módulo de Proyectos (Vista General)
**Ruta:** `/projects`

**Funcionalidades Completas:**
- **CRUD Completo de Proyectos:**
  - Crear, editar, eliminar proyectos
  - Código generado automáticamente por el backend
  - Campos principales:
    - Nombre (requerido)
    - Descripción
    - Código (auto-generado)
    - Cliente asociado (requerido)
    - Estado: PENDIENTE, EN_COTIZACION, APROBADO, EN_EJECUCION, EN_OBSERVACION, TERMINADO, CANCELADO
    - Fecha de inicio
    - Fecha de fin
    - Ubicación
    - Presupuesto
    - Notas
    - Estado activo/inactivo (isActive)
- **Gestión de Archivos Adjuntos:**
  - Subida de múltiples archivos usando Presigned URLs (S3)
  - Drag & drop o selección de archivos
  - Visualización de archivos existentes
  - Eliminación de archivos adjuntos
  - Iconos según tipo de archivo (imagen, video, PDF, etc.)
- **Búsqueda y Filtrado:**
  - Búsqueda por nombre, descripción o código
  - Filtrado por estado (desde queryParams del menú)
  - Filtrado por activo/inactivo
  - Vista expandible de detalles
- **Validaciones:**
  - Nombre requerido
  - Cliente requerido
  - Estado requerido
  - Presupuesto no puede ser negativo
  - Fecha de inicio no puede ser posterior a fecha de fin
- **Características Especiales:**
  - Integración con sistema de permisos (canEdit)
  - Carga de siguiente código disponible
  - Vista de detalles completa en modal

### Dashboard de Proyectos
**Ruta:** `/projects/dashboard`

**Funcionalidades:**
- **KPIs Específicos de Proyectos:**
  - Total de Proyectos
  - Total de Cotizaciones
  - Total de Órdenes
  - Total de Requerimientos
  - Total de TDRs
- **Gráficos:**
  - Proyectos por Estado (distribución)
  - Cotizaciones por Estado
  - Requerimientos por Estado
- **Tablas:**
  - Proyectos por estado y cantidad
  - Cotizaciones por proyecto
  - Requerimientos por estado
- **Filtros:**
  - Rango de fechas
  - Empresa/Tenant (solo gerencia)

---

## 3. FUTUROS IMPOSIBLES

**Ruta:** `/fi`

### Funcionalidades Principales

- **Gestión de "Futuros Imposibles" (FI):**
  - Concepto: Metas personales/profesionales con plan de acción estructurado
  - Campos principales:
    - Título del FI
    - "Atravesar": Descripción de lo que se busca superar o lograr
    - Plan de acción:
      - Descripción del plan
      - Fecha de inicio
      - Fecha de fin (debe ser >= fecha de inicio)
    - Estado activo/inactivo
- **Accionables Diarios:**
  - Cada FI puede tener accionables diarios
  - Máximo un accionable por día por FI (restricción única)
  - Campos del accionable:
    - Fecha
    - Descripción de la actividad
    - Estado: "pendiente" o "cumplido"
- **Rutas Adicionales:**
  - `/fi/:id` - Detalle de un FI específico
  - `/fi/:id/day/:date` - Detalle de un día específico con sus accionables
- **Funcionalidades:**
  - CRUD completo de FIs
  - Gestión de accionables diarios
  - Búsqueda por texto (título, atravesar, descripción del plan)
  - Filtrado por estado activo/inactivo
  - Visualización de progreso diario

---

## 4. ADMINISTRACIÓN

### 4.1. Clientes
**Ruta:** `/clients`

**Funcionalidades:**
- **CRUD Completo de Clientes:**
  - Crear, editar, eliminar clientes
  - Campos principales:
    - Nombre (requerido)
    - RUC/Tax ID (opcional)
    - Ubicación completa:
      - País (requerido)
      - Provincia
      - Distrito
      - Dirección (mínimo 5 caracteres si se proporciona)
    - Contactos (mínimo 1 requerido):
      - Nombre (requerido)
      - Email (requerido, formato válido)
      - Teléfono (opcional)
      - Área (requerido)
- **Gestión de Contactos:**
  - Agregar múltiples contactos por cliente
  - Editar contactos individuales
  - Eliminar contactos
  - Vista de contactos en modal separado
- **Estadísticas:**
  - Total de clientes
  - Clientes con ubicación completa
  - Clientes sin ubicación
  - Clientes con contactos
- **Búsqueda y Filtrado:**
  - Búsqueda por nombre o RUC
  - Filtrado por ubicación
  - Vista expandible de detalles
- **Integración con Ubicaciones:**
  - Carga dinámica de países, provincias y distritos
  - Selectores en cascada (país → provincia → distrito)
- **Validaciones:**
  - Nombre requerido
  - País requerido
  - Al menos un contacto requerido
  - Email válido para cada contacto
  - Área requerida para cada contacto

### 4.2. Proveedores
**Ruta:** `/providers`

**Funcionalidades:**
- **CRUD Completo de Proveedores:**
  - Crear, editar, eliminar proveedores
  - Campos principales:
    - Nombre (requerido)
    - Dirección
    - RUC/Tax ID
    - Ubicación completa (similar a clientes)
    - Contactos (mínimo 1 requerido)
    - Servicios (array de strings, mínimo 1 requerido)
    - Descripción (mínimo 10 caracteres si se proporciona)
    - Sitio web (URL válida)
    - Calificación (rating 1-5)
    - Estado activo/inactivo
- **Gestión de Servicios:**
  - Agregar servicios desde lista disponible
  - Agregar servicios personalizados (texto separado por comas)
  - Eliminar servicios
  - Filtrado por servicio
- **Gestión de Contactos:**
  - Similar a clientes
- **Calificación:**
  - Sistema de rating de 1 a 5 estrellas
  - Actualización de calificación
- **Estadísticas:**
  - Total de proveedores
  - Proveedores activos/inactivos
  - Distribución por servicios
- **Búsqueda y Filtrado:**
  - Búsqueda por nombre
  - Filtrado por servicio
  - Filtrado por estado activo/inactivo
- **Funcionalidades Especiales:**
  - Toggle rápido de estado activo/inactivo
  - Vista de detalles completa
  - Carga dinámica de servicios disponibles desde otros proveedores

### 4.3. Documentos Tributarios
**Ruta:** `/documents`

**Funcionalidades:**
- **Gestión de Documentos Tributarios:**
  - CRUD completo de documentos
  - Almacenamiento de documentos fiscales
  - Categorización de documentos
  - Asociación con clientes/proveedores/proyectos
- **Características:**
  - Subida de archivos
  - Organización por tipo de documento
  - Búsqueda y filtrado

### 4.4. Empleados
**Ruta:** `/employees`

**Funcionalidades:**
- **Gestión de Empleados:**
  - CRUD completo de empleados
  - Información personal y laboral
  - Asociación con áreas
  - Gestión de datos de empleados
- **Características:**
  - Registro de información completa
  - Asignación a áreas organizacionales
  - Historial laboral

### 4.5. Planillas y Pagos
**Ruta:** `/payroll`

**Funcionalidades:**
- **Gestión de Planillas:**
  - Listado de planillas
  - Carga de planillas (upload)
  - Detalle de planilla por ID (`/payroll/detail/:id`)
- **Submódulos:**
  - **Lista de Planillas** (`/payroll`): Visualización de todas las planillas
  - **Carga de Planilla** (`/payroll/upload`): Subida de archivos de planilla
  - **Detalle de Planilla** (`/payroll/detail/:id`): Vista detallada de una planilla específica
- **Características:**
  - Procesamiento de archivos de planilla
  - Cálculo de pagos
  - Generación de reportes de nómina

---

## 5. TALENTO HUMANO

### 5.1. Tareas
**Ruta:** `/tasks`

**Funcionalidades:**
- **Gestión de Tareas con Tableros Kanban:**
  - Sistema de tableros tipo Kanban
  - Múltiples tableros (boards)
  - Columnas personalizables (Por hacer, En progreso, Completado, etc.)
  - Tarjetas de tareas movibles entre columnas
- **Características:**
  - Crear, editar, eliminar tareas
  - Asignación de tareas a usuarios
  - Prioridades y etiquetas
  - Fechas de vencimiento
  - Comentarios y archivos adjuntos
  - Seguimiento de progreso
- **Rutas:**
  - `/tasks` - Lista de tableros
  - `/tasks/:boardId` - Tablero específico con sus tareas

### 5.2. Reportes Diarios
**Ruta:** `/daily-reports`

**Funcionalidades:**
- **Gestión de Reportes Diarios:**
  - Registro de actividades diarias
  - Asociación con proyectos
  - Registro de horas trabajadas
  - Registro de gastos y valores
  - Descripción de actividades realizadas
- **Características:**
  - CRUD completo de reportes
  - Filtrado por fecha y proyecto
  - Cálculo de totales y promedios
  - Exportación de reportes
  - Visualización en dashboard

### 5.3. Marcación de Hora
**Ruta:** `/time-tracking`

**Funcionalidades:**
- **Sistema de Control de Asistencia:**
  - Registro de entrada y salida
  - Marcación con geolocalización (GPS)
  - Reconocimiento facial (opcional)
  - Historial de marcaciones
- **Características:**
  - Marcación de INGRESO y SALIDA
  - Captura de ubicación GPS
  - Validación de ubicación (dentro/fuera de zona permitida)
  - Fotos de marcación
  - Reportes de asistencia
  - Cálculo de horas trabajadas
  - Integración con reconocimiento facial
- **Funcionalidades Avanzadas:**
  - Geocodificación inversa (mostrar dirección desde coordenadas)
  - Validación de zonas permitidas
  - Historial completo de marcaciones
  - Reportes por usuario y período

---

## 6. CRM

### 6.1. Leads
**Ruta:** `/leads`

**Funcionalidades:**
- **Gestión de Leads/Prospectos:**
  - CRUD completo de leads
  - Campos principales:
    - Nombre del lead
    - Información de contacto:
      - Nombre completo
      - Email (requerido)
      - Teléfono
      - Cargo/Posición
      - Departamento
    - Información de empresa:
      - Nombre de empresa
      - RUC/Tax ID
      - Sector
      - Tamaño de empresa
      - Sitio web
    - Ubicación completa (país, provincia, distrito, dirección)
    - Estado: NEW, CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION, WON, LOST, CONVERTED
    - Fuente: WEBSITE, REFERRAL, SOCIAL_MEDIA, EMAIL, PHONE, OTHER
    - Valor estimado
    - Notas
    - Asignado a (usuario)
    - Empresa asociada (companyId)
- **Gestión de Documentos:**
  - Subida de documentos asociados al lead
  - Múltiples formatos soportados (hasta 20MB)
- **Conversión a Cliente:**
  - Convertir lead en cliente existente
  - Cambio automático de estado a CONVERTED
  - Registro de fecha de conversión
- **Seguimientos:**
  - Ver todos los seguimientos asociados a un lead
  - Historial de interacciones
- **Búsqueda y Filtrado:**
  - Búsqueda por texto
  - Filtrado por estado
  - Filtrado por fuente
  - Filtrado por usuario asignado

### 6.2. Seguimientos
**Ruta:** `/follow-ups`

**Funcionalidades:**
- **Gestión de Seguimientos a Clientes/Leads:**
  - CRUD completo de seguimientos
  - Campos principales:
    - Título (requerido)
    - Descripción/Notas (requerido)
    - Tipo: CALL, EMAIL, MEETING, NOTE, PROPOSAL, OTHER
    - Estado: SCHEDULED, COMPLETED, CANCELLED
    - Fecha programada (requerido)
    - Lead asociado (opcional)
    - Cliente asociado (opcional)
    - Usuario que realiza el seguimiento (requerido)
    - Archivos adjuntos (URLs)
    - Resultado/Outcome
    - Fecha del próximo seguimiento sugerido
- **Características:**
  - Asociación con leads o clientes
  - Programación de seguimientos futuros
  - Registro de resultados
  - Archivos adjuntos
  - Historial completo de interacciones
- **Búsqueda y Filtrado:**
  - Por lead
  - Por cliente
  - Por usuario
  - Por estado
  - Por tipo
  - Por rango de fechas

### 6.3. Empresas
**Ruta:** `/companies-crm`

**Funcionalidades:**
- **Gestión de Empresas en el CRM (Momentum):**
  - CRUD completo de empresas
  - Información completa de empresas
  - Asociación con leads y clientes
  - Seguimiento de empresas
- **Características:**
  - Registro de información empresarial
  - Historial de interacciones
  - Análisis de empresas
  - Integración con módulo de leads

---

## 7. CONFIGURACIÓN

### 7.1. Usuarios
**Ruta:** `/users`

**Funcionalidades:**
- **Gestión de Usuarios del Sistema:**
  - CRUD completo de usuarios
  - Campos principales:
    - Nombre completo
    - Email (único, requerido)
    - Contraseña (encriptada)
    - Rol: user, admin, gerencia, supervisor
    - Estado activo/inactivo
    - Información de perfil
  - Asignación de roles y permisos
  - Gestión de acceso al sistema
- **Características:**
  - Creación y edición de usuarios
  - Asignación de roles
  - Activación/desactivación de usuarios
  - Reset de contraseñas
  - Historial de usuarios

### 7.2. Permisos
**Ruta:** `/menu-permissions`

**Funcionalidades:**
- **Gestión de Permisos de Menú:**
  - Asignación de permisos por usuario
  - Control de acceso a rutas específicas
  - Permisos de lectura y edición
  - Gestión granular de permisos
- **Características:**
  - Asignar permisos a usuarios individuales
  - Control de acceso por ruta
  - Permisos de solo lectura vs edición
  - Visualización de permisos asignados
  - Herencia de permisos por rol

### 7.3. Asignación de Empresas
**Ruta:** `/user-tenants-assignment`

**Funcionalidades:**
- **Gestión de Asignación de Empresas (Tenants) a Usuarios:**
  - Asignar usuarios a múltiples empresas
  - Control de acceso multi-tenant
  - Gestión de empresas por usuario
- **Características:**
  - Asignar/desasignar empresas a usuarios
  - Visualización de empresas asignadas
  - Control de acceso por empresa
  - Gestión de multi-tenancy

### 7.4. Áreas
**Ruta:** `/areas`

**Funcionalidades:**
- **Gestión de Áreas Organizacionales:**
  - CRUD completo de áreas
  - Organización jerárquica de áreas
  - Asociación de empleados a áreas
- **Características:**
  - Crear, editar, eliminar áreas
  - Estructura organizacional
  - Asignación de empleados
  - Reportes por área

### 7.5. Registro Facial
**Ruta:** `/face-recognition-register`

**Funcionalidades:**
- **Sistema de Registro Facial para Asistencia:**
  - Registro de descriptores faciales de usuarios
  - Extracción de descriptores en frontend usando face.js api
  - Almacenamiento de descriptores (128 valores numéricos)
  - Almacenamiento de imágenes en S3
- **Proceso de Registro:**
  1. Selección de usuario
  2. Captura o selección de imagen
  3. Extracción de descriptor facial (frontend)
  4. Envío de imagen y descriptor al backend
  5. Almacenamiento en S3 (imagen) y MongoDB (descriptor)
- **Características:**
  - Validación de imagen (debe contener un rostro)
  - Validación de descriptor (exactamente 128 valores)
  - Visualización de imagen registrada
  - Eliminación de registro facial
  - Listado de usuarios con registro facial
- **Integración:**
  - Usado por el módulo de Marcación de Hora para reconocimiento automático

### 7.6. Mi Perfil
**Ruta:** `/profile`

**Funcionalidades:**
- **Gestión del Perfil de Usuario:**
  - Edición de información personal
  - Cambio de contraseña
  - Actualización de datos de contacto
  - Visualización de permisos asignados
  - Configuración de preferencias
- **Características:**
  - Edición de perfil propio
  - Cambio seguro de contraseña
  - Visualización de información de cuenta
  - Gestión de preferencias de usuario

### 7.7. Logs del Sistema
**Ruta:** `/logs`

**Funcionalidades:**
- **Visualización de Logs y Auditoría:**
  - Registro de actividades del sistema
  - Historial de acciones de usuarios
  - Logs de errores y eventos
  - Auditoría de cambios
- **Características:**
  - Filtrado por tipo de log
  - Filtrado por usuario
  - Filtrado por fecha
  - Búsqueda en logs
  - Exportación de logs
  - Visualización de detalles de eventos

---

## MÓDULOS ADICIONALES (No en menú principal)

### Ingeniería
**Ruta:** `/engineering`

**Funcionalidades:**
- **Gestión de Documentación Técnica de Proyectos:**
  - Clasificación de proyectos por tipo de trabajo:
    - Mantenimiento
    - Fabricación
    - Montaje
    - Mixto
  - Carga de documentación técnica por categorías:
    - Cálculo estructural (`structural`)
    - Cronograma de ejecución (`schedule`)
    - Planos de fabricación (`fabrication`)
    - Planos de montaje (`assembly`)
    - Lista de materiales - BOM (`bom`)
    - Otros documentos técnicos (`other`)
- **Características:**
  - Soporte para múltiples archivos por tipo
  - Archivos almacenados en S3 (máximo 50MB por archivo)
  - Cualquier tipo de archivo permitido
  - Selección de proyecto desde lista disponible
  - Visualización de documentación cargada
  - Eliminación de documentos

### Órdenes
**Ruta:** `/orders`

**Funcionalidades:**
- **Gestión de Órdenes de Servicio:**
  - CRUD completo de órdenes
  - Campos principales:
    - Cliente (requerido)
    - Nombre del cliente (requerido)
    - Número de orden (requerido)
    - Tipo: "purchase" (compra) o "service" (servicio)
  - Gestión de documentos asociados
- **Características:**
  - Subida de documentos (máximo 10MB)
  - Visualización y descarga de documentos
  - Eliminación de documentos
  - Búsqueda por texto
  - Vista de detalles completa

### Cotizaciones
**Ruta:** `/quotes`

**Funcionalidades:**
- **Gestión de Cotizaciones:**
  - CRUD completo de cotizaciones
  - Campos principales:
    - Cliente (requerido)
    - Proyecto (requerido)
    - Requerimiento (requerido)
    - Estado: Pendiente, Enviada, Rechazada, Cancelada, Observada, Aprobada
    - Fecha de creación (requerido)
    - Fecha de envío (opcional)
    - Notas
  - Gestión de documentos:
    - Subida de múltiples documentos (máximo 50MB)
    - Visualización y descarga
    - Eliminación de documentos
- **Características:**
  - Cambio de estado con menú contextual
  - Generación de PDF de cotización
  - Paginación de resultados
  - Filtrado por estado (desde queryParams del menú)
  - Búsqueda por texto
  - Vista de detalles completa
  - Validaciones completas de formulario

---

## NOTAS IMPORTANTES

### Sistema de Permisos
- Todos los módulos están protegidos por `MenuPermissionGuard`
- Los permisos se gestionan desde el módulo de Permisos (`/menu-permissions`)
- Existen dos niveles de permisos:
  - **Lectura**: Permite ver el módulo
  - **Edición**: Permite crear, editar y eliminar registros
- El rol "gerencia" tiene acceso completo a todos los módulos y puede ver datos de todas las empresas

### Multi-Tenancy
- El sistema soporta múltiples empresas (tenants)
- Cada usuario puede estar asignado a una o más empresas
- Los datos se filtran automáticamente por empresa del usuario
- El header `X-Tenant-Id` se envía automáticamente en todas las peticiones

### Integración entre Módulos
- **Flujo de Ingeniería**: Requerimiento → TDR → Cotización → Orden → Proyecto → Ingeniería
- **CRM**: Leads → Seguimientos → Conversión a Cliente
- **Talento Humano**: Empleados → Áreas → Tareas → Reportes Diarios → Marcación de Hora

### Tecnologías Utilizadas
- **Frontend**: Angular 20, Signals, Standalone Components, OnPush Change Detection
- **UI**: PrimeNG, Tailwind CSS
- **Backend**: NestJS, MongoDB, S3 (AWS)
- **Autenticación**: JWT
- **Reconocimiento Facial**: face.js api (frontend)

---

**Última actualización:** Basado en análisis del código fuente de la plataforma Tecmeing


