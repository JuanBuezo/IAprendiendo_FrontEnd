import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../services/auth'
import { canWrite, isSuperuser, createStaffUser } from '../../services/admin'
import Navbar from '../../components/Navbar'
import './AdminCreateUser.css'

function AdminCreateUser() {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [role, setRole] = useState('staff')

  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const userData = await getProfile()
      setCurrentUser(userData)

      if (!canWrite(userData)) {
        navigate('/admin')
        return
      }
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validaciones
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setSubmitting(true)
    try {
      const newUser = await createStaffUser({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        role,
      })
      setSuccess(`Usuario ${newUser.username} creado correctamente`)

      // Limpiar formulario
      setUsername('')
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
      setRole('staff')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-create-user">
        <Navbar />
        <div className="admin-content">
          <p className="loading">Cargando...</p>
        </div>
      </div>
    )
  }

  const isCurrentSuperuser = isSuperuser(currentUser)

  return (
    <div className="admin-create-user">
      <Navbar showBackButton backPath="/admin" backLabel="Panel de Control" />

      <div className="admin-content">
        <header className="page-header">
          <h1>Crear Usuario</h1>
          <p>Crea un nuevo usuario con permisos de staff o administrador</p>
        </header>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Nombre de usuario</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario123"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="passwordConfirm">Confirmar contraseña</label>
              <input
                type="password"
                id="passwordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Rol</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="staff">Staff (solo lectura)</option>
                {isCurrentSuperuser && (
                  <option value="admin">Administrador (lectura/escritura)</option>
                )}
              </select>
              <p className="role-hint">
                {role === 'staff'
                  ? 'El staff puede ver estadísticas y perfiles, pero no puede modificar usuarios.'
                  : 'El administrador puede banear usuarios, cambiar roles y crear staff.'}
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/admin')}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminCreateUser
