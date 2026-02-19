# Refactoring Sergio Nolasco Page to Lead Form

## Overview
Refactored the `/sergionolasco` page from a User Registration system to a Lead Capture system (CRM style).

## Changes

### Backend (`momentum-back`)
- **Schema**: Updated `Registration` schema in `registration.schema.ts`.
    - Added: `dni`, `fechaNacimiento`, `direccion`, `nickname`.
    - Modified: Made `pais` and `capitulo` optional.
- **DTO**: Updated `CreateRegistrationDto`.
    - Added validations for new fields (optional).
    - Relaxed validations for `pais` and `capitulo`.

### Frontend (`momentum`)
- **Service**: Updated `MomentumRegistrationService` interface to include new fields.
- **Component (`sergionolasco.ts`)**:
    - Changed default `viewState` to `'register'`.
    - Updated `registrationData` to include new fields.
    - Modified `submitRegistration` to display success message ("finalizar su registro ha sido exito") and NOT auto-login.
- **Template (`sergionolasco.html`)**:
    - Changed title to "Requisitos para tú inscripción".
    - Implemented new form fields:
        1. Nombre completo
        2. DNI
        3. Fecha de nacimiento
        4. Dirección
        5. Correo
        6. Teléfono
        7. Como te gustaría que te llamen (Nickname)
    - Removed old fields (Password, Social Media, etc.) from the view.
    - Updated "Login" link to be more subtle/admin-focused.

## Next Steps
- Verify admin view to ensure leads are visible (using existing `getAllRegistrations` or `contacts`).
- Ensure admin login still works via the "Iniciar Sesión" link.
