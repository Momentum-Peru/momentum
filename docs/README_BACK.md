# 📚 Documentación Completa de Endpoints - Momentum API

## 🚀 Resumen General

Esta API proporciona un sistema completo de autenticación con JWT y Google OAuth2, incluyendo gestión de usuarios y acceso continuo al calendario de Google.

**Base URL**: `http://localhost:3026`  
**Documentación Swagger**: `http://localhost:3026/api/docs`

---

## 📋 Endpoints por Categoría

### 🏠 **Aplicación Principal**

| Método | Endpoint | Descripción           | Autenticación |
| ------ | -------- | --------------------- | ------------- |
| `GET`  | `/`      | Mensaje de bienvenida | ❌            |

### 🔐 **Autenticación Tradicional**

| Método | Endpoint         | Descripción                | Autenticación |
| ------ | ---------------- | -------------------------- | ------------- |
| `POST` | `/auth/register` | Registrar nuevo usuario    | ❌            |
| `POST` | `/auth/login`    | Iniciar sesión             | ❌            |
| `GET`  | `/auth/profile`  | Obtener perfil del usuario | ✅ JWT        |

### 🔗 **Google OAuth2**

| Método | Endpoint                     | Descripción                      | Autenticación |
| ------ | ---------------------------- | -------------------------------- | ------------- |
| `GET`  | `/auth/google`               | Iniciar autenticación con Google | ❌            |
| `GET`  | `/auth/google/callback`      | Callback de Google OAuth2        | ❌            |
| `GET`  | `/auth/google/token-info`    | Información de tokens de Google  | ✅ JWT        |
| `POST` | `/auth/google/refresh-token` | Renovar access token de Google   | ✅ JWT        |
| `POST` | `/auth/google/disconnect`    | Desconectar cuenta de Google     | ✅ JWT        |
| `GET`  | `/auth/google/status`        | Estado de conexión con Google    | ✅ JWT        |
| `GET`  | `/auth/google/config-status` | Estado de configuración OAuth2   | ❌            |

### 👥 **Gestión de Usuarios**

| Método   | Endpoint     | Descripción                | Autenticación | Roles            |
| -------- | ------------ | -------------------------- | ------------- | ---------------- |
| `GET`    | `/users`     | Lista paginada de usuarios | ✅ JWT        | admin, moderator |
| `GET`    | `/users/:id` | Obtener usuario por ID     | ✅ JWT        | admin, moderator |
| `DELETE` | `/users/:id` | Eliminar usuario           | ✅ JWT        | admin            |

### 📱 **Gestión de Teléfonos**

| Método   | Endpoint               | Descripción                  | Autenticación | Roles       |
| -------- | ---------------------- | ---------------------------- | ------------- | ----------- |
| `POST`   | `/phones`              | Crear teléfono               | ✅ JWT        | admin, user |
| `GET`    | `/phones`              | Lista paginada de teléfonos  | ✅ JWT        | admin       |
| `GET`    | `/phones/:id`          | Obtener teléfono por ID      | ✅ JWT        | admin, user |
| `GET`    | `/phones/user/:userId` | Obtener teléfono por usuario | ✅ JWT        | admin, user |
| `PATCH`  | `/phones/:id`          | Actualizar teléfono          | ✅ JWT        | admin, user |
| `PATCH`  | `/phones/:id/verify`   | Verificar teléfono           | ✅ JWT        | admin       |
| `DELETE` | `/phones/:id`          | Eliminar teléfono            | ✅ JWT        | admin, user |

---

## 🔍 Detalles de Endpoints

### 🏠 **Aplicación Principal**

#### `GET /`

**Descripción**: Endpoint de bienvenida de la aplicación.

**Respuesta**:

```json
"Momentum API - Sistema de autenticación y gestión de usuarios"
```

---

### 🔐 **Autenticación Tradicional**

#### `POST /auth/register`

**Descripción**: Registra un nuevo usuario en el sistema.

**Body**:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "miPassword123",
  "role": "user"
}
```

**Respuesta**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "usuario@ejemplo.com",
    "name": "Usuario",
    "role": "user",
    "isActive": true
  }
}
```

**Códigos de Error**:

- `400`: Datos de entrada inválidos
- `409`: Usuario ya existe

#### `POST /auth/login`

**Descripción**: Autentica un usuario existente.

**Body**:

```json
{
  "email": "usuario@ejemplo.com",
  "password": "miPassword123"
}
```

**Respuesta**:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "user",
    "isActive": true
  }
}
```

**Códigos de Error**:

- `400`: Datos de entrada inválidos
- `401`: Credenciales inválidas

#### `GET /auth/profile`

**Descripción**: Obtiene el perfil del usuario autenticado.

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Respuesta**:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "googleId": "1234567890123456789",
  "profilePicture": "https://lh3.googleusercontent.com/a/...",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido

---

### 🔗 **Google OAuth2**

#### `GET /auth/google`

**Descripción**: Inicia el flujo de autenticación con Google OAuth2.

**Respuesta**: Redirección a Google (302)

**Uso en Frontend**:

```html
<a href="http://localhost:3026/auth/google" class="google-login-btn">
  <img src="google-icon.png" alt="Google" />
  Iniciar sesión con Google
</a>
```

#### `GET /auth/google/callback`

**Descripción**: Maneja la respuesta de Google después de la autenticación.

**Respuesta**: Redirección al frontend con tokens:

```
http://localhost:3000/auth/callback?token=JWT_TOKEN&user=USER_INFO
```

#### `GET /auth/google/token-info`

**Descripción**: Obtiene información sobre los tokens de Google del usuario.

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Respuesta**:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "usuario@gmail.com",
  "scope": "https://www.googleapis.com/auth/calendar",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "tokenCreatedAt": "2024-01-15T10:30:00.000Z",
  "lastRefreshedAt": "2024-01-15T10:30:00.000Z",
  "isActive": true,
  "isExpired": false
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `404`: No hay tokens de Google disponibles

#### `POST /auth/google/refresh-token`

**Descripción**: Renueva el access token de Google usando el refresh token.

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Respuesta**:

```json
{
  "accessToken": "ya29.a0AfH6SMC...",
  "expiresIn": 3600,
  "refreshedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido o refresh token inválido

#### `POST /auth/google/disconnect`

**Descripción**: Desconecta la cuenta de Google del usuario.

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Respuesta**:

```json
{
  "message": "Cuenta de Google desconectada exitosamente",
  "disconnectedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido

#### `GET /auth/google/status`

**Descripción**: Verifica si el usuario tiene Google conectado.

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Respuesta**:

```json
{
  "hasGoogleConnected": true,
  "email": "usuario@gmail.com"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido

#### `GET /auth/google/config-status`

**Descripción**: Verifica si Google OAuth2 está configurado correctamente.

**Respuesta**:

```json
{
  "isConfigured": false,
  "message": "Google OAuth2 no está configurado. Configura las credenciales en Google Cloud Console.",
  "setupInstructions": [
    "1. Ve a Google Cloud Console (https://console.cloud.google.com/)",
    "2. Crea un proyecto o selecciona uno existente",
    "3. Habilita Google Calendar API y Google+ API",
    "4. Ve a \"Credenciales\" y crea credenciales OAuth2",
    "5. Configura URIs autorizados: http://localhost:3026/auth/google/callback",
    "6. Configura orígenes JavaScript: http://localhost:3000",
    "7. Actualiza las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el archivo .env",
    "8. Reinicia la aplicación"
  ]
}
```

---

### 👥 **Gestión de Usuarios**

#### `GET /users`

**Descripción**: Obtiene una lista paginada de usuarios (solo admin y moderator).

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:

- `page` (opcional): Número de página (por defecto: 1)
- `limit` (opcional): Límite de usuarios por página (por defecto: 10)

**Ejemplo**: `GET /users?page=1&limit=10`

**Respuesta**:

```json
{
  "users": [
    {
      "id": "507f1f77bcf86cd799439011",
      "email": "usuario1@ejemplo.com",
      "name": "Usuario 1",
      "role": "user",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 3
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `403`: Acceso denegado - Se requieren permisos de administrador o moderador

#### `GET /users/:id`

**Descripción**: Obtiene un usuario específico por ID (solo admin y moderator).

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Path Parameters**:

- `id`: ID del usuario

**Ejemplo**: `GET /users/507f1f77bcf86cd799439011`

**Respuesta**:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "usuario@ejemplo.com",
  "name": "Juan Pérez",
  "role": "user",
  "isActive": true,
  "googleId": "1234567890123456789",
  "profilePicture": "https://lh3.googleusercontent.com/a/...",
  "lastLogin": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `403`: Acceso denegado
- `404`: Usuario no encontrado

#### `DELETE /users/:id`

**Descripción**: Elimina un usuario del sistema (solo admin).

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Path Parameters**:

- `id`: ID del usuario

**Ejemplo**: `DELETE /users/507f1f77bcf86cd799439011`

**Respuesta**:

```json
{
  "message": "Usuario eliminado exitosamente",
  "deletedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `403`: Acceso denegado - Se requieren permisos de administrador
- `404`: Usuario no encontrado

---

### 📱 **Gestión de Teléfonos**

#### `POST /phones`

**Descripción**: Crea un nuevo teléfono para un usuario.

**Headers**:

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+1234567890",
  "isActive": true,
  "isVerified": false
}
```

**Respuesta (201)**:

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+1234567890",
  "isActive": true,
  "isVerified": false,
  "verifiedAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Códigos de Error**:

- `400`: Datos de entrada inválidos
- `409`: El usuario ya tiene un teléfono activo o el número ya está en uso

#### `GET /phones`

**Descripción**: Obtiene una lista paginada de todos los teléfonos (solo administradores).

**Headers**:

```
Authorization: Bearer <admin_token>
```

**Query Parameters**:

- `page` (opcional): Número de página (por defecto: 1)
- `limit` (opcional): Límite de resultados por página (por defecto: 10)

**Respuesta (200)**:

```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "phone": "+1234567890",
      "isActive": true,
      "isVerified": false,
      "verifiedAt": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `403`: Acceso denegado - Se requieren permisos de administrador

#### `GET /phones/:id`

**Descripción**: Obtiene un teléfono específico por su ID.

**Headers**:

```
Authorization: Bearer <token>
```

**Respuesta (200)**:

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+1234567890",
  "isActive": true,
  "isVerified": false,
  "verifiedAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `404`: Teléfono no encontrado

#### `GET /phones/user/:userId`

**Descripción**: Obtiene el teléfono activo de un usuario específico.

**Headers**:

```
Authorization: Bearer <token>
```

**Respuesta (200)**:

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+1234567890",
  "isActive": true,
  "isVerified": false,
  "verifiedAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `404`: Usuario no encontrado o sin teléfono

#### `PATCH /phones/:id`

**Descripción**: Actualiza los datos de un teléfono existente.

**Headers**:

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:

```json
{
  "phone": "+0987654321",
  "isActive": true,
  "isVerified": true
}
```

**Respuesta (200)**:

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+0987654321",
  "isActive": true,
  "isVerified": true,
  "verifiedAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `404`: Teléfono no encontrado
- `409`: El número de teléfono ya está en uso

#### `PATCH /phones/:id/verify`

**Descripción**: Marca un teléfono como verificado (solo administradores).

**Headers**:

```
Authorization: Bearer <admin_token>
```

**Respuesta (200)**:

```json
{
  "id": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "phone": "+1234567890",
  "isActive": true,
  "isVerified": true,
  "verifiedAt": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `403`: Acceso denegado - Se requieren permisos de administrador
- `404`: Teléfono no encontrado

#### `DELETE /phones/:id`

**Descripción**: Elimina un teléfono (soft delete).

**Headers**:

```
Authorization: Bearer <token>
```

**Respuesta (200)**:

```json
{
  "message": "Teléfono eliminado exitosamente"
}
```

**Códigos de Error**:

- `401`: Token de acceso requerido
- `404`: Teléfono no encontrado

---

## 🔐 **Autenticación y Autorización**

### **JWT Token**

Todos los endpoints protegidos requieren un token JWT en el header:

```
Authorization: Bearer <jwt_token>
```

### **Roles de Usuario**

- `user`: Usuario básico
- `moderator`: Moderador (puede ver usuarios)
- `admin`: Administrador (puede ver y eliminar usuarios)

### **Códigos de Estado HTTP**

- `200`: Éxito
- `201`: Creado exitosamente
- `400`: Solicitud incorrecta
- `401`: No autorizado
- `403`: Prohibido
- `404`: No encontrado
- `409`: Conflicto
- `500`: Error interno del servidor

---

## 🚀 **Flujo de Autenticación Completo**

### **1. Autenticación Tradicional**

```
1. POST /auth/register → Crear cuenta
2. POST /auth/login → Obtener JWT
3. GET /auth/profile → Acceder a perfil protegido
```

### **2. Autenticación con Google OAuth2**

```
1. GET /auth/google → Redirigir a Google
2. Usuario autoriza en Google
3. GET /auth/google/callback → Procesar respuesta
4. Redirección al frontend con JWT
5. GET /auth/google/status → Verificar conexión
6. GET /auth/google/token-info → Ver tokens
7. POST /auth/google/refresh-token → Renovar si es necesario
8. POST /auth/google/disconnect → Desconectar cuando sea necesario
```

### **3. Gestión de Usuarios (Admin/Moderator)**

```
1. POST /auth/login → Autenticarse como admin
2. GET /users → Ver lista de usuarios
3. GET /users/:id → Ver usuario específico
4. DELETE /users/:id → Eliminar usuario (solo admin)
```

### **4. Gestión de Teléfonos**

```
1. POST /auth/login → Autenticarse
2. POST /phones → Crear teléfono para usuario
3. GET /phones/user/:userId → Obtener teléfono de usuario
4. PATCH /phones/:id → Actualizar teléfono
5. PATCH /phones/:id/verify → Verificar teléfono (admin)
6. DELETE /phones/:id → Eliminar teléfono
```

---

## 📊 **Modelos de Datos**

### **User**

```typescript
{
  id: string;
  email: string;
  name: string;
  password?: string; // Solo para usuarios tradicionales
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  googleId?: string;
  profilePicture?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### **GoogleToken**

```typescript
{
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  tokenCreatedAt: Date;
  lastRefreshedAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### **Phone**

```typescript
{
  id: string;
  userId: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### **AuthResponse**

```typescript
{
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
}
```

---

## 🔧 **Configuración Requerida**

### **Variables de Entorno**

```env
# Base de datos
MONGO_URI=mongodb://localhost:27017/Momentum

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=24h

# Google OAuth2
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3026/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000
```

### **Google Cloud Console**

1. Crear proyecto en Google Cloud Console
2. Habilitar Google Calendar API y Google+ API
3. Crear credenciales OAuth2
4. Configurar URIs autorizados y orígenes JavaScript

---

## 📱 **Ejemplos de Uso**

### **Frontend - Login con Google**

```javascript
// Redirigir a Google OAuth
window.location.href = 'http://localhost:3026/auth/google';

// Manejar callback
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const user = JSON.parse(decodeURIComponent(urlParams.get('user')));
```

### **Frontend - API Calls**

```javascript
// Obtener perfil
const response = await fetch('http://localhost:3026/auth/profile', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// Obtener información de Google
const googleInfo = await fetch('http://localhost:3026/auth/google/token-info', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// Crear teléfono
const phone = await fetch('http://localhost:3026/phones', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: '507f1f77bcf86cd799439011',
    phone: '+1234567890',
  }),
});

// Obtener teléfono de usuario
const userPhone = await fetch('http://localhost:3026/phones/user/507f1f77bcf86cd799439011', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 🎯 **Próximos Pasos**

1. **Configurar Google Cloud Console** con credenciales reales
2. **Implementar frontend** usando los endpoints documentados
3. **Probar flujo completo** de autenticación
4. **Implementar funcionalidades de calendario** usando los tokens de Google
5. **Implementar gestión de teléfonos** en el frontend
6. **Configurar monitoreo** y logs
7. **Desplegar en producción** con HTTPS

¡El sistema está completamente documentado y listo para ser integrado con cualquier frontend! 🚀
