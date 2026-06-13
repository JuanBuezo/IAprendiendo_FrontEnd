import { getAccessToken, refreshAccessToken } from './auth'

const API_URL = 'http://localhost:8000/api/v1'

// ==================== HELPERS ====================

// Helper para verificar booleanos (pueden venir como true, "true", 1, etc)
const isTruthy = (value) => {
  return value === true || value === 'true' || value === 1 || value === '1'
}

// Verificar si el usuario tiene acceso de admin (staff, admin o superuser)
export const hasAdminAccess = (user) => {
  if (!user) return false
  // Verificar múltiples campos posibles que el backend podría devolver
  return (
    isTruthy(user.is_superuser) ||
    isTruthy(user.is_staff) ||
    user.role === 'admin' ||
    user.role === 'staff' ||
    user.role === 'superuser'
  )
}

// Verificar si puede escribir (modificar datos) - admin o superuser
export const canWrite = (user) => {
  if (!user) return false
  return isTruthy(user.is_superuser) || user.role === 'admin' || user.role === 'superuser'
}

// Verificar si es superuser
export const isSuperuser = (user) => {
  if (!user) return false
  return isTruthy(user.is_superuser) || user.role === 'superuser'
}

// Obtener etiqueta del rol (superuser se muestra como Admin visualmente)
export const getRoleLabel = (role, isSuperuserFlag) => {
  // Superuser se muestra como "Administrador" visualmente
  if (isSuperuserFlag || role === 'superuser') return 'Administrador'
  switch (role) {
    case 'admin': return 'Administrador'
    case 'staff': return 'Staff'
    case 'member': return 'Miembro'
    default: return role || 'Miembro'
  }
}

// Obtener clase CSS del badge de rol
export const getRoleBadgeClass = (role, isSuperuserFlag) => {
  // Superuser usa el mismo estilo que admin
  if (isSuperuserFlag || role === 'superuser') return 'admin'
  return role || 'member'
}

// Helper para hacer peticiones autenticadas
const authFetch = async (url, options = {}) => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
  }

  // Solo agregar Content-Type si no es FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return authFetch(url, options)
  }

  return response
}

// ==================== ESTADISTICAS ====================

// Obtener estadísticas de la plataforma
export const getStats = async () => {
  const response = await authFetch(`${API_URL}/admin/stats/`)

  if (!response.ok) {
    throw new Error('Error al obtener estadísticas')
  }

  const data = await response.json()

  // Normalizar respuesta
  return {
    total_users: data.users?.total || 0,
    total_teams: data.teams?.total || 0,
    banned_users: data.users?.banned || 0,
    total_files: data.content?.files || 0,
    total_messages: data.content?.messages || 0,
    staff_users: data.users?.staff || 0,
    superusers: data.users?.superusers || 0,
    active_users: data.users?.active || 0,
  }
}

// ==================== USUARIOS ====================

// Listar usuarios con filtros y paginación
export const listUsers = async (params = {}) => {
  const queryParams = new URLSearchParams()

  if (params.search) queryParams.append('search', params.search)
  if (params.role) queryParams.append('role', params.role)
  if (params.is_banned !== undefined && params.is_banned !== '') {
    queryParams.append('is_banned', params.is_banned)
  }
  if (params.ordering) queryParams.append('ordering', params.ordering)
  if (params.page) queryParams.append('page', params.page)

  const url = `${API_URL}/admin/users/${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const response = await authFetch(url)

  if (!response.ok) {
    throw new Error('Error al listar usuarios')
  }

  return await response.json()
}

// Alias para compatibilidad
export const searchUsers = listUsers

// Obtener perfil completo de un usuario
export const getUserProfile = async (userId) => {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Usuario no encontrado')
    }
    throw new Error('Error al obtener usuario')
  }

  return await response.json()
}

// Alias para compatibilidad
export const getUserDetail = getUserProfile

// Obtener equipos de un usuario
export const getUserTeams = async (userId) => {
  // El endpoint de detalle ya incluye los equipos
  const user = await getUserProfile(userId)
  return user.teams || []
}

// Actualizar rol de un usuario
export const updateUserRole = async (userId, data) => {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al actualizar usuario')
  }

  return await response.json()
}

// Alias para compatibilidad
export const updateUser = updateUserRole

// Banear usuario
export const banUser = async (userId, data) => {
  // Soportar tanto (userId, reason, expiresAt) como (userId, {reason, expires_at})
  let body = data
  if (typeof data === 'string') {
    body = { reason: data }
  }

  const response = await authFetch(`${API_URL}/admin/users/${userId}/ban/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al banear usuario')
  }

  return await response.json()
}

// Desbanear usuario
export const unbanUser = async (userId) => {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/unban/`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al desbanear usuario')
  }

  return await response.json()
}

// Crear usuario staff/admin
export const createStaffUser = async (data) => {
  const response = await authFetch(`${API_URL}/admin/users/create-staff/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    // Manejar errores de validación
    const messages = []
    for (const key in error) {
      if (Array.isArray(error[key])) {
        messages.push(...error[key])
      } else if (typeof error[key] === 'string') {
        messages.push(error[key])
      }
    }
    throw new Error(messages.join(', ') || 'Error al crear usuario')
  }

  const result = await response.json()
  // Devolver el usuario creado (puede venir en result.user o directamente)
  return result.user || result
}

// Eliminar usuario permanentemente (solo superuser)
export const deleteUser = async (userId) => {
  const response = await authFetch(`${API_URL}/admin/users/${userId}/delete/`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al eliminar usuario')
  }

  return await response.json()
}

// ==================== PERFIL PUBLICO ====================

// Obtener perfil básico de un usuario (para ver en chats, etc)
// Esta función intenta obtener info del usuario que puede ser útil
// para mostrar en un modal de perfil al hacer clic en su avatar
export const getPublicUserInfo = async (userId) => {
  // Si el usuario tiene acceso de admin, usar el endpoint de admin
  try {
    const response = await authFetch(`${API_URL}/admin/users/${userId}/`)
    if (response.ok) {
      const data = await response.json()
      return {
        id: data.id,
        username: data.username,
        avatar: data.avatar,
        avatar_url: data.avatar_url,
        role: data.role,
        is_superuser: data.is_superuser,
        is_staff: data.is_staff,
        date_joined: data.date_joined,
        teams: data.teams || [],
        is_banned: data.is_banned,
        // Flag para indicar que tiene acceso de admin
        hasAdminView: true,
      }
    }
  } catch {
    // Si no tiene permisos de admin, devolver solo datos básicos
  }

  // Fallback: devolver null si no se puede obtener info
  // En el futuro se podría agregar un endpoint público para esto
  return null
}
