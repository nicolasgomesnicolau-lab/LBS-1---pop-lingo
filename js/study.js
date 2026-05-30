/* ========================================
   LBS #1 — Study Tab
   ======================================== */

const StudyTab = (() => {
  let currentView = 'main'; // main | standard | active | basic | lesson | review | ranked
  let currentLessonIndex = -1;
  let studyWords = [];
  let currentWordIndex = 0;
  let isFlipped = false;
  let sessionCorrect = 0;
  let sessionWrong = 0;
  let activeFeedback = null;
  let periodDays = 3;
  let rankedRound = 1;
  let rankedMaxWrong = 2;
  let rankedWrongCount = 0;
  let rankedDefeated = false;
  let rankedStyle = 'active'; // 'standard' (flip card) or 'active' (typing) — set by which ⚔️ was clicked
  let sessionStartTime = 0;
  let sessionStreak = 0;
  let sessionWrongWords = []; // words wrong in current session (for end-of-session review)
  let mediaSessionCallback = null; // called when media study session completes

  // Review tracking
  let reviewWords = [];     // words that were wrong
  let reviewRound = 1;      // current review round
  let reviewSessionWrong = []; // words wrong in current review
  let reviewStyle = 'active'; // 'standard' (flip card) or 'active' (typing) — matches the original session mode

  const lessons = [
    { emoji: '🔗', title: 'Phrasal Verbs — Básico', desc: 'Palavras juntas mudam o sentido' },
    { emoji: '🚪', title: 'Phrasal Verbs com "Out"', desc: 'O "out" muda tudo' },
    { emoji: '🔄', title: 'Phrasal Verbs com "On / Off"', desc: 'Ligar, desligar e muito mais' },
    { emoji: '🔤', title: 'Expressões com "As"', desc: '"As" sozinho vs expressão inteira' },
    { emoji: '🎭', title: 'Palavras com múltiplos significados', desc: 'Uma palavra, vários sentidos' },
    { emoji: '❓', title: 'Perguntas em inglês', desc: 'Regra: verbo auxiliar no início' },
    { emoji: '📐', title: 'Adjetivos antes do substantivo', desc: 'Em inglês, o adjetivo vem ANTES' },
    { emoji: '📣', title: 'Sons de Vogais e Consoantes em Inglês', desc: 'Reconheça sons diferentes do português' },
    { emoji: '🏆', title: 'Desafio Final', desc: 'Teste se você entendeu as lições' },
  ];

  function render() {
    switch (currentView) {
      case 'standard': return renderSession('standard', false);
      case 'active': return renderSession('active', false);
      case 'review': return renderReview();
      case 'ranked': return renderRanked();
      case 'basic': return renderBasicLearning();
      case 'lesson': return renderLessonDetail();
      default: return renderMain();
    }
  }

  function renderMain() {
    const settings = Store.getSettings();
    const todayStats = Store.getTodayStats();
    const stats = Store.getAggregatedStats(periodDays);
    const goalProgress = Math.min((todayStats.wordsStudied / 10) * 100, 100);
    const wordCount = Store.getWords().length;

    return `
      <div class="tab-header">
        <div class="tab-header-icon">📖</div>
        <div class="tab-header-text">
          <h1>Study Mode</h1>
          <p>Suas palavras salvas viram desafios aqui ⚡</p>
        </div>
      </div>

      <div class="study-daily-goal">
        <div class="card">
          <div class="study-goal-header">
            <h3>🎯 Meta diária ✨</h3>
            <span class="study-goal-count">${todayStats.wordsStudied}/10</span>
          </div>
          <div class="progress-bar mb-lg">
            <div class="progress-bar-fill" style="width: ${goalProgress}%"></div>
          </div>
          <div class="stat-grid">
            <div class="stat-item">
              <span class="stat-icon">🕐</span>
              <span class="stat-value">${stats.freq}</span>
              <span class="stat-label">freq.</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📋</span>
              <span class="stat-value">${stats.words}</span>
              <span class="stat-label">palavras</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">😊</span>
              <span class="stat-value">${stats.correct}</span>
              <span class="stat-label">acertos</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">✅</span>
              <span class="stat-value">${stats.goalMet}</span>
              <span class="stat-label">meta</span>
            </div>
          </div>
        </div>
      </div>

      <div class="study-period">
        <div class="card" style="padding: var(--space-base) var(--space-lg);">
          <div class="flex-between">
            <span style="font-weight: 600;">Período</span>
            <div class="dropdown" id="period-dropdown">
              <button class="dropdown-trigger" id="period-trigger">
                <span>${getPeriodLabel(periodDays)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="dropdown-menu" id="period-menu">
                <div class="dropdown-item ${periodDays === 3 ? 'selected' : ''}" data-period="3">Últimos 3 dias</div>
                <div class="dropdown-item ${periodDays === 7 ? 'selected' : ''}" data-period="7">Última semana</div>
                <div class="dropdown-item ${periodDays === 30 ? 'selected' : ''}" data-period="30">Último mês</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="study-direction mb-lg">
        <span class="study-direction-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Direção
        </span>
        <div class="chip-group">
          <button class="chip chip-sm ${settings.studyDirection === 'en-pt' ? 'active' : ''}" data-direction="en-pt">EN→PT</button>
          <button class="chip chip-sm ${settings.studyDirection === 'pt-en' ? 'active' : ''}" data-direction="pt-en">PT→EN</button>
        </div>
      </div>

      <div class="study-modes-label">✨ Toque para começar</div>

      <div class="mode-card" data-mode="standard">
        <div class="mode-card-icon green">📖</div>
        <div class="mode-card-info">
          <h3>Modo Padrão</h3>
          <p>Clique na palavra para ver a tradução</p>
        </div>
        <div class="mode-card-actions">
          <span class="mode-card-arrow" data-mode="standard">→</span>
          <span class="mode-ranked-toggle" data-ranked="standard" title="Versão ranqueada">⚔️</span>
        </div>
      </div>

      <div class="mode-card" data-mode="active">
        <div class="mode-card-icon blue">🧠</div>
        <div class="mode-card-info">
          <h3>Modo Ativo</h3>
          <p>Digite a tradução correta</p>
        </div>
        <div class="mode-card-actions">
          <span class="mode-card-arrow" data-mode="active">→</span>
          <span class="mode-ranked-toggle" data-ranked="active" title="Versão ranqueada">⚔️</span>
        </div>
      </div>

      <div class="mode-card" data-mode="basic">
        <div class="mode-card-icon orange">📚</div>
        <div class="mode-card-info">
          <h3>Aprendizado Básico</h3>
          <p>Phrasal verbs, expressões e regras essenciais</p>
        </div>
        <span class="mode-card-arrow">→</span>
      </div>

      ${wordCount === 0 ? `
        <div class="info-banner mt-lg">
          <span>💡</span>
          <span>Adicione palavras na aba Vocab para começar a estudar!</span>
        </div>
      ` : ''}
    `;
  }

  function renderSession(mode, isRanked) {
    const words = Store.getWords();
    if (words.length === 0) {
      return emptySession(mode === 'ranked' ? 'Modo Ranqueado' : (mode === 'standard' ? 'Modo Padrão' : 'Modo Ativo'));
    }

    if (studyWords.length === 0) {
      studyWords = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
      currentWordIndex = 0;
      sessionCorrect = 0;
      sessionWrong = 0;
      isFlipped = false;
      activeFeedback = null;
    }

    if (currentWordIndex >= studyWords.length) {
      return renderComplete(mode, isRanked);
    }

    const settings = Store.getSettings();
    const word = studyWords[currentWordIndex];
    const showWord = settings.studyDirection === 'en-pt' ? word.word : word.translation;
    const showAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;
    const total = studyWords.length;
    const progress = ((currentWordIndex) / total) * 100;

    var backFn = isRanked ? 'ranked' : mode;

    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" data-study-back="${backFn}" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div style="flex:1;">
            <div class="progress-bar progress-bar-sm">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          <span class="study-progress-info">${currentWordIndex + 1}/${total}</span>
        </div>

        <div class="study-card-container">
          ${mode === 'standard' ? renderStandardCard(showWord, showAnswer) : renderActiveCard(showWord, showAnswer, word)}
        </div>

        ${mode === 'standard' ? renderStandardActions() : ''}
      </div>
    `;
  }

  function emptySession(title) {
    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2 style="font-size: var(--font-lg); font-weight: 700;">${title}</h2>
        </div>
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>Sem palavras para estudar</h3>
          <p>Adicione palavras na aba Vocab primeiro!</p>
        </div>
      </div>
    `;
  }

  function renderStandardCard(showWord, showAnswer) {
    return `
      <div class="study-flashcard ${isFlipped ? 'flipped' : ''}" id="flashcard">
        <div class="study-flashcard-inner">
          <div class="study-flashcard-front">
            <span class="study-flashcard-word">${escapeHtml(showWord)}</span>
            <span class="study-flashcard-hint">Toque para revelar</span>
          </div>
          <div class="study-flashcard-back">
            <span class="study-flashcard-hint" style="margin-bottom: var(--space-sm);">Tradução</span>
            <span class="study-flashcard-translation">${escapeHtml(showAnswer)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderStandardActions() {
    return `
      <div class="study-actions" style="visibility: ${isFlipped ? 'visible' : 'hidden'};">
        <button class="btn study-btn-wrong" id="study-wrong-btn">✗ Errei</button>
        <button class="btn study-btn-correct" id="study-correct-btn">✓ Acertei</button>
      </div>
    `;
  }

  function renderActiveCard(showWord, showAnswer, word) {
    return `
      <div style="width: 100%;">
        <div class="card" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-lg);">
          <span class="study-flashcard-word">${escapeHtml(showWord)}</span>
        </div>

        <div class="study-input-area">
          <input type="text" class="input-field" id="active-input" placeholder="Digite a tradução..." autocomplete="off" ${activeFeedback ? 'disabled' : ''}>
          
          ${activeFeedback ? `
            <div class="study-feedback ${activeFeedback.correct ? 'correct' : 'wrong'}">
              ${activeFeedback.correct ? '✅ Correto!' : `❌ Resposta: <strong>${escapeHtml(showAnswer)}</strong>`}
            </div>
            <button class="btn btn-primary btn-block mt-lg" id="active-next-btn">Próxima →</button>
          ` : `
            <button class="btn btn-primary btn-block mt-base" id="active-submit-btn">Verificar</button>
          `}
        </div>
      </div>
    `;
  }

  // --- REVIEW MODE ---
  function renderReview() {
    if (reviewWords.length === 0) {
      var words = Store.getWords();
      reviewWords = words.filter(function(w) { return w.timesWrong > w.timesCorrect; });
      reviewRound = 1;
      reviewSessionWrong = [];
      if (reviewWords.length === 0) {
        currentView = 'main';
        return render();
      }
    }

    if (currentWordIndex >= reviewWords.length) {
      if (reviewSessionWrong.length === 0) {
        var completed = renderComplete('review', false);
        reviewWords = [];
        return completed;
      }
      reviewRound++;
      reviewWords = reviewSessionWrong;
      reviewSessionWrong = [];
      currentWordIndex = 0;
      sessionCorrect = 0;
      sessionWrong = 0;
    }

    var settings = Store.getSettings();
    var word = reviewWords[currentWordIndex];
    var showWord = settings.studyDirection === 'en-pt' ? word.word : word.translation;
    var showAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;
    var total = reviewWords.length;
    var progress = (currentWordIndex / total) * 100;

    if (reviewStyle === 'standard') {
      return `
        <div class="study-session active">
          <div class="study-session-header">
            <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </div>
            <div style="flex:1;">
              <div class="progress-bar progress-bar-sm">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
              </div>
            </div>
            <span class="study-progress-info">Revisão R${reviewRound} · ${currentWordIndex + 1}/${total}</span>
          </div>

          <div class="study-card-container">
            <div style="width:100%;">
              <div class="card" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-lg); border-color: rgba(245, 158, 11, 0.3);">
                <span style="font-size:var(--font-sm);color:var(--warning);margin-bottom:var(--space-sm);display:block">🔄 Revisão — já errou esta palavra antes</span>
                ${renderStandardCard(showWord, showAnswer)}
              </div>

              <div class="study-actions" style="visibility: ${isFlipped ? 'visible' : 'hidden'};">
                <button class="btn study-btn-wrong" id="review-wrong-std-btn">✗ Errei</button>
                <button class="btn study-btn-correct" id="review-correct-btn">✓ Acertei</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div style="flex:1;">
            <div class="progress-bar progress-bar-sm">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          <span class="study-progress-info">Revisão R${reviewRound} · ${currentWordIndex + 1}/${total}</span>
        </div>

        <div class="study-card-container">
          <div style="width:100%;">
            <div class="card" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-lg); border-color: rgba(245, 158, 11, 0.3);">
              <span style="font-size:var(--font-sm);color:var(--warning);margin-bottom:var(--space-sm);display:block">🔄 Revisão — já errou esta palavra antes</span>
              <span class="study-flashcard-word">${escapeHtml(showWord)}</span>
            </div>

            <div class="study-input-area">
              <input type="text" class="input-field" id="active-input" placeholder="Digite a tradução..." autocomplete="off" ${activeFeedback ? 'disabled' : ''}>
              
              ${activeFeedback ? `
                <div class="study-feedback ${activeFeedback.correct ? 'correct' : 'wrong'}">
                  ${activeFeedback.correct ? '✅ Correto! Recuperou!' : `❌ Resposta: <strong>${escapeHtml(showAnswer)}</strong>`}
                </div>
                <button class="btn btn-primary btn-block mt-lg" id="active-next-btn">Próxima →</button>
              ` : `
                <button class="btn btn-primary btn-block mt-base" id="active-submit-btn">Verificar</button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- RANKED MODE ---
  function renderRanked() {
    if (rankedDefeated) {
      return renderRankedDefeat();
    }

    var words = Store.getWords();
    if (words.length === 0) return emptySession('Modo Ranqueado');

    if (studyWords.length === 0) {
      studyWords = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
      currentWordIndex = 0;
      sessionCorrect = 0;
      sessionWrong = 0;
      rankedRound = 1;
      rankedWrongCount = 0;
      rankedDefeated = false;
    }

    var modeName = rankedStyle === 'standard' ? 'Padrão' : 'Ativo';

    if (currentWordIndex >= studyWords.length) {
      return renderComplete(modeName, true);
    }

    var settings = Store.getSettings();
    var word = studyWords[currentWordIndex];
    var showWord = settings.studyDirection === 'en-pt' ? word.word : word.translation;
    var showAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;
    var total = studyWords.length;
    var progress = (currentWordIndex / total) * 100;
    var lives = rankedMaxWrong - rankedWrongCount;

    if (rankedStyle === 'standard') {
      return `
        <div class="study-session active">
          <div class="study-session-header">
            <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </div>
            <div style="flex:1;">
              <div class="progress-bar progress-bar-sm">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
              </div>
            </div>
            <span class="study-progress-info">❤️ ${lives} · ${currentWordIndex + 1}/${total}</span>
          </div>

          <div class="study-card-container">
            <div style="width:100%;">
              <div class="card" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-lg); border-color: rgba(255, 77, 106, 0.3);">
                <span style="font-size:var(--font-sm);color:var(--error);margin-bottom:var(--space-sm);display:block">⚔️ Ranqueada (Padrão) — Round ${rankedRound}</span>
                ${renderStandardCard(showWord, showAnswer)}
              </div>

              <div class="study-actions" style="visibility: ${isFlipped ? 'visible' : 'hidden'};">
                <button class="btn study-btn-wrong" id="ranked-standard-wrong-btn">✗ Errei</button>
                <button class="btn study-btn-correct" id="ranked-standard-correct-btn">✓ Acertei</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <div style="flex:1;">
            <div class="progress-bar progress-bar-sm">
              <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
          </div>
          <span class="study-progress-info">❤️ ${lives} · ${currentWordIndex + 1}/${total}</span>
        </div>

        <div class="study-card-container">
          <div style="width:100%;">
            <div class="card" style="padding: var(--space-2xl); text-align: center; margin-bottom: var(--space-lg); border-color: rgba(255, 77, 106, 0.3);">
              <span style="font-size:var(--font-sm);color:var(--error);margin-bottom:var(--space-sm);display:block">⚔️ Ranqueada (Ativo) — Round ${rankedRound}</span>
              <span class="study-flashcard-word">${escapeHtml(showWord)}</span>
            </div>

            <div class="study-input-area">
              <input type="text" class="input-field" id="active-input" placeholder="Digite a tradução..." autocomplete="off" ${activeFeedback ? 'disabled' : ''}>
              
              ${activeFeedback ? `
                <div class="study-feedback ${activeFeedback.correct ? 'correct' : 'wrong'}">
                  ${activeFeedback.correct ? '✅ Correto!' : `❌ Resposta: <strong>${escapeHtml(showAnswer)}</strong>`}
                </div>
                <button class="btn btn-primary btn-block mt-lg" id="active-next-btn">Próxima →</button>
              ` : `
                <button class="btn btn-primary btn-block mt-base" id="active-submit-btn">Verificar</button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderRankedDefeat() {
    var total = sessionCorrect + sessionWrong;
    return `
      <div class="study-session active">
        <div class="study-complete" style="padding-top:60px">
          <div style="font-size:80px;margin-bottom:var(--space-lg)">💀</div>
          <h2 style="font-size:var(--font-3xl);color:var(--error);font-weight:900">DERROTA!</h2>
          <p style="color:var(--text-muted);font-size:var(--font-lg);margin-bottom:var(--space-xl)">Você errou ${rankedWrongCount} vez(es) e foi eliminado!</p>
          
          <div class="study-complete-stats" style="margin-bottom:var(--space-xl)">
            <div class="stat-item">
              <span class="stat-value" style="color: var(--accent);">${sessionCorrect}</span>
              <span class="stat-label">acertos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: var(--error);">${sessionWrong}</span>
              <span class="stat-label">erros</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">Round ${rankedRound}</span>
              <span class="stat-label">rodada</span>
            </div>
          </div>

          <button class="btn btn-primary btn-lg" id="ranked-retry-btn">🔄 Tentar Novamente</button>
          <button class="btn btn-secondary btn-lg mt-base" id="study-back-main-btn">Voltar</button>
        </div>
      </div>
    `;
  }

  function renderComplete(mode, isRanked) {
    var total = sessionCorrect + sessionWrong;
    var percentage = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    var hasWrongWords = sessionWrongWords.length > 0;

    // Fire media session callback if set
    if (mediaSessionCallback) {
      mediaSessionCallback({ correct: sessionCorrect, wrong: sessionWrong, total: total });
      mediaSessionCallback = null;
    }

    return `
      <div class="study-session active">
        <div class="study-complete">
          <div class="study-complete-icon">${percentage >= 70 ? '🎉' : '💪'}</div>
          <h2>${percentage >= 70 ? 'Parabéns!' : 'Continue praticando!'}</h2>
          <p>Você completou a sessão de estudo</p>
          
          <div class="study-complete-stats">
            <div class="stat-item">
              <span class="stat-value" style="color: var(--accent);">${sessionCorrect}</span>
              <span class="stat-label">acertos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" style="color: var(--error);">${sessionWrong}</span>
              <span class="stat-label">erros</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${percentage}%</span>
              <span class="stat-label">precisão</span>
            </div>
          </div>

          ${hasWrongWords ? `
            <div class="info-banner mb-lg">
              <span>🔄</span>
              <span>Você errou ${sessionWrongWords.length} palavra(s) — revise abaixo!</span>
            </div>
            <button class="btn btn-warning btn-lg" id="start-review-btn" data-review-style="${mode === 'standard' ? 'standard' : 'active'}">Revisar ${sessionWrongWords.length} erros</button>
            <button class="btn btn-secondary btn-lg mt-base" id="study-back-main-btn">Voltar</button>
          ` : `
            <button class="btn btn-primary btn-lg" data-study-again="${mode}" ${isRanked ? 'data-ranked="1"' : ''}>Estudar novamente</button>
            <button class="btn btn-secondary btn-lg mt-base" id="study-back-main-btn">Voltar</button>
          `}
        </div>
      </div>
    `;
  }

  function renderBasicLearning() {
    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" data-study-back="main" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2 style="font-size: var(--font-lg); font-weight: 700;">Aprendizado Básico</h2>
        </div>

        <div class="lesson-list stagger">
          ${lessons.map(function(lesson, i) { return `
            <div class="lesson-card anim-slide-up" data-lesson="${i}" style="animation-delay: ${i * 50}ms;">
              <span class="lesson-emoji">${lesson.emoji}</span>
              <div class="lesson-info">
                <h4>${lesson.title}</h4>
                <p>${lesson.desc}</p>
              </div>
              <span class="mode-card-arrow" style="color: var(--text-muted);">→</span>
            </div>
          `; }).join('')}
        </div>

        <button class="btn btn-outline btn-block mt-xl" id="ask-chat-btn">
          💬 Tirar dúvidas com o Chat
        </button>
      </div>
    `;
  }

  function renderLessonDetail() {
    var lesson = lessons[currentLessonIndex];
    if (!lesson) return renderBasicLearning();

    return `
      <div class="lesson-detail-view active">
        <div class="study-session-header">
          <div class="back-btn" id="lesson-back-btn" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2 style="font-size: var(--font-lg); font-weight: 700;">${lesson.emoji} ${lesson.title}</h2>
        </div>

        <div class="lesson-content">
          <div class="coming-soon">
            <span>🚧</span>
            <h3 style="font-size: var(--font-lg); font-weight: 700; color: var(--text-secondary);">Conteúdo em breve...</h3>
            <p style="font-size: var(--font-sm); color: var(--text-muted);">Esta lição está sendo preparada. Volte em breve!</p>
          </div>
        </div>

        <button class="btn btn-outline btn-block mt-xl" id="ask-chat-lesson-btn">
          💬 Tirar dúvidas com o Chat
        </button>
      </div>
    `;
  }

  function getPeriodLabel(days) {
    switch (days) {
      case 3: return 'Últimos 3 dias';
      case 7: return 'Última semana';
      case 30: return 'Último mês';
      default: return 'Últimos ${days} dias';
    }
  }

  // ---- Soft matching ----
  function normalizeText(text) {
    return text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '');
  }

  function isSimilarEnough(input, expected) {
    var a = normalizeText(input);
    var b = normalizeText(expected);
    if (a === b) return true;
    // Check if one contains the other (e.g., "abraço" ≈ "abraçar")
    if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return true;
    // Levenshtein for short words
    if (a.length <= 8 && b.length <= 8) {
      var dist = levenshtein(a, b);
      if (dist <= 1) return true;
      if (dist <= 2 && a.length >= 5) return true;
    }
    return false;
  }

  function levenshtein(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) { dp[i] = [i]; }
    for (var j = 0; j <= n; j++) { dp[0][j] = j; }
    for (var i = 1; i <= m; i++) {
      for (var j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : Math.min(dp[i-1][j-1], dp[i][j-1], dp[i-1][j]) + 1;
      }
    }
    return dp[m][n];
  }

  function checkAnswer(input, expected) {
    return isSimilarEnough(input, expected);
  }

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function resetSession() {
    studyWords = [];
    currentWordIndex = 0;
    isFlipped = false;
    sessionCorrect = 0;
    sessionWrong = 0;
    activeFeedback = null;
    rankedDefeated = false;
    rankedWrongCount = 0;
    rankedRound = 1;
    sessionStartTime = Date.now();
    sessionStreak = 0;
    sessionWrongWords = [];
  }

  var _lastWordTime = Date.now();

  function recordStudyWord(word, isCorrect) {
    Store.updateWordStats(word.id, isCorrect);
    Store.recordStudyResult(isCorrect);

    // Track per-word time for study time achievements
    var now = Date.now();
    var wordMs = now - _lastWordTime;
    _lastWordTime = now;
    if (typeof Store !== 'undefined' && Store.recordStudyTime) {
      Store.recordStudyTime(wordMs);
    }

    if (isCorrect) {
      sessionCorrect++;
      sessionStreak++;
      if (typeof Store !== 'undefined' && Store.recordCorrectStreak) {
        Store.recordCorrectStreak(sessionStreak);
      }
    } else {
      sessionWrong++;
      sessionStreak = 0;
    }

    // Check lightning study: all words done in under 2 minutes
    if (currentWordIndex === studyWords.length - 1 || currentWordIndex === reviewWords.length - 1) {
      var elapsed = (now - sessionStartTime) / 1000;
      if (elapsed < 120 && typeof Store !== 'undefined' && Store.recordLightningStudy) {
        Store.recordLightningStudy();
      }
      if (elapsed < 30 && typeof Store !== 'undefined' && Store.setLightning30s) {
        Store.setLightning30s();
      }
    }

    if (typeof Achievements !== 'undefined') {
      Achievements.checkAll(Achievements.getState());
    }
  }

  // ---- Events ----
  function bindEvents(container) {
    // Mode selection
    // Mode card main area (basic / standard / active)
    container.querySelectorAll('.mode-card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        // Ignore clicks on arrow or ranked toggle
        if (e.target.closest('.mode-card-arrow') || e.target.closest('.mode-ranked-toggle')) return;
        var mode = this.dataset.mode;
        if (mode === 'basic') {
          currentView = 'basic';
        } else {
          resetSession();
          currentView = mode;
        }
        App.refreshCurrentTab();
      });
    });

    // Mode card arrows (standard / active) — click arrow starts normal mode
    container.querySelectorAll('.mode-card-arrow').forEach(function(arrow) {
      arrow.addEventListener('click', function(e) {
        e.stopPropagation();
        var mode = this.dataset.mode;
        resetSession();
        currentView = mode;
        App.refreshCurrentTab();
      });
    });

    // Ranked toggles — click ⚔️ starts ranked mode with correct style
    container.querySelectorAll('.mode-ranked-toggle').forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        resetSession();
        rankedDefeated = false;
        rankedStyle = this.dataset.ranked || 'active';
        currentView = 'ranked';
        App.refreshCurrentTab();
      });
    });

    // Direction toggle
    container.querySelectorAll('[data-direction]').forEach(function(chip) {
      chip.addEventListener('click', function() {
        Store.updateSettings({ studyDirection: this.dataset.direction });
        App.refreshCurrentTab();
      });
    });

    // Period dropdown
    var periodTrigger = container.querySelector('#period-trigger');
    var periodMenu = container.querySelector('#period-menu');
    if (periodTrigger && periodMenu) {
      periodTrigger.addEventListener('click', function() {
        periodMenu.classList.toggle('open');
      });
      container.querySelectorAll('[data-period]').forEach(function(item) {
        item.addEventListener('click', function() {
          periodDays = parseInt(this.dataset.period);
          periodMenu.classList.remove('open');
          App.refreshCurrentTab();
        });
      });
      document.addEventListener('click', function(e) {
        if (!e.target.closest('#period-dropdown')) {
          if (periodMenu) periodMenu.classList.remove('open');
        }
      });
    }

    // Back button — data-study-back attribute
    container.querySelectorAll('[data-study-back]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var dest = this.dataset.studyBack;
        if (dest === 'ranked' && rankedDefeated) { rankedDefeated = false; }
        if (dest === 'main' || dest === 'ranked') {
          currentView = dest === 'main' ? 'main' : 'ranked';
          resetSession();
        } else {
          currentView = 'main';
          resetSession();
        }
        App.refreshCurrentTab();
      });
    });

    // Flashcard click (standard mode + ranked standard)
    container.querySelectorAll('#flashcard').forEach(function(el) {
      el.addEventListener('click', function() {
        if (!isFlipped) {
          isFlipped = true;
          App.refreshCurrentTab();
        }
      });
    });

    // Standard mode buttons
    container.querySelector('#study-correct-btn')?.addEventListener('click', function() {
      var word = studyWords[currentWordIndex];
      recordStudyWord(word, true);
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#study-wrong-btn')?.addEventListener('click', function() {
      var word = studyWords[currentWordIndex];
      recordStudyWord(word, false);
      sessionWrongWords.push(word);
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    // Active mode submit
    var activeInput = container.querySelector('#active-input');
    if (activeInput && !activeFeedback) {
      setTimeout(function() { activeInput.focus(); }, 100);
      activeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') handleActiveSubmit();
      });
    }

    container.querySelector('#active-submit-btn')?.addEventListener('click', handleActiveSubmit);

    container.querySelector('#active-next-btn')?.addEventListener('click', function() {
      activeFeedback = null;
      currentWordIndex++;
      App.refreshCurrentTab();
    });

    // Complete screen
    container.querySelectorAll('[data-study-again]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = this.dataset.studyAgain;
        if (this.dataset.ranked) {
          resetSession();
          rankedDefeated = false;
          currentView = 'ranked';
        } else if (mode === 'review') {
          resetSession();
          currentView = 'main';
        } else {
          resetSession();
          currentView = mode;
        }
        App.refreshCurrentTab();
      });
    });

    // Review wrong words at session end
    container.querySelector('#start-review-btn')?.addEventListener('click', function() {
      reviewWords = sessionWrongWords.slice();
      reviewStyle = this.dataset.reviewStyle || 'active';
      reviewSessionWrong = [];
      reviewRound = 1;
      currentWordIndex = 0;
      sessionCorrect = 0;
      sessionWrong = 0;
      isFlipped = false;
      currentView = 'review';
      App.refreshCurrentTab();
    });

    // Review standard mode (flip card with wrong/correct buttons)
    container.querySelector('#review-correct-btn')?.addEventListener('click', function() {
      var word = reviewWords[currentWordIndex];
      recordStudyWord(word, true);
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#review-wrong-std-btn')?.addEventListener('click', function() {
      var word = reviewWords[currentWordIndex];
      recordStudyWord(word, false);
      reviewSessionWrong.push(word);
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#study-back-main-btn')?.addEventListener('click', function() {
      currentView = 'main';
      resetSession();
      rankedDefeated = false;
      App.refreshCurrentTab();
    });

    // Ranked standard mode (flip card with lives)
    container.querySelector('#ranked-standard-correct-btn')?.addEventListener('click', function() {
      var word = studyWords[currentWordIndex];
      recordStudyWord(word, true);
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#ranked-standard-wrong-btn')?.addEventListener('click', function() {
      var word = studyWords[currentWordIndex];
      recordStudyWord(word, false);
      rankedWrongCount++;
      isFlipped = false;
      if (rankedWrongCount >= rankedMaxWrong) {
        rankedDefeated = true;
        App.refreshCurrentTab();
        return;
      }
      sessionWrongWords.push(word);
      currentWordIndex++;
      App.refreshCurrentTab();
    });

    // Ranked retry
    container.querySelector('#ranked-retry-btn')?.addEventListener('click', function() {
      resetSession();
      rankedDefeated = false;
      currentView = 'ranked';
      App.refreshCurrentTab();
    });

    // Lessons
    container.querySelectorAll('[data-lesson]').forEach(function(card) {
      card.addEventListener('click', function() {
        currentLessonIndex = parseInt(this.dataset.lesson);
        currentView = 'lesson';
        App.refreshCurrentTab();
      });
    });

    container.querySelector('#lesson-back-btn')?.addEventListener('click', function() {
      currentView = 'basic';
      App.refreshCurrentTab();
    });

    // Chat buttons
    container.querySelector('#ask-chat-btn')?.addEventListener('click', function() {
      App.switchTab('chat');
    });
    container.querySelector('#ask-chat-lesson-btn')?.addEventListener('click', function() {
      App.switchTab('chat');
    });
  }

  function handleActiveSubmit() {
    var input = document.querySelector('#active-input');
    if (!input) return;
    var userAnswer = input.value.trim();
    if (!userAnswer) return;

    var settings = Store.getSettings();
    var word = getCurrentWord();
    if (!word) return;
    var expectedAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;
    var isCorrect = checkAnswer(userAnswer, expectedAnswer);

    // Ranked mode: track lives
    if (currentView === 'ranked' && rankedStyle === 'active') {
      if (!isCorrect) {
        rankedWrongCount++;
        if (rankedWrongCount >= rankedMaxWrong) {
          rankedDefeated = true;
          activeFeedback = null;
          App.refreshCurrentTab();
          return;
        }
      }
    }

    if (!isCorrect) {
      // Track wrong words for end-of-session review
      if (currentView !== 'review') {
        sessionWrongWords.push(word);
      }
      // Review mode: track for next round
      if (currentView === 'review') {
        reviewSessionWrong.push(word);
      }
    } else if (currentView === 'review' && typeof Achievements !== 'undefined') {
      // Check first_review achievement
      var state = Achievements.getState();
      state.firstReview = true;
      Achievements.checkAll(state);
    }

    recordStudyWord(word, isCorrect);
    activeFeedback = { correct: isCorrect };
    App.refreshCurrentTab();
  }

  function getCurrentWord() {
    if (currentView === 'review') return reviewWords[currentWordIndex];
    return studyWords[currentWordIndex];
  }

  // Start a session with external words (from movies/music media)
  function startMediaSession(words, mode, onComplete) {
    if (!words || words.length === 0) return;
    mediaSessionCallback = onComplete || null;
    studyWords = words;
    currentView = mode || 'standard';
    currentWordIndex = 0;
    isFlipped = false;
    sessionCorrect = 0;
    sessionWrong = 0;
    activeFeedback = null;
    rankedDefeated = false;
    rankedWrongCount = 0;
    rankedRound = 1;
    sessionStartTime = Date.now();
    sessionStreak = 0;
    sessionWrongWords = [];
    reviewWords = [];
    // Switch to study tab
    if (typeof App !== 'undefined' && App.switchTab) {
      App.switchTab('study');
    }
  }

  return { render: render, bindEvents: bindEvents, startMediaSession: startMediaSession };
})();
