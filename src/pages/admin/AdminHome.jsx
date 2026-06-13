import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../../services/auth'
import { hasAdminAccess, canWrite, isSuperuser, getStats } from '../../services/admin'
import Navbar from '../../components/Navbar'
import './AdminHome.css'

function AdminHome() {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const userData = await getProfile()
      setUser(userData)

      // Verificar acceso de admin
      if (!hasAdminAccess(userData)) {
        navigate('/home')
        return
      }

      // Cargar estadísticas
      try {
        const statsData = await getStats()
        setStats(statsData)
      } catch (err) {
        console.error('Error al cargar estadísticas:', err)
      }
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-home">
        <Navbar />
        <div className="admin-content">
          <p className="loading">Cargando...</p>
        </div>
      </div>
    )
  }

  const isAdminRole = canWrite(user)
  const isSuperuserRole = isSuperuser(user)

  // Opciones de admin según rol
  const adminOptions = []

  // Staff+ puede ver
  adminOptions.push({
    id: 'users',
    icon: '👤',
    title: 'Buscar Usuario',
    description: 'Buscar y ver perfiles de usuarios',
    path: '/admin/users',
    color: 'blue',
  })

  // Admin+ puede hacer más
  if (isAdminRole) {
    adminOptions.push({
      id: 'create-user',
      icon: '➕',
      title: 'Crear Usuario',
      description: 'Crear usuarios staff o administradores',
      path: '/admin/users/create',
      color: 'green',
    })
  }

  // Solo superuser
  if (isSuperuserRole) {
    adminOptions.push({
      id: 'danger-zone',
      icon: '⚠️',
      title: 'Zona de Peligro',
      description: 'Acciones irreversibles (eliminar usuarios)',
      path: '/admin/danger',
      color: 'red',
    })
  }

  return (
    <div className="admin-home">
      <Navbar showBackButton backPath="/home" backLabel="Salir del Panel" />

      <div className="admin-content">
        <header className="admin-header">
          <h1>Panel de Control</h1>
          <p className="admin-subtitle">
            Bienvenido, {user?.username}.
            {isSuperuserRole && ' Tienes acceso completo de Administrador.'}
            {!isSuperuserRole && isAdminRole && ' Tienes acceso de Administrador.'}
            {!isSuperuserRole && !isAdminRole && ' Tienes acceso de Staff (solo lectura).'}
          </p>
        </header>

        {/* Estadísticas */}
        {stats && (
          <section className="stats-section">
            <h2>Estadísticas de la Plataforma</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.total_users || 0}</span>
                <span className="stat-label">Usuarios</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_teams || 0}</span>
                <span className="stat-label">Equipos</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.banned_users || 0}</span>
                <span className="stat-label">Baneados</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.total_files || 0}</span>
                <span className="stat-label">Archivos</span>
              </div>
            </div>
          </section>
        )}

        {/* Opciones de Admin */}
        <section className="admin-options-section">
          <h2>Herramientas de Administración</h2>
          <div className="admin-options-grid">
            {adminOptions.map((option) => (
              <div
                key={option.id}
                className={`admin-option-card ${option.color}`}
                onClick={() => navigate(option.path)}
              >
                <div className="option-icon">{option.icon}</div>
                <div className="option-content">
                  <h3>{option.title}</h3>
                  <p>{option.description}</p>
                </div>
                <div className="option-arrow">→</div>
              </div>
            ))}
          </div>
        </section>

        {/* Separador */}
        <div className="section-divider">
          <span>Acceso Normal</span>
        </div>

        {/* Opciones normales */}
        <section className="normal-options-section">
          <div className="normal-options-grid">
            <div className="normal-option-card" onClick={() => navigate('/teams')}>
              <div className="option-icon">👥</div>
              <div className="option-content">
                <h3>Equipos</h3>
                <p>Colabora con tu equipo</p>
              </div>
              <div className="option-arrow">→</div>
            </div>

            <div className="normal-option-card" onClick={() => navigate('/projects')}>
              <div className="option-icon">📁</div>
              <div className="option-content">
                <h3>Proyectos</h3>
                <p>Archivos recientes</p>
              </div>
              <div className="option-arrow">→</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminHome
