/* ========================================
   LBS #1 — Study Tab
   ======================================== */

const StudyTab = (() => {
  let currentView = 'main'; // main | standard | active | basic | lesson
  let currentLessonIndex = -1;
  let studyWords = [];
  let currentWordIndex = 0;
  let isFlipped = false;
  let sessionCorrect = 0;
  let sessionWrong = 0;
  let activeFeedback = null;
  let periodDays = 3;

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
      case 'standard': return renderSession('standard');
      case 'active': return renderSession('active');
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

      <!-- Daily Goal -->
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

      <!-- Period -->
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

      <!-- Direction Toggle -->
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

      <!-- Study Modes -->
      <div class="study-modes-label">✨ Toque para começar</div>

      <div class="mode-card" data-mode="standard">
        <div class="mode-card-icon green">📖</div>
        <div class="mode-card-info">
          <h3>Modo Padrão</h3>
          <p>Clique na palavra para ver a tradução</p>
        </div>
        <span class="mode-card-arrow">→</span>
      </div>

      <div class="mode-card" data-mode="active">
        <div class="mode-card-icon blue">🧠</div>
        <div class="mode-card-info">
          <h3>Modo Ativo</h3>
          <p>Digite a tradução correta</p>
        </div>
        <span class="mode-card-arrow">→</span>
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

  function renderSession(mode) {
    const words = Store.getWords();
    if (words.length === 0) {
      return `
        <div class="study-session active">
          <div class="study-session-header">
            <div class="back-btn" id="study-back-btn" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </div>
            <h2 style="font-size: var(--font-lg); font-weight: 700;">${mode === 'standard' ? 'Modo Padrão' : 'Modo Ativo'}</h2>
          </div>
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h3>Sem palavras para estudar</h3>
            <p>Adicione palavras na aba Vocab primeiro!</p>
          </div>
        </div>
      `;
    }

    if (studyWords.length === 0) {
      // Shuffle and pick words
      studyWords = [...words].sort(() => Math.random() - 0.5).slice(0, 20);
      currentWordIndex = 0;
      sessionCorrect = 0;
      sessionWrong = 0;
      isFlipped = false;
      activeFeedback = null;
    }

    // Check if session complete
    if (currentWordIndex >= studyWords.length) {
      return renderComplete();
    }

    const settings = Store.getSettings();
    const word = studyWords[currentWordIndex];
    const showWord = settings.studyDirection === 'en-pt' ? word.word : word.translation;
    const showAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;
    const total = studyWords.length;
    const progress = ((currentWordIndex) / total) * 100;

    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" id="study-back-btn" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
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

  function renderComplete() {
    const total = sessionCorrect + sessionWrong;
    const percentage = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;

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

          <button class="btn btn-primary btn-lg" id="study-again-btn">Estudar novamente</button>
          <button class="btn btn-secondary btn-lg mt-base" id="study-back-main-btn">Voltar</button>
        </div>
      </div>
    `;
  }

  function renderBasicLearning() {
    return `
      <div class="study-session active">
        <div class="study-session-header">
          <div class="back-btn" id="study-back-btn" style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2 style="font-size: var(--font-lg); font-weight: 700;">Aprendizado Básico</h2>
        </div>

        <div class="lesson-list stagger">
          ${lessons.map((lesson, i) => `
            <div class="lesson-card anim-slide-up" data-lesson="${i}" style="animation-delay: ${i * 50}ms;">
              <span class="lesson-emoji">${lesson.emoji}</span>
              <div class="lesson-info">
                <h4>${lesson.title}</h4>
                <p>${lesson.desc}</p>
              </div>
              <span class="mode-card-arrow" style="color: var(--text-muted);">→</span>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-outline btn-block mt-xl" id="ask-chat-btn">
          💬 Tirar dúvidas com o Chat
        </button>
      </div>
    `;
  }

  function renderLessonDetail() {
    const lesson = lessons[currentLessonIndex];
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
      default: return `Últimos ${days} dias`;
    }
  }

  function normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '');     // Remove special chars
  }

  function checkAnswer(input, expected) {
    return normalizeText(input) === normalizeText(expected);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function resetSession() {
    studyWords = [];
    currentWordIndex = 0;
    isFlipped = false;
    sessionCorrect = 0;
    sessionWrong = 0;
    activeFeedback = null;
  }

  // ---- Events ----
  function bindEvents(container) {
    // Mode selection
    container.querySelectorAll('[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        if (mode === 'basic') {
          currentView = 'basic';
        } else {
          resetSession();
          currentView = mode;
        }
        App.refreshCurrentTab();
      });
    });

    // Direction toggle
    container.querySelectorAll('[data-direction]').forEach(chip => {
      chip.addEventListener('click', () => {
        Store.updateSettings({ studyDirection: chip.dataset.direction });
        App.refreshCurrentTab();
      });
    });

    // Period dropdown
    const periodTrigger = container.querySelector('#period-trigger');
    const periodMenu = container.querySelector('#period-menu');
    if (periodTrigger && periodMenu) {
      periodTrigger.addEventListener('click', () => {
        periodMenu.classList.toggle('open');
      });
      container.querySelectorAll('[data-period]').forEach(item => {
        item.addEventListener('click', () => {
          periodDays = parseInt(item.dataset.period);
          periodMenu.classList.remove('open');
          App.refreshCurrentTab();
        });
      });
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#period-dropdown')) {
          periodMenu?.classList.remove('open');
        }
      });
    }

    // Back button
    container.querySelector('#study-back-btn')?.addEventListener('click', () => {
      currentView = 'main';
      resetSession();
      App.refreshCurrentTab();
    });

    // Flashcard click (standard mode)
    container.querySelector('#flashcard')?.addEventListener('click', () => {
      if (!isFlipped) {
        isFlipped = true;
        App.refreshCurrentTab();
      }
    });

    // Standard mode buttons
    container.querySelector('#study-correct-btn')?.addEventListener('click', () => {
      const word = studyWords[currentWordIndex];
      Store.updateWordStats(word.id, true);
      Store.recordStudyResult(true);
      sessionCorrect++;
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#study-wrong-btn')?.addEventListener('click', () => {
      const word = studyWords[currentWordIndex];
      Store.updateWordStats(word.id, false);
      Store.recordStudyResult(false);
      sessionWrong++;
      currentWordIndex++;
      isFlipped = false;
      App.refreshCurrentTab();
    });

    // Active mode
    const activeInput = container.querySelector('#active-input');
    if (activeInput && !activeFeedback) {
      setTimeout(() => activeInput.focus(), 100);
      activeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleActiveSubmit();
      });
    }

    container.querySelector('#active-submit-btn')?.addEventListener('click', handleActiveSubmit);

    container.querySelector('#active-next-btn')?.addEventListener('click', () => {
      activeFeedback = null;
      currentWordIndex++;
      App.refreshCurrentTab();
    });

    // Complete screen
    container.querySelector('#study-again-btn')?.addEventListener('click', () => {
      resetSession();
      App.refreshCurrentTab();
    });

    container.querySelector('#study-back-main-btn')?.addEventListener('click', () => {
      currentView = 'main';
      resetSession();
      App.refreshCurrentTab();
    });

    // Lessons
    container.querySelectorAll('[data-lesson]').forEach(card => {
      card.addEventListener('click', () => {
        currentLessonIndex = parseInt(card.dataset.lesson);
        currentView = 'lesson';
        App.refreshCurrentTab();
      });
    });

    container.querySelector('#lesson-back-btn')?.addEventListener('click', () => {
      currentView = 'basic';
      App.refreshCurrentTab();
    });

    // Chat buttons
    container.querySelector('#ask-chat-btn')?.addEventListener('click', () => {
      App.switchTab('chat');
    });
    container.querySelector('#ask-chat-lesson-btn')?.addEventListener('click', () => {
      App.switchTab('chat');
    });
  }

  function handleActiveSubmit() {
    const input = document.querySelector('#active-input');
    if (!input) return;

    const userAnswer = input.value.trim();
    if (!userAnswer) return;

    const settings = Store.getSettings();
    const word = studyWords[currentWordIndex];
    const expectedAnswer = settings.studyDirection === 'en-pt' ? word.translation : word.word;

    const isCorrect = checkAnswer(userAnswer, expectedAnswer);

    Store.updateWordStats(word.id, isCorrect);
    Store.recordStudyResult(isCorrect);

    if (isCorrect) sessionCorrect++;
    else sessionWrong++;

    activeFeedback = { correct: isCorrect };
    App.refreshCurrentTab();
  }

  return { render, bindEvents };
})();
