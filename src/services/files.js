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
      ...options.headers,
    },
  })

  if (response.status === 401) {
    await refreshAccessToken()
    return authFetch(url, options)
  }

  return response
}

// ==================== CARPETAS ====================

// Obtener carpeta raíz del equipo
export const getRootFolder = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/files/`)
  if (!response.ok) throw new Error('Error al obtener carpeta raíz')
  return response.json()
}

// Obtener contenido de carpeta
export const getFolder = async (folderId) => {
  const response = await authFetch(`${API_URL}/folders/${folderId}/`)
  if (!response.ok) throw new Error('Error al obtener carpeta')
  return response.json()
}

// Crear subcarpeta
export const createFolder = async (parentFolderId, name) => {
  const response = await authFetch(`${API_URL}/folders/${parentFolderId}/folders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Error al crear carpeta')
  return response.json()
}

// Renombrar/mover carpeta
export const updateFolder = async (folderId, data) => {
  const response = await authFetch(`${API_URL}/folders/${folderId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar carpeta')
  return response.json()
}

// Eliminar carpeta
export const deleteFolder = async (folderId) => {
  const response = await authFetch(`${API_URL}/folders/${folderId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar carpeta')
}

// ==================== ARCHIVOS ====================

// Listar archivos en carpeta
export const getFiles = async (folderId) => {
  const response = await authFetch(`${API_URL}/folders/${folderId}/files/`)
  if (!response.ok) throw new Error('Error al obtener archivos')
  return response.json()
}

// Subir archivo
export const uploadFile = async (folderId, file, description = '') => {
  const formData = new FormData()
  formData.append('file', file)
  if (description) formData.append('description', description)

  const response = await authFetch(`${API_URL}/folders/${folderId}/files/`, {
    method: 'POST',
    body: formData,
    // No añadir Content-Type, el navegador lo pone con el boundary correcto
  })
  if (!response.ok) throw new Error('Error al subir archivo')
  return response.json()
}

// Obtener metadatos de archivo
export const getFile = async (fileId) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/`)
  if (!response.ok) throw new Error('Error al obtener archivo')
  return response.json()
}

// Renombrar/mover archivo
export const updateFile = async (fileId, data) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Error al actualizar archivo')
  return response.json()
}

// Renombrar archivo (alias semántico)
export const renameFile = (fileId, newName) => updateFile(fileId, { name: newName })

// Mover archivo a otra carpeta
export const moveFile = (fileId, targetFolderId) => updateFile(fileId, { folder: targetFolderId })

// Eliminar archivo
export const deleteFile = async (fileId) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Error al eliminar archivo')
}

// Descargar archivo
export const downloadFile = async (fileId) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/download/`)
  if (!response.ok) throw new Error('Error al descargar archivo')
  return response.blob()
}

// Obtener URL de descarga
export const getDownloadUrl = (fileId) => {
  return `${API_URL}/files/${fileId}/download/`
}

// Obtener URL de preview
export const getPreviewUrl = (fileId) => {
  return `${API_URL}/files/${fileId}/preview/`
}

// Copiar archivo
export const copyFile = async (fileId, destinationFolderId) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/copy/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: destinationFolderId }),
  })
  if (!response.ok) throw new Error('Error al copiar archivo')
  return response.json()
}

// Crear archivo de texto (markdown o txt)
export const createTextFile = async (folderId, name, content = '') => {
  const response = await authFetch(`${API_URL}/folders/${folderId}/files/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || error.name?.[0] || 'Error al crear archivo')
  }
  return response.json()
}

// Actualizar contenido de archivo de texto
export const updateFileContent = async (fileId, content) => {
  const response = await authFetch(`${API_URL}/files/${fileId}/content/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Error al guardar el archivo')
  }
  return response.json()
}

// Obtener contenido de archivo de texto (usa el endpoint preview)
export const getFileContent = async (fileId) => {
  const token = getAccessToken()
  const response = await fetch(`${API_URL}/files/${fileId}/preview/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Error al obtener contenido del archivo')
  // El preview devuelve el contenido como texto plano
  const text = await response.text()
  return { content: text }
}

// ==================== BÚSQUEDA ====================

// Buscar archivos en equipo
export const searchFiles = async (teamId, query, type = null) => {
  let url = `${API_URL}/teams/${teamId}/files/search/?q=${encodeURIComponent(query)}`
  if (type) url += `&type=${type}`

  const response = await authFetch(url)
  if (!response.ok) throw new Error('Error en la búsqueda')
  return response.json()
}

// Archivos recientes del equipo
export const getTeamRecentFiles = async (teamId) => {
  const response = await authFetch(`${API_URL}/teams/${teamId}/files/recent/`)
  if (!response.ok) throw new Error('Error al obtener archivos recientes')
  return response.json()
}

// Archivos recientes del usuario
export const getUserRecentFiles = async () => {
  const response = await authFetch(`${API_URL}/users/me/files/recent/`)
  if (!response.ok) throw new Error('Error al obtener archivos recientes')
  return response.json()
}

// ==================== HELPERS ====================

// Obtener icono según tipo de archivo
export const getFileIcon = (mimeType, extension) => {
  if (mimeType?.startsWith('image/')) return '🖼️'
  if (mimeType?.startsWith('video/')) return '🎬'
  if (mimeType?.startsWith('audio/')) return '🎵'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType?.includes('word') || extension === 'docx' || extension === 'doc') return '📝'
  if (mimeType?.includes('excel') || extension === 'xlsx' || extension === 'xls') return '📊'
  if (mimeType?.includes('powerpoint') || extension === 'pptx' || extension === 'ppt') return '📽️'
  if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('7z')) return '📦'
  if (extension === 'js' || extension === 'jsx') return '🟨'
  if (extension === 'py') return '🐍'
  if (extension === 'html') return '🌐'
  if (extension === 'css') return '🎨'
  if (extension === 'json') return '📋'
  if (extension === 'md') return '📑'
  if (extension === 'tex') return '🧮'
  return '📄'
}

// Verificar si es previsualizable
export const isPreviewable = (mimeType) => {
  if (!mimeType) return false
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    mimeType === 'application/json'
  )
}

// Verificar si es un archivo de texto editable
export const isTextFile = (mimeType, extension) => {
  if (!mimeType && !extension) return false
  const textExtensions = ['md', 'txt', 'tex', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'py', 'xml', 'yaml', 'yml']
  return (
    mimeType?.startsWith('text/') ||
    mimeType === 'application/json' ||
    textExtensions.includes(extension?.toLowerCase())
  )
}

// Verificar si es un archivo markdown
export const isMarkdown = (mimeType, extension) => {
  return mimeType === 'text/markdown' || extension?.toLowerCase() === 'md'
}
