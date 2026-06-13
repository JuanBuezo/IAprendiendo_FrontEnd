import { useState, useEffect, useRef } from 'react'
import {
  getMessages,
  getRecentMessages,
  sendMessage,
  deleteMessage,
  editMessage,
  togglePinMessage,
} from '../../services/teams'
import { getAvatarUrl, getProfile } from '../../services/auth'
import MemberList from './MemberList'
import MemberContextMenu from './MemberContextMenu'
import './Chat.css'

function Chat({ channel, team, members, onMembersChange }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // {member, position}
  const [messageMenu, setMessageMenu] = useState(null) // messageId
  const messagesEndRef = useRef(null)
  const pollingRef = useRef(null)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (channel) {
      loadMessages()
      startPolling()
    }
    return () => stopPolling()
  }, [channel?.id])

  // Cerrar menus al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setMessageMenu(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadCurrentUser = async () => {
    try {
      const userData = await getProfile()
      setCurrentUser(userData)
    } catch (err) {
      console.error('Error al cargar usuario actual:', err)
    }
  }

  const loadMessages = async () => {
    if (!channel) return
    setLoading(true)
    try {
      const data = await getMessages(channel.id)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error al cargar mensajes:', err)
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      if (!channel || messages.length === 0) return
      try {
        const lastMessage = messages[messages.length - 1]
        const since = lastMessage?.created_at || new Date().toISOString()
        const newMessages = await getRecentMessages(channel.id, since)
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages])
        }
      } catch (err) {
        console.error('Error en polling:', err)
      }
    }, 3000)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !channel) return

    try {
      const message = await sendMessage(channel.id, newMessage, replyTo?.id)
      setMessages([...messages, message])
      setNewMessage('')
      setReplyTo(null)
    } catch (err) {
      console.error('Error al enviar mensaje:', err)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('¿Eliminar este mensaje?')) return
    try {
      await deleteMessage(messageId)
      setMessages(messages.filter((m) => m.id !== messageId))
      setMessageMenu(null)
    } catch (err) {
      console.error('Error al eliminar mensaje:', err)
    }
  }

  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) return
    try {
      const updated = await editMessage(messageId, editContent)
      setMessages(messages.map((m) => (m.id === messageId ? updated : m)))
      setEditingMessage(null)
      setEditContent('')
    } catch (err) {
      console.error('Error al editar mensaje:', err)
    }
  }

  const handlePinMessage = async (messageId) => {
    try {
      const updated = await togglePinMessage(messageId)
      setMessages(messages.map((m) => (m.id === messageId ? updated : m)))
      setMessageMenu(null)
    } catch (err) {
      console.error('Error al fijar mensaje:', err)
    }
  }

  const startEditing = (message) => {
    setEditingMessage(message.id)
    setEditContent(message.content)
    setMessageMenu(null)
  }

  const cancelEditing = () => {
    setEditingMessage(null)
    setEditContent('')
  }

  // Handlers para el menu contextual de miembros
  const handleAvatarClick = (author, teamRole, event) => {
    if (!author) return
    event.stopPropagation()
    // Buscar el miembro completo en la lista
    const member = members.find((m) => m.user?.id === author.id) || {
      user: author,
      role: teamRole || 'member',
      nickname: '',
    }
    setContextMenu({
      member,
      position: { x: event.clientX, y: event.clientY },
    })
  }

  const handleMemberClick = (member, event) => {
    event.stopPropagation()
    setContextMenu({
      member,
      position: { x: event.clientX, y: event.clientY },
    })
  }

  const handleMemberUpdated = (updatedMember) => {
    onMembersChange?.(
      members.map((m) => (m.user?.id === updatedMember.user?.id ? updatedMember : m))
    )
    setContextMenu(null)
  }

  const handleMemberRemoved = (userId) => {
    onMembersChange?.(members.filter((m) => m.user?.id !== userId))
    setContextMenu(null)
  }

  const handleMessageMenuClick = (e, messageId) => {
    e.stopPropagation()
    setMessageMenu(messageMenu === messageId ? null : messageId)
  }

  const handleReply = (message) => {
    setReplyTo(message)
    setMessageMenu(null)
  }

  const canModerate = ['owner', 'admin', 'moderator'].includes(team?.my_role)
  const canWriteAnnouncement =
    channel?.channel_type !== 'announcement' || ['owner', 'admin'].includes(team?.my_role)

  if (!channel) {
    return (
      <main className="chat-container">
        <div className="chat-main">
          <div className="no-channel">
            <p>Selecciona un canal para empezar a chatear</p>
          </div>
        </div>
        <MemberList
          members={members}
          team={team}
          currentUser={currentUser}
          onMemberClick={handleMemberClick}
        />
      </main>
    )
  }

  const channelIcon =
    channel.channel_type === 'voice'
      ? '🔊'
      : channel.channel_type === 'announcement'
        ? '📢'
        : '#'

  return (
    <main className="chat-container">
      <div className="chat-main">
        <div className="chat-header">
          <span className="channel-icon">{channelIcon}</span>
          <h2>{channel.name}</h2>
          {channel.description && <p className="channel-description">{channel.description}</p>}
        </div>

        <div className="messages-container">
          {loading ? (
            <p className="loading">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.is_pinned ? 'pinned' : ''}`}
              >
                {message.reply_to_preview && (
                  <div className="reply-preview">
                    ↱ {message.reply_to_preview.author?.username}:{' '}
                    {message.reply_to_preview.content?.substring(0, 50)}...
                  </div>
                )}
                <div className="message-row">
                  <div
                    className="message-avatar clickable"
                    onClick={(e) => handleAvatarClick(message.author, message.author_team_role, e)}
                    title={`Ver perfil de ${message.author?.username}`}
                  >
                    {message.author?.avatar ? (
                      <img
                        src={getAvatarUrl(message.author.avatar)}
                        alt={message.author.username}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {message.author?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="author">{message.author?.username}</span>
                      <span className="timestamp">
                        {new Date(message.created_at).toLocaleString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                      {message.edited_at && <span className="edited">(editado)</span>}
                      {message.is_pinned && <span className="pin-badge">📌</span>}
                    </div>
                    {editingMessage === message.id ? (
                      <div className="edit-container">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditMessage(message.id)
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button onClick={() => handleEditMessage(message.id)}>Guardar</button>
                          <button onClick={cancelEditing}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <p className="content">{message.content}</p>
                    )}
                  </div>

                  {/* Boton de 3 puntos */}
                  <div className="message-menu-container">
                    <button
                      className="message-menu-trigger"
                      onClick={(e) => handleMessageMenuClick(e, message.id)}
                      title="Opciones"
                    >
                      ⋮
                    </button>

                    {messageMenu === message.id && (
                      <div className="message-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleReply(message)}>
                          ↩️ Responder
                        </button>
                        {canModerate && (
                          <button onClick={() => handlePinMessage(message.id)}>
                            {message.is_pinned ? '📌 Desfijar' : '📌 Fijar'}
                          </button>
                        )}
                        {message.is_own && (
                          <button onClick={() => startEditing(message)}>
                            ✏️ Editar
                          </button>
                        )}
                        {(message.is_own || canModerate) && (
                          <button
                            className="danger"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {canWriteAnnouncement && (
          <form className="message-form" onSubmit={handleSendMessage}>
            {replyTo && (
              <div className="reply-indicator">
                Respondiendo a <strong>{replyTo.author?.username}</strong>
                <button type="button" onClick={() => setReplyTo(null)}>
                  ×
                </button>
              </div>
            )}
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Escribe en #${channel.name}...`}
            />
            <button type="submit" disabled={!newMessage.trim()}>
              Enviar
            </button>
          </form>
        )}
      </div>

      {/* Lista de miembros a la derecha */}
      <MemberList
        members={members}
        team={team}
        currentUser={currentUser}
        onMemberClick={handleMemberClick}
      />

      {/* Menu contextual de miembro */}
      {contextMenu && (
        <MemberContextMenu
          member={contextMenu.member}
          position={contextMenu.position}
          currentUserRole={team?.my_role}
          currentUserId={currentUser?.id}
          teamId={team?.id}
          onClose={() => setContextMenu(null)}
          onMemberUpdated={handleMemberUpdated}
          onMemberRemoved={handleMemberRemoved}
        />
      )}
    </main>
  )
}

export default Chat
