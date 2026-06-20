import { useState } from 'react'
import { deleteSession } from '../../services/study'
import './StudySessionSidebar.css'

function StudySessionSidebar({ sessions, selectedSession, onSelectSession, onNewSession, onSessionDeleted }) {
  const [sessionMenu, setSessionMenu] = useState(null)

  const handleDeleteSession = async (session, e) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar la sesión "${session.title}"?`)) return
    try {
      await deleteSession(session.id)
      if (onSessionDeleted) onSessionDeleted(session.id)
      setSessionMenu(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleMenuClick = (e, sessionId) => {
    e.stopPropagation()
    setSessionMenu(sessionMenu === sessionId ? null : sessionId)
  }

  return (
    <aside className="study-sidebar">
      <div className="study-sidebar-header">
        <h3>🤖 Herramienta de Estudio</h3>
      </div>

      <button className="new-session-btn" onClick={onNewSession}>
        + Nueva Sesión
      </button>

      <hr className="sidebar-separator" />

      <div className="study-sessions-list">
        {sessions.length === 0 && (
          <div className="no-sessions">
            <p>No tienes sesiones de estudio.</p>
            <p>¡Crea una para empezar!</p>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`study-session-item ${selectedSession?.id === session.id ? 'selected' : ''}`}
            onClick={() => onSelectSession(session)}
          >
            <div className="session-item-content">
              <span className="session-item-icon">📚</span>
              <div className="session-item-info">
                <span className="session-item-title">{session.title}</span>
                <span className="session-item-meta">
                  {session.document_count} doc · {session.quiz_count} quiz
                  {session.overall_average != null && ` · ${session.overall_average.toFixed(0)}%`}
                </span>
              </div>
            </div>

            <div className="session-menu-container">
              <button
                className="session-menu-trigger"
                onClick={(e) => handleMenuClick(e, session.id)}
                title="Opciones"
              >
                ⋮
              </button>

              {sessionMenu === session.id && (
                <div className="session-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="danger"
                    onClick={(e) => handleDeleteSession(session, e)}
                  >
                    🗑️ Eliminar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default StudySessionSidebar
