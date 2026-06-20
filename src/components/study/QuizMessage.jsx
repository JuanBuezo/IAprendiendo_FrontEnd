import './QuizMessage.css'

function QuizMessage({ question, questionIndex, totalQuestions, answered, onAnswer, disabled }) {
  const getOptionClass = (option) => {
    if (!answered) return 'option-btn'
    if (option.id === answered.selectedOptionId) {
      return answered.isCorrect ? 'option-btn correct' : 'option-btn incorrect'
    }
    if (option.is_correct) return 'option-btn correct'
    return 'option-btn'
  }

  return (
    <div className="quiz-message-wrapper">
      <div className="quiz-message-card">
        {/* Progress bar */}
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
          />
        </div>
        <div className="quiz-progress-label">
          Pregunta {questionIndex} de {totalQuestions}
        </div>

        {/* Question text */}
        <div className="quiz-question-text">{question.question_text}</div>

        <hr className="quiz-separator" />

        {/* Answer options — 2 per row */}
        <div className="quiz-options-grid">
          {question.options.map((option) => (
            <button
              key={option.id}
              className={getOptionClass(option)}
              onClick={() => !disabled && !answered && onAnswer(option.id)}
              disabled={disabled || answered !== null}
            >
              {option.text}
            </button>
          ))}
        </div>

        {/* Explanation after answering */}
        {answered && question.explanation && (
          <div className="quiz-explanation">
            💡 {question.explanation}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuizMessage
