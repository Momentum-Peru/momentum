---
name: angular-tecmeing
description: Guía de desarrollo Angular 20 en Tecmeing con PrimeNG, Tailwind y arquitectura limpia. Usar al crear o modificar componentes, rutas, servicios o plantillas en el proyecto.
---

# Angular Tecmeing

## Stack y versiones

- **Angular**: 20.2.x (standalone por defecto, sin NgModules)
- **TypeScript**: 5.9.x (tipado estricto, sin `any`)
- **PrimeNG**: 20.2.x con preset Maya (sin dark mode)
- **Tailwind**: 3.4.x (Mobile First)
- **RxJS**: 7.8.x

## Estructura del proyecto

- **core/**: servicios singleton, interceptors, guards, modelos base
- **shared/**: interfaces, servicios compartidos, componentes reutilizables
- **pages/**: componentes de ruta (una carpeta por ruta)
- **components/**: componentes de layout o globales (menu, notifications-bell)
- **layouts/**: layouts (main con sidebar)
- **guards/**, **interceptors/**: en `core` o raíz de app según convención del repo

## Componentes

- Standalone; no poner `standalone: true` (es el valor por defecto).
- `changeDetection: ChangeDetectionStrategy.OnPush`.
- Inyección con `inject()`, no en constructor.
- `input()` y `output()` en lugar de decoradores.
- Estado local con signals; derivados con `computed()`.
- Host en el decorador: `host: { class: '...', '(click)': '...' }` en lugar de `@HostBinding`/`@HostListener`.

## Plantillas

- Control de flujo nativo: `@if`, `@for`, `@switch`, `@defer`.
- En `@for` usar `track` con función (p. ej. `track item.id` o `trackByFn`).
- Preferir `async` pipe para observables; evitar suscripciones manuales en componentes cuando sea posible.

## Servicios

- Una responsabilidad por servicio (SRP).
- `@Injectable({ providedIn: 'root' })` para singletons.
- `inject(HttpClient)` y URLs base desde `environment.apiUrl`.

## Recursos

- Reglas del proyecto: `.cursor/rules/cursor.mdc` y `tailwind-ui.mdc`.
- APIs y HTTP: skill `api-and-http` cuando se trabaje con servicios o interceptors.
