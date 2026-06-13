import { useState } from 'react'
import { createChannel, deleteChannel, updateChannel, getVoiceParticipants } from '../../services/teams'
import './ChannelSidebar.css'

function ChannelSidebar({ channels, selectedChannel, onSelectChannel, team, onChannelsChange }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState('text')
  const [expandedSections, setExpandedSections] = useState({
    text: true,
    voice: true,
    announcement: true,
  })
  const [voiceParticipants, setVoiceParticipants] = useState({})
  const [error, setError] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const [channelMenu, setChannelMenu] = useState(null) // channelId
  const [editingChannel, setEditingChannel] = useState(null)
  const [editChannelName, setEditChannelName] = useState('')

  const canManageChannels = ['owner', 'admin'].includes(team?.my_role)

  const textChannels = channels.filter((c) => c.channel_type === 'text')
  const voiceChannels = channels.filter((c) => c.channel_type === 'voice')
  const announcementChannels = channels.filter((c) => c.channel_type === 'announcement')

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleCreateChannel = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const channel = await createChannel(team.id, {
        name: newChannelName,
        channel_type: newChannelType,
      })
      onChannelsChange([...channels, channel])
      setShowCreateModal(false)
      setNewChannelName('')
      setNewChannelType('text')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteChannel = async (channelId) => {
    if (!confirm('¿Estás seguro de eliminar este canal?')) return
    try {
      await deleteChannel(channelId)
      onChannelsChange(channels.filter((c) => c.id !== channelId))
      if (selectedChannel?.id === channelId) {
        onSelectChannel(channels.find((c) => c.id !== channelId))
      }
      setChannelMenu(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEditChannel = async (channelId) => {
    if (!editChannelName.trim()) return
    try {
      const updated = await updateChannel(channelId, { name: editChannelName })
      onChannelsChange(channels.map((c) => (c.id === channelId ? updated : c)))
      setEditingChannel(null)
      setEditChannelName('')
    } catch (err) {
      alert(err.message)
    }
  }

  const startEditingChannel = (channel) => {
    setEditingChannel(channel.id)
    setEditChannelName(channel.name)
    setChannelMenu(null)
  }

  const loadVoiceParticipants = async (channelId) => {
    try {
      const participants = await getVoiceParticipants(channelId)
      setVoiceParticipants((prev) => ({
        ...prev,
        [channelId]: participants,
      }))
    } catch (err) {
      console.error('Error al cargar participantes:', err)
    }
  }

  const handleChannelMenuClick = (e, channelId) => {
    e.stopPropagation()
    setChannelMenu(channelMenu === channelId ? null : channelId)
  }

  const renderChannelList = (channelList, type) => {
    if (channelList.length === 0) return null

    const typeLabels = {
      text: 'Canales de Texto',
      voice: 'Canales de Voz',
      announcement: 'Anuncios',
    }

    const typeIcons = {
      text: '#',
      voice: '🔊',
      announcement: '📢',
    }

    return (
      <div className="channel-section">
        <div className="section-header" onClick={() => toggleSection(type)}>
          <span className={`arrow ${expandedSections[type] ? 'expanded' : ''}`}>▶</span>
          <span className="section-title">{typeLabels[type]}</span>
          {canManageChannels && (
            <button
              className="add-channel-btn"
              onClick={(e) => {
                e.stopPropagation()
                setNewChannelType(type)
                setShowCreateModal(true)
              }}
              title="Crear canal"
            >
              +
            </button>
          )}
        </div>
        {expandedSections[type] && (
          <div className="channel-list">
            {channelList.map((channel) => (
              <div
                key={channel.id}
                className={`channel-item ${selectedChannel?.id === channel.id ? 'selected' : ''}`}
                onClick={() => onSelectChannel(channel)}
              >
                <span className="channel-icon">{typeIcons[type]}</span>
                {editingChannel === channel.id ? (
                  <input
                    type="text"
                    className="edit-channel-input"
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditChannel(channel.id)
                      if (e.key === 'Escape') setEditingChannel(null)
                    }}
                    onBlur={() => setEditingChannel(null)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="channel-name">{channel.name}</span>
                )}
                {type === 'voice' && voiceParticipants[channel.id]?.length > 0 && (
                  <span className="voice-count">{voiceParticipants[channel.id].length}</span>
                )}

                {/* Menú de 3 puntos */}
                <div className="channel-menu-container">
                  <button
                    className="channel-menu-trigger"
                    onClick={(e) => handleChannelMenuClick(e, channel.id)}
                    title="Opciones"
                  >
                    ⋮
                  </button>

                  {channelMenu === channel.id && (
                    <div className="channel-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      {canManageChannels && (
                        <>
                          <button onClick={() => startEditingChannel(channel)}>
                            ✏️ Editar nombre
                          </button>
                          {!channel.is_default && (
                            <button
                              className="danger"
                              onClick={() => handleDeleteChannel(channel.id)}
                            >
                              🗑️ Eliminar canal
                            </button>
                          )}
                        </>
                      )}
                      {!canManageChannels && (
                        <div className="no-options">Sin opciones disponibles</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={`channel-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? 'Ocultar canales' : 'Mostrar canales'}
      >
        ≡
      </button>

      {isExpanded && (
        <>
          <div className="sidebar-header">
            <h3>{team?.name}</h3>
          </div>

          <div className="channels-container">
            {renderChannelList(announcementChannels, 'announcement')}
            {renderChannelList(textChannels, 'text')}
            {renderChannelList(voiceChannels, 'voice')}

            {channels.length === 0 && (
              <div className="no-channels">
                <p>No hay canales</p>
                {canManageChannels && (
                  <button onClick={() => setShowCreateModal(true)}>Crear canal</button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Crear Canal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Canal</h2>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Nombre del canal</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="general"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo de canal</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                >
                  <option value="text">Texto</option>
                  <option value="voice">Voz</option>
                  <option value="announcement">Anuncios</option>
                </select>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}

export default ChannelSidebar
