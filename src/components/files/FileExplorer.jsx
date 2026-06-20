import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  getFolder,
  getRootFolder,
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
  renameFile,
  moveFile,
} from '../../services/files'
import { getAccessToken } from '../../services/auth'
import './FileExplorer.css'

// ── Vista previa KaTeX para archivos .tex ──────────────────────────────────
function LatexPreview({ code }) {
  if (!code.trim()) return <p style={{ color: '#aaa', fontStyle: 'italic' }}>(Archivo vacío)</p>

  // Extraer cuerpo del documento; si no hay \begin{document}, usar todo
  const bodyMatch = code.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
  const body = bodyMatch ? bodyMatch[1] : code

  // Leer argumento entre llaves balanceadas: str[pos] debe ser '{'
  function readBraced(str, pos) {
    if (str[pos] !== '{') return { inner: '', next: pos }
    let depth = 0, i = pos
    while (i < str.length) {
      if (str[i] === '{') depth++
      else if (str[i] === '}') { depth--; if (depth === 0) return { inner: str.slice(pos + 1, i), next: i + 1 } }
      i++
    }
    return { inner: str.slice(pos + 1), next: str.length }
  }

  // Renderizar LaTeX en línea como nodos React (bold, italic, código, anidado)
  function renderInline(str, pfx = 0) {
    const nodes = []
    let i = 0, ni = 0
    while (i < str.length) {
      if (str[i] !== '\\') {
        let j = i + 1
        while (j < str.length && str[j] !== '\\') j++
        const txt = str.slice(i, j).replace(/[{}]/g, '')
        if (txt) nodes.push(txt)
        i = j
        continue
      }
      let j = i + 1
      while (j < str.length && /[a-zA-Z]/.test(str[j])) j++
      const cmd = str.slice(i + 1, j)
      i = j
      while (i < str.length && str[i] === ' ') i++
      const key = `${pfx}-${ni++}`
      if (str[i] === '{') {
        const { inner, next } = readBraced(str, i)
        i = next
        if (cmd === 'textbf') nodes.push(<strong key={key}>{renderInline(inner, key)}</strong>)
        else if (cmd === 'textit' || cmd === 'emph') nodes.push(<em key={key}>{renderInline(inner, key)}</em>)
        else if (cmd === 'texttt') nodes.push(<code key={key} style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '0 2px', borderRadius: 2 }}>{inner}</code>)
        else if (cmd === 'underline') nodes.push(<u key={key}>{renderInline(inner, key)}</u>)
        // Comandos desconocidos con un argumento: descartar comando y argumento
      }
      // Comandos sin argumento: descartar
    }
    return nodes
  }

  // Tokenizar body en segmentos matemáticos y de texto
  // Incluye entornos display: $$, \[…\], \begin{equation/align/…}
  const MATH_RE = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$|\\begin\{(?:equation|align|gather|multline)\*?\}[\s\S]+?\\end\{(?:equation|align|gather|multline)\*?\})/g
  const tokens = []
  let last = 0, m
  while ((m = MATH_RE.exec(body)) !== null) {
    if (m.index > last) tokens.push({ t: 'text', s: body.slice(last, m.index) })
    const raw = m[0]
    let display = false, inner = raw
    if (raw.startsWith('$$'))       { display = true;  inner = raw.slice(2, -2) }
    else if (raw.startsWith('\\[')) { display = true;  inner = raw.slice(2, -2) }
    else if (raw.startsWith('\\(')) { display = false; inner = raw.slice(2, -2) }
    else if (raw.startsWith('$'))   { display = false; inner = raw.slice(1, -1) }
    else                            { display = true  /* \begin{…} — pasar completo a KaTeX */ }
    tokens.push({ t: 'math', display, inner: inner.trim() })
    last = m.index + raw.length
  }
  if (last < body.length) tokens.push({ t: 'text', s: body.slice(last) })

  // Convertir tokens a elementos React
  const elements = []
  let key = 0

  for (const tok of tokens) {
    if (tok.t === 'math') {
      try {
        const html = katex.renderToString(tok.inner, { displayMode: tok.display, throwOnError: false })
        elements.push(
          <span key={key++} style={{ display: tok.display ? 'block' : 'inline', textAlign: tok.display ? 'center' : undefined, margin: tok.display ? '16px 0' : undefined }}
            dangerouslySetInnerHTML={{ __html: html }} />
        )
      } catch {
        elements.push(<code key={key++} style={{ color: '#c00', fontSize: '12px' }}>{tok.inner}</code>)
      }
      continue
    }

    // Procesar texto línea a línea
    for (const rawLine of tok.s.split('\n')) {
      const line = rawLine.trim()
      if (!line) continue
      let match

      if ((match = line.match(/^\\section\*?\s*\{/))) {
        const { inner } = readBraced(line, match[0].length - 1)
        elements.push(<h2 key={key++} style={{ fontSize: '1.3em', fontWeight: 700, margin: '16px 0 6px', borderBottom: '1px solid #ccc', paddingBottom: 4 }}>{renderInline(inner)}</h2>)
        continue
      }
      if ((match = line.match(/^\\subsection\*?\s*\{/))) {
        const { inner } = readBraced(line, match[0].length - 1)
        elements.push(<h3 key={key++} style={{ fontSize: '1.1em', fontWeight: 600, margin: '12px 0 4px' }}>{renderInline(inner)}</h3>)
        continue
      }
      if ((match = line.match(/^\\subsubsection\*?\s*\{/))) {
        const { inner } = readBraced(line, match[0].length - 1)
        elements.push(<h4 key={key++} style={{ fontSize: '1em', fontWeight: 600, margin: '10px 0 2px' }}>{renderInline(inner)}</h4>)
        continue
      }
      if ((match = line.match(/^\\item\s*(.*)/s))) {
        elements.push(<p key={key++} style={{ margin: '2px 0 2px 16px', lineHeight: 1.7 }}>• {renderInline(match[1])}</p>)
        continue
      }
      // Saltar directivas de entorno/preámbulo
      if (/^\\(begin|end|documentclass|usepackage|maketitle|newcommand|renewcommand|setlength|hline)\b/.test(line)) continue

      const inline = renderInline(line.replace(/\\\\/g, ''))
      if (inline.length > 0) elements.push(<p key={key++} style={{ margin: '4px 0', lineHeight: 1.7 }}>{inline}</p>)
    }
  }

  return (
    <div style={{ background: '#fff', color: '#111', padding: '32px 40px', fontFamily: 'Georgia, serif', fontSize: '14px', minHeight: '100%' }}>
      {elements}
    </div>
  )
}

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
  const [exportingPdf, setExportingPdf] = useState(false)
  // 3-dot dropdown para archivos del grid
  const [openMenuFileId, setOpenMenuFileId] = useState(null)
  // Modal renombrar
  const [renameModal, setRenameModal] = useState(null) // { file }
  const [renameName, setRenameName] = useState('')
  // Modal mover
  const [moveModal, setMoveModal] = useState(null)    // { file }
  const [moveFolderTree, setMoveFolderTree] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const fileInputRef = useRef(null)
  // WS de carpeta activa (para recibir notificaciones de cambios estructurales)
  const folderWsRef = useRef(null)
  // Map fileId → WebSocket (para sync en tiempo real mientras se edita)
  const fileWsMap = useRef({})

  // Conectar WebSocket de sync para un archivo de texto
  const connectFileWs = useCallback((fileId) => {
    if (fileWsMap.current[fileId]) return // ya conectado
    const token = getAccessToken()
    if (!token) return
    const ws = new WebSocket(`ws://localhost:8000/ws/files/${fileId}/?token=${token}`)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.sender_channel === ws._selfChannel) return // ignorar eco propio
        if (data.type === 'edit') {
          // Actualizar el contenido en edición en tiempo real
          setEditContent(prev => ({ ...prev, [fileId]: data.content }))
        } else if (data.type === 'saved') {
          // El otro cliente guardó — actualizar la vista de lectura
          setTextContents(prev => ({ ...prev, [fileId]: data.content }))
        }
      } catch { /* ignorar */ }
    }
    ws.onclose = () => { delete fileWsMap.current[fileId] }
    fileWsMap.current[fileId] = ws
  }, [])

  const disconnectFileWs = useCallback((fileId) => {
    const ws = fileWsMap.current[fileId]
    if (ws) {
      ws.onclose = null
      ws.close(1000)
      delete fileWsMap.current[fileId]
    }
  }, [])

  // Limpiar todos los WebSockets al desmontar
  useEffect(() => {
    return () => {
      Object.keys(fileWsMap.current).forEach(id => disconnectFileWs(Number(id)))
    }
  }, [disconnectFileWs])

  // WS de carpeta: suscribirse al folder activo para recibir cambios estructurales
  useEffect(() => {
    if (!currentFolder) return
    const token = getAccessToken()
    if (!token) return

    // Desconectar WS anterior si era otra carpeta
    if (folderWsRef.current) {
      folderWsRef.current.onclose = null
      folderWsRef.current.close(1000)
      folderWsRef.current = null
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/folders/${currentFolder.id}/?token=${token}`)
    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'folder_changed') {
          // Otro cliente hizo un cambio estructural — recargar la carpeta
          const updated = await getFolder(currentFolder.id)
          onFolderChange(updated)
        }
      } catch { /* ignorar */ }
    }
    ws.onclose = () => { if (folderWsRef.current === ws) folderWsRef.current = null }
    folderWsRef.current = ws

    return () => {
      ws.onclose = null
      ws.close(1000)
      if (folderWsRef.current === ws) folderWsRef.current = null
    }
  }, [currentFolder?.id])

  // Notificar a otros clientes que la carpeta cambió
  const notifyFolderChanged = useCallback(() => {
    const ws = folderWsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'folder_changed' }))
    }
  }, [])

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

  // Cargar contenido de archivos de texto y sincronizar conexiones WS
  useEffect(() => {
    const currentIds = new Set(openFiles.map(f => f.id))
    // Desconectar WS de archivos que ya no están abiertos
    Object.keys(fileWsMap.current).forEach(id => {
      if (!currentIds.has(Number(id))) disconnectFileWs(Number(id))
    })
    const loadTextContents = async () => {
      for (const file of openFiles) {
        if (isTextFile(file.mime_type, file.extension)) {
          // Mantener WS activo mientras el archivo está abierto
          connectFileWs(file.id)
          if (!textContents[file.id] && !loadingContent[file.id]) {
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
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      notifyFolderChanged()
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
    // WS ya está activo desde que el archivo se abrió
  }

  // Cancelar edición
  const handleCancelEdit = (fileId) => {
    setEditMode(prev => ({ ...prev, [fileId]: false }))
    setEditContent(prev => ({ ...prev, [fileId]: undefined }))
    // WS permanece activo para seguir recibiendo cambios ajenos
  }

  // Guardar archivo
  const handleSaveFile = async (fileId) => {
    setSaving(true)
    try {
      await updateFileContent(fileId, editContent[fileId])
      const saved = editContent[fileId]
      setTextContents(prev => ({ ...prev, [fileId]: saved }))
      setEditMode(prev => ({ ...prev, [fileId]: false }))
      setEditContent(prev => ({ ...prev, [fileId]: undefined }))
      // Notificar a otros clientes que el archivo fue guardado
      const ws = fileWsMap.current[fileId]
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'saved', content: saved }))
      }
      // WS permanece activo para seguir recibiendo cambios del equipo
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Exportar archivo .tex a PDF via pdflatex
  const handleExportPdf = async (file) => {
    const content = textContents[file.id] || ''
    const token = getAccessToken()
    setExportingPdf(true)
    try {
      const response = await fetch('http://localhost:8000/api/v1/latex/export-pdf/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: content,
          file_id: file.id,
          filename: file.name,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert('Error al compilar: ' + (err.detail || `HTTP ${response.status}`))
        return
      }
      // El servidor devuelve el File del PDF creado/actualizado
      const pdfFile = await response.json()
      // 1. Refrescar la carpeta para que aparezca el PDF en el sidebar
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      notifyFolderChanged()
      // 2. Abrir el PDF en una nueva pestaña del panel de visualización
      onOpenFile(pdfFile)
    } catch (err) {
      alert('Error al exportar PDF: ' + err.message)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleDeleteFile = async (fileId, e) => {
    e?.stopPropagation()
    if (!confirm('\u00bfEliminar este archivo?')) return
    try {
      await deleteFile(fileId)
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      notifyFolderChanged()
      // NO cerramos la pesta\u00f1a si est\u00e1 abierta:
      // el usuario puede seguir viendo el archivo hasta que lo cierre manualmente
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  // Renombrar archivo
  const handleRenameFile = async () => {
    if (!renameModal) return
    const trimmed = renameName.trim()
    if (!trimmed) return
    try {
      await renameFile(renameModal.file.id, trimmed)
      setRenameModal(null)
      setRenameName('')
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      notifyFolderChanged()
    } catch (err) {
      alert('Error al renombrar: ' + err.message)
    }
  }

  // Abrir modal de mover
  const openMoveModal = async (file) => {
    setMoveModal({ file })
    setMoveTarget(null)
    try {
      const root = await getRootFolder(teamId)
      setMoveFolderTree(root)
    } catch { setMoveFolderTree(null) }
  }

  // Mover archivo
  const handleMoveFile = async () => {
    if (!moveModal || !moveTarget) return
    try {
      await moveFile(moveModal.file.id, moveTarget)
      setMoveModal(null)
      setMoveFolderTree(null)
      setMoveTarget(null)
      const updated = await getFolder(currentFolder.id)
      onFolderChange(updated)
      notifyFolderChanged()
    } catch (err) {
      alert('Error al mover: ' + err.message)
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
    const isTex = file.extension?.toLowerCase() === 'tex'

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
            onChange={(e) => {
              const val = e.target.value
              setEditContent(prev => ({ ...prev, [file.id]: val }))
              // Enviar cambio en tiempo real a otros clientes
              const ws = fileWsMap.current[file.id]
              if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'edit', content: val }))
              }
            }}
            placeholder={isMd ? 'Escribe tu markdown aquí...' : isTex ? 'Escribe tu código LaTeX aquí...' : 'Escribe tu texto aquí...'}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {isTex && (
              <button
                className="export-pdf-btn"
                onClick={() => handleExportPdf(file)}
                disabled={exportingPdf}
                title="Compilar con pdflatex y descargar PDF"
              >
                {exportingPdf ? 'Compilando…' : '⬇ Exportar PDF'}
              </button>
            )}
            <button
              className="edit-btn"
              onClick={() => handleEnterEdit(file.id)}
            >
              Editar
            </button>
          </div>
        </div>
        <div className={`text-viewer${isTex ? ' latex-viewer' : ''}`}>
          {isMd ? (
            <div className="markdown-preview">
              <ReactMarkdown>{content || '*Archivo vacío*'}</ReactMarkdown>
            </div>
          ) : isTex ? (
            <LatexPreview code={content || ''} />
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
                onClick={() => openMenuFileId && setOpenMenuFileId(null)}
              >
                <div className="item-icon">
                  {getFileIcon(file.mime_type, file.extension)}
                </div>
                <div className="item-name">{file.name}</div>
                <div className="item-meta">{file.human_size}</div>
                {/* 3-dot menu */}
                <div className="item-menu-wrap" onClick={e => e.stopPropagation()}>
                  <button
                    className="item-menu-btn"
                    title="Opciones"
                    onClick={e => { e.stopPropagation(); setOpenMenuFileId(openMenuFileId === file.id ? null : file.id) }}
                  >⋮</button>
                  {openMenuFileId === file.id && (
                    <div className="item-dropdown">
                      <button onClick={() => { setOpenMenuFileId(null); handleDownload(file, { stopPropagation: () => {} }) }}>⬇ Descargar</button>
                      <button onClick={() => { setOpenMenuFileId(null); setRenameModal({ file }); setRenameName(file.name) }}>✏️ Renombrar</button>
                      <button onClick={() => { setOpenMenuFileId(null); openMoveModal(file) }}>📂 Mover a…</button>
                      <button className="danger" onClick={() => { setOpenMenuFileId(null); handleDeleteFile(file.id) }}>🗑️ Eliminar</button>
                    </div>
                  )}
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

      {/* ── Modal Renombrar ────────────────────────────────────────────── */}
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
                onKeyDown={e => { if (e.key === 'Enter') handleRenameFile() }}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setRenameModal(null)}>Cancelar</button>
              <button className="primary" onClick={handleRenameFile} disabled={!renameName.trim()}>Renombrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Mover ────────────────────────────────────────────────── */}
      {moveModal && (
        <div className="modal-overlay" onClick={() => { setMoveModal(null); setMoveFolderTree(null) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Mover "{moveModal.file.name}"</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>Selecciona la carpeta de destino:</p>
            <div className="folder-picker">
              {moveFolderTree
                ? <FolderPickerTree folder={moveFolderTree} selected={moveTarget} onSelect={setMoveTarget} excludeFolderId={currentFolder?.id} />
                : <p style={{ color: '#6b7280' }}>Cargando…</p>
              }
            </div>
            <div className="modal-actions">
              <button onClick={() => { setMoveModal(null); setMoveFolderTree(null) }}>Cancelar</button>
              <button className="primary" onClick={handleMoveFile} disabled={!moveTarget || moveTarget === currentFolder?.id}>Mover aquí</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Árbol de carpetas para el modal de mover ──────────────────────────────
function FolderPickerTree({ folder, selected, onSelect, excludeFolderId, level = 0 }) {
  const [expanded, setExpanded] = useState(level === 0)
  const isSelected = selected === folder.id
  return (
    <div style={{ marginLeft: level * 14 }}>
      <div
        className={`picker-folder${isSelected ? ' picker-selected' : ''}`}
        onClick={() => { onSelect(folder.id); setExpanded(true) }}
      >
        <span style={{ marginRight: 4, cursor: 'pointer', opacity: 0.6 }}
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
          {(folder.subfolders?.length) ? (expanded ? '▾' : '▸') : ' '}
        </span>
        📁 {folder.name}
      </div>
      {expanded && folder.subfolders?.map(sub => (
        <FolderPickerTree
          key={sub.id}
          folder={sub}
          selected={selected}
          onSelect={onSelect}
          excludeFolderId={excludeFolderId}
          level={level + 1}
        />
      ))}
    </div>
  )
}

export default FileExplorer
