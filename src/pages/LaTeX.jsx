import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, getAccessToken } from '../services/auth'
import Navbar from '../components/Navbar'
import LaTeXEditor from '../components/latex/LaTeXEditor'
import '../styles/LaTeX.css'

const API_BASE = 'http://localhost:8000/api/v1'

async function fetchDocuments() {
  const token = getAccessToken()
  const res = await fetch(`${API_BASE}/latex/documents/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results || data
}

async function createDocument(title) {
  const token = getAccessToken()
  const docId = `doc-${Date.now()}`
  const res = await fetch(`${API_BASE}/latex/documents/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ doc_id: docId, title }),
  })
  if (!res.ok) throw new Error('Error al crear documento')
  return res.json()
}

export default function LaTeX() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        await getProfile()
        const docs = await fetchDocuments()
        setDocuments(docs)
        if (docs.length > 0) setSelectedDocId(docs[0].doc_id)
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [navigate])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      const doc = await createDocument(newTitle.trim())
      setDocuments((prev) => [doc, ...prev])
      setSelectedDocId(doc.doc_id)
      setNewTitle('')
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="latex-page-loading">Cargando editor LaTeX...</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="latex-page">
        {/* Sidebar de documentos */}
        <aside className="latex-sidebar">
          <div className="latex-sidebar-header">📝 Documentos LaTeX</div>

          <form className="latex-new-form" onSubmit={handleCreate}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nombre del nuevo documento"
            />
            <button type="submit" disabled={!newTitle.trim()}>+</button>
          </form>

          <ul className="latex-doc-list">
            {documents.length === 0 && (
              <li className="latex-doc-empty">No hay documentos. Crea uno.</li>
            )}
            {documents.map((doc) => (
              <li
                key={doc.doc_id}
                className={`latex-doc-item ${doc.doc_id === selectedDocId ? 'active' : ''}`}
                onClick={() => setSelectedDocId(doc.doc_id)}
              >
                <span className="latex-doc-title">{doc.title}</span>
                <span className="latex-doc-id">{doc.doc_id}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Editor principal */}
        <main className="latex-main">
          {selectedDocId ? (
            <LaTeXEditor key={selectedDocId} docId={selectedDocId} />
          ) : (
            <div className="latex-no-doc">
              <p>Selecciona o crea un documento para empezar.</p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
