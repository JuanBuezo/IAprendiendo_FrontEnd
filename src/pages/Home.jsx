import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, clearTokens, updateProfile } from '../services/auth'
import '../styles/Home.css'

function Home() {
  const [user, setUser] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
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

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const handleUpdateUsername = async () => {
    setError('')
    try {
      const updated = await updateProfile({ username: newUsername })
      setUser(updated)
      setEditMode(false)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="home-container">
        <p className="loading">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="home-container">
      <nav className="navbar">
        <h2 className="logo">IAprendiendo</h2>
        <div className="nav-buttons">
          <button className="nav-btn" onClick={() => setShowProfile(!showProfile)}>
            {showProfile ? 'Cerrar Perfil' : 'Mi Perfil'}
          </button>
          <button className="nav-btn logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {showProfile && user && (
        <div className="profile-card">
          <h3>Mi Perfil</h3>
          <div className="profile-info">
            <div className="profile-field">
              <span className="label">ID:</span>
              <span className="value">{user.id}</span>
            </div>
            <div className="profile-field">
              <span className="label">Username:</span>
              {editMode ? (
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="edit-input"
                />
              ) : (
                <span className="value">{user.username}</span>
              )}
            </div>
            <div className="profile-field">
              <span className="label">Email:</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="profile-field">
              <span className="label">Rol:</span>
              <span className="value">{user.role}</span>
            </div>
            <div className="profile-field">
              <span className="label">Miembro desde:</span>
              <span className="value">
                {new Date(user.date_joined).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="profile-actions">
            {editMode ? (
              <>
                <button className="action-btn save" onClick={handleUpdateUsername}>
                  Guardar
                </button>
                <button className="action-btn cancel" onClick={() => setEditMode(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button className="action-btn edit" onClick={() => setEditMode(true)}>
                Editar Username
              </button>
            )}
          </div>
        </div>
      )}

      <div className="main-content">
        <h1>Bienvenido{user ? `, ${user.username}` : ''}</h1>
        <div className="cristiano-container">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg"
            alt="Cristiano Ronaldo"
            className="cristiano-img"
          />
          <p className="caption">SIUUUUU!</p>
        </div>
      </div>
    </div>
  )
}

export default Home
