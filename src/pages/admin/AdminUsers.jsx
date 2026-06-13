import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile, getAvatarUrl } from '../../services/auth'
import { hasAdminAccess, listUsers, getRoleLabel, getRoleBadgeClass } from '../../services/admin'
import Navbar from '../../components/Navbar'
import './AdminUsers.css'

function AdminUsers() {
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [bannedFilter, setBannedFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (user) {
        searchUsers()
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [search, roleFilter, bannedFilter, page])

  const loadInitialData = async () => {
    try {
      const userData = await getProfile()
      setUser(userData)

      if (!hasAdminAccess(userData)) {
        navigate('/home')
        return
      }

      await searchUsers()
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    setSearching(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      if (bannedFilter !== '') params.is_banned = bannedFilter

      const data = await listUsers(params)
      setUsers(data.results || data)
      if (data.count) {
        setTotalPages(Math.ceil(data.count / 20))
      }
    } catch (err) {
      console.error('Error al buscar usuarios:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleUserClick = (userId) => {
    navigate(`/admin/users/${userId}`)
  }

  if (loading) {
    return (
      <div className="admin-users">
        <Navbar />
        <div className="admin-content">
          <p className="loading">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-users">
      <Navbar showBackButton backPath="/admin" backLabel="Panel de Control" />

      <div className="admin-content">
        <header className="page-header">
          <h1>Gestión de Usuarios</h1>
          <p>Busca y gestiona los usuarios de la plataforma</p>
        </header>

        {/* Filtros */}
        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Buscar por username o email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            {searching && <span className="search-spinner">⏳</span>}
          </div>

          <div className="filter-row">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos los roles</option>
              <option value="member">Miembros</option>
              <option value="staff">Staff</option>
              <option value="admin">Administradores</option>
            </select>

            <select
              value={bannedFilter}
              onChange={(e) => {
                setBannedFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos los estados</option>
              <option value="false">Activos</option>
              <option value="true">Baneados</option>
            </select>
          </div>
        </div>

        {/* Lista de usuarios */}
        <div className="users-list">
          {users.length === 0 ? (
            <div className="no-results">
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className={`user-card ${u.is_banned ? 'banned' : ''}`}
                onClick={() => handleUserClick(u.id)}
              >
                <div className="user-avatar">
                  {u.avatar ? (
                    <img src={getAvatarUrl(u.avatar)} alt={u.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {u.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name-row">
                    <span className="user-name">{u.username}</span>
                    <span className={`role-badge ${getRoleBadgeClass(u.role, u.is_superuser)}`}>
                      {getRoleLabel(u.role, u.is_superuser)}
                    </span>
                    {u.is_banned && <span className="banned-badge">Baneado</span>}
                  </div>
                  <span className="user-email">{u.email}</span>
                </div>
                <div className="user-arrow">→</div>
              </div>
            ))
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsers
