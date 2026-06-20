import './QuizControls.css'

function QuizControls({ config, onChange, onGenerate, disabled, hasDocuments }) {
  const handleChange = (field, value) => {
    onChange({ ...config, [field]: value })
  }

  const toggleTrueFalse = () => {
    onChange({ ...config, include_true_false: !config.include_true_false })
  }

  return (
    <div className="quiz-controls">
      <div className="controls-row">
        {/* Number of questions */}
        <div className="control-group">
          <label>Preguntas</label>
          <div className="number-stepper">
            <button
              onClick={() => handleChange('num_questions', Math.max(1, config.num_questions - 1))}
              disabled={disabled || config.num_questions <= 1}
            >
              −
            </button>
            <span>{config.num_questions}</span>
            <button
              onClick={() => handleChange('num_questions', Math.min(50, config.num_questions + 1))}
              disabled={disabled || config.num_questions >= 50}
            >
              +
            </button>
          </div>
        </div>

        {/* True/False toggle or options count */}
        <div className="control-group">
          <label>Tipo</label>
          <div className="toggle-options">
            <button
              className={`type-btn ${!config.include_true_false ? 'active' : ''}`}
              onClick={() => config.include_true_false && toggleTrueFalse()}
              disabled={disabled}
            >
              Opción múltiple
            </button>
            <button
              className={`type-btn ${config.include_true_false ? 'active' : ''}`}
              onClick={() => !config.include_true_false && toggleTrueFalse()}
              disabled={disabled}
            >
              V / F
            </button>
          </div>
        </div>

        {/* Options per question (only when not true/false) */}
        {!config.include_true_false && (
          <div className="control-group">
            <label>Opciones</label>
            <div className="number-stepper">
              <button
                onClick={() => handleChange('options_per_question', Math.max(2, config.options_per_question - 1))}
                disabled={disabled || config.options_per_question <= 2}
              >
                −
              </button>
              <span>{config.options_per_question}</span>
              <button
                onClick={() => handleChange('options_per_question', Math.min(5, config.options_per_question + 1))}
                disabled={disabled || config.options_per_question >= 5}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div className="control-group">
          <label>Dificultad</label>
          <select
            value={config.difficulty}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            disabled={disabled}
            className="difficulty-select"
          >
            <option value="easy">Fácil</option>
            <option value="medium">Media</option>
            <option value="hard">Difícil</option>
          </select>
        </div>

        {/* Generate button */}
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={disabled}
          title={!hasDocuments ? 'Adjunta documentos a la sesión primero' : ''}
        >
          {disabled ? '⏳ Generando...' : '🤖 Generar Quiz'}
        </button>
      </div>

      {!hasDocuments && (
        <p className="controls-hint">
          ⚠️ Esta sesión no tiene documentos. Añade documentos antes de generar un quiz.
        </p>
      )}
    </div>
  )
}

export default QuizControls
