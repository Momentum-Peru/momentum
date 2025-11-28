# Nuevos Módulos Implementados

Este documento detalla las funcionalidades de los módulos recientemente implementados en la plataforma Tecmeing para dar soporte al flujo completo de ingeniería.

## 1. Módulo de Ingeniería (`/engineering`)

Este módulo permite al equipo de ingeniería gestionar la documentación técnica y clasificación de los proyectos una vez que han sido aprobados y tienen orden de servicio.

### Funcionalidades Clave:

- **Clasificación de Proyectos**: Permite definir si un proyecto es de Mantenimiento, Fabricación, Montaje o Mixto. La clasificación inicializa el registro de ingeniería.

- **Subida de Archivos a S3**: Los documentos técnicos se suben directamente a la plataforma (S3), no mediante URLs manuales. Características:
  - Soporte para múltiples archivos por tipo de documento
  - Límite de 50MB por archivo
  - Cualquier tipo de archivo permitido
  - Almacenamiento organizado: `engineering/{projectId}/{type}-{timestamp}-{filename}`

- **Tipos de Documentos Soportados**:
  - `structural`: Cálculos estructurales
  - `schedule`: Cronogramas de ejecución
  - `fabrication`: Planos de fabricación
  - `assembly`: Planos de montaje
  - `bom`: Lista de materiales (Bill of Materials)
  - `other`: Otros documentos técnicos

- **Gestión de Documentos**:
  - Subir múltiples archivos del mismo tipo
  - Eliminar documentos individuales (también se elimina de S3)
  - Consultar todos los documentos asociados a un proyecto

- **Vinculación**: Cada registro de ingeniería está estrictamente vinculado a un Proyecto existente (relación 1:1).

- **Flujo de Uso**:
  1.  Seleccionar proyecto desde la lista disponible (`GET /projects`)
  2.  Clasificar el proyecto (`POST /engineering`) - crea o actualiza el registro
  3.  Subir documentos técnicos (`POST /engineering/project/:projectId/files`)
  4.  Consultar documentación (`GET /engineering/project/:projectId`)
  5.  Eliminar documentos si es necesario (`DELETE /engineering/project/:projectId/files`)

## 2. Módulo de Cotizaciones de Proveedores (`/supplier-quotes`)

Facilita al área de logística la gestión de precios y adquisición de materiales necesarios para la ejecución del proyecto, basándose en la lista de materiales generada por ingeniería.

### Funcionalidades Clave:

- **Registro de Cotizaciones**: Permite registrar las ofertas recibidas de distintos proveedores.
- **Control de Estado**: Gestión de estados (Pendiente, Aprobada, Rechazada) para controlar el flujo de compras.
- **Vinculación**: Se asocia directamente a un Proyecto y a un Proveedor registrado en el sistema.
- **Costos y Plazos**: Registro del costo total ofertado y la fecha límite de la oferta o entrega.

## 3. Dashboard de Proyectos (`/dashboard`)

Se ha actualizado el módulo de Dashboard para proporcionar una visión integral del estado de los proyectos y sus documentos asociados.

### Funcionalidades Clave:

- **KPIs Generales**: Totales de Proyectos, Cotizaciones, Órdenes y ahora también TDRs.
- **Desglose por Estado**: Gráficos que muestran la distribución de TDRs por tipo (Cliente vs Tecmeing) y proyectos por estado.
- **Visión 360**: Permite a la gerencia y jefes de proyecto ver el "embudo" de ingeniería desde el requerimiento hasta la orden.
