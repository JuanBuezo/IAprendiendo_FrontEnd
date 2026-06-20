import { useState, useEffect, useRef, useCallback } from 'react'
import { getFolder, createFolder, deleteFolder, createTextFile, deleteFile, renameFile, moveFile, getRootFolder, getDownloadUrl } from '../../services/files'
import { getAccessToken } from '../../services/auth'
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
  const [showDropdown, setShowDropdown] = useState(null) // folder create dropdown
  const [folderMenu, setFolderMenu] = useState(null) // { folderId } 3-dot menu
  const [fileMenu, setFileMenu] = useState(null) // { fileId }
  const [renameModal, setRenameModal] = useState(null) // { file?, folder?, folderId, isFolder }
  const [renameName, setRenameName] = useState('')
  const [moveModal, setMoveModal] = useState(null)  // { file, folderId }
  const [moveFolderTree, setMoveFolderTree] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const dropdownRef = useRef(null)
  // Map folderId → WebSocket for folder change notifications
  const folderWsMap = useRef({})

  useEffect(() => {
    if (rootFolder) {
      loadFolderContents(rootFolder.id)
      connectFolderWs(rootFolder.id)
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

  const loadFolderContents = useCallback(async (folderId) => {
    try {
      const folder = await getFolder(folderId)
      setFolderContents((prev) => ({ ...prev, [folderId]: folder }))
    } catch (err) {
      console.error('Error al cargar carpeta:', err)
    }
  }, [])

  // Conectar WS de carpeta para recibir cambios estructurales
  const connectFolderWs = useCallback((folderId) => {
    if (folderWsMap.current[folderId]) return
    const token = getAccessToken()
    if (!token) return
    const ws = new WebSocket(`ws://localhost:8000/ws/folders/${folderId}/?token=${token}`)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'folder_changed') {
          loadFolderContents(folderId)
        }
      } catch { /* ignorar */ }
    }
    ws.onclose = () => { delete folderWsMap.current[folderId] }
    folderWsMap.current[folderId] = ws
  }, [loadFolderContents])

  // Desconectar WS de carpeta
  const disconnectFolderWs = useCallback((folderId) => {
    const ws = folderWsMap.current[folderId]
    if (ws) {
      ws.onclose = null
      ws.close(1000)
      delete folderWsMap.current[folderId]
    }
  }, [])

  // Limpiar todos los WS al desmontar
  useEffect(() => {
    return () => {
      Object.keys(folderWsMap.current).forEach(id => disconnectFolderWs(Number(id)))
    }
  }, [disconnectFolderWs])

  const toggleFolder = async (folderId) => {
    const isFolderExpanded = expandedFolders[folderId]
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !isFolderExpanded,
    }))
    connectFolderWs(folderId)
    if (!isFolderExpanded && !folderContents[folderId]) {
      await loadFolderContents(folderId)
    }
  }

  const handleCreateFolder = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const folder = await createFolder(createInFolder, newFolderName)
      await loadFolderContents(createInFolder)
      notifySideFolderChanged(createInFolder)
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
      const parentId = folderContents[folderId]?.parent || rootFolder?.id
      await loadFolderContents(parentId)
      notifySideFolderChanged(parentId)
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
      const defaultContent = fileType === 'tex'
        ? `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\n\\title{${newFileName}}\n\\author{Autor}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\n\\section{Introducción}\nEscribe aquí tu contenido \\LaTeX.\n\n\\end{document}\n`
        : ''
      const file = await createTextFile(createInFolder, fullName, defaultContent)
      await loadFolderContents(createInFolder)
      notifySideFolderChanged(createInFolder)
      setShowFileModal(false)
      setNewFileName('')
      setCreateInFolder(null)
      if (onFileCreated) onFileCreated(file)
    } catch (err) {
      setError(err.message)
    }
  }

  // Notificar cambio estructural al resto de clientes via WS
  const notifySideFolderChanged = useCallback((folderId) => {
    const ws = folderWsMap.current[folderId]
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'folder_changed' }))
    }
  }, [])

  // ── Handlers de archivo desde el sidebar ──────────────────────────────────
  const handleSideDeleteFile = async (fileId, folderId, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este archivo?')) return
    try {
      await deleteFile(fileId)
      await loadFolderContents(folderId)
      notifySideFolderChanged(folderId)
    } catch (err) { alert(err.message) }
  }

  const handleSideRenameFile = async () => {
    if (!renameModal) return
    const trimmed = renameName.trim()
    if (!trimmed) return
    if (renameModal.isFolder) {
      // Renombrar carpeta
      try {
        const { updateFolder } = await import('../../services/files')
        await updateFolder(renameModal.folder.id, { name: trimmed })
        setRenameModal(null)
        setRenameName('')
        const parentId = renameModal.folderId
        await loadFolderContents(parentId)
        notifySideFolderChanged(parentId)
      } catch (err) { alert('Error al renombrar: ' + err.message) }
      return
    }
    try {
      await renameFile(renameModal.file.id, trimmed)
      setRenameModal(null)
      setRenameName('')
      await loadFolderContents(renameModal.folderId)
      notifySideFolderChanged(renameModal.folderId)
    } catch (err) { alert('Error al renombrar: ' + err.message) }
  }

  const openSideMoveModal = async (file, folderId) => {
    setMoveModal({ file, folderId })
    setMoveTarget(null)
    try {
      const root = await getRootFolder(teamId)
      setMoveFolderTree(root)
    } catch { setMoveFolderTree(null) }
  }

  const handleSideMoveFile = async () => {
    if (!moveModal || !moveTarget) return
    try {
      await moveFile(moveModal.file.id, moveTarget)
      setMoveModal(null)
      setMoveFolderTree(null)
      setMoveTarget(null)
      await loadFolderContents(moveModal.folderId)
      notifySideFolderChanged(moveModal.folderId)
    } catch (err) { alert('Error al mover: ' + err.message) }
  }

  const handleSideDownload = async (file, e) => {
    e.stopPropagation()
    const token = getAccessToken()
    try {
      const res = await fetch(getDownloadUrl(file.id), { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = file.name
      document.body.appendChild(a); a.click()
      URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch (err) { alert('Error al descargar: ' + err.message) }
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
                  <button onClick={(e) => openFileModal(folder.id, 'tex', e)}>
                    <span>🧮</span> Nuevo LaTeX .tex
                  </button>
                </div>
              )}
            </div>
            {!folder.is_root && (
              <div className="file-row-menu" onClick={e => e.stopPropagation()} style={{ marginLeft: 2 }}>
                <button
                  className="file-row-menu-btn"
                  title="Opciones"
                  onClick={e => { e.stopPropagation(); setFolderMenu(folderMenu?.folderId === folder.id ? null : { folderId: folder.id }) }}
                >⋮</button>
                {folderMenu?.folderId === folder.id && (
                  <div className="file-row-dropdown">
                    <button onClick={e => { e.stopPropagation(); setFolderMenu(null); setRenameModal({ folder, folderId: folder.parent || rootFolder?.id, isFolder: true }); setRenameName(folder.name) }}>✏️ Renombrar</button>
                    <button className="danger" onClick={e => { e.stopPropagation(); setFolderMenu(null); handleDeleteFolder(folder.id, e) }}>🗑️ Eliminar</button>
                  </div>
                )}
              </div>
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
                {/* 3-dot menu (visible on hover) */}
                <div className="file-row-menu" onClick={e => e.stopPropagation()}>
                  <button
                    className="file-row-menu-btn"
                    title="Opciones"
                    onClick={e => { e.stopPropagation(); setFileMenu(fileMenu?.fileId === file.id ? null : { fileId: file.id, folderId: folder.id }) }}
                  >⋮</button>
                  {fileMenu?.fileId === file.id && (
                    <div className="file-row-dropdown">
                      <button onClick={e => { setFileMenu(null); handleSideDownload(file, e) }}>⬇ Descargar</button>
                      <button onClick={() => { setFileMenu(null); setRenameModal({ file, folderId: folder.id }); setRenameName(file.name) }}>✏️ Renombrar</button>
                      <button onClick={() => { setFileMenu(null); openSideMoveModal(file, folder.id) }}>📂 Mover a…</button>
                      <button className="danger" onClick={e => { setFileMenu(null); handleSideDeleteFile(file.id, folder.id, e) }}>🗑️ Eliminar</button>
                    </div>
                  )}
                </div>
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
      tex: '🧮',
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

      {/* Modal Renombrar Archivo */}
      {renameModal && (
        <div className="modal-overlay" onClick={() => setRenameModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Renombrar archivo</h2>
            <div className="form-group">
              <label>Nuevo nombre</label>
              <input
                type="text"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSideRenameFile() }}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setRenameModal(null)}>Cancelar</button>
              <button className="primary" onClick={handleSideRenameFile} disabled={!renameName.trim()}>Renombrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mover Archivo */}
      {moveModal && (
        <div className="modal-overlay" onClick={() => { setMoveModal(null); setMoveFolderTree(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Mover "{moveModal.file.name}"</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>Selecciona la carpeta de destino:</p>
            <div className="folder-picker">
              {moveFolderTree
                ? <SidebarFolderPickerTree folder={moveFolderTree} selected={moveTarget} onSelect={setMoveTarget} />
                : <p style={{ color: '#6b7280' }}>Cargando…</p>
              }
            </div>
            <div className="modal-actions">
              <button onClick={() => { setMoveModal(null); setMoveFolderTree(null) }}>Cancelar</button>
              <button className="primary" onClick={handleSideMoveFile} disabled={!moveTarget || moveTarget === moveModal?.folderId}>Mover aquí</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function SidebarFolderPickerTree({ folder, selected, onSelect, level = 0 }) {
  const [expanded, setExpanded] = useState(level === 0)
  return (
    <div style={{ marginLeft: level * 14 }}>
      <div
        className={`picker-folder${selected === folder.id ? ' picker-selected' : ''}`}
        onClick={() => { onSelect(folder.id); setExpanded(true) }}
      >
        <span style={{ marginRight: 4, cursor: 'pointer', opacity: 0.6 }}
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
          {folder.subfolders?.length ? (expanded ? '▾' : '▸') : ' '}
        </span>
        📁 {folder.name}
      </div>
      {expanded && folder.subfolders?.map(sub => (
        <SidebarFolderPickerTree key={sub.id} folder={sub} selected={selected} onSelect={onSelect} level={level + 1} />
      ))}
    </div>
  )
}

export default FileSidebar
