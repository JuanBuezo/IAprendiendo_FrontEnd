import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearTokens, getProfile, getAvatarUrl, uploadAvatar, deleteAvatar } from '../services/auth'
import { hasAdminAccess, getRoleLabel, getRoleBadgeClass } from '../services/admin'
import './Navbar.css'

function Navbar({ showBackButton = false, backPath = '/home', backLabel = 'Inicio' }) {
  const [user, setUser] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const menuRef = useRef(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      setUser(data)
    } catch (err) {
      navigate('/')
    }
  }

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      await uploadAvatar(file)
      // Recargar la página para sincronizar en toda la UI
      window.location.reload()
    } catch (err) {
      alert('Error al subir foto: ' + err.message)
      setUploadingAvatar(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    try {
      await deleteAvatar()
      // Recargar la página para sincronizar en toda la UI
      window.location.reload()
    } catch (err) {
      alert('Error al eliminar foto: ' + err.message)
    }
  }

  const isAdmin = hasAdminAccess(user)

  return (
    <nav className="navbar">
      <h2 className="logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
        IAprendiendo
      </h2>
      <div className="nav-buttons">
        {showBackButton && (
          <button className="nav-btn" onClick={() => navigate(backPath)}>
            {backLabel}
          </button>
        )}

        <div className="profile-menu-container" ref={menuRef}>
          <button
            className="profile-avatar-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Mi perfil"
          >
            {user?.avatar ? (
              <img src={getAvatarUrl(user.avatar)} alt={user.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                {user?.username?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  {user?.avatar ? (
                    <img src={getAvatarUrl(user.avatar)} alt={user.username} />
                  ) : (
                    <div className="avatar-placeholder large">
                      {user?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    hidden
                  />
                  <button
                    className="change-avatar-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? '...' : '📷'}
                  </button>
                </div>
                <div className="dropdown-info">
                  <span className="dropdown-username">{user?.username}</span>
                  <span className="dropdown-email">{user?.email}</span>
                  {isAdmin && (
                    <span className={`dropdown-role-badge ${getRoleBadgeClass(user?.role, user?.is_superuser)}`}>
                      {getRoleLabel(user?.role, user?.is_superuser)}
                    </span>
                  )}
                </div>
              </div>

              <div className="dropdown-divider" />

              <button className="dropdown-item" onClick={() => navigate('/profile')}>
                Mi Perfil
              </button>
              {user?.avatar && (
                <button className="dropdown-item danger" onClick={handleDeleteAvatar}>
                  Eliminar foto
                </button>
              )}

              {isAdmin && (
                <>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item admin-mode"
                    onClick={() => navigate('/admin')}
                  >
                    <span className="admin-icon">⚙️</span>
                    Modo Admin
                  </button>
                </>
              )}

              <div className="dropdown-divider" />

              <button className="dropdown-item logout" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
