/* ========================================
   LBS #1 — Vocab Tab
   ======================================== */

const VocabTab = (() => {
  let currentSubTab = 'add';
  let currentFilter = 'all';
  let searchQuery = '';

  function render() {
    return `
      <div class="tab-header">
        <div class="tab-header-icon">➕</div>
        <div class="tab-header-text">
          <h1>Vocabulário</h1>
          <p>Adicione e gerencie suas palavras</p>
        </div>
      </div>

      <div class="sub-tabs">
        <div class="sub-tab ${currentSubTab === 'add' ? 'active' : ''}" data-subtab="add">Adicionar</div>
        <div class="sub-tab ${currentSubTab === 'library' ? 'active' : ''}" data-subtab="library">Biblioteca</div>
      </div>

      <div id="vocab-add" style="display: ${currentSubTab === 'add' ? 'block' : 'none'}">
        ${renderAddForm()}
      </div>
      <div id="vocab-library" style="display: ${currentSubTab === 'library' ? 'block' : 'none'}">
        ${renderLibrary()}
      </div>
    `;
  }

  function renderAddForm() {
    return `
      <div class="vocab-add-form anim-slide-up">
        <div class="card" style="padding: var(--space-xl);">
          <div class="input-group mb-lg">
            <label class="input-label">Palavra em Inglês</label>
            <input type="text" class="input-field" id="vocab-word-input" placeholder="Ex: Hello">
          </div>
          <div class="input-group mb-lg">
            <label class="input-label">Tradução</label>
            <input type="text" class="input-field" id="vocab-translation-input" placeholder="Ex: Olá">
          </div>
          <button class="btn btn-primary btn-block" id="vocab-add-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar à Biblioteca
          </button>
        </div>

        <div class="mt-xl">
          <div class="section-label">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Dica
          </div>
          <div class="card" style="padding: var(--space-base);">
            <p style="font-size: var(--font-sm); color: var(--text-secondary);">
              Você também pode salvar palavras diretamente ao clicar nelas nas abas <strong style="color: var(--accent);">Movies</strong> e <strong style="color: var(--accent);">Music</strong>!
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderLibrary() {
    const words = searchQuery ? Store.searchWords(searchQuery) : Store.getWordsBySource(currentFilter);

    return `
      <div class="vocab-library anim-slide-up">
        <div class="input-with-icon mb-base">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="input-field" id="vocab-search" placeholder="Buscar palavras..." value="${searchQuery}">
        </div>

        <div class="vocab-filters no-scrollbar">
          ${renderFilterChips()}
        </div>

        <div class="vocab-count">
          ${words.length} palavra${words.length !== 1 ? 's' : ''} encontrada${words.length !== 1 ? 's' : ''}
        </div>

        ${words.length > 0 ? `
          <div class="vocab-list">
            ${words.map(w => renderWordItem(w)).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <h3>Nenhuma palavra ainda</h3>
            <p>Adicione palavras na aba "Adicionar" ou salve palavras das legendas!</p>
          </div>
        `}
      </div>
    `;
  }

  function renderFilterChips() {
    const filters = [
      { key: 'all', label: 'Todas' },
      { key: 'manual', label: 'Manual' },
      { key: 'movies', label: 'Movies' },
      { key: 'music', label: 'Music' },
      { key: 'chat', label: 'Chat' },
    ];

    return filters.map(f => `
      <button class="chip chip-sm ${currentFilter === f.key ? 'active' : ''}" data-filter="${f.key}">${f.label}</button>
    `).join('');
  }

  function renderWordItem(word) {
    const sourceBadge = getSourceBadge(word.source);
    const date = new Date(word.createdAt).toLocaleDateString('pt-BR');

    return `
      <div class="vocab-item" data-word-id="${word.id}">
        <div class="vocab-word">
          <strong>${escapeHtml(word.word)}</strong>
          <small>${escapeHtml(word.translation)} · ${sourceBadge} · ${date}</small>
        </div>
        <button class="vocab-delete" data-delete-word="${word.id}" title="Deletar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }

  function getSourceBadge(source) {
    const labels = {
      manual: '✏️ Manual',
      movies: '🎬 Movies',
      music: '🎵 Music',
      chat: '💬 Chat',
    };
    return labels[source] || source;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function bindEvents(container) {
    // Sub-tab switching
    container.querySelectorAll('.sub-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentSubTab = tab.dataset.subtab;
        App.refreshCurrentTab();
      });
    });

    // Add word
    const addBtn = container.querySelector('#vocab-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', handleAddWord);
    }

    // Enter key on inputs
    const wordInput = container.querySelector('#vocab-word-input');
    const transInput = container.querySelector('#vocab-translation-input');
    if (wordInput) {
      wordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') transInput?.focus();
      });
    }
    if (transInput) {
      transInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAddWord();
      });
    }

    // Search
    const searchInput = container.querySelector('#vocab-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        refreshLibrary(container);
      });
    }

    // Filter chips
    container.querySelectorAll('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFilter = chip.dataset.filter;
        searchQuery = '';
        App.refreshCurrentTab();
      });
    });

    // Delete word
    container.querySelectorAll('[data-delete-word]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.deleteWord;
        Store.deleteWord(id);
        App.showToast('Palavra removida!', 'success');
        App.refreshCurrentTab();
      });
    });
  }

  function handleAddWord() {
    const wordInput = document.querySelector('#vocab-word-input');
    const transInput = document.querySelector('#vocab-translation-input');

    const word = wordInput?.value.trim();
    const translation = transInput?.value.trim();

    if (!word || !translation) {
      App.showToast('Preencha todos os campos!', 'error');
      return;
    }

    const result = Store.addWord(word, translation, 'manual');
    if (result.success) {
      App.showToast(result.message, 'success');
      wordInput.value = '';
      transInput.value = '';
      wordInput.focus();
    } else {
      App.showToast(result.message, 'error');
    }
  }

  function refreshLibrary(container) {
    const libraryEl = container.querySelector('#vocab-library');
    if (libraryEl) {
      libraryEl.innerHTML = renderLibrary();
      // Re-bind library events
      bindLibraryEvents(container);
    }
  }

  function bindLibraryEvents(container) {
    container.querySelectorAll('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        currentFilter = chip.dataset.filter;
        searchQuery = '';
        App.refreshCurrentTab();
      });
    });

    container.querySelectorAll('[data-delete-word]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Store.deleteWord(btn.dataset.deleteWord);
        App.showToast('Palavra removida!', 'success');
        App.refreshCurrentTab();
      });
    });

    const searchInput = container.querySelector('#vocab-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        refreshLibrary(container);
      });
    }
  }

  return { render, bindEvents };
})();
