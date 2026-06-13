import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTeams, createTeam, joinTeam, joinWithInvitation } from '../services/teams'
import Navbar from '../components/Navbar'
import '../styles/Teams.css'

function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      setLoadError('')
      const data = await getTeams()
      setTeams(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.message === 'No autenticado') {
        navigate('/')
      } else {
        setLoadError('Error al cargar equipos. Verifica que la API esté funcionando.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const team = await createTeam({
        name: newTeamName,
        description: newTeamDescription,
      })
      setTeams([...teams, team])
      setShowCreateModal(false)
      setNewTeamName('')
      setNewTeamDescription('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleJoinTeam = async (e) => {
    e.preventDefault()
    setError('')
    try {
      // Intentar primero con el nuevo sistema de invitaciones
      let team
      try {
        team = await joinWithInvitation(inviteCode)
      } catch {
        // Si falla, intentar con el sistema antiguo
        team = await joinTeam(inviteCode)
      }
      setTeams([...teams, team])
      setShowJoinModal(false)
      setInviteCode('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="teams-container">
        <p className="loading">Cargando equipos...</p>
      </div>
    )
  }

  return (
    <div className="teams-container">
      <Navbar showBackButton backPath="/home" backLabel="Inicio" />

      <div className="teams-content">
        <div className="teams-header">
          <h1>Mis Equipos</h1>
          <div className="teams-actions">
            <button className="action-btn create" onClick={() => setShowCreateModal(true)}>
              + Crear Equipo
            </button>
            <button className="action-btn join" onClick={() => setShowJoinModal(true)}>
              Unirse con Código
            </button>
          </div>
        </div>

        {loadError ? (
          <div className="no-teams">
            <p className="error-text">{loadError}</p>
            <button className="action-btn create" onClick={loadTeams}>
              Reintentar
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className="no-teams">
            <p>No perteneces a ningún equipo todavía.</p>
            <p>Crea uno nuevo o únete con un código de invitación.</p>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map((team) => (
              <div
                key={team.id}
                className="team-card"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <div className="team-avatar">
                  {team.avatar ? (
                    <img src={team.avatar} alt={team.name} />
                  ) : (
                    <span>{team.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="team-info">
                  <h3>{team.name}</h3>
                  <p className="team-description">
                    {team.description || 'Sin descripción'}
                  </p>
                  <div className="team-meta">
                    <span className="member-count">
                      {team.member_count || team.members?.length || 0} miembros
                    </span>
                    <span className="team-role">{team.my_role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Equipo */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Equipo</h2>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label>Nombre del equipo</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Mi equipo"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción (opcional)</label>
                <textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Describe tu equipo..."
                  rows={3}
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

      {/* Modal Unirse con Código */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Unirse a un Equipo</h2>
            <form onSubmit={handleJoinTeam}>
              <div className="form-group">
                <label>Código de invitación</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="ABC12345"
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowJoinModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Unirse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Teams
