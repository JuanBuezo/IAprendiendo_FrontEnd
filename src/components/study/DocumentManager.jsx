import { useState, useEffect } from 'react'
import { getRootFolder, getFolder } from '../../services/files'
import { getFileIcon } from '../../services/files'
import './DocumentManager.css'

function DocumentManager({ session, onClose, onAddDocuments }) {
  const [folderContents, setFolderContents] = useState(null)
  const [allFiles, setAllFiles] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFiles()
  }, [])

  const collectFiles = async (folderId, collected = []) => {
    try {
      const folder = await getFolder(folderId)
      if (folder.files) {
        collected.push(...folder.files)
      }
      if (folder.subfolders) {
        for (const sub of folder.subfolders) {
          await collectFiles(sub.id, collected)
        }
      }
    } catch (err) {
      console.error('Error al cargar carpeta:', err)
    }
    return collected
  }

  const loadFiles = async () => {
    setLoading(true)
    setError('')
    try {
      const rootFolder = await getRootFolder(session.team)
      const files = await collectFiles(rootFolder.id)
      // Filter out already attached documents
      const attachedIds = new Set(session.documents || [])
      setAllFiles(files.filter(f => !attachedIds.has(f.id)))
    } catch (err) {
      setError('No se pudieron cargar los archivos del equipo')
    } finally {
      setLoading(false)
    }
  }

  const toggleFile = (fileId) => {
    setSelectedIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    )
  }

  const handleAdd = async () => {
    if (selectedIds.length === 0) return
    setAdding(true)
    setError('')
    try {
      await onAddDocuments(selectedIds)
    } catch (err) {
      setError(err.message)
      setAdding(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="doc-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📎 Adjuntar documentos</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="doc-manager-body">
          {loading && <p className="doc-loading">Cargando archivos del equipo...</p>}

          {!loading && error && <p className="doc-error">{error}</p>}

          {!loading && !error && allFiles.length === 0 && (
            <p className="doc-empty">
              No hay archivos disponibles para adjuntar. Sube archivos al sistema de archivos del equipo primero.
            </p>
          )}

          {!loading && !error && allFiles.length > 0 && (
            <div className="doc-file-list">
              {allFiles.map((file) => (
                <label key={file.id} className="doc-file-item">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => toggleFile(file.id)}
                  />
                  <span className="doc-file-icon">
                    {getFileIcon(file.mime_type, file.extension)}
                  </span>
                  <span className="doc-file-name">{file.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="doc-add-error">{error}</div>
        )}

        <div className="doc-manager-footer">
          <span className="doc-selected-count">
            {selectedIds.length > 0 ? `${selectedIds.length} seleccionado(s)` : ''}
          </span>
          <div className="doc-actions">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              className="btn-create"
              onClick={handleAdd}
              disabled={selectedIds.length === 0 || adding || loading}
            >
              {adding ? 'Adjuntando...' : `Adjuntar${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentManager
