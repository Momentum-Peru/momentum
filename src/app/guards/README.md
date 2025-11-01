# 🔐 Sistema de Guards de Autenticación - Momentum

## 📋 Resumen

Este sistema implementa guards de autenticación que manejan automáticamente la navegación basada en el estado de autenticación del usuario.

## 🎯 Funcionalidades

### 1. **Redirección desde Login**

- Si el usuario ya está autenticado y trata de acceder a `/ingreso`, es redirigido automáticamente a `/calendario`

### 2. **Protección de Rutas**

- Si el usuario no está autenticado y trata de acceder a cualquier ruta protegida, es redirigido a `/ingreso`
- Las rutas `/registro` y `/ingreso` son públicas y no requieren autenticación

### 3. **Manejo de Errores 401**

- Si cualquier endpoint devuelve un error 401, el usuario es automáticamente deslogueado y redirigido al login

## 🛡️ Guards Implementados

### `publicGuard`

- **Propósito**: Protege páginas públicas (login, registro)
- **Comportamiento**: Redirige al home si el usuario ya está autenticado
- **Rutas**: `/ingreso`, `/registro`

### `requireAuthGuard`

- **Propósito**: Protege páginas que requieren autenticación
- **Comportamiento**: Redirige al login si el usuario no está autenticado
- **Rutas**: Todas las rutas protegidas (calendario, etc.)

### `authGuard` (Guard general)

- **Propósito**: Maneja ambos casos en un solo guard
- **Comportamiento**: Lógica combinada de los dos guards anteriores

## 🔧 Interceptor de Autenticación

### `authInterceptor`

- **Propósito**: Intercepta todas las peticiones HTTP
- **Comportamiento**:
  - Detecta errores 401 automáticamente
  - Desloguea al usuario y redirige al login
  - No interfiere con las páginas públicas

## 📁 Estructura de Archivos

```
src/app/
├── guards/
│   └── auth.guard.ts          # Guards de autenticación
├── interceptors/
│   └── auth.interceptor.ts    # Interceptor HTTP
├── pages/login/services/
│   └── auth.service.ts       # Servicio de autenticación
└── app.routes.ts             # Configuración de rutas
```

## 🚀 Configuración de Rutas

```typescript
export const routes: Routes = [
  {
    path: 'ingreso',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [publicGuard], // Solo usuarios no autenticados
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
    canActivate: [publicGuard], // Solo usuarios no autenticados
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main/main').then((m) => m.Main),
    canActivate: [requireAuthGuard], // Solo usuarios autenticados
    children: [
      {
        path: 'calendario',
        loadComponent: () => import('./pages/calendar/calendar').then((m) => m.Calendar),
      },
    ],
  },
];
```

## 🔄 Flujo de Autenticación

### Usuario No Autenticado

1. Intenta acceder a `/calendario`
2. `requireAuthGuard` detecta que no está autenticado
3. Redirige automáticamente a `/ingreso`
4. Usuario se autentica
5. `publicGuard` detecta que ahora está autenticado
6. Redirige automáticamente a `/calendario`

### Usuario Autenticado

1. Intenta acceder a `/ingreso`
2. `publicGuard` detecta que ya está autenticado
3. Redirige automáticamente a `/calendario`

### Token Expirado

1. Usuario está en `/calendario`
2. Hace una petición HTTP que devuelve 401
3. `authInterceptor` detecta el error 401
4. Desloguea automáticamente al usuario
5. Redirige automáticamente a `/ingreso`

## 🎪 Ejemplos de Uso

### En Componentes

```typescript
// No es necesario manejar redirecciones manualmente
// Los guards se encargan automáticamente

export class LoginComponent {
  async onSubmit(): Promise<void> {
    try {
      await firstValueFrom(this.authService.login(loginData));
      // El guard redirigirá automáticamente
      // No necesitas this.router.navigate(['/calendario'])
    } catch (error) {
      // Manejar errores
    }
  }
}
```

### En Servicios

```typescript
// El interceptor maneja automáticamente los errores 401
// No necesitas verificar manualmente el estado de autenticación

export class DataService {
  getData(): Observable<any> {
    return this.http.get('/api/data');
    // Si devuelve 401, el interceptor maneja la redirección
  }
}
```

## ✅ Beneficios

1. **🔄 Automático**: No necesitas manejar redirecciones manualmente
2. **🛡️ Seguro**: Todas las rutas están protegidas automáticamente
3. **🎯 Consistente**: Comportamiento uniforme en toda la aplicación
4. **🔧 Mantenible**: Lógica centralizada en guards e interceptors
5. **📱 UX Mejorada**: Transiciones suaves sin interrupciones

## 🚀 Próximos Pasos

1. **Probar el flujo completo** de autenticación
2. **Agregar más rutas protegidas** según sea necesario
3. **Implementar roles** si es requerido
4. **Agregar logging** para debugging
5. **Optimizar rendimiento** si es necesario

¡El sistema de guards está completamente implementado y listo para usar! 🎉
