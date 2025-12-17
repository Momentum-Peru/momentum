# LISTA DEL MENÚ - PLATAFORMA TECMEING

## 1. DASHBOARD
**Ruta:** `/dashboard`

Panel principal con KPIs, gráficos de proyectos, cotizaciones, órdenes y reportes diarios. Incluye reportes de horas para gerencia con geolocalización.

---

## 2. PROYECTOS

### 2.1. RQ Requerimiento
**Ruta:** `/requirements`

Gestión de requerimientos de clientes con código, título, descripción, fechas, estados y documentos adjuntos. Incluye solicitante y aprobador.

### 2.2. TDR Cliente
**Ruta:** `/tdrs?type=client`

Términos de referencia entregados por clientes. Permite subir documentos técnicos, aprobar TDRs y asociarlos a clientes específicos.

### 2.3. TDR Tecmeing
**Ruta:** `/tdrs?type=tecmeing`

Términos de referencia elaborados internamente por Tecmeing. Gestión de documentos técnicos y resúmenes de alcances.

### 2.4. Proyecto Cotización
**Ruta:** `/projects?status=EN_COTIZACION`

Lista de proyectos en etapa de cotización. Vista filtrada de proyectos que requieren propuesta comercial.

### 2.5. Proyecto Aprobado
**Ruta:** `/projects?status=APROBADO`

Proyectos aprobados listos para ejecución. Visualización de proyectos que han sido aprobados por el cliente.

### 2.6. Proyecto en Ejecución
**Ruta:** `/projects?status=EN_EJECUCION`

Proyectos actualmente en ejecución. Seguimiento de proyectos activos en desarrollo.

### 2.7. Proyecto en Observación
**Ruta:** `/projects?status=EN_OBSERVACION`

Proyectos que requieren atención o revisión. Lista de proyectos con observaciones pendientes.

### 2.8. Proyecto Culminado al 100%
**Ruta:** `/projects?status=TERMINADO`

Proyectos finalizados completamente. Historial de proyectos terminados exitosamente.

### 2.9. Proyecto Archivados
**Ruta:** `/projects?isActive=false`

Proyectos archivados no activos. Historial de proyectos que ya no están en uso.

---

## 3. FUTUROS IMPOSIBLES
**Ruta:** `/fi`

Gestión de metas personales/profesionales con plan de acción estructurado. Incluye accionables diarios con estados pendiente/cumplido.

---

## 4. ADMINISTRACIÓN

### 4.1. Clientes
**Ruta:** `/clients`

Gestión de clientes con ubicación completa, múltiples contactos, RUC y estadísticas. Validación de datos y gestión de documentos.

### 4.2. Proveedores
**Ruta:** `/providers`

Gestión de proveedores con servicios, calificaciones, contactos y ubicación. Filtrado por servicio y estado activo/inactivo.

### 4.3. Documentos Tributarios
**Ruta:** `/documents`

Gestión de documentos fiscales y tributarios. Almacenamiento y organización de documentos asociados a clientes y proveedores.

### 4.4. Empleados
**Ruta:** `/employees`

Gestión de empleados con información personal y laboral. Asociación con áreas organizacionales y datos completos.

### 4.5. Planillas y Pagos
**Ruta:** `/payroll`

Gestión de planillas de pago. Incluye carga de archivos, listado de planillas y detalle de cada planilla con cálculos.

---

## 5. TALENTO HUMANO

### 5.1. Tareas
**Ruta:** `/tasks`

Sistema de gestión de tareas con tableros Kanban. Múltiples tableros, columnas personalizables y tarjetas movibles entre estados.

### 5.2. Reportes Diarios
**Ruta:** `/daily-reports`

Registro de actividades diarias con horas trabajadas, gastos y descripciones. Asociación con proyectos y cálculo de totales.

### 5.3. Marcación de Hora
**Ruta:** `/time-tracking`

Control de asistencia con marcación de entrada/salida, geolocalización GPS y reconocimiento facial opcional. Historial completo.

---

## 6. CRM

### 6.1. Leads
**Ruta:** `/leads`

Gestión de leads/prospectos con información de contacto, empresa, ubicación y estados. Conversión a cliente y seguimientos asociados.

### 6.2. Seguimientos
**Ruta:** `/follow-ups`

Gestión de seguimientos a clientes y leads. Tipos: llamada, email, reunión, nota, propuesta. Programación y registro de resultados.

### 6.3. Empresas
**Ruta:** `/companies-crm`

Gestión de empresas en el CRM Momentum. Información empresarial completa, asociación con leads y seguimiento de interacciones.

---

## 7. CONFIGURACIÓN

### 7.1. Usuarios
**Ruta:** `/users`

Gestión de usuarios del sistema con roles, permisos y estados. Creación, edición, activación/desactivación y reset de contraseñas.

### 7.2. Permisos
**Ruta:** `/menu-permissions`

Asignación de permisos de menú por usuario. Control granular de acceso a rutas con permisos de lectura y edición.

### 7.3. Asignación de Empresas
**Ruta:** `/user-tenants-assignment`

Gestión de asignación de empresas (tenants) a usuarios. Control de acceso multi-tenant y gestión de empresas por usuario.

### 7.4. Áreas
**Ruta:** `/areas`

Gestión de áreas organizacionales. Estructura jerárquica, asignación de empleados y organización de la empresa.

### 7.5. Registro Facial
**Ruta:** `/face-recognition-register`

Registro de descriptores faciales para reconocimiento. Extracción en frontend, almacenamiento de imagen y descriptor para asistencia.

### 7.6. Mi Perfil
**Ruta:** `/profile`

Gestión del perfil de usuario. Edición de información personal, cambio de contraseña y visualización de permisos asignados.

### 7.7. Logs del Sistema
**Ruta:** `/logs`

Visualización de logs y auditoría del sistema. Registro de actividades, errores, eventos y cambios realizados por usuarios.

---

## MÓDULOS ADICIONALES (No en menú principal)

### Ingeniería
**Ruta:** `/engineering`

Gestión de documentación técnica de proyectos. Clasificación por tipo de trabajo y carga de planos, cálculos, cronogramas y BOM.

### Órdenes
**Ruta:** `/orders`

Gestión de órdenes de servicio. Registro de órdenes de compra y servicio con documentos asociados y búsqueda por cliente.

### Cotizaciones
**Ruta:** `/quotes`

Gestión de cotizaciones comerciales. Estados, documentos, vinculación con proyectos y requerimientos. Generación de PDF.

---

**Total:** 7 items principales, 24 subitems, 3 módulos adicionales


