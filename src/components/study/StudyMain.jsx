import { useState, useEffect, useRef } from 'react'
import {
  getSession,
  addDocuments,
  generateQuiz,
  getQuiz,
  startAttempt,
  submitAnswer,
  completeAttempt,
  getSessionQuizzes,
} from '../../services/study'
import QuizMessage from './QuizMessage'
import QuizControls from './QuizControls'
import DocumentManager from './DocumentManager'
import './StudyMain.css'

// ─── Inline sub-components ───────────────────────────────────────────────────

function WelcomeMessage({ session }) {
  return (
    <div className="system-message welcome-msg">
      <div className="system-msg-icon">🤖</div>
      <div className="system-msg-body">
        <strong>{session.title}</strong>
        {session.description && <p>{session.description}</p>}
        <div className="welcome-stats">
          <span>📄 {session.document_count} documento(s)</span>
          <span>📝 {session.quiz_count} quiz(zes) generado(s)</span>
          {session.overall_average != null && (
            <span>⭐ Media: {session.overall_average.toFixed(1)}%</span>
          )}
        </div>
        {session.document_count === 0 ? (
          <p className="welcome-hint">
            Añade documentos a esta sesión para poder generar quizzes.
          </p>
        ) : (
          <p className="welcome-hint">
            Configura los parámetros abajo y pulsa <strong>Generar Quiz</strong> para empezar.
          </p>
        )}
      </div>
    </div>
  )
}

function LoadingMessage({ text }) {
  return (
    <div className="system-message loading-msg">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  )
}

function ErrorMessage({ text }) {
  return (
    <div className="system-message error-msg">
      <span>{text}</span>
    </div>
  )
}

