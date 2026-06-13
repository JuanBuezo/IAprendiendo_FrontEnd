import { useState, useEffect } from 'react'
import {
  getTeamInvitations,
  createInvitation,
  deleteInvitation,
  toggleInvitation,
  getInvitationLink,
} from '../../services/teams'
import './InvitationManager.css'

function InvitationManager({ team, onClose }) {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [inviteType, setInviteType] = useState('permanent')
  const [maxUses, setMaxUses] = useState(10)
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    loadInvitations()
  }, [team.id])

  const loadInvitations = async () => {
    try {
      const data = await getTeamInvitations(team.id)
      setInvitations(data)
    } catch (err) {
      console.error('Error al cargar invitaciones:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvitation = async (e) => {
    e.preventDefault()
    setError('')

    const data = { invitation_type: inviteType }
    if (inviteType === 'limited') {
      data.max_uses = maxUses
    } else if (inviteType === 'timed') {
      data.expires_at = expiresAt
    }

    try {
      await createInvitation(team.id, data)
      // Recargar la lista completa para obtener todos los campos
      await loadInvitations()
      setShowCreateModal(false)
      setInviteType('permanent')
      setMaxUses(10)
      setExpiresAt('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (invitationId) => {
    if (!confirm('¿Eliminar esta invitación?')) return
    try {
      await deleteInvitation(invitationId)
      setInvitations(invitations.filter((i) => i.id !== invitationId))
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const handleToggle = async (invitationId) => {
    try {
      const updated = await toggleInvitation(invitationId)
      setInvitations(invitations.map((i) => (i.id === invitationId ? updated : i)))
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const copyToClipboard = (invitation, type) => {
    const text = type === 'code' ? invitation.code : getInvitationLink(invitation)
    navigator.clipboard.writeText(text)
    setCopiedId(`${invitation.id}-${type}`)
    setTimeout(() => setCopiedId(null), 2000)
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const canManage = ['owner', 'admin'].includes(team?.my_role)

  if (!canManage) {
    return (
      <div className="invitation-manager">
        <div className="manager-header">
          <h2>Invitaciones</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <p className="no-permission">Solo los administradores pueden gestionar invitaciones.</p>
      </div>
    )
  }

  return (
    <div className="invitation-manager">
      <div className="manager-header">
        <h2>Invitaciones del Equipo</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="manager-actions">
        <button className="create-btn" onClick={() => setShowCreateModal(true)}>
          + Nueva Invitación
        </button>
      </div>

      {loading ? (
        <p className="loading">Cargando invitaciones...</p>
      ) : invitations.length === 0 ? (
        <div className="no-invitations">
          <p>No hay invitaciones activas.</p>
          <p>Crea una para invitar nuevos miembros.</p>
        </div>
      ) : (
        <div className="invitations-list">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className={`invitation-card ${!invitation.is_active ? 'inactive' : ''}`}
            >
              <div className="invitation-header">
                <span className={`type-badge ${invitation.invitation_type}`}>
                  {getTypeLabel(invitation.invitation_type)}
                </span>
                {!invitation.is_active && <span className="inactive-badge">Desactivada</span>}
              </div>

              <div className="invitation-code">
                <span className="code">{invitation.code}</span>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(invitation, 'code')}
                  title="Copiar código"
                >
                  {copiedId === `${invitation.id}-code` ? '✓' : '📋'}
                </button>
              </div>

              <div className="invitation-link">
                <input
                  type="text"
                  value={getInvitationLink(invitation)}
                  readOnly
                  onClick={(e) => e.target.select()}
                />
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(invitation, 'link')}
                  title="Copiar enlace"
                >
                  {copiedId === `${invitation.id}-link` ? '✓' : '🔗'}
                </button>
              </div>

              <div className="invitation-meta">
                {invitation.invitation_type === 'limited' && (
                  <span>Usos: {invitation.use_count || 0}/{invitation.max_uses}</span>
                )}
                {invitation.invitation_type === 'timed' && (
                  <span>Expira: {formatDate(invitation.expires_at)}</span>
                )}
                {invitation.invitation_type === 'single_use' && (
                  <span>Usos: {invitation.use_count || 0}/1</span>
                )}
                <span>Creada: {formatDate(invitation.created_at)}</span>
              </div>

              <div className="invitation-actions">
                <button
                  className={`toggle-btn ${invitation.is_active ? 'active' : ''}`}
                  onClick={() => handleToggle(invitation.id)}
                  title={invitation.is_active ? 'Desactivar' : 'Activar'}
                >
                  {invitation.is_active ? '🟢 Activa' : '🔴 Inactiva'}
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(invitation.id)}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Invitación */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nueva Invitación</h2>
            <form onSubmit={handleCreateInvitation}>
              <div className="form-group">
                <label>Tipo de invitación</label>
                <select value={inviteType} onChange={(e) => setInviteType(e.target.value)}>
                  <option value="permanent">Permanente (sin límite)</option>
                  <option value="single_use">Un solo uso</option>
                  <option value="limited">Usos limitados</option>
                  <option value="timed">Temporal (expira en fecha)</option>
                </select>
              </div>

              {inviteType === 'limited' && (
                <div className="form-group">
                  <label>Número máximo de usos</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value))}
                  />
                </div>
              )}

              {inviteType === 'timed' && (
                <div className="form-group">
                  <label>Fecha de expiración</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    required
                  />
                </div>
              )}

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
    </div>
  )
}

export default InvitationManager
