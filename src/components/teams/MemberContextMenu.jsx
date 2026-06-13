import { useState, useEffect, useRef } from 'react'
import { getAvatarUrl } from '../../services/auth'
import { updateMember, removeMember } from '../../services/teams'
import './MemberContextMenu.css'

const ROLE_LABELS = {
  owner: 'Propietario',
  admin: 'Administrador',
  moderator: 'Moderador',
  member: 'Miembro',
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'moderator', label: 'Moderador' },
  { value: 'member', label: 'Miembro' },
]

function MemberContextMenu({
  member,
  position,
  currentUserRole,
  currentUserId,
  teamId,
  onClose,
  onMemberUpdated,
  onMemberRemoved,
}) {
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showNicknameInput, setShowNicknameInput] = useState(false)
  const [nickname, setNickname] = useState(member?.nickname || '')
  const [loading, setLoading] = useState(false)
  const menuRef = useRef(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!member) return null

  // Permisos
  const isOwnProfile = member.user?.id === currentUserId
  const canManageMembers = ['owner', 'admin'].includes(currentUserRole)
  const canChangeRole =
    canManageMembers &&
    member.role !== 'owner' &&
    !isOwnProfile &&
    (currentUserRole === 'owner' || member.role !== 'admin')
  const canKick =
    canManageMembers &&
    !isOwnProfile &&
    member.role !== 'owner' &&
    (currentUserRole === 'owner' || member.role !== 'admin')
  const canChangeNickname = canManageMembers && member.role !== 'owner'

  // Calcular posicion del menu
  const menuStyle = {
    top: Math.min(position.y, window.innerHeight - 350),
    left: Math.min(position.x, window.innerWidth - 250),
  }

  const handleChangeRole = async (newRole) => {
    if (loading) return
    setLoading(true)
    try {
      const updated = await updateMember(teamId, member.user.id, { role: newRole })
      onMemberUpdated?.(updated)
      setShowRoleMenu(false)
    } catch (err) {
      console.error('Error al cambiar rol:', err)
      alert('Error al cambiar el rol')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeNickname = async () => {
    if (loading) return
    setLoading(true)
    try {
      const updated = await updateMember(teamId, member.user.id, { nickname })
      onMemberUpdated?.(updated)
      setShowNicknameInput(false)
    } catch (err) {
      console.error('Error al cambiar apodo:', err)
      alert('Error al cambiar el apodo')
    } finally {
      setLoading(false)
    }
  }

  const handleKick = async () => {
    if (loading) return
    if (!confirm(`¿Expulsar a ${member.user.username} del equipo?`)) return
    setLoading(true)
    try {
      await removeMember(teamId, member.user.id)
      onMemberRemoved?.(member.user.id)
      onClose()
    } catch (err) {
      console.error('Error al expulsar:', err)
      alert('Error al expulsar al miembro')
    } finally {
      setLoading(false)
    }
  }

  const handleComingSoon = (action) => {
    alert(`${action} estará disponible próximamente`)
  }

  return (
    <div className="member-context-menu" style={menuStyle} ref={menuRef}>
      {/* Header con info del usuario */}
      <div className="menu-header">
        <div className="menu-avatar">
          {member.user?.avatar ? (
            <img src={getAvatarUrl(member.user.avatar)} alt={member.user.username} />
          ) : (
            <div className="avatar-placeholder">
              {member.user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="menu-user-info">
          <span className="menu-username">
            {member.nickname || member.user?.username}
          </span>
          {member.nickname && (
            <span className="menu-real-name">@{member.user?.username}</span>
          )}
          <span className={`menu-role-badge ${member.role}`}>
            {ROLE_LABELS[member.role]}
          </span>
        </div>
      </div>

      <div className="menu-divider" />

      {/* Acciones disponibles para todos */}
      {!isOwnProfile && (
        <>
          <button
            className="menu-item coming-soon"
            onClick={() => handleComingSoon('Silenciar')}
          >
            <span className="menu-icon">🔇</span>
            Silenciar
            <span className="coming-soon-badge">Pronto</span>
          </button>
          <button
            className="menu-item coming-soon"
            onClick={() => handleComingSoon('Bloquear')}
          >
            <span className="menu-icon">🚫</span>
            Bloquear
            <span className="coming-soon-badge">Pronto</span>
          </button>
        </>
      )}

      {/* Acciones de gestion (solo admin/owner) */}
      {canManageMembers && !isOwnProfile && member.role !== 'owner' && (
        <>
          <div className="menu-divider" />

          {/* Cambiar apodo */}
          {canChangeNickname && (
            <>
              {showNicknameInput ? (
                <div className="nickname-input-container">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nuevo apodo..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleChangeNickname()
                      if (e.key === 'Escape') setShowNicknameInput(false)
                    }}
                    autoFocus
                  />
                  <div className="nickname-actions">
                    <button onClick={handleChangeNickname} disabled={loading}>
                      Guardar
                    </button>
                    <button onClick={() => setShowNicknameInput(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="menu-item"
                  onClick={() => setShowNicknameInput(true)}
                >
                  <span className="menu-icon">📝</span>
                  Cambiar apodo
                </button>
              )}
            </>
          )}

          {/* Cambiar rol */}
          {canChangeRole && (
            <div className="menu-item-with-submenu">
              <button
                className="menu-item"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
              >
                <span className="menu-icon">👑</span>
                Cambiar rol
                <span className="submenu-arrow">{showRoleMenu ? '▼' : '▶'}</span>
              </button>
              {showRoleMenu && (
                <div className="submenu">
                  {ROLE_OPTIONS.filter((r) => r.value !== member.role).map((role) => (
                    <button
                      key={role.value}
                      className={`submenu-item ${role.value === member.role ? 'active' : ''}`}
                      onClick={() => handleChangeRole(role.value)}
                      disabled={loading}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expulsar */}
          {canKick && (
            <button className="menu-item danger" onClick={handleKick} disabled={loading}>
              <span className="menu-icon">🚷</span>
              Expulsar del equipo
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default MemberContextMenu
