# Mapeo del Proyecto Frontend - IAprendiendo

## Estructura General del Proyecto

```
IAprendiendo_FrontEnd/
├── package.json                    # Configuración y dependencias
├── vite.config.js                  # Configuración de Vite
├── eslint.config.js                # Configuración de ESLint
├── index.html                      # HTML principal
├── src/
│   ├── main.jsx                    # Punto de entrada de React
│   ├── App.jsx                     # Componente raíz con routing
│   ├── index.css                   # Estilos globales
│   ├── assets/                     # Recursos estáticos (imágenes, etc.)
│   ├── components/                 # Componentes reutilizables
│   │   ├── Navbar.jsx/.css         # Barra de navegación global
│   │   ├── teams/                  # Componentes de equipos
│   │   │   ├── ChannelSidebar.jsx/.css
│   │   │   ├── Chat.jsx/.css
│   │   │   └── InvitationManager.jsx/.css
│   │   └── files/                  # Componentes de archivos
│   │       ├── FileExplorer.jsx/.css
│   │       └── FileSidebar.jsx/.css
│   ├── pages/                      # Páginas principales
│   │   ├── Login.jsx
│   │   ├── Home.jsx
│   │   ├── Teams.jsx
│   │   ├── Team.jsx
│   │   ├── Projects.jsx
│   │   ├── Profile.jsx
│   │   └── InvitePage.jsx
│   ├── services/                   # Servicios de API
│   │   ├── auth.js
│   │   ├── teams.js
│   │   └── files.js
│   └── styles/                     # Hojas de estilo por página
│       ├── Login.css
│       ├── Home.css
│       ├── Teams.css
│       ├── Team.css
│       ├── Projects.css
│       ├── Profile.css
│       └── InvitePage.css
```

---

## Tecnologías Utilizadas

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19.x | Framework UI |
| React Router DOM | 7.x | Navegación/Routing |
| Vite | 8.x | Build tool y dev server |
| ESLint | - | Linting de código |

---

## Sistema de Routing

Definido en `src/App.jsx`:

| Ruta | Componente | Descripción | Autenticación |
|------|------------|-------------|---------------|
| `/` | `Login` | Página de login/registro | No |
| `/home` | `Home` | Dashboard principal | Sí |
| `/teams` | `Teams` | Lista de equipos | Sí |
| `/teams/:teamId` | `Team` | Vista de equipo específico | Sí |
| `/projects` | `Projects` | Proyectos recientes | Sí |
| `/profile` | `Profile` | Página de perfil de usuario | Sí |
| `/invite/:code` | `InvitePage` | Unirse a equipo por invitación | Opcional |
| `*` | Redirect a `/` | Cualquier otra ruta | - |

---

## Servicios de API

### Base URL
```
http://localhost:8000/api/v1
```

### auth.js - Autenticación y Usuarios

| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `login(email, password)` | POST | `/auth/login/` | Iniciar sesión |
| `register(username, email, password, passwordConfirm)` | POST | `/auth/register/` | Registrar usuario |
| `refreshAccessToken()` | POST | `/auth/token/refresh/` | Refrescar JWT |
| `getProfile()` | GET | `/users/me/` | Obtener perfil actual |
| `updateProfile(data)` | PATCH | `/users/me/` | Actualizar perfil |
| `uploadAvatar(file)` | POST | `/users/me/avatar/` | Subir foto de perfil |
| `deleteAvatar()` | DELETE | `/users/me/avatar/` | Eliminar foto de perfil |
| `getAvatarUrl(avatarPath)` | - | - | Helper para URL completa |
| `setTokens(access, refresh)` | - | - | Guardar tokens en localStorage |
| `getAccessToken()` | - | - | Obtener access token |
| `getRefreshToken()` | - | - | Obtener refresh token |
| `clearTokens()` | - | - | Limpiar tokens (logout) |
| `isAuthenticated()` | - | - | Verificar si hay sesión |

### teams.js - Equipos, Canales, Mensajes e Invitaciones

