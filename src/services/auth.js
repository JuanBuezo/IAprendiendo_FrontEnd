const API_URL = 'http://localhost:8000/api/v1'

// Guardar tokens en localStorage
export const setTokens = (access, refresh) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

// Obtener tokens
export const getAccessToken = () => localStorage.getItem('access_token')
export const getRefreshToken = () => localStorage.getItem('refresh_token')

// Limpiar tokens (logout)
export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// Login
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al iniciar sesión')
  }

  const data = await response.json()
  setTokens(data.access, data.refresh)
  return data
}

// Registro
export const register = async (username, email, password, passwordConfirm) => {
  const response = await fetch(`${API_URL}/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password,
      password_confirm: passwordConfirm,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    // Manejar errores de validación
    const messages = []
    for (const key in error) {
      if (Array.isArray(error[key])) {
        messages.push(...error[key])
      } else {
        messages.push(error[key])
      }
    }
    throw new Error(messages.join(', ') || 'Error al registrarse')
  }

  return await response.json()
}

// Refrescar token
export const refreshAccessToken = async () => {
  const refresh = getRefreshToken()
  if (!refresh) throw new Error('No hay refresh token')

  const response = await fetch(`${API_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  })

  if (!response.ok) {
    clearTokens()
    throw new Error('Sesión expirada')
  }

  const data = await response.json()
  setTokens(data.access, data.refresh)
  return data
}

// Obtener perfil del usuario
export const getProfile = async () => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const response = await fetch(`${API_URL}/users/me/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 401) {
    // Token expirado, intentar refrescar
    await refreshAccessToken()
    return getProfile()
  }

  if (!response.ok) {
    throw new Error('Error al obtener perfil')
  }

  return await response.json()
}

// Actualizar perfil
export const updateProfile = async (data) => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const response = await fetch(`${API_URL}/users/me/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return updateProfile(data)
  }

  if (!response.ok) {
    throw new Error('Error al actualizar perfil')
  }

  return await response.json()
}

// Verificar si está autenticado
export const isAuthenticated = () => {
  return !!getAccessToken()
}
