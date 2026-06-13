import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTeam, getChannels, getMembers } from '../services/teams'
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

  useEffect(() => {
    loadTeamData()
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
          <h1>{team?.name}</h1>
          <span className="team-role-badge">{team?.my_role}</span>
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
    </div>
  )
}

export default Team