function ResultMessage({ results, attempt }) {
  const passed = results.percentage >= 60
  return (
    <div className="system-message result-msg">
      <div className={`result-score ${passed ? 'passed' : 'failed'}`}>
        <span className="result-pct">{results.percentage.toFixed(1)}%</span>
        <span className="result-label">{passed ? '✅ Aprobado' : '❌ Suspenso'}</span>
      </div>
      <div className="result-detail">
        <span>{results.correct} de {results.total} correctas</span>
        <span className="result-quiz-title">{attempt.quiz_title}</span>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

function StudyMain({ selectedSession, onSessionUpdate }) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  // quizState: { questions, attemptId, currentIndex } — null when no quiz in progress
  const [quizState, setQuizState] = useState(null)
  const [quizConfig, setQuizConfig] = useState({
    num_questions: 10,
    options_per_question: 4,
    include_true_false: false,
    difficulty: 'medium',
  })
  const [generating, setGenerating] = useState(false)
  const [showDocManager, setShowDocManager] = useState(false)
  const [loading, setLoading] = useState(false)
  // history
  const [activeView, setActiveView] = useState('chat')   // 'chat' | 'history'
  const [quizHistory, setQuizHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (selectedSession) {
      loadSession(selectedSession.id)
      setActiveView('chat')
    }
  }, [selectedSession?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSession = async (id) => {
    setLoading(true)
    setMessages([])
    setQuizState(null)
    try {
      const data = await getSession(id)
      setSession(data)
      setMessages([{ id: 'welcome', type: 'welcome', session: data }])
    } catch (err) {
      console.error('Error al cargar sesión:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    if (!session) return null
    const updated = await getSession(session.id)
    setSession(updated)
    setMessages((prev) =>
      prev.map((m) => (m.type === 'welcome' ? { ...m, session: updated } : m))
    )
    if (onSessionUpdate) onSessionUpdate(updated)
    return updated
  }

  const switchToHistory = async () => {
    setActiveView('history')
    if (!session) return
    setHistoryLoading(true)
    try {
      const quizzes = await getSessionQuizzes(session.id)
      setQuizHistory(quizzes)
    } catch (err) {
      console.error('Error al cargar historial:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const addMessage = (msg) => setMessages((prev) => [...prev, msg])

  const removeMessage = (id) => setMessages((prev) => prev.filter((m) => m.id !== id))

  const updateMessage = (id, patch) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  // ── Generate quiz ────────────────────────────────────────────────────────

  const handleGenerateQuiz = async () => {
    if (!session || generating || quizState) return

    if (session.document_count === 0) {
      addMessage({
        id: Date.now(),
        type: 'error',
        text: '⚠️ Debes adjuntar al menos un documento a la sesión antes de generar un quiz.',
      })
      return
    }

    setGenerating(true)
    const loadingId = `loading-${Date.now()}`
    addMessage({
      id: loadingId,
      type: 'loading',
      text: 'Generando quiz con IA... Esto puede tardar entre 10 y 30 segundos ⏳',
    })

    try {
      const now = new Date()
      const params = {
        title: `Quiz ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        num_questions: quizConfig.num_questions,
        options_per_question: quizConfig.include_true_false ? 4 : quizConfig.options_per_question,
        include_true_false: quizConfig.include_true_false,
        difficulty: quizConfig.difficulty,
      }

      const genResult = await generateQuiz(session.id, params)
      const quiz = await getQuiz(genResult.quiz.id)
      const attemptResult = await startAttempt(quiz.id)
      const attempt = attemptResult.attempt

      removeMessage(loadingId)
      setQuizState({
        questions: quiz.questions,
        attemptId: attempt.id,
        currentIndex: 0,
      })

      addMessage({
        id: `q-${quiz.questions[0].id}`,
        type: 'question',
        question: quiz.questions[0],
        questionIndex: 1,
        totalQuestions: quiz.questions.length,
        answered: null,
      })
    } catch (err) {
      removeMessage(loadingId)
      addMessage({
        id: Date.now(),
        type: 'error',
        text: `❌ Error al generar el quiz: ${err.message}`,
      })
    } finally {
      setGenerating(false)
    }
  }

  // ── Handle answer ────────────────────────────────────────────────────────

  const handleAnswer = async (messageId, question, selectedOptionId) => {
    if (!quizState) return

    let answerResult
    try {
      answerResult = await submitAnswer(quizState.attemptId, question.id, selectedOptionId)
    } catch (err) {
      console.error('Error al enviar respuesta:', err)
      return
    }

    const isCorrect = answerResult.answer.is_correct

    // Show feedback on current question
    updateMessage(messageId, { answered: { selectedOptionId, isCorrect } })

    // After short delay, advance
    setTimeout(async () => {
      const nextIndex = quizState.currentIndex + 1

      if (nextIndex < quizState.questions.length) {
        const nextQuestion = quizState.questions[nextIndex]
        setQuizState((prev) => ({ ...prev, currentIndex: nextIndex }))
        addMessage({
          id: `q-${nextQuestion.id}`,
          type: 'question',
          question: nextQuestion,
          questionIndex: nextIndex + 1,
          totalQuestions: quizState.questions.length,
          answered: null,
        })
      } else {
        // Complete quiz
        try {
          const completeResult = await completeAttempt(quizState.attemptId)
          setQuizState(null)
          addMessage({
            id: `result-${Date.now()}`,
            type: 'result',
            results: completeResult.results,
            attempt: completeResult.attempt,
          })
          await refreshSession()
        } catch (err) {
          console.error('Error al completar quiz:', err)
        }
      }
    }, 1500)
  }

  // ── Add documents ────────────────────────────────────────────────────────

  const handleAddDocuments = async (documentIds) => {
    const result = await addDocuments(session.id, documentIds)
    const updatedSession = result.session
    setSession(updatedSession)
    setMessages((prev) =>
      prev.map((m) => (m.type === 'welcome' ? { ...m, session: updatedSession } : m))
    )
    if (onSessionUpdate) onSessionUpdate(updatedSession)
    setShowDocManager(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="study-main study-main-loading">
        <div className="spinner" />
        <span>Cargando sesión...</span>
      </div>
    )
  }

  const isQuizActive = quizState !== null

  const difficultyLabel = (d) =>
    d === 'easy' ? 'Fácil' : d === 'hard' ? 'Difícil' : 'Media'

  return (
    <div className="study-main">
      {/* Header */}
      <div className="study-main-header">
        <div className="header-info">
          <h2>{session?.title || selectedSession?.title}</h2>
          {session?.description && (
            <p className="header-description">{session.description}</p>
          )}
        </div>
        <div className="header-actions">
          <div className="header-stats">
            <span className="stat-badge">📄 {session?.document_count ?? 0}</span>
            <span className="stat-badge">📝 {session?.quiz_count ?? 0}</span>
            {session?.overall_average != null && (
              <span className="stat-badge">⭐ {session.overall_average.toFixed(0)}%</span>
            )}
          </div>
          {/* Tab switcher */}
          <div className="view-tabs">
            <button
              className={`view-tab-btn ${activeView === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveView('chat')}
            >
              💬 Chat
            </button>
            <button
              className={`view-tab-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={switchToHistory}
            >
              📊 Historial
            </button>
          </div>
          <button className="add-docs-btn" onClick={() => setShowDocManager(true)}>
            + Documentos
          </button>
        </div>
      </div>

      {/* ── History view ── */}
      {activeView === 'history' && (
        <div className="quiz-history-panel">
          {/* Summary stats */}
          <div className="history-summary">
            <div className="history-stat">
              <span className="history-stat-value">{session?.quiz_count ?? 0}</span>
              <span className="history-stat-label">Quizzes generados</span>
            </div>
            {session?.overall_average != null ? (
              <div className="history-stat">
                <span className={`history-stat-value ${session.overall_average >= 60 ? 'green' : 'red'}`}>
                  {session.overall_average.toFixed(1)}%
                </span>
                <span className="history-stat-label">Media general</span>
              </div>
            ) : (
              <div className="history-stat">
                <span className="history-stat-value grey">—</span>
                <span className="history-stat-label">Sin intentos aún</span>
              </div>
            )}
          </div>

          {historyLoading ? (
            <div className="history-loading">
              <div className="spinner" />
              <span>Cargando historial...</span>
            </div>
          ) : quizHistory.length === 0 ? (
            <div className="history-empty">
              <p>No hay quizzes generados aún.</p>
              <p>Cambia a la pestaña <strong>Chat</strong> para generar tu primer quiz.</p>
            </div>
          ) : (
            <div className="history-list">
              {quizHistory.map((quiz, idx) => (
                <div key={quiz.id} className="history-quiz-card">
                  <div className="hqc-left">
                    <span className="hqc-index">#{quizHistory.length - idx}</span>
                    <div className="hqc-info">
                      <span className="hqc-title">{quiz.title}</span>
                      <div className="hqc-meta">
                        <span>{quiz.num_questions} preg.</span>
                        <span className={`hqc-diff ${quiz.difficulty}`}>{difficultyLabel(quiz.difficulty)}</span>
                        <span>
                          {new Date(quiz.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {quiz.avg_attempts != null ? (
                    <div className={`hqc-score ${quiz.avg_attempts >= 60 ? 'passed' : 'failed'}`}>
                      {quiz.avg_attempts.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="hqc-score no-attempt">Sin completar</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Chat view ── */}
      {activeView === 'chat' && (
        <>
          {/* Messages */}
          <div className="study-messages">
            {messages.map((msg) => {
              if (msg.type === 'welcome') {
                return <WelcomeMessage key={msg.id} session={msg.session} />
              }
              if (msg.type === 'loading') {
                return <LoadingMessage key={msg.id} text={msg.text} />
              }
              if (msg.type === 'error') {
                return <ErrorMessage key={msg.id} text={msg.text} />
              }
              if (msg.type === 'question') {
                return (
                  <QuizMessage
                    key={msg.id}
                    question={msg.question}
                    questionIndex={msg.questionIndex}
                    totalQuestions={msg.totalQuestions}
                    answered={msg.answered}
                    onAnswer={(optionId) => handleAnswer(msg.id, msg.question, optionId)}
                    disabled={msg.answered !== null}
                  />
                )
              }
              if (msg.type === 'result') {
                return <ResultMessage key={msg.id} results={msg.results} attempt={msg.attempt} />
              }
              return null
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quiz controls (bottom) */}
          <QuizControls
            config={quizConfig}
            onChange={setQuizConfig}
            onGenerate={handleGenerateQuiz}
            disabled={generating || isQuizActive}
            hasDocuments={(session?.document_count ?? 0) > 0}
          />
        </>
      )}

      {/* Document manager modal */}
      {showDocManager && session && (
        <DocumentManager
          session={session}
          onClose={() => setShowDocManager(false)}
          onAddDocuments={handleAddDocuments}
        />
      )}
    </div>
  )
}

export default StudyMain
