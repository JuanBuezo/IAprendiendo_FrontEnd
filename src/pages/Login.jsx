import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/auth'
import '../styles/Login.css'

function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Verificar si hay invitación pendiente
  const checkPendingInvite = () => {
    const pendingInvite = localStorage.getItem('pending_invite')
    if (pendingInvite) {
      localStorage.removeItem('pending_invite')
      navigate(`/invite/${pendingInvite}`)
    } else {
      navigate('/home')
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      checkPendingInvite()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      await register(username, email, password, passwordConfirm)
      setSuccess('Cuenta creada correctamente. Ahora puedes iniciar sesión.')
      setIsLoginMode(true)
      setPassword('')
      setPasswordConfirm('')
      setUsername('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setError('')
    setSuccess('')
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
        <p className="subtitle">
          {isLoginMode ? 'Bienvenido de nuevo' : 'Únete a IAprendiendo'}
        </p>

        <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="username">Nombre de usuario</label>
              <input
                type="text"
                id="username"
                placeholder="tu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="passwordConfirm">Confirmar Contraseña</label>
              <input
                type="password"
                id="passwordConfirm"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Cargando...' : isLoginMode ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <div className="footer-text">
          <button className="toggle-mode" onClick={toggleMode}>
            {isLoginMode
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