#### Equipos
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getTeams()` | GET | `/teams/` | Listar mis equipos |
| `createTeam(data)` | POST | `/teams/` | Crear equipo |
| `getTeam(teamId)` | GET | `/teams/:id/` | Detalle de equipo |
| `updateTeam(teamId, data)` | PATCH | `/teams/:id/` | Editar equipo |
| `deleteTeam(teamId)` | DELETE | `/teams/:id/` | Eliminar equipo |
| `joinTeam(inviteCode)` | POST | `/teams/join/` | Unirse con código (legacy) |
| `leaveTeam(teamId)` | POST | `/teams/:id/leave/` | Abandonar equipo |
| `regenerateInviteCode(teamId)` | POST | `/teams/:id/regenerate-invite/` | Regenerar código |
| `uploadTeamAvatar(teamId, file)` | POST | `/teams/:id/avatar/` | Subir avatar equipo |
| `deleteTeamAvatar(teamId)` | DELETE | `/teams/:id/avatar/` | Eliminar avatar equipo |

#### Miembros
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getMembers(teamId)` | GET | `/teams/:id/members/` | Listar miembros |
| `updateMember(teamId, userId, data)` | PATCH | `/teams/:id/members/:userId/` | Cambiar rol |
| `removeMember(teamId, userId)` | DELETE | `/teams/:id/members/:userId/` | Expulsar miembro |

#### Canales
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getChannels(teamId)` | GET | `/teams/:id/channels/` | Listar canales |
| `createChannel(teamId, data)` | POST | `/teams/:id/channels/` | Crear canal |
| `getChannel(channelId)` | GET | `/channels/:id/` | Detalle de canal |
| `updateChannel(channelId, data)` | PATCH | `/channels/:id/` | Editar canal |
| `deleteChannel(channelId)` | DELETE | `/channels/:id/` | Eliminar canal |

#### Mensajes
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getMessages(channelId, page)` | GET | `/channels/:id/messages/` | Listar mensajes (paginado) |
| `getRecentMessages(channelId, since)` | GET | `/channels/:id/messages/recent/` | Mensajes nuevos (polling) |
| `sendMessage(channelId, content, replyTo)` | POST | `/channels/:id/messages/` | Enviar mensaje |
| `editMessage(messageId, content)` | PATCH | `/messages/:id/` | Editar mensaje |
| `deleteMessage(messageId)` | DELETE | `/messages/:id/` | Eliminar mensaje |
| `togglePinMessage(messageId)` | POST | `/messages/:id/pin/` | Fijar/desfijar |
| `getPinnedMessages(channelId)` | GET | `/channels/:id/messages/pinned/` | Mensajes fijados |

#### Canales de Voz
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getVoiceParticipants(channelId)` | GET | `/channels/:id/voice/participants/` | Participantes |
| `joinVoiceChannel(channelId)` | POST | `/channels/:id/voice/join/` | Unirse a voz |
| `leaveVoiceChannel(channelId)` | POST | `/channels/:id/voice/leave/` | Salir de voz |
| `updateVoiceStatus(channelId, data)` | PATCH | `/channels/:id/voice/status/` | Actualizar mute/deaf |

#### Invitaciones
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getTeamInvitations(teamId)` | GET | `/teams/:id/invitations/` | Listar invitaciones |
| `createInvitation(teamId, data)` | POST | `/teams/:id/invitations/` | Crear invitación |
| `getInvitation(invitationId)` | GET | `/invitations/:id/` | Ver invitación |
| `deleteInvitation(invitationId)` | DELETE | `/invitations/:id/` | Eliminar invitación |
| `toggleInvitation(invitationId)` | POST | `/invitations/:id/toggle/` | Activar/desactivar |
| `joinWithInvitation(code)` | POST | `/invitations/join/` | Unirse con código |
| `previewInvitation(code)` | GET | `/invitations/preview/?code=X` | Preview público |
| `getInvitationLink(invitation)` | - | - | Helper para generar link |

**Tipos de invitación:**
- `permanent` - Sin límite de usos ni tiempo
- `single_use` - Un solo uso
- `limited` - Número máximo de usos (`max_uses`)
- `timed` - Expira en fecha específica (`expires_at`)

### files.js - Sistema de Archivos

