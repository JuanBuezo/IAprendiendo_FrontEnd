import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { getAccessToken } from '../../services/auth'
import './LaTeXEditor.css'

const WS_BASE = 'ws://localhost:8000'
const API_BASE = 'http://localhost:8000/api/v1'

// ─── KaTeX preview ──────────────────────────────────────────────────────────
// Extrae y renderiza solo las fórmulas del documento LaTeX con KaTeX.
// Las líneas \begin{document}...\end{document} se usan como contenido.
function renderKaTeXPreview(latexCode) {
  // Extraer el cuerpo del documento
  const bodyMatch = latexCode.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
  const body = bodyMatch ? bodyMatch[1] : latexCode

  // Dividir por fórmulas: $$...$$ y $...$
  const parts = []
  const pattern = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
  let last = 0
  let match

  while ((match = pattern.exec(body)) !== null) {
    // Texto plano antes de la fórmula
    if (match.index > last) {
      parts.push({ type: 'text', content: body.slice(last, match.index) })
    }
    const isDisplay = match[0].startsWith('$$')
    const inner = isDisplay
      ? match[0].slice(2, -2).trim()
      : match[0].slice(1, -1).trim()
    parts.push({ type: 'math', display: isDisplay, content: inner })
    last = match.index + match[0].length
  }
  if (last < body.length) {
    parts.push({ type: 'text', content: body.slice(last) })
  }

  return parts.map((part, i) => {
    if (part.type === 'text') {
      // Convertir comandos LaTeX comunes a texto legible
      const txt = part.content
        .replace(/\\section\{([^}]+)\}/g, '\n## $1\n')
        .replace(/\\subsection\{([^}]+)\}/g, '\n### $1\n')
        .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
        .replace(/\\textit\{([^}]+)\}/g, '_$1_')
        .replace(/\\\\|\n{2,}/g, '\n')
        .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '')
        .trim()
      return txt ? <p key={i} className="le-preview-text">{txt}</p> : null
    }
    try {
      const html = katex.renderToString(part.content, {
        displayMode: part.display,
        throwOnError: false,
      })
      return (
        <span
          key={i}
          className={part.display ? 'le-math-display' : 'le-math-inline'}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    } catch {
      return <span key={i} className="le-math-error">{part.content}</span>
    }
  })
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function LaTeXEditor({ docId }) {
  const editorDomRef = useRef(null)   // div donde monta CodeMirror
  const editorViewRef = useRef(null)  // instancia EditorView
  const wsRef = useRef(null)          // instancia WebSocket
  const isRemoteUpdate = useRef(false) // evitar eco WS → editor → WS

  const [previewParts, setPreviewParts] = useState([])
  const [pdfError, setPdfError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [connected, setConnected] = useState(false)

  // Debounce para la preview KaTeX (300 ms)
  const previewTimer = useRef(null)
  const schedulePreview = useCallback((code) => {
    clearTimeout(previewTimer.current)
    previewTimer.current = setTimeout(() => {
      setPreviewParts(renderKaTeXPreview(code))
    }, 300)
  }, [])

  // ── Inicializar CodeMirror ───────────────────────────────────────────────
  useEffect(() => {
    if (!editorDomRef.current || editorViewRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      if (isRemoteUpdate.current) return

      const newCode = update.state.doc.toString()
      schedulePreview(newCode)

      // Enviar cambio por WebSocket si está conectado
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'edit', content: newCode }))
      }
    })

    const state = EditorState.create({
      doc: '',
      extensions: [
        history(),
        lineNumbers(),
        highlightActiveLine(),
        markdown(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: '"Fira Code", "Courier New", monospace' },
        }),
      ],
    })

    editorViewRef.current = new EditorView({ state, parent: editorDomRef.current })

    return () => {
      editorViewRef.current?.destroy()
      editorViewRef.current = null
    }
  }, [schedulePreview])

  // ── Conectar WebSocket ───────────────────────────────────────────────────
  useEffect(() => {
    if (!docId) return

    const token = getAccessToken()
    if (!token) return

    const ws = new WebSocket(`${WS_BASE}/ws/latex/${docId}/?token=${token}`)

    ws.onopen = () => setConnected(true)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'init' || data.type === 'document_update') {
          // Solo actualizar el editor si el cambio vino de otro cliente
          if (data.type === 'document_update' && data.sender_channel === ws._localChannel) return

          const view = editorViewRef.current
          if (!view) return

          isRemoteUpdate.current = true
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: data.content },
          })
          isRemoteUpdate.current = false
          schedulePreview(data.content)
        }
      } catch (err) {
        console.error('WS parse error:', err)
      }
    }

    ws.onerror = () => setConnected(false)

    ws.onclose = (e) => {
      setConnected(false)
      // Reconectar si no fue cierre limpio
      if (e.code !== 1000 && e.code !== 4001) {
        setTimeout(() => {
          if (wsRef.current === ws) {
            // Forzar re-mount limpio desmontando y remontando el effect
            wsRef.current = null
          }
        }, 3000)
      }
    }

    wsRef.current = ws

    return () => {
      ws.onclose = null
      ws.close(1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  // ── Exportar PDF ─────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    const view = editorViewRef.current
    if (!view) return
    const code = view.state.doc.toString()

    setExporting(true)
    setPdfError(null)

    try {
      const token = getAccessToken()
      const response = await fetch(`${API_BASE}/latex/export-pdf/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      })

      if (response.ok) {
        // Descargar el PDF automáticamente
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'documento.pdf'
        a.click()
        URL.revokeObjectURL(url)
      } else if (response.status === 422) {
        const data = await response.json()
        setPdfError({ detail: data.detail, log: data.log })
      } else {
        setPdfError({ detail: `Error del servidor (${response.status})`, log: '' })
      }
    } catch (err) {
      setPdfError({ detail: 'Error de red al exportar.', log: err.message })
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="le-root">
      {/* Barra superior */}
      <div className="le-toolbar">
        <span className="le-doc-id">📄 {docId}</span>
        <span className={`le-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Conectado' : '🔴 Desconectado'}
        </span>
        <button
          className="le-export-btn"
          onClick={handleExportPdf}
          disabled={exporting}
        >
          {exporting ? '⏳ Compilando...' : '⬇️ Exportar PDF'}
        </button>
      </div>

      {/* Panel principal: editor + preview */}
      <div className="le-panels">
        {/* Editor CodeMirror */}
        <div className="le-editor-pane">
          <div className="le-pane-header">✏️ Editor LaTeX</div>
          <div ref={editorDomRef} className="le-codemirror-host" />
        </div>

        {/* Vista previa KaTeX */}
        <div className="le-preview-pane">
          <div className="le-pane-header">👁️ Vista previa (fórmulas)</div>
          <div className="le-preview-content">
            {previewParts.length > 0
              ? previewParts
              : <p className="le-preview-empty">Las fórmulas matemáticas aparecerán aquí mientras escribes.</p>
            }
          </div>
        </div>
      </div>

      {/* Log de errores de pdflatex */}
      {pdfError && (
        <div className="le-error-panel">
          <div className="le-error-header">
            ❌ Error de compilación
            <button className="le-error-close" onClick={() => setPdfError(null)}>×</button>
          </div>
          <p className="le-error-detail">{pdfError.detail}</p>
          {pdfError.log && (
            <pre className="le-error-log">{pdfError.log}</pre>
          )}
        </div>
      )}
    </div>
  )
}
