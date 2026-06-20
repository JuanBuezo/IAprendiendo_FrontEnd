import { getAccessToken, refreshAccessToken } from './auth'

const API_URL = 'http://localhost:8000/api/v1'

// Helper para hacer peticiones autenticadas
const authFetch = async (url, options = {}) => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return authFetch(url, options)
  }

  return response
}

// ==================== EQUIPOS ====================

// Listar mis equipos
export const getTeams = async () => {
  const response = await authFetch(`${API_URL}/teams/`)
  if (!response.ok) throw new Error('Error al obtener equipos')
  const data = await response.json()
  return data.results || data
}

// Crear equipo
export const createTeam = async (data) => {
  const response = await authFetch(`${API_URL}/teams/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al crear equipo')
  }
  return response.json()
}

// Obtener detalle de equipo
export const getTeam = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/`)
  if (!response.ok) throw new Error('Error al obtener equipo')
  return response.json()
}

// Editar equipo
export const updateTeam = async (teamId, data) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar equipo')
  return response.json()
}

// Cambiar avatar del equipo (multipart)
export const updateTeamAvatar = async (teamId, imageFile) => {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('avatar', imageFile)
  const response = await fetch(`${API_URL}/teams/${teamId}/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!response.ok) throw new Error('Error al cambiar avatar del equipo')
  return response.json()
}

// Eliminar equipo
export const deleteTeam = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar equipo')
}

// Unirse a equipo con código
export const joinTeam = async (inviteCode) => {
  const response = await authFetch(`${API_URL}/teams/join/`, {
    method: 'POST',
    body: JSON.stringify({ invite_code: inviteCode }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Código de invitación inválido')
  }
  return response.json()
}

// Abandonar equipo
export const leaveTeam = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/leave/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al abandonar equipo')
}

// Regenerar código de invitación
export const regenerateInviteCode = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/regenerate-invite/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al regenerar código')
  return response.json()
}

// ==================== MIEMBROS ====================

// Listar miembros del equipo
export const getMembers = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/members/`)
  if (!response.ok) throw new Error('Error al obtener miembros')
  return response.json()
}

// Cambiar rol de miembro
export const updateMember = async (teamId, userId, data) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/members/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar miembro')
  return response.json()
}

// Expulsar miembro
export const removeMember = async (teamId, userId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/members/${userId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al expulsar miembro')
}

// ==================== CANALES ====================

// Listar canales del equipo
export const getChannels = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/channels/`)
  if (!response.ok) throw new Error('Error al obtener canales')
  const data = await response.json()
  return data.results || data
}

// Crear canal
export const createChannel = async (teamId, data) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/channels/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al crear canal')
  return response.json()
}

// Obtener detalle de canal
export const getChannel = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/`)
  if (!response.ok) throw new Error('Error al obtener canal')
  return response.json()
}

// Editar canal
export const updateChannel = async (channelId, data) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar canal')
  return response.json()
}

// Eliminar canal
export const deleteChannel = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar canal')
}

// ==================== MENSAJES ====================

// Listar mensajes del canal (paginado)
export const getMessages = async (channelId, page = 1) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/messages/?page=${page}`)
  if (!response.ok) throw new Error('Error al obtener mensajes')
  const data = await response.json()
  return data.results || data
}

// Obtener mensajes nuevos (polling)
export const getRecentMessages = async (channelId, since) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/messages/recent/?since=${since}`)
  if (!response.ok) throw new Error('Error al obtener mensajes recientes')
  return response.json()
}

// Enviar mensaje
export const sendMessage = async (channelId, content, replyTo = null) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content, reply_to: replyTo }),
  })
  if (!response.ok) throw new Error('Error al enviar mensaje')
  return response.json()
}

// Editar mensaje
export const editMessage = async (messageId, content) => {
  const response = await authFetch(`${API_URL}/messages/${messageId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error('Error al editar mensaje')
  return response.json()
}

// Eliminar mensaje
export const deleteMessage = async (messageId) => {
  const response = await authFetch(`${API_URL}/messages/${messageId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar mensaje')
}

// Fijar/desfijar mensaje
export const togglePinMessage = async (messageId) => {
  const response = await authFetch(`${API_URL}/messages/${messageId}/pin/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al fijar mensaje')
  return response.json()
}

// Obtener mensajes fijados
export const getPinnedMessages = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/messages/pinned/`)
  if (!response.ok) throw new Error('Error al obtener mensajes fijados')
  return response.json()
}

// ==================== VOZ ====================

// Obtener participantes en canal de voz
export const getVoiceParticipants = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/voice/participants/`)
  if (!response.ok) throw new Error('Error al obtener participantes')
  return response.json()
}

// Unirse a canal de voz
export const joinVoiceChannel = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/voice/join/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al unirse al canal de voz')
  return response.json()
}

// Salir de canal de voz
export const leaveVoiceChannel = async (channelId) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/voice/leave/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al salir del canal de voz')
}

// Actualizar estado de voz (mute/deaf)
export const updateVoiceStatus = async (channelId, data) => {
  const response = await authFetch(`${API_URL}/channels/${channelId}/voice/status/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar estado de voz')
  return response.json()
}

// ==================== INVITACIONES ====================

// Listar invitaciones del equipo
export const getTeamInvitations = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/invitations/`)
  if (!response.ok) throw new Error('Error al obtener invitaciones')
  const data = await response.json()
  return data.results || data
}

// Crear invitación
// type: 'single_use', 'limited', 'timed', 'permanent'
export const createInvitation = async (teamId, data) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/invitations/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al crear invitación')
  }
  return response.json()
}

// Obtener invitación por ID
export const getInvitation = async (invitationId) => {
  const response = await authFetch(`${API_URL}/invitations/${invitationId}/`)
  if (!response.ok) throw new Error('Error al obtener invitación')
  return response.json()
}

// Eliminar invitación
export const deleteInvitation = async (invitationId) => {
  const response = await authFetch(`${API_URL}/invitations/${invitationId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar invitación')
}

// Activar/desactivar invitación
export const toggleInvitation = async (invitationId) => {
  const response = await authFetch(`${API_URL}/invitations/${invitationId}/toggle/`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Error al cambiar estado de invitación')
  return response.json()
}

// Unirse con código o token de invitación (nuevo sistema)
export const joinWithInvitation = async (code) => {
  const response = await authFetch(`${API_URL}/invitations/join/`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Código de invitación inválido')
  }
  return response.json()
}

// Preview de invitación (público, no requiere auth)
export const previewInvitation = async (code) => {
  const response = await fetch(`${API_URL}/invitations/preview/?code=${encodeURIComponent(code)}`)
  if (!response.ok) throw new Error('Invitación no encontrada')
  return response.json()
}

// Generar link de invitación
export const getInvitationLink = (invitation) => {
  return `${window.location.origin}/invite/${invitation.code}`
}

// ==================== AVATAR DE EQUIPO ====================

// Subir avatar del equipo
export const uploadTeamAvatar = async (teamId, file) => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(`${API_URL}/teams/${teamId}/avatar/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return uploadTeamAvatar(teamId, file)
  }

  if (!response.ok) {
    throw new Error('Error al subir avatar del equipo')
  }

  return await response.json()
}

// Eliminar avatar del equipo
export const deleteTeamAvatar = async (teamId) => {
  const token = getAccessToken()
  if (!token) throw new Error('No autenticado')

  const response = await fetch(`${API_URL}/teams/${teamId}/avatar/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return deleteTeamAvatar(teamId)
  }

  if (!response.ok) {
    throw new Error('Error al eliminar avatar del equipo')
  }
}
