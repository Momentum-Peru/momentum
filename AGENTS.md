# Guía del Agente (Tecmeing)

Este proyecto usa **Cursor Rules** y **Skills** para que el asistente siga las convenciones del equipo.

## Reglas (.cursor/rules/)

- **cursor.mdc**: Estándares Angular 20 y TypeScript (siempre aplicada).
- **tailwind-ui.mdc**: UI Mobile First con Tailwind puro. Usar estrictamente la línea gráfica (`alan-sans`, `playfair`, paleta). PrimeNG está deprecado para nuevos componentes y se retirará gradualmente al actualizar componentes existentes (aplica en `**/*.html` y `**/*.scss`).

El agente debe respetar estas reglas al generar o modificar código.

## Skills (.cursor/skills/)

Skills son conjuntos de instrucciones que el agente aplica cuando el contexto lo requiere:

- **angular-tecmeing**: Componentes, servicios, plantillas y estructura del proyecto Angular 20.
- **api-and-http**: Servicios HTTP, `environment`, interceptors y manejo de errores.

No es necesario invocarlos manualmente; el agente los usa según la descripción de cada skill.

## Buenas prácticas

1. **Tipado**: Sin `any`; usar interfaces en `shared/interfaces/`.
2. **Inyección**: `inject()` en lugar de constructor.
3. **Estado**: Signals y `computed()`; OnPush en componentes.
4. **APIs**: URLs en `environment.ts`; un servicio por dominio.
5. **Plantillas**: `@if`, `@for` con `track`, `async` pipe.

Ver `.cursor/rules/` y `.cursor/skills/*/SKILL.md` para detalle.

## Eficiencia y Modelos LLM (Claude/Gemini)

- Sistema configurado con `claude-token-efficient` (`CLAUDE.md`).
- **Respuestas directas**: Sin verborrea ("sycophantic fluff"), explicaciones redundantes ni preámbulos.
- **Contexto**: Pensar y leer archivos antes de modificarlos. 
- **Edición modular**: Previene cambiar archivos completos cuando solo se busca editar un bloque.
