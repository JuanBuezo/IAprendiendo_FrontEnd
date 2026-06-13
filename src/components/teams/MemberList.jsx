import { useState } from 'react'
import { getAvatarUrl } from '../../services/auth'
import './MemberList.css'

const ROLE_SECTIONS = [
  { key: 'owner', label: 'Propietario', plural: 'Propietarios' },
  { key: 'admin', label: 'Administrador', plural: 'Administradores' },
  { key: 'moderator', label: 'Moderador', plural: 'Moderadores' },
  { key: 'member', label: 'Miembro', plural: 'Miembros' },
]

function MemberList({ members, team, currentUser, onMemberClick }) {
  const [collapsedSections, setCollapsedSections] = useState({})
  const [isExpanded, setIsExpanded] = useState(true)

  // Agrupar miembros por rol
  const grouped = ROLE_SECTIONS.reduce((acc, section) => {
    acc[section.key] = members.filter((m) => m.role === section.key)
    return acc
  }, {})

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleMemberClick = (member, event) => {
    onMemberClick?.(member, event)
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <aside className={`member-list ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="member-list-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? 'Ocultar miembros' : 'Mostrar miembros'}
      >
        {isExpanded ? '›' : '‹'}
      </button>

      {isExpanded && (
        <>
          <div className="member-list-header">
            <h3>Miembros</h3>
            <span className="member-count">{members.length}</span>
          </div>

          <div className="member-list-content">
            {ROLE_SECTIONS.map((section) => {
              const sectionMembers = grouped[section.key]
              if (sectionMembers.length === 0) return null

              const isCollapsed = collapsedSections[section.key]
              const sectionLabel = sectionMembers.length === 1 ? section.label : section.plural

              return (
                <div key={section.key} className="member-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection(section.key)}
                  >
                    <span className="section-arrow">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="section-label">{sectionLabel}</span>
                    <span className="section-count">{sectionMembers.length}</span>
                  </button>

                  {!isCollapsed && (
                    <div className="section-members">
                      {sectionMembers.map((member) => (
                        <button
                          key={member.id}
                          className={`member-item ${member.user?.id === currentUser?.id ? 'is-me' : ''}`}
                          onClick={(e) => handleMemberClick(member, e)}
                        >
                          <div className="member-avatar">
                            {member.user?.avatar ? (
                              <img
                                src={getAvatarUrl(member.user.avatar)}
                                alt={member.user.username}
                              />
                            ) : (
                              <div className="avatar-placeholder">
                                {member.user?.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`online-indicator ${member.is_online ? 'online' : ''}`} />
                          </div>
                          <span className="member-name">
                            {member.nickname || member.user?.username}
                            {member.user?.id === currentUser?.id && (
                              <span className="me-badge">(Yo)</span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </aside>
  )
}

export default MemberList
