import { useNavigate } from 'react-router-dom'
import { getAvatarUrl } from '../services/auth'
import { hasAdminAccess, getRoleLabel, getRoleBadgeClass } from '../services/admin'
import './UserProfileModal.css'

function UserProfileModal({ user, teamRole, currentUser, onClose }) {
  const navigate = useNavigate()

  if (!user) return null

  const isCurrentUserAdmin = hasAdminAccess(currentUser)

  const handleAdminView = () => {
    onClose()
    navigate(`/admin/users/${user.id}`)
  }

  return (
    <div className="user-profile-modal-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-avatar">
          {user.avatar ? (
            <img src={getAvatarUrl(user.avatar)} alt={user.username} />
          ) : (
            <div className="avatar-placeholder">
              {user.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="modal-username">{user.username}</h2>

        <div className="modal-badges">
          {/* Rol en el equipo */}
          {teamRole && (
            <span className={`team-role-badge ${teamRole}`}>
              {teamRole === 'owner' && 'Propietario'}
              {teamRole === 'admin' && 'Admin'}
              {teamRole === 'moderator' && 'Moderador'}
              {teamRole === 'member' && 'Miembro'}
            </span>
          )}

          {/* Rol de plataforma (solo si es staff+) */}
          {(user.role === 'staff' || user.role === 'admin' || user.is_superuser) && (
            <span className={`platform-role-badge ${getRoleBadgeClass(user.role, user.is_superuser)}`}>
              {getRoleLabel(user.role, user.is_superuser)}
            </span>
          )}
        </div>

        {/* Información adicional si está disponible */}
        {user.date_joined && (
          <p className="modal-joined">
            Miembro desde {new Date(user.date_joined).toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}

        {/* Botón de admin */}
        {isCurrentUserAdmin && (
          <button className="admin-view-btn" onClick={handleAdminView}>
            Ver en Panel de Admin
          </button>
        )}
      </div>
    </div>
  )
}

export default UserProfileModal
