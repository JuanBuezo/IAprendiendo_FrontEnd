import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearTokens } from '../services/auth'
import '../styles/Projects.css'

function Projects() {
  const navigate = useNavigate()
  const [recentProjects] = useState([])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  return (
    <div className="projects-container">
      <nav className="navbar">
        <h2 className="logo">IAprendiendo</h2>
        <div className="nav-buttons">
          <button className="nav-btn" onClick={() => navigate('/home')}>
            Inicio
          </button>
          <button className="nav-btn logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className="projects-content">
        <div className="projects-header">
          <h1>Proyectos Recientes</h1>
        </div>

        {recentProjects.length === 0 ? (
          <div className="no-projects">
            <div className="empty-icon">📁</div>
            <p>No hay proyectos recientes</p>
            <p className="hint">Los proyectos que edites aparecerán aquí</p>
          </div>
        ) : (
          <div className="projects-grid">
            {recentProjects.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-icon">📄</div>
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="project-date">
                    Editado: {new Date(project.edited_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Projects
