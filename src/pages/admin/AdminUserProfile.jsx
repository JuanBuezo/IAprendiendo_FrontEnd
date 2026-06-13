import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProfile, getAvatarUrl } from '../../services/auth'
import {
  hasAdminAccess,
  canWrite,
  isSuperuser,
  getUserProfile,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  getUserTeams,
  getRoleLabel,
  getRoleBadgeClass,
} from '../../services/admin'
import Navbar from '../../components/Navbar'
import './AdminUserProfile.css'

function AdminUserProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [targetUser, setTargetUser] = useState(null)
  const [teams, setTeams] = useState([])
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modales
  const [showBanModal, setShowBanModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Formularios
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('permanent')
  const [newRole, setNewRole] = useState('')

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      const userData = await getProfile()
      setCurrentUser(userData)

      if (!hasAdminAccess(userData)) {
        navigate('/home')
        return
      }

      const targetData = await getUserProfile(userId)
      setTargetUser(targetData)
      setNewRole(targetData.role)

      // Cargar equipos del usuario
      try {
        const teamsData = await getUserTeams(userId)
        setTeams(Array.isArray(teamsData) ? teamsData : teamsData.results || [])
      } catch {
        setTeams([])
      }
    } catch (err) {
      setError('Error al cargar el usuario')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBan = async () => {
    setError('')
    try {
      const data = { reason: banReason }
      if (banDuration !== 'permanent') {
        const date = new Date()
        const days = parseInt(banDuration)
        date.setDate(date.getDate() + days)
        data.expires_at = date.toISOString()
      }
      await banUser(userId, data)
      setSuccess('Usuario baneado correctamente')
      setShowBanModal(false)
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUnban = async () => {
    setError('')
    try {
      await unbanUser(userId)
      setSuccess('Usuario desbaneado correctamente')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateRole = async () => {
    setError('')
    try {
      await updateUserRole(userId, { role: newRole })
      setSuccess('Rol actualizado correctamente')
      setShowRoleModal(false)
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    setError('')
    try {
      await deleteUser(userId)
      setSuccess('Usuario eliminado')
      setTimeout(() => navigate('/admin/users'), 1500)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-user-profile">
        <Navbar />
        <div className="admin-content">
          <p className="loading">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!targetUser) {
    return (
      <div className="admin-user-profile">
        <Navbar showBackButton backPath="/admin/users" backLabel="Usuarios" />
        <div className="admin-content">
          <p className="error-message">{error || 'Usuario no encontrado'}</p>
        </div>
      </div>
    )
  }

  const canModify = canWrite(currentUser)
  const isCurrentSuperuser = isSuperuser(currentUser)
  const isTargetSuperuser = isSuperuser(targetUser)
  const isTargetAdmin = targetUser.role === 'admin'

  // Determinar qué acciones puede hacer
  const canBan = canModify && !isTargetSuperuser && !(isTargetAdmin && !isCurrentSuperuser)
  const canChangeRole = canModify && !isTargetSuperuser
  const canDeleteUser = isCurrentSuperuser && !isTargetSuperuser

  return (
    <div className="admin-user-profile">
      <Navbar showBackButton backPath="/admin/users" backLabel="Usuarios" />

      <div className="admin-content">
        {/* Header del usuario */}
        <div className="user-profile-header">
          <div className="profile-avatar-large">
            {targetUser.avatar ? (
              <img src={getAvatarUrl(targetUser.avatar)} alt={targetUser.username} />
            ) : (
              <div className="avatar-placeholder-large">
                {targetUser.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{targetUser.username}</h1>
            <p className="user-email">{targetUser.email}</p>
            <div className="badges-row">
              <span className={`role-badge large ${getRoleBadgeClass(targetUser.role, isTargetSuperuser)}`}>
                {getRoleLabel(targetUser.role, isTargetSuperuser)}
              </span>
              {targetUser.is_banned && (
                <span className="banned-badge large">Baneado</span>
              )}
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Información
          </button>
          <button
            className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Equipos ({teams.length})
          </button>
          {canModify && (
            <button
              className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
              onClick={() => setActiveTab('actions')}
            >
              Acciones
            </button>
          )}
        </div>

        {/* Contenido de tabs */}
        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">ID</span>
                  <span className="info-value">{targetUser.id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Username</span>
                  <span className="info-value">{targetUser.username}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{targetUser.email}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rol</span>
                  <span className="info-value">{getRoleLabel(targetUser.role, isTargetSuperuser)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Fecha de registro</span>
                  <span className="info-value">
                    {new Date(targetUser.date_joined).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {targetUser.is_banned && (
                  <>
                    <div className="info-item">
                      <span className="info-label">Estado</span>
                      <span className="info-value banned">Baneado</span>
                    </div>
                    {targetUser.ban_expires_at && (
                      <div className="info-item">
                        <span className="info-label">Expira el</span>
                        <span className="info-value">
                          {new Date(targetUser.ban_expires_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="teams-tab">
              {teams.length === 0 ? (
                <p className="no-teams">Este usuario no pertenece a ningún equipo</p>
              ) : (
                <div className="teams-list">
                  {teams.map((team) => (
                    <div key={team.id || team.team?.id} className="team-item">
                      <div className="team-info">
                        <span className="team-name">{team.name || team.team?.name}</span>
                        <span className="team-role">{team.role || team.my_role || 'member'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && canModify && (
            <div className="actions-tab">
              {/* Cambiar rol */}
              {canChangeRole && (
                <div className="action-card">
                  <h3>Cambiar Rol</h3>
                  <p>Modifica el nivel de acceso del usuario</p>
                  <button className="action-btn blue" onClick={() => setShowRoleModal(true)}>
                    Cambiar Rol
                  </button>
                </div>
              )}

              {/* Banear/Desbanear */}
              {canBan && (
                <div className="action-card">
                  <h3>{targetUser.is_banned ? 'Desbanear Usuario' : 'Banear Usuario'}</h3>
                  <p>
                    {targetUser.is_banned
                      ? 'Permite que el usuario vuelva a acceder'
                      : 'Impide que el usuario acceda a la plataforma'}
                  </p>
                  {targetUser.is_banned ? (
                    <button className="action-btn green" onClick={handleUnban}>
                      Desbanear
                    </button>
                  ) : (
                    <button className="action-btn orange" onClick={() => setShowBanModal(true)}>
                      Banear
                    </button>
                  )}
                </div>
              )}

              {/* Eliminar (solo superuser) */}
              {canDeleteUser && (
                <div className="action-card danger">
                  <h3>Eliminar Usuario</h3>
                  <p>Esta acción es irreversible. Se eliminarán todos los datos del usuario.</p>
                  <button className="action-btn red" onClick={() => setShowDeleteModal(true)}>
                    Eliminar Permanentemente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Banear */}
      {showBanModal && (
        <div className="modal-overlay" onClick={() => setShowBanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Banear Usuario</h2>
            <p className="modal-subtitle">Usuario: {targetUser.username}</p>

            <div className="form-group">
              <label>Duración del baneo</label>
              <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)}>
                <option value="permanent">Permanente</option>
                <option value="1">1 día</option>
                <option value="7">7 días</option>
                <option value="30">30 días</option>
                <option value="90">90 días</option>
              </select>
            </div>

            <div className="form-group">
              <label>Motivo (opcional)</label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motivo del baneo..."
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowBanModal(false)}>Cancelar</button>
              <button className="danger" onClick={handleBan}>Banear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar Rol */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Cambiar Rol</h2>
            <p className="modal-subtitle">Usuario: {targetUser.username}</p>

            <div className="form-group">
              <label>Nuevo rol</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="member">Miembro</option>
                <option value="staff">Staff</option>
                {isCurrentSuperuser && <option value="admin">Administrador</option>}
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowRoleModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleUpdateRole}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal danger" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Eliminar Usuario</h2>
            <p className="modal-warning">
              Esta acción es <strong>irreversible</strong>. Se eliminarán todos los datos
              asociados al usuario <strong>{targetUser.username}</strong>.
            </p>
            <p>Escribe el username para confirmar:</p>

            <input
              type="text"
              placeholder={targetUser.username}
              id="confirm-delete"
            />

            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button
                className="danger"
                onClick={() => {
                  const input = document.getElementById('confirm-delete')
                  if (input.value === targetUser.username) {
                    handleDelete()
                  } else {
                    setError('El username no coincide')
                  }
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserProfile
