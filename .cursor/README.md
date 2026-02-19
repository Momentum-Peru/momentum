# Cursor: Rules y Skills (Tecmeing)

## Rules (Reglas)

Archivos `.mdc` en `.cursor/rules/` que el agente aplica automáticamente:

| Archivo           | Descripción                          | Cuándo aplica      |
|-------------------|--------------------------------------|--------------------|
| `cursor.mdc`      | Angular 20, TypeScript, componentes  | Siempre            |
| `tailwind-ui.mdc` | Tailwind, PrimeNG, Mobile First      | En `.html` y `.scss` |

Para añadir una regla: crear un `.mdc` con frontmatter `description`, `globs` (opcional) y `alwaysApply` (opcional). Ver [create-rule](https://docs.cursor.com) para el formato.

## Skills (Habilidades)

Carpetas en `.cursor/skills/` con un `SKILL.md` que describe cuándo y cómo aplicar el skill:

| Skill               | Uso                                  |
|---------------------|--------------------------------------|
| `angular-tecmeing`  | Componentes, rutas, servicios, plantillas |
| `api-and-http`      | Servicios HTTP, environment, interceptors |

Para crear un skill: carpeta `nombre-skill/` con `SKILL.md` (frontmatter `name` y `description`). Descripción en tercera persona e incluir términos que disparen su uso.

## Versiones del proyecto

- Angular 20.2.x, TypeScript 5.9.x, PrimeNG 20.2, Tailwind 3.4, RxJS 7.8.

El agente debe alinear las sugerencias con estas versiones y con las reglas y skills definidos aquí.
