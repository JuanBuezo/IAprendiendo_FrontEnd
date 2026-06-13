import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, updateProfile, uploadAvatar, deleteAvatar, getAvatarUrl } from '../services/auth'
import Navbar from '../components/Navbar'
import '../styles/Profile.css'

function Profile() {
  const [user, setUser] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      setUser(data)
      setNewUsername(data.username)
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUsername = async () => {
    setError('')
    setSuccess('')
    try {
      const updated = await updateProfile({ username: newUsername })
      setUser(updated)
      setEditMode(false)
      setSuccess('Username actualizado correctamente')
      // Recargar para actualizar el Navbar
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError('')
    try {
      await uploadAvatar(file)
      setSuccess('Foto actualizada correctamente')
      // Recargar para actualizar toda la UI
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return
    setError('')
    try {
      await deleteAvatar()
      setSuccess('Foto eliminada correctamente')
      // Recargar para actualizar toda la UI
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="profile-content">
          <p className="loading">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <Navbar showBackButton backPath="/home" backLabel="Inicio" />

      <div className="profile-content">
        <div className="profile-card-large">
          <div className="profile-avatar-section">
            <div className="profile-avatar-xl">
              {user?.avatar ? (
                <img src={getAvatarUrl(user.avatar)} alt={user.username} />
              ) : (
                <div className="avatar-placeholder-xl">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              hidden
            />
            <div className="avatar-actions">
              <button
                className="avatar-btn primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
              </button>
              {user?.avatar && (
                <button className="avatar-btn danger" onClick={handleDeleteAvatar}>
                  Eliminar foto
                </button>
              )}
            </div>
          </div>

          <h1 className="profile-username">{user?.username}</h1>
          <p className="profile-email">{user?.email}</p>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="profile-details">
            <div className="detail-row">
              <span className="detail-label">ID de Usuario</span>
              <span className="detail-value">{user?.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Username</span>
              {editMode ? (
                <div className="edit-inline">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="edit-input"
                  />
                  <button className="save-btn" onClick={handleUpdateUsername}>
                    Guardar
                  </button>
                  <button className="cancel-btn" onClick={() => setEditMode(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="value-with-edit">
                  <span className="detail-value">{user?.username}</span>
                  <button className="edit-btn" onClick={() => setEditMode(true)}>
                    Editar
                  </button>
                </div>
              )}
            </div>
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user?.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Rol</span>
              <span className="detail-value role-badge">{user?.role}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Miembro desde</span>
              <span className="detail-value">
                {user?.date_joined && new Date(user.date_joined).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
