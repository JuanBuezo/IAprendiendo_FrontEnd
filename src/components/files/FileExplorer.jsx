import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  getFolder,
  uploadFile,
  deleteFile,
  getDownloadUrl,
  getPreviewUrl,
  getFileIcon,
  isPreviewable,
  isTextFile,
  isMarkdown,
  getFileContent,
  updateFileContent,
} from '../../services/files'
import { getAccessToken } from '../../services/auth'
import './FileExplorer.css'

function FileExplorer({
  currentFolder,
  openFiles,
  activeFileIndex,
  onOpenFile,
  onCloseFile,
  onSelectFile,
  onFolderChange,
  teamId,
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrls, setPreviewUrls] = useState({}) // Cache de blob URLs
  const [textContents, setTextContents] = useState({}) // Cache de contenido de texto
  const [editMode, setEditMode] = useState({}) // Estado de edición por archivo
  const [editContent, setEditContent] = useState({}) // Contenido en edición
  const [saving, setSaving] = useState(false)
  const [loadingContent, setLoadingContent] = useState({})
  const fileInputRef = useRef(null)

  // Cargar blob URLs para archivos previewables
  useEffect(() => {
    const loadPreviewUrls = async () => {
      for (const file of openFiles) {
        if (isPreviewable(file.mime_type) && !previewUrls[file.id]) {
          try {
            const token = getAccessToken()
            const url = getPreviewUrl(file.id)
            const response = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
              const blob = await response.blob()
              const blobUrl = URL.createObjectURL(blob)
              setPreviewUrls(prev => ({ ...prev, [file.id]: blobUrl }))
            }
          } catch (err) {
            console.error('Error al cargar preview:', err)
          }
        }
      }
    }
    loadPreviewUrls()

    // Limpiar blob URLs al desmontar
    return () => {
      Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [openFiles])

  // Cargar contenido de archivos de texto
  useEffect(() => {
    const loadTextContents = async () => {
      for (const file of openFiles) {
        if (isTextFile(file.mime_type, file.extension) && !textContents[file.id] && !loadingContent[file.id]) {
          setLoadingContent(prev => ({ ...prev, [file.id]: true }))
          try {
            const data = await getFileContent(file.id)
            setTextContents(prev => ({ ...prev, [file.id]: data.content || '' }))
          } catch (err) {
            console.error('Error al cargar contenido:', err)
            setTextContents(prev => ({ ...prev, [file.id]: '' }))
          } finally {
            setLoadingContent(prev => ({ ...prev, [file.id]: false }))
          }
        }
      }
    }
    loadTextContents()
  }, [openFiles])

  const handleUpload = async (files) => {
    if (!currentFolder || files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        await uploadFile(currentFolder.id, file)
      }
      // Recargar carpeta
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
    } catch (err) {
      alert('Error al subir archivo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e) => {
    handleUpload(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(Array.from(e.dataTransfer.files))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  // Entrar en modo edición
  const handleEnterEdit = (fileId) => {
    setEditContent(prev => ({ ...prev, [fileId]: textContents[fileId] || '' }))
    setEditMode(prev => ({ ...prev, [fileId]: true }))
  }

  // Cancelar edición
  const handleCancelEdit = (fileId) => {
    setEditMode(prev => ({ ...prev, [fileId]: false }))
    setEditContent(prev => ({ ...prev, [fileId]: undefined }))
  }

  // Guardar archivo
  const handleSaveFile = async (fileId) => {
    setSaving(true)
    try {
      await updateFileContent(fileId, editContent[fileId])
      setTextContents(prev => ({ ...prev, [fileId]: editContent[fileId] }))
      setEditMode(prev => ({ ...prev, [fileId]: false }))
      setEditContent(prev => ({ ...prev, [fileId]: undefined }))
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este archivo?')) return
    try {
      await deleteFile(fileId)
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      // Cerrar si está abierto
      const openIndex = openFiles.findIndex((f) => f.id === fileId)
      if (openIndex !== -1) {
        onCloseFile(openIndex)
      }
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const handleDownload = async (file, e) => {
    e.stopPropagation()
    const token = getAccessToken()
    const url = getDownloadUrl(file.id)

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (err) {
      alert('Error al descargar: ' + err.message)
    }
  }

  const navigateToFolder = async (folderId) => {
    try {
      const folder = await getFolder(folderId)
      onFolderChange(folder)
    } catch (err) {
      console.error('Error al navegar:', err)
    }
  }

  // Renderiza el visor de archivos de texto (markdown/txt)
  const renderTextViewer = (file) => {
    const content = textContents[file.id]
    const isEditing = editMode[file.id]
    const isLoading = loadingContent[file.id]
    const isMd = isMarkdown(file.mime_type, file.extension)

    if (isLoading) {
      return <div className="loading-preview">Cargando contenido...</div>
    }

    if (isEditing) {
      return (
        <div className="text-editor-container">
          <div className="editor-toolbar">
            <span className="editor-title">Editando: {file.name}</span>
            <div className="editor-actions">
              <button
                className="cancel-btn"
                onClick={() => handleCancelEdit(file.id)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="save-btn"
                onClick={() => handleSaveFile(file.id)}
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
          <textarea
            className="text-editor"
            value={editContent[file.id] ?? ''}
            onChange={(e) => setEditContent(prev => ({ ...prev, [file.id]: e.target.value }))}
            placeholder={isMd ? 'Escribe tu markdown aquí...' : 'Escribe tu texto aquí...'}
            autoFocus
          />
        </div>
      )
    }

    // Modo lectura
    return (
      <div className="text-viewer-container">
        <div className="viewer-toolbar">
          <span className="viewer-title">{file.name}</span>
          <button
            className="edit-btn"
            onClick={() => handleEnterEdit(file.id)}
          >
            Editar
          </button>
        </div>
        <div className="text-viewer">
          {isMd ? (
            <div className="markdown-preview">
              <ReactMarkdown>{content || '*Archivo vacío*'}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-content">{content || '(Archivo vacío)'}</pre>
          )}
        </div>
      </div>
    )
  }

  const activeFile = openFiles[activeFileIndex]

  // Vista de archivo abierto
  if (activeFile) {
    return (
      <main className="file-explorer">
        <div className="file-tabs">
          {openFiles.map((file, index) => (
            <div
              key={file.id}
              className={`file-tab ${index === activeFileIndex ? 'active' : ''}`}
              onClick={() => onSelectFile(index)}
            >
              <span className="tab-icon">{getFileIcon(file.mime_type, file.extension)}</span>
              <span className="tab-name">{file.name}</span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseFile(index)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="file-viewer">
          {isTextFile(activeFile.mime_type, activeFile.extension) ? (
            renderTextViewer(activeFile)
          ) : isPreviewable(activeFile.mime_type) ? (
            activeFile.mime_type?.startsWith('image/') ? (
              previewUrls[activeFile.id] ? (
                <img
                  src={previewUrls[activeFile.id]}
                  alt={activeFile.name}
                  className="preview-image"
                />
              ) : (
                <div className="loading-preview">Cargando imagen...</div>
              )
            ) : activeFile.mime_type === 'application/pdf' ? (
              previewUrls[activeFile.id] ? (
                <iframe
                  src={previewUrls[activeFile.id]}
                  className="preview-pdf"
                  title={activeFile.name}
                />
              ) : (
                <div className="loading-preview">Cargando PDF...</div>
              )
            ) : (
              <div className="preview-text">
                <p>Vista previa no disponible para este tipo de archivo</p>
              </div>
            )
          ) : (
            <div className="no-preview">
              <div className="file-icon-large">
                {getFileIcon(activeFile.mime_type, activeFile.extension)}
              </div>
              <h3>{activeFile.name}</h3>
              <p className="file-size">{activeFile.human_size}</p>
              <button
                className="download-btn"
                onClick={(e) => handleDownload(activeFile, e)}
              >
                Descargar
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  // Vista de explorador de carpeta
  return (
    <main
      className={`file-explorer ${dragOver ? 'drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="explorer-header">
        <div className="breadcrumbs">
          {currentFolder?.breadcrumbs?.map((crumb, index) => (
            <span key={crumb.id}>
              {index > 0 && <span className="separator">/</span>}
              <button
                className="breadcrumb"
                onClick={() => navigateToFolder(crumb.id)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
        <div className="explorer-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            multiple
            hidden
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : '+ Subir archivo'}
          </button>
        </div>
      </div>

      <div className="explorer-content">
        {(!currentFolder?.subfolders?.length && !currentFolder?.files?.length) ? (
          <div className="empty-folder">
            <p>Esta carpeta está vacía</p>
            <p className="hint">Arrastra archivos aquí o haz clic en "Subir archivo"</p>
          </div>
        ) : (
          <div className="file-grid">
            {currentFolder?.subfolders?.map((folder) => (
              <div
                key={folder.id}
                className="grid-item folder"
                onDoubleClick={() => navigateToFolder(folder.id)}
              >
                <div className="item-icon">📁</div>
                <div className="item-name">{folder.name}</div>
                <div className="item-meta">{folder.item_count || 0} elementos</div>
              </div>
            ))}
            {currentFolder?.files?.map((file) => (
              <div
                key={file.id}
                className="grid-item file"
                onDoubleClick={() => onOpenFile(file)}
              >
                <div className="item-icon">
                  {getFileIcon(file.mime_type, file.extension)}
                </div>
                <div className="item-name">{file.name}</div>
                <div className="item-meta">{file.human_size}</div>
                <div className="item-actions">
                  <button
                    onClick={(e) => handleDownload(file, e)}
                    title="Descargar"
                  >
                    ⬇
                  </button>
                  <button
                    onClick={(e) => handleDeleteFile(file.id, e)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {dragOver && (
        <div className="drop-overlay">
          <p>Suelta los archivos aquí</p>
        </div>
      )}
    </main>
  )
}

export default FileExplorer
