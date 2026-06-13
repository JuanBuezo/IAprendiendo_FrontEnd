import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { previewInvitation, joinWithInvitation } from '../services/teams'
import { isAuthenticated } from '../services/auth'
import '../styles/InvitePage.css'

function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvitationPreview()
  }, [code])

  const loadInvitationPreview = async () => {
    try {
      const data = await previewInvitation(code)
      setInvitation(data)
    } catch (err) {
      setError('Invitación no válida o expirada')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!isAuthenticated()) {
      // Guardar el código y redirigir al login
      localStorage.setItem('pending_invite', code)
      navigate('/')
      return
    }

    setJoining(true)
    setError('')
    try {
      const team = await joinWithInvitation(code)
      navigate(`/teams/${team.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }

  const getTypeLabel = (type) => {
    const labels = {
      single_use: 'Un solo uso',
      limited: 'Usos limitados',
      timed: 'Temporal',
      permanent: 'Permanente',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="invite-page">
        <div className="invite-card">
          <p className="loading">Cargando invitación...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="invite-page">
        <div className="invite-card error">
          <div className="error-icon">❌</div>
          <h2>Invitación no válida</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="primary-btn">
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="invite-page">
      <div className="invite-card">
        <div className="team-preview">
          <div className="team-avatar-large">
            {invitation?.team?.avatar ? (
              <img src={invitation.team.avatar} alt={invitation.team.name} />
            ) : (
              <span>{invitation?.team?.name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h1>{invitation?.team?.name}</h1>
          {invitation?.team?.description && (
            <p className="team-description">{invitation.team.description}</p>
          )}
          <div className="invite-meta">
            <span className="member-count">
              {invitation?.team?.member_count || 0} miembros
            </span>
            <span className={`invite-type ${invitation?.invitation_type}`}>
              {getTypeLabel(invitation?.invitation_type)}
            </span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="invite-actions">
          {isAuthenticated() ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="join-btn"
            >
              {joining ? 'Uniéndose...' : 'Unirse al equipo'}
            </button>
          ) : (
            <>
              <p className="login-prompt">Inicia sesión para unirte</p>
              <button onClick={handleJoin} className="join-btn">
                Iniciar sesión y unirse
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvitePage
