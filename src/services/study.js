import { getAccessToken, refreshAccessToken } from './auth'

const API_URL = 'http://localhost:8000/api/v1'

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

// ==================== SESIONES ====================

export const getSessions = async () => {
  const response = await authFetch(`${API_URL}/study-sessions/`)
  if (!response.ok) throw new Error('Error al obtener sesiones')
  const data = await response.json()
  return data.results || data
}

export const createSession = async (data) => {
  const response = await authFetch(`${API_URL}/study-sessions/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Error al crear sesión')
  }
  return response.json()
}

export const getSession = async (id) => {
  const response = await authFetch(`${API_URL}/study-sessions/${id}/`)
  if (!response.ok) throw new Error('Error al obtener sesión')
  return response.json()
}

export const updateSession = async (id, data) => {
  const response = await authFetch(`${API_URL}/study-sessions/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar sesión')
  return response.json()
}

export const deleteSession = async (id) => {
  const response = await authFetch(`${API_URL}/study-sessions/${id}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar sesión')
}

export const addDocuments = async (sessionId, documentIds) => {
  const response = await authFetch(`${API_URL}/study-sessions/${sessionId}/add-documents/`, {
    method: 'POST',
    body: JSON.stringify({ documents: documentIds }),
  })
  if (!response.ok) {
    let msg = 'Error al adjuntar documentos'
    try {
      const error = await response.json()
      msg = error.error || msg
    } catch {}
    throw new Error(msg)
  }
  return response.json()
}

export const generateQuiz = async (sessionId, params) => {
  const response = await authFetch(`${API_URL}/study-sessions/${sessionId}/generate-quiz/`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al generar quiz')
  }
  return response.json()
}

export const getSessionProgress = async (sessionId) => {
  const response = await authFetch(`${API_URL}/study-sessions/${sessionId}/progress/`)
  if (!response.ok) throw new Error('Error al obtener progreso')
  return response.json()
}

// ==================== QUIZZES ====================

export const getQuiz = async (quizId) => {
  const response = await authFetch(`${API_URL}/quizzes/${quizId}/`)
  if (!response.ok) throw new Error('Error al obtener quiz')
  return response.json()
}

export const startAttempt = async (quizId) => {
  const response = await authFetch(`${API_URL}/quizzes/${quizId}/start-attempt/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al iniciar intento')
  }
  return response.json()
}

// ==================== INTENTOS ====================

export const submitAnswer = async (attemptId, questionId, selectedOptionId) => {
  const response = await authFetch(`${API_URL}/quiz-attempts/${attemptId}/submit-answer/`, {
    method: 'POST',
    body: JSON.stringify({ question: questionId, selected_option_id: selectedOptionId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || error.non_field_errors?.[0] || 'Error al enviar respuesta')
  }
  return response.json()
}

export const completeAttempt = async (attemptId) => {
  const response = await authFetch(`${API_URL}/quiz-attempts/${attemptId}/complete/`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al completar quiz')
  }
  return response.json()
}

export const getAttempts = async () => {
  const response = await authFetch(`${API_URL}/quiz-attempts/`)
  if (!response.ok) throw new Error('Error al obtener intentos')
  const data = await response.json()
  return data.results || data
}

export const getAttempt = async (id) => {
  const response = await authFetch(`${API_URL}/quiz-attempts/${id}/`)
  if (!response.ok) throw new Error('Error al obtener intento')
  return response.json()
}

export const getSessionQuizzes = async (sessionId) => {
  const response = await authFetch(`${API_URL}/quizzes/?session_id=${sessionId}`)
  if (!response.ok) throw new Error('Error al obtener historial de quizzes')
  const data = await response.json()
  return data.results || data
}
