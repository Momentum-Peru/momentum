# Funcionalidad de Escaneo de Facturas

Este módulo implementa la funcionalidad de escaneo automático de facturas y documentos tributarios usando LangChain y GPT-4o/GPT-4o-mini.

## Arquitectura

### Principios SOLID Aplicados

1. **Single Responsibility Principle (SRP)**:
   - `InvoiceScannerService`: Responsable únicamente del escaneo y extracción de datos
   - `DocumentsService`: Responsable de la lógica de negocio de documentos
   - `DocumentsController`: Responsable únicamente del manejo de HTTP

2. **Open/Closed Principle (OCP)**:
   - El servicio de escaneo es extensible para nuevos tipos de documentos sin modificar código existente

3. **Liskov Substitution Principle (LSP)**:
   - Los servicios implementan interfaces claras y pueden ser sustituidos

4. **Interface Segregation Principle (ISP)**:
   - Interfaces y DTOs específicos para cada operación

5. **Dependency Inversion Principle (DIP)**:
   - El servicio depende de abstracciones (ConfigService) no de implementaciones concretas

## Estructura de Archivos

```
documents/
├── services/
│   └── invoice-scanner.service.ts    # Servicio de escaneo con LangChain
├── dto/
│   └── scan-invoice.dto.ts           # DTO para el endpoint de escaneo
├── documents.controller.ts           # Controlador con endpoint /scan
├── documents.service.ts              # Servicio extendido con scanAndCreateDocument
└── documents.module.ts                # Módulo con InvoiceScannerService
```

## Configuración

### Variables de Entorno

Asegúrate de tener configurada la siguiente variable en tu archivo `.env`:

```env
OPENAI_API_KEY=sk-tu-clave-api-aqui
```

### Dependencias

El módulo requiere las siguientes dependencias (ya incluidas en package.json):

- `langchain`: Framework para trabajar con modelos de lenguaje
- `@langchain/openai`: Integración con OpenAI

Para instalar:

```bash
npm install langchain @langchain/openai
```

## Uso

### Endpoint de Escaneo

**POST** `/documents/scan`

Envía una imagen de factura para escanear y extraer información automáticamente.

### Tipos de Documentos Soportados

- FACTURA
- BOLETA DE VENTA
- GUÍA DE REMISIÓN
- NOTA DE CRÉDITO
- NOTA DE DÉBITO
- RECIBO POR HONORARIOS

## Optimización de Base de Datos

Se han agregado los siguientes índices para optimizar las consultas:

1. **Índice para verificación de duplicados**:
   ```javascript
   { numeroDocumento: 1, serie: 1, isActive: 1 }
   ```

2. **Índice para búsqueda por categoría y número**:
   ```javascript
   { categoria: 1, numeroDocumento: 1 }
   ```

Estos índices aseguran consultas rápidas cuando se verifica si un documento ya existe después del escaneo.

## Flujo de Escaneo

1. **Recepción de Imagen**: El controlador recibe la imagen vía multipart/form-data
2. **Validación**: Se valida el tipo de archivo (JPEG, PNG, WebP)
3. **Escaneo**: Se utiliza GPT-4o para extraer datos (fallback a GPT-4o-mini)
4. **Validación de Datos**: Se valida y limpia la información extraída
5. **Almacenamiento**: La imagen se sube a S3
6. **Creación de Documento**: Si `autoCreate=true`, se crea el documento en la BD

## Manejo de Errores

El servicio implementa un sistema robusto de manejo de errores:

- **Errores de validación**: Tipo de archivo no soportado, datos inválidos
- **Errores de escaneo**: Fallo del modelo, respuesta inválida
- **Errores de negocio**: Documento duplicado, proyecto inexistente

## Testing

Para probar el endpoint:

```bash
curl -X POST http://localhost:3026/documents/scan \
  -F "file=@factura.jpg" \
  -F "proyectoId=64a1b2c3d4e5f6789abcdef0" \
  -F "autoCreate=true"
```

## Notas de Implementación

- El servicio intenta primero con GPT-4o y automáticamente hace fallback a GPT-4o-mini si es necesario
- Los datos extraídos se validan antes de crear el documento
- La imagen siempre se sube a S3, incluso si `autoCreate=false`
- Se verifica duplicados antes de crear nuevos documentos

