import { useState, useEffect } from 'react'
import { createSession } from '../../services/study'
import { getTeams } from '../../services/teams'
import './NewSessionModal.css'

function NewSessionModal({ onClose, onCreate }) {
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const data = await getTeams()
      setTeams(data)
      if (data.length > 0) setTeamId(String(data[0].id))
    } catch (err) {
      setError('No se pudieron cargar los equipos')
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!teamId || !title.trim()) return
    setError('')
    setLoading(true)
    try {
      const session = await createSession({
        team: Number(teamId),
        title: title.trim(),
        description: description.trim() || undefined,
        is_active: true,
      })
      onCreate(session)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="new-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 Nueva sesión de estudio</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {loadingTeams ? (
          <p className="modal-loading">Cargando equipos...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Equipo</label>
              {teams.length === 0 ? (
                <p className="no-teams-msg">No tienes equipos. Crea o únete a uno primero.</p>
              ) : (
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  required
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Biología Celular"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Descripción (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el contenido de esta sesión..."
                rows={3}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-create"
                disabled={loading || !title.trim() || !teamId || teams.length === 0}
              >
                {loading ? 'Creando...' : 'Crear sesión'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default NewSessionModal
