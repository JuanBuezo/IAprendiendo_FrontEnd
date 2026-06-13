import { useState, useEffect, useRef } from 'react'
import { getFolder, createFolder, deleteFolder, createTextFile } from '../../services/files'
import './FileSidebar.css'

function FileSidebar({ rootFolder, currentFolder, onSelectFolder, onOpenFile, teamId, onFileCreated }) {
  const [expandedFolders, setExpandedFolders] = useState({ [rootFolder?.id]: true })
  const [folderContents, setFolderContents] = useState({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFileName, setNewFileName] = useState('')
  const [fileType, setFileType] = useState('md')
  const [createInFolder, setCreateInFolder] = useState(null)
  const [error, setError] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const [showDropdown, setShowDropdown] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (rootFolder) {
      loadFolderContents(rootFolder.id)
    }
  }, [rootFolder?.id])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadFolderContents = async (folderId) => {
    try {
      const folder = await getFolder(folderId)
      setFolderContents((prev) => ({
        ...prev,
        [folderId]: folder,
      }))
    } catch (err) {
      console.error('Error al cargar carpeta:', err)
    }
  }

  const toggleFolder = async (folderId) => {
    const isFolderExpanded = expandedFolders[folderId]
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !isFolderExpanded,
    }))

    if (!isFolderExpanded && !folderContents[folderId]) {
      await loadFolderContents(folderId)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const folder = await createFolder(createInFolder, newFolderName)
      // Recargar contenido del padre
      await loadFolderContents(createInFolder)
      setShowCreateModal(false)
      setNewFolderName('')
      setCreateInFolder(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta carpeta y todo su contenido?')) return
    try {
      await deleteFolder(folderId)
      // Recargar carpeta padre
      const parentId = folderContents[folderId]?.parent || rootFolder?.id
      await loadFolderContents(parentId)
    } catch (err) {
      alert(err.message)
    }
  }

  const openCreateModal = (parentId, e) => {
    e.stopPropagation()
    setCreateInFolder(parentId)
    setShowCreateModal(true)
    setShowDropdown(null)
  }

  const openFileModal = (parentId, type, e) => {
    e.stopPropagation()
    setCreateInFolder(parentId)
    setFileType(type)
    setShowFileModal(true)
    setShowDropdown(null)
  }

  const toggleDropdown = (folderId, e) => {
    e.stopPropagation()
    setShowDropdown(showDropdown === folderId ? null : folderId)
  }

  const handleCreateFile = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const fullName = newFileName.includes('.') ? newFileName : `${newFileName}.${fileType}`
      const file = await createTextFile(createInFolder, fullName, '')
      // Recargar contenido del padre
      await loadFolderContents(createInFolder)
      setShowFileModal(false)
      setNewFileName('')
      setCreateInFolder(null)
      // Notificar para que se abra el archivo
      if (onFileCreated) {
        onFileCreated(file)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const renderFolder = (folder, level = 0) => {
    if (!folder) return null

    const isFolderExpanded = expandedFolders[folder.id]
    const contents = folderContents[folder.id]
    const isSelected = currentFolder?.id === folder.id

    return (
      <div key={folder.id} className="folder-tree-item">
        <div
          className={`folder-row ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            toggleFolder(folder.id)
            onSelectFolder(contents || folder)
          }}
        >
          <span className={`folder-arrow ${isFolderExpanded ? 'expanded' : ''}`}>
            {(contents?.subfolders?.length > 0 || folder.subfolders?.length > 0) && '▶'}
          </span>
          <span className="folder-icon">📁</span>
          <span className="folder-name">{folder.name}</span>
          <div className="folder-actions">
            <div className="dropdown-container" ref={showDropdown === folder.id ? dropdownRef : null}>
              <button
                className="add-folder-btn"
                onClick={(e) => toggleDropdown(folder.id, e)}
                title="Crear nuevo"
              >
                +
              </button>
              {showDropdown === folder.id && (
                <div className="create-dropdown">
                  <button onClick={(e) => openCreateModal(folder.id, e)}>
                    <span>📁</span> Nueva carpeta
                  </button>
                  <button onClick={(e) => openFileModal(folder.id, 'md', e)}>
                    <span>📑</span> Nuevo Markdown
                  </button>
                  <button onClick={(e) => openFileModal(folder.id, 'txt', e)}>
                    <span>📄</span> Nuevo archivo .txt
                  </button>
                </div>
              )}
            </div>
            {!folder.is_root && (
              <button
                className="delete-folder-btn"
                onClick={(e) => handleDeleteFolder(folder.id, e)}
                title="Eliminar"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {isFolderExpanded && contents && (
          <div className="folder-children">
            {contents.subfolders?.map((subfolder) => renderFolder(subfolder, level + 1))}
            {contents.files?.map((file) => (
              <div
                key={file.id}
                className="file-row"
                style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                onClick={() => onOpenFile(file)}
              >
                <span className="file-icon">{getFileIcon(file.extension)}</span>
                <span className="file-name">{file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const getFileIcon = (extension) => {
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      ppt: '📽️',
      pptx: '📽️',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
      rar: '📦',
      js: '🟨',
      jsx: '🟨',
      py: '🐍',
      html: '🌐',
      css: '🎨',
      json: '📋',
      md: '📑',
    }
    return icons[extension?.toLowerCase()] || '📄'
  }

  return (
    <aside className={`file-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Ocultar explorador' : 'Mostrar explorador'}
      >
        ≡
      </button>

      {isExpanded && (
        <>
          <div className="sidebar-header">
            <h3>Explorador</h3>
          </div>

          <div className="folder-tree">
            {rootFolder && renderFolder(rootFolder)}
          </div>
        </>
      )}

      {/* Modal Crear Carpeta */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nueva Carpeta</h2>
            <form onSubmit={handleCreateFolder}>
              <div className="form-group">
                <label>Nombre de la carpeta</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Mi carpeta"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Archivo */}
      {showFileModal && (
        <div className="modal-overlay" onClick={() => setShowFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo {fileType === 'md' ? 'Markdown' : 'Archivo de texto'}</h2>
            <form onSubmit={handleCreateFile}>
              <div className="form-group">
                <label>Nombre del archivo</label>
                <div className="file-name-input">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder={fileType === 'md' ? 'documento' : 'notas'}
                    required
                    autoFocus
                  />
                  <span className="file-extension">.{fileType}</span>
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowFileModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}

export default FileSidebar
