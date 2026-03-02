import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-doc-compras',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.scss',
})
export class DocComprasPage {
  title = 'Compras';
  /** Contenido basado en Especificaciones Funcionales: Módulo de Logística (Momentum ERP) */
  content = `
    <p class="lead">El módulo de Compras forma parte de <strong>Logística</strong> y cubre todo el flujo desde el catálogo de productos hasta el registro de facturas y el cierre con Cuentas por Pagar.</p>

    <figure class="doc-figure my-8">
      <img src="/images/docs/flujo-modulo-logistica.png" alt="Flujo del módulo de Logística: Catálogo, RFQ, Cotizaciones, Órdenes de Compra, Recepciones, Calificación de Proveedores y Facturas de Compra" class="w-full max-w-4xl rounded-lg border border-gray-200 shadow-sm" />
      <figcaption class="text-sm text-gray-500 mt-2 text-center">Flujo del proceso de compras en el módulo de Logística</figcaption>
    </figure>

    <h2>0. Reorganización del menú principal</h2>
    <p>Se crea el nodo principal <strong>Logística</strong>. La sección de proveedores se integra aquí como base del módulo.</p>
    <ul>
      <li>Menú &gt; Logística</li>
      <li>Proveedores</li>
      <li>Catálogo de Compras</li>
      <li>Solicitudes de Cotización (RFQ)</li>
      <li>Cotizaciones y Comparativa</li>
      <li>Órdenes de Compra</li>
      <li>Recepciones (Vistos Buenos)</li>
      <li>Facturas de Compra</li>
    </ul>

    <h2>1. Proveedores (Directorio y Calificación)</h2>
    <p>Panel maestro de las entidades a las que se les compra. Reemplaza y mejora la vista actual.</p>
    <ul>
      <li><strong>Listado interactivo:</strong> Tabla con búsqueda rápida, filtros por categoría y columnas de estado (Activo/Inactivo).</li>
      <li><strong>Ficha del proveedor (Crear/Editar):</strong> RUC, Razón Social, contactos múltiples y cuentas bancarias.</li>
      <li><strong>Motor de calificación (rating):</strong> Cada proveedor muestra un puntaje global (ej. 4.5/5). El sistema lo calcula con datos de Recepciones: a tiempo (fecha OC vs recepción), completo (cantidad OC vs recibida) y calidad (puntaje manual 1 a 5).</li>
      <li><strong>Historial conectado:</strong> En el perfil del proveedor, pestañas con todas sus OC, cotizaciones y facturas.</li>
    </ul>

    <h2>2. Catálogo de Productos y Servicios (Adquisiciones)</h2>
    <p>Administra la base de lo que la empresa consume y evita texto libre con errores al pedir compras.</p>
    <ul>
      <li><strong>Ficha de ítem:</strong> Bienes (físicos) o servicios (intangibles). SKU, nombre, unidad de medida (Cajas, Litros, Horas, etc.) y categoría de gasto.</li>
      <li><strong>Multi-moneda y costo base:</strong> Costo referencial para alertas de sobreprecio.</li>
    </ul>

    <h2>3. Solicitudes de Cotización (RFQ)</h2>
    <p>Inicio del flujo de compras con asistente paso a paso (Stepper).</p>
    <ul>
      <li><strong>Paso 1 – Detalle del requerimiento:</strong> Búsqueda de productos en el catálogo. Si no existe, opción [ + Crear nuevo producto ] en ventana emergente.</li>
      <li><strong>Paso 2 – Selección de proveedores:</strong> Buscador múltiple con calificación (estrellas). Opción [ + Crear Proveedor ] embebida si no existe.</li>
      <li><strong>Paso 3 – Envío:</strong> Genera documento y envío por correo desde el ERP.</li>
    </ul>

    <h2>4. Cotizaciones y Comparativa</h2>
    <p>Concentra las respuestas de proveedores y apoya la decisión con una matriz comparativa.</p>
    <ul>
      <li><strong>Bandeja:</strong> Vista tarjetas o lista con etiquetas: Completada, Requiere Ajuste, Pendiente. Botón "Solicitar Cambio" para registrar petición de descuento o mejora.</li>
      <li><strong>Matriz comparadora:</strong> Filas = productos, columnas = proveedores. Verde claro = mejor precio unitario, azul claro = menor tiempo de entrega. Checkboxes para adjudicar ítems y botón "Generar Orden de Compra".</li>
    </ul>

    <h2>5. Órdenes de Compra (con aprobaciones)</h2>
    <p>Convierte la adjudicación en compromiso formal, con filtro de autorización por monto.</p>
    <ul>
      <li><strong>Generación automática:</strong> La OC se pre-llena (proveedor, ítems, precios, IGV, totales).</li>
      <li><strong>Bloqueo anti-edición:</strong> Una vez generada, los precios no se pueden subir (solo bajar o corregir).</li>
      <li><strong>Flujo de aprobación:</strong> Según monto, estado Pendiente de Aprobación; notificación al aprobador; botones Aprobar / Rechazar (con comentario).</li>
      <li><strong>Exportación y envío:</strong> PDF y envío por email al proveedor.</li>
    </ul>

    <h2>6. Recepciones (Vistos Buenos)</h2>
    <p>Cierra la brecha entre lo comprado y lo realmente entregado.</p>
    <ul>
      <li><strong>De OC a recepción:</strong> Se elige una OC Aprobada y se hace clic en "Recibir".</li>
      <li><strong>Checklist de entrega:</strong> Se muestra lo esperado y se ingresa la cantidad recibida real.</li>
      <li><strong>Calificación:</strong> Al guardar, el sistema compara fechas y cantidades (alimenta el rating del proveedor). Selector obligatorio de 1 a 5 estrellas para calidad antes de guardar.</li>
    </ul>

    <h2>7. Facturas de Compra (Cruce a 3 vías)</h2>
    <p>Conecta Logística con Finanzas/Contabilidad.</p>
    <ul>
      <li><strong>Registro:</strong> Serie, número, fecha de emisión y archivo adjunto (PDF/XML).</li>
      <li><strong>Vinculación (match 3 vías):</strong> La factura debe vincularse a una OC y a una Recepción. Si el monto no cuadra con la OC, alerta y bloqueo o justificación.</li>
      <li><strong>Cierre de ciclo:</strong> Estado "Cuenta por Pagar" para que Finanzas programe el desembolso.</li>
    </ul>
  `;
}
