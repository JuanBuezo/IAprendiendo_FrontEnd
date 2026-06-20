import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSessions } from '../services/study'
import { getProfile } from '../services/auth'
import Navbar from '../components/Navbar'
import StudySessionSidebar from '../components/study/StudySessionSidebar'
import StudyMain from '../components/study/StudyMain'
import NewSessionModal from '../components/study/NewSessionModal'
import '../styles/Study.css'

function Study() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    try {
      await getProfile() // Auth check
      const data = await getSessions()
      setSessions(data)
      if (data.length > 0) setSelectedSession(data[0])
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSessionCreated = (session) => {
    setSessions((prev) => [session, ...prev])
    setSelectedSession(session)
    setShowNewSession(false)
  }

  const handleSessionDeleted = (sessionId) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (selectedSession?.id === sessionId) {
      const remaining = sessions.filter((s) => s.id !== sessionId)
      setSelectedSession(remaining.length > 0 ? remaining[0] : null)
    }
  }

  const handleSessionUpdate = (updated) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    )
    if (selectedSession?.id === updated.id) {
      setSelectedSession((prev) => ({ ...prev, ...updated }))
    }
  }

  if (loading) {
    return (
      <div className="study-page">
        <Navbar showBackButton backPath="/home" backLabel="Inicio" />
        <div className="study-loading">
          <div className="study-spinner" />
          <p>Cargando sesiones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="study-page">
      <Navbar showBackButton backPath="/home" backLabel="Inicio" />

      <div className="study-layout">
        <StudySessionSidebar
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={setSelectedSession}
          onNewSession={() => setShowNewSession(true)}
          onSessionDeleted={handleSessionDeleted}
        />

        {selectedSession ? (
          <StudyMain
            selectedSession={selectedSession}
            onSessionUpdate={handleSessionUpdate}
          />
        ) : (
          <div className="study-empty-state">
            <div className="empty-robot">🤖</div>
            <h2>Herramienta de Estudio</h2>
            <p>Crea una sesión de estudio para empezar a generar quizzes con IA sobre tus documentos.</p>
            <button className="empty-create-btn" onClick={() => setShowNewSession(true)}>
              + Nueva Sesión
            </button>
          </div>
        )}
      </div>

      {showNewSession && (
        <NewSessionModal
          onClose={() => setShowNewSession(false)}
          onCreate={handleSessionCreated}
        />
      )}
    </div>
  )
}

export default Study
