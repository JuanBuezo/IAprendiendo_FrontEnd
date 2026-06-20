import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeam, getChannels, getMembers, deleteTeam, updateTeam, updateTeamAvatar } from '../services/teams'
import { getProfile } from '../services/auth'
import { hasAdminAccess } from '../services/admin'
import { getRootFolder } from '../services/files'
import Navbar from '../components/Navbar'
import ChannelSidebar from '../components/teams/ChannelSidebar'
import Chat from '../components/teams/Chat'
import FileSidebar from '../components/files/FileSidebar'
import FileExplorer from '../components/files/FileExplorer'
import InvitationManager from '../components/teams/InvitationManager'
import '../styles/Team.css'

function Team() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState(null)
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [rootFolder, setRootFolder] = useState(null)
  const [currentFolder, setCurrentFolder] = useState(null)
  const [openFiles, setOpenFiles] = useState([])
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('conversations')
  const [showInvitations, setShowInvitations] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  // Team management
  const [teamMenuOpen, setTeamMenuOpen] = useState(false)
  const [renameModal, setRenameModal] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const teamAvatarInputRef = useRef(null)

  useEffect(() => {
    loadTeamData()
    getProfile().then(setCurrentUser).catch(() => {})
  }, [teamId])

  const loadTeamData = async () => {
    try {
      // Cargar equipo primero (obligatorio)
      const teamData = await getTeam(teamId)
      setTeam(teamData)

      // Cargar canales (puede fallar si no hay)
      try {
        const channelsData = await getChannels(teamId)
        const channelsList = Array.isArray(channelsData) ? channelsData : []
        setChannels(channelsList)
        const defaultChannel = channelsList.find((c) => c.is_default) || channelsList[0]
        if (defaultChannel) {
          setSelectedChannel(defaultChannel)
        }
      } catch (err) {
        console.log('No hay canales:', err)
        setChannels([])
      }

      // Cargar miembros del equipo
      try {
        const membersData = await getMembers(teamId)
        // Manejar respuesta paginada o array directo
        const membersList = membersData?.results || membersData
        setMembers(Array.isArray(membersList) ? membersList : [])
      } catch (err) {
        console.error('Error al cargar miembros:', err)
        setMembers([])
      }

      // Cargar carpeta raíz (puede fallar si no hay)
      try {
        const rootFolderData = await getRootFolder(teamId)
        setRootFolder(rootFolderData)
        setCurrentFolder(rootFolderData)
      } catch (err) {
        console.log('No hay carpeta raíz:', err)
        setRootFolder(null)
        setCurrentFolder(null)
      }
    } catch (err) {
      console.error('Error al cargar equipo:', err)
      navigate('/teams')
    } finally {
      setLoading(false)
    }
  }

  const canManageTeam = () => {
    if (!currentUser || !team) return false
    return hasAdminAccess(currentUser) || team.my_role === 'owner' || team.my_role === 'admin'
  }

  const handleDeleteTeam = async () => {
    if (!confirm('¿Eliminar este equipo? Esta acción es irreversible.')) return
    try {
      await deleteTeam(teamId)
      navigate('/teams')
    } catch (err) { alert(err.message) }
  }

  const handleRenameTeam = async () => {
    if (!renameVal.trim()) return
    try {
      const updated = await updateTeam(teamId, { name: renameVal.trim() })
      setTeam(prev => ({ ...prev, name: updated.name }))
      setRenameModal(false)
      setRenameVal('')
    } catch (err) { alert(err.message) }
  }

  const handleTeamAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const updated = await updateTeamAvatar(teamId, file)
      setTeam(prev => ({ ...prev, avatar: updated.avatar }))
    } catch (err) { alert(err.message) }
    e.target.value = ''
  }

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel)
  }

  const handleSelectFolder = (folder) => {
    setCurrentFolder(folder)
  }

  const handleOpenFile = (file) => {
    // Verificar si el archivo ya está abierto
    const existingIndex = openFiles.findIndex((f) => f.id === file.id)
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex)
    } else {
      setOpenFiles([...openFiles, file])
      setActiveFileIndex(openFiles.length)
    }
  }

  const handleCloseFile = (index) => {
    const newOpenFiles = openFiles.filter((_, i) => i !== index)
    setOpenFiles(newOpenFiles)
    if (activeFileIndex >= newOpenFiles.length) {
      setActiveFileIndex(Math.max(0, newOpenFiles.length - 1))
    }
  }

  const handleChannelsChange = (updatedChannels) => {
    setChannels(updatedChannels)
  }

  if (loading) {
    return (
      <div className="team-container">
        <Navbar showBackButton backPath="/teams" backLabel="Equipos" />
        <p className="loading">Cargando equipo...</p>
      </div>
    )
  }

  const canManageInvitations = ['owner', 'admin'].includes(team?.my_role)

  return (
    <div className="team-container">
      <Navbar showBackButton backPath="/teams" backLabel="Equipos" />

      <header className="team-header">
        <div className="team-title">
          {/* Nombre del equipo con menú de gestión */}
          <div className="team-title-menu" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <h1
              style={{ cursor: canManageTeam() ? 'pointer' : 'default', userSelect: 'none' }}
              onClick={() => canManageTeam() && setTeamMenuOpen(v => !v)}
              title={canManageTeam() ? 'Gestionar equipo' : undefined}
            >{team?.name}</h1>
            {canManageTeam() && (
              <>
                <div
                  style={{ fontSize: 13, color: '#9ca3af', cursor: 'pointer', paddingBottom: 2 }}
                  onClick={() => setTeamMenuOpen(v => !v)}
                  title="Opciones del equipo"
                >▾</div>
                {teamMenuOpen && (
                  <div className="team-header-dropdown" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setTeamMenuOpen(false); setRenameModal(true); setRenameVal(team?.name || '') }}>✏️ Cambiar nombre</button>
                    <button onClick={() => { setTeamMenuOpen(false); teamAvatarInputRef.current?.click() }}>📷 Cambiar foto</button>
                    <button className="danger" onClick={() => { setTeamMenuOpen(false); handleDeleteTeam() }}>🗑️ Eliminar equipo</button>
                  </div>
                )}
              </>
            )}
          </div>
          <span className="team-role-badge">{team?.my_role}</span>
          <input type="file" ref={teamAvatarInputRef} accept="image/*" hidden onChange={handleTeamAvatarChange} />
        </div>
        <div className="header-actions">
          {canManageInvitations && (
            <button
              className="invite-btn"
              onClick={() => setShowInvitations(true)}
              title="Gestionar invitaciones"
            >
              + Invitar
            </button>
          )}
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
              onClick={() => setActiveTab('conversations')}
            >
              Conversaciones
            </button>
            <button
              className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              Archivos
            </button>
          </div>
        </div>
      </header>

      <div className="team-content">
        {activeTab === 'conversations' ? (
          <>
            <ChannelSidebar
              channels={channels}
              selectedChannel={selectedChannel}
              onSelectChannel={handleSelectChannel}
              team={team}
              onChannelsChange={handleChannelsChange}
            />
            <Chat channel={selectedChannel} team={team} members={members} onMembersChange={setMembers} />
          </>
        ) : rootFolder ? (
          <>
            <FileSidebar
              rootFolder={rootFolder}
              currentFolder={currentFolder}
              onSelectFolder={handleSelectFolder}
              onOpenFile={handleOpenFile}
              onFileCreated={handleOpenFile}
              teamId={teamId}
            />
            <FileExplorer
              currentFolder={currentFolder}
              openFiles={openFiles}
              activeFileIndex={activeFileIndex}
              onOpenFile={handleOpenFile}
              onCloseFile={handleCloseFile}
              onSelectFile={setActiveFileIndex}
              onFolderChange={handleSelectFolder}
              teamId={teamId}
            />
          </>
        ) : (
          <div className="no-files-message">
            <p>El sistema de archivos no está disponible para este equipo.</p>
          </div>
        )}
      </div>

      {/* Modal de Invitaciones */}
      {showInvitations && (
        <div className="modal-overlay" onClick={() => setShowInvitations(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InvitationManager team={team} onClose={() => setShowInvitations(false)} />
          </div>
        </div>
      )}
      {/* Modal Renombrar Equipo */}
      {renameModal && (
        <div className="modal-overlay" onClick={() => setRenameModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Cambiar nombre del equipo</h2>
            <div className="form-group">
              <label>Nuevo nombre</label>
              <input
                type="text"
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleRenameTeam() }}
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setRenameModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleRenameTeam} disabled={!renameVal.trim()}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Team
