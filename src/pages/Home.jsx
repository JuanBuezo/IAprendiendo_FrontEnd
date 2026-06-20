import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProfile } from '../services/auth'
import Navbar from '../components/Navbar'
import '../styles/Home.css'

function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await getProfile()
      setUser(data)
    } catch (err) {
      navigate('/')
    } finally {
      setLoading(false)
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
      <Navbar />

      <div className="main-content">
        <h1>Bienvenido{user ? `, ${user.username}` : ''}</h1>

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => navigate('/teams')}>
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h2>Equipos</h2>
              <p>Colabora con tu equipo en canales de texto, voz y comparte archivos</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/study')}>
            <div className="card-icon">🤖</div>
            <div className="card-content">
              <h2>Herramienta de estudio</h2>
              <p>Genera quizzes con IA sobre tus documentos y mejora tu aprendizaje</p>
            </div>
            <div className="card-arrow">→</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