#### Carpetas
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getRootFolder(teamId)` | GET | `/teams/:id/files/` | Carpeta raíz del equipo |
| `getFolder(folderId)` | GET | `/folders/:id/` | Contenido de carpeta |
| `createFolder(parentFolderId, name)` | POST | `/folders/:id/folders/` | Crear subcarpeta |
| `updateFolder(folderId, data)` | PATCH | `/folders/:id/` | Renombrar/mover |
| `deleteFolder(folderId)` | DELETE | `/folders/:id/` | Eliminar carpeta |

#### Archivos
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `getFiles(folderId)` | GET | `/folders/:id/files/` | Listar archivos |
| `uploadFile(folderId, file, description)` | POST | `/folders/:id/files/` | Subir archivo |
| `createTextFile(folderId, name, content)` | POST | `/folders/:id/files/create/` | Crear archivo de texto (.md, .txt) |
| `getFile(fileId)` | GET | `/files/:id/` | Metadatos archivo |
| `updateFile(fileId, data)` | PATCH | `/files/:id/` | Renombrar/mover |
| `getFileContent(fileId)` | GET | `/files/:id/preview/` | Obtener contenido de texto |
| `updateFileContent(fileId, content)` | PATCH | `/files/:id/content/` | Guardar contenido de texto |
| `deleteFile(fileId)` | DELETE | `/files/:id/` | Eliminar archivo |
| `downloadFile(fileId)` | GET | `/files/:id/download/` | Descargar (blob) |
| `getDownloadUrl(fileId)` | - | - | URL de descarga |
| `getPreviewUrl(fileId)` | - | - | URL de preview |
| `copyFile(fileId, destinationFolderId)` | POST | `/files/:id/copy/` | Copiar archivo |

#### Búsqueda
| Función | Método | Endpoint | Descripción |
|---------|--------|----------|-------------|
| `searchFiles(teamId, query, type)` | GET | `/teams/:id/files/search/` | Buscar archivos |
| `getTeamRecentFiles(teamId)` | GET | `/teams/:id/files/recent/` | Recientes del equipo |
| `getUserRecentFiles()` | GET | `/users/me/files/recent/` | Mis archivos recientes |

#### Helpers
| Función | Descripción |
|---------|-------------|
| `getFileIcon(mimeType, extension)` | Obtener emoji según tipo |
| `isPreviewable(mimeType)` | Verificar si se puede previsualizar |
| `isTextFile(mimeType, extension)` | Verificar si es archivo de texto editable |
| `isMarkdown(mimeType, extension)` | Verificar si es archivo Markdown |

---

## Páginas y Componentes

### Pages (Páginas)

#### Login.jsx
- **Ruta:** `/`
- **Funcionalidad:**
  - Formulario de inicio de sesión
  - Formulario de registro
  - Toggle entre modos login/registro
  - Manejo de invitaciones pendientes post-login

#### Home.jsx
- **Ruta:** `/home`
- **Funcionalidad:**
  - Dashboard principal
  - Mensaje de bienvenida con nombre de usuario
  - Navegación a Equipos y Proyectos

#### Profile.jsx
- **Ruta:** `/profile`
- **Funcionalidad:**
  - Vista completa del perfil de usuario
  - Subida/eliminación de foto de perfil
  - Edición de username
  - Visualización de datos: ID, email, rol, fecha de registro
  - Al cambiar datos se recarga la página para sincronizar

#### Teams.jsx
- **Ruta:** `/teams`
- **Funcionalidad:**
  - Lista de equipos del usuario
  - Modal para crear nuevo equipo
  - Modal para unirse con código de invitación
  - Grid de cards de equipos

#### Team.jsx
- **Ruta:** `/teams/:teamId`
- **Funcionalidad:**
  - Vista de equipo con tabs: Conversaciones/Archivos
  - Gestión de invitaciones (botón "+ Invitar")
  - Integración de ChannelSidebar + Chat
  - Integración de FileSidebar + FileExplorer

#### Projects.jsx
- **Ruta:** `/projects`
- **Funcionalidad:**
  - Lista de proyectos/archivos recientes

#### InvitePage.jsx
- **Ruta:** `/invite/:code`
- **Funcionalidad:**
  - Preview de equipo por invitación
  - Botón para unirse (redirige a login si no autenticado)
  - Muestra info del equipo y tipo de invitación

### Components (Componentes)

#### Navbar.jsx
- **Ubicación:** `src/components/`
- **Uso:** Barra de navegación global
- **Características:**
  - Logo clicable (navega a /home)
  - Botón de regreso configurable
  - Avatar del usuario como dropdown
  - Menú: cambiar/eliminar foto, ver perfil, logout

#### ChannelSidebar.jsx
- **Ubicación:** `src/components/teams/`
- **Uso:** Sidebar de canales en vista de equipo
- **Características:**
  - Secciones colapsables: Texto, Voz, Anuncios
  - CRUD de canales (admin/owner)
  - Indicador de participantes en canales de voz
  - Modal para crear canal

#### Chat.jsx
- **Ubicación:** `src/components/teams/`
- **Uso:** Sistema de chat en canales
- **Características:**
  - Lista de mensajes con avatares
  - Enviar/editar/eliminar mensajes
  - Responder a mensajes (reply)
  - Fijar mensajes (pin)
  - Polling cada 3 segundos para mensajes nuevos

#### InvitationManager.jsx
- **Ubicación:** `src/components/teams/`
- **Uso:** Gestión de invitaciones de equipo
- **Características:**
  - Lista de invitaciones activas
  - Crear invitación (4 tipos)
  - Copiar código/link
  - Activar/desactivar invitaciones
  - Eliminar invitaciones

#### FileSidebar.jsx
- **Ubicación:** `src/components/files/`
- **Uso:** Árbol de navegación de carpetas
- **Características:**
  - Navegación de carpetas expandibles
  - Crear/eliminar carpetas
  - Crear archivos de texto (.md y .txt) con menú dropdown
  - Selección de carpeta actual

#### FileExplorer.jsx
- **Ubicación:** `src/components/files/`
- **Uso:** Explorador y visor de archivos
- **Características:**
  - Grid de carpetas y archivos
  - Subida de archivos (drag & drop)
  - Preview de imágenes y PDFs (con autenticación)
  - Visor de archivos Markdown con renderizado
  - Editor de archivos de texto (.md, .txt) con modo lectura/edición
  - Descarga de archivos
  - Sistema de pestañas para archivos abiertos
  - Breadcrumbs de navegación

---

## Flujo de Autenticación

```
1. Usuario accede a la app
   ├── Sin token → Redirige a /login
   └── Con token → Accede a /home

2. Login exitoso
   ├── Tokens guardados en localStorage
   ├── ¿Invitación pendiente?
   │   ├── Sí → Redirige a /invite/:code
   │   └── No → Redirige a /home
   └── Refresh automático si token expira (401)

3. Logout
   └── Limpia localStorage → Redirige a /login
```

---

## Gestión de Estado

El proyecto utiliza **estado local de React** (useState) sin librerías externas de estado global.

### Patrones utilizados:
- **Lifting state up:** Estados compartidos se elevan al componente padre
- **Props drilling:** Datos pasados de padre a hijo
- **Polling:** Para mensajes nuevos (cada 3 segundos)
- **Blob URLs:** Para preview de archivos autenticados

---

## Almacenamiento Local

| Key | Uso |
|-----|-----|
| `access_token` | JWT de acceso |
| `refresh_token` | JWT de refresco |
| `pending_invite` | Código de invitación pendiente (temporal) |

---

## Roles y Permisos

| Rol | Gestionar Canales | Gestionar Invitaciones | Moderar Mensajes | Expulsar |
|-----|-------------------|------------------------|------------------|----------|
| `owner` | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `moderator` | ❌ | ❌ | ✅ | ❌ |
| `member` | ❌ | ❌ | Solo propios | ❌ |

---

## Tipos de Canal

| Tipo | Icono | Descripción |
|------|-------|-------------|
| `text` | # | Canal de texto normal |
| `voice` | 🔊 | Canal de voz |
| `announcement` | 📢 | Solo admin/owner pueden escribir |

---

## Tipos de Archivo Previewables

| MIME Type | Preview |
|-----------|---------|
| `image/*` | Imagen en visor |
| `application/pdf` | PDF embebido |
| `text/plain` | Texto plano con editor |
| `text/markdown` | Markdown renderizado con editor |
| `application/json` | JSON formateado |

---

## Configuración de Desarrollo

### Iniciar el servidor de desarrollo:
```bash
npm run dev
```

### Build para producción:
```bash
npm run build
```

### Linting:
```bash
npm run lint
```

---

## Dependencias Principales

```json
{
  "react": "^19.x",
  "react-dom": "^19.x",
  "react-router-dom": "^7.x",
  "react-markdown": "^9.x"
}
```

---

## Notas de Implementación

1. **Autenticación:** JWT con refresh automático en peticiones 401
2. **Archivos:** Los preview usan blob URLs para incluir autenticación
3. **Mensajes:** Polling cada 3 segundos (no WebSockets)
4. **Invitaciones:** Soporta 4 tipos con diferentes restricciones
5. **Avatares:** Se guardan en el servidor en `media/avatars/`
