# Flujo de Trabajo de Ingeniería - Tecmeing

Este documento describe el proceso estándar para los proyectos de ingeniería en la plataforma Tecmeing, desde la recepción del requerimiento hasta la culminación del proyecto.

## Diagrama de Flujo Completo

1.  **Requerimiento**: El cliente envía un requerimiento o necesidad.
    - Módulo: `Requirements`
    - Estado inicial: Registro de la necesidad del cliente

2.  **TDR (Términos de Referencia)**: Se definen los alcances técnicos. Puede ser entregado por el cliente o elaborado por Tecmeing.
    - Módulo: `TDRs`
    - Tipos: `client` (entregado por cliente) o `tecmeing` (elaborado por Tecmeing)
    - Documentos: Se pueden adjuntar archivos técnicos

3.  **Cotización**: Se elabora la propuesta económica y técnica basada en el TDR.
    - Módulo: `Quotes`
    - Vinculación: Obligatoriamente vinculada a un `Requirement` (requirementId)
    - Estados: Pendiente, Aprobada, Rechazada, etc.

4.  **Aprobación**: El cliente aprueba la cotización.
    - Módulo: `Quotes`
    - Acción: Cambio de estado a "Aprobada"

5.  **Orden de Servicio**: El cliente emite la Orden de Servicio (OS) o Purchase Order (PO).
    - Módulo: `Orders`
    - Vinculación: Vinculada a la Cotización aprobada
    - Resultado: Genera o actualiza el Proyecto asociado

6.  **Ingeniería (Planificación)**:
    - Módulo: `Engineering`
    - **Paso 6.1 - Clasificación**: Se define el tipo de trabajo (Mantenimiento, Fabricación, Montaje, Mixto). Esto inicializa la ficha de ingeniería.
    - **Paso 6.2 - Carga de Documentación**: Se suben los archivos técnicos directamente a la plataforma (S3):
        *   Cálculo estructural (`structural`)
        *   Cronograma de ejecución (`schedule`)
        *   Planos de fabricación (`fabrication`)
        *   Planos de montaje (`assembly`)
        *   Lista de materiales - BOM (`bom`)
        *   Otros documentos técnicos (`other`)
    - **Características**:
        *   Soporte para múltiples archivos por tipo
        *   Archivos almacenados en S3 (máximo 50MB por archivo)
        *   Cualquier tipo de archivo permitido
        *   Selección de proyecto desde lista disponible

7.  **Logística (Cotizaciones de Proveedores)**: Se cotizan y adquieren los materiales necesarios con proveedores.
    - Módulo: `SupplierQuotes`
    - Vinculación: Proyecto y Proveedor
    - Estados: Pendiente, Aprobada, Rechazada
    - Basado en: Lista de materiales (BOM) generada por ingeniería

8.  **Ejecución y Control**: Inicio de obra, reportes diarios, control de avances y entregas hasta el cierre.
    - Módulos: `Projects` / `DailyReports`
    - Control: Seguimiento diario, hitos, entregas parciales

## Módulos del Sistema

| Paso | Módulo Responsable | Endpoint Base | Descripción |
| :--- | :--- | :--- | :--- |
| 1 | **Requerimientos** | `/requirements` | Registro inicial de la necesidad del cliente. |
| 2 | **TDRs** | `/tdrs` | Documentación técnica y alcances. Soporta subida de documentos. |
| 3, 4 | **Cotizaciones** | `/quotes` | Propuesta comercial vinculada al Requerimiento/TDR. Obligatorio requirementId. |
| 5 | **Órdenes** | `/orders` | Registro de la OS del cliente. Vincula la Cotización aprobada. |
| 6 | **Ingeniería** | `/engineering` | Gestión técnica completa: clasificación y subida de archivos (planos, cálculos, cronogramas, BOM). |
| 7 | **Cotizaciones Proveedores** | `/supplier-quotes` | Gestión de compras y precios con proveedores. Vinculado a Proyecto y Proveedor. |
| 8 | **Proyectos / Reportes Diarios** | `/projects` / `/daily-reports` | Gestión de la ejecución, hitos y control diario de obra. |

## Flujo de Uso del Módulo de Ingeniería

### 1. Seleccionar Proyecto
- Endpoint: `GET /projects?activeOnly=true` o `GET /projects?status=EN_EJECUCION`
- El usuario selecciona el proyecto desde la lista disponible

### 2. Clasificar Proyecto (Inicializar Ingeniería)
- Endpoint: `POST /engineering`
- Body: `{ projectId: "...", type: "Mantenimiento" | "Fabricación" | "Montaje" | "Mixto" }`
- Si ya existe, se actualiza el tipo. Si no existe, se crea el registro.

### 3. Subir Documentos Técnicos
- Endpoint: `POST /engineering/project/:projectId/files`
- Form-Data:
  - `file`: Archivo a subir (máx 50MB, cualquier formato)
  - `type`: Tipo de documento (`structural`, `schedule`, `fabrication`, `assembly`, `bom`, `other`)
- Se pueden subir múltiples archivos del mismo tipo
- Los archivos se almacenan en S3 en la ruta: `engineering/{projectId}/{type}-{timestamp}-{filename}`

### 4. Consultar Documentación
- Endpoint: `GET /engineering/project/:projectId`
- Retorna: Clasificación y arrays de URLs de documentos por tipo

### 5. Eliminar Documento
- Endpoint: `DELETE /engineering/project/:projectId/files?url={url}`
- Elimina el documento del registro y de S3

## Detalles de los Nuevos Módulos

### Módulo de Ingeniería (`/engineering`)
Centraliza la información técnica del proyecto.

**Funcionalidades**:
- **Clasificación**: Mantenimiento, Fabricación, Montaje, Mixto
- **Gestión Documental**: Subida directa a S3 (no URLs manuales)
- **Múltiples Archivos**: Soporte para varios archivos por tipo de documento
- **Vinculación**: 1:1 con Proyecto (un proyecto = un registro de ingeniería)

**Tipos de Documentos Soportados**:
- `structural`: Cálculos estructurales
- `schedule`: Cronogramas
- `fabrication`: Planos de fabricación
- `assembly`: Planos de montaje
- `bom`: Lista de materiales (Bill of Materials)
- `other`: Otros documentos técnicos

### Módulo de Cotizaciones de Proveedores (`/supplier-quotes`)
Permite al área de logística registrar las solicitudes de cotización a proveedores para los materiales definidos por ingeniería.

**Funcionalidades**:
- **Registro de Cotizaciones**: Ofertas recibidas de proveedores
- **Control de Estado**: Pendiente, Aprobada, Rechazada
- **Vinculación**: Proyecto + Proveedor (opcionalmente Requerimiento)
- **Costos y Plazos**: Registro de costo total y fecha límite

## Integración con Otros Módulos

- **Proyectos**: La ingeniería está vinculada 1:1 con proyectos. Se puede consultar qué proyectos tienen ingeniería asociada.
- **Cotizaciones de Proveedores**: Utiliza la lista de materiales (BOM) generada en ingeniería para cotizar con proveedores.
- **Reportes Diarios**: Los proyectos con ingeniería completa pueden iniciar ejecución y generar reportes diarios.
