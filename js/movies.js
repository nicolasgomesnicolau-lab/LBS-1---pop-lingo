/* ========================================
   LBS #1 — Movies Tab
   ======================================== */

const MoviesTab = (() => {
  const ADMIN_PASSWORD = 'w4xxy61030';
  let isAdmin = false;
  let currentView = 'list'; // list | player | allClips | admin
  let currentSeries = null;
  let currentClip = null;
  let justHeardMode = false;

  function render() {
    if (currentView === 'player' && currentClip) {
      return renderPlayer();
    }
    if (currentView === 'allClips' && currentSeries) {
      return renderAllClips();
    }
    if (currentView === 'admin') {
      return renderAdminPanel();
    }
    return renderList();
  }

  function renderList() {
    const movies = Store.getMovies();

    return `
      <div class="tab-header">
        <div class="tab-header-icon">🎬</div>
        <div class="tab-header-text">
          <h1>Movies</h1>
          <p>Aprenda com cenas de filmes e séries</p>
        </div>
        <button class="btn btn-icon btn-secondary" id="movies-admin-btn" title="Admin">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>

      ${movies.length > 0 ? movies.map(series => renderSeriesSection(series)).join('') : `
        <div class="empty-state">
          <div class="empty-state-icon">🎥</div>
          <h3>Nenhum clip ainda</h3>
          <p>Use o modo admin para adicionar séries e clips de filmes com legendas!</p>
        </div>
      `}
    `;
  }

  function renderSeriesSection(series) {
    const clipCount = series.clips.length;
    return `
      <div class="movies-series-section">
        <div class="section-header">
          <h2>${escapeHtml(series.seriesName)}</h2>
          <span class="see-all" data-see-all="${series.id}">Ver tudo (${clipCount})</span>
        </div>
        <div class="h-scroll no-scrollbar">
          ${series.clips.map(clip => renderClipThumb(clip, series.id)).join('')}
        </div>
      </div>
    `;
  }

  function renderClipThumb(clip, seriesId) {
    const thumbnail = getYoutubeThumbnail(clip.videoUrl);
    return `
      <div class="thumb-card" data-play-clip="${clip.id}" data-series-id="${seriesId}">
        <div class="thumb-img">
          ${thumbnail ? `<img src="${thumbnail}" alt="${escapeHtml(clip.title)}" loading="lazy">` : `<div class="flex-center h-full" style="color: var(--text-muted); font-size: 32px;">🎬</div>`}
          ${clip.hasSubtitles && clip.subtitles.length > 0 ? '' : '<span class="badge badge-warning" style="position:absolute;bottom:6px;left:6px;">Sem legenda</span>'}
        </div>
        <div class="thumb-title">${escapeHtml(clip.title)}</div>
      </div>
    `;
  }

  function renderPlayer() {
    const series = Store.getMovies().find(m => m.clips.some(c => c.id === currentClip.id));
    const embedUrl = getYoutubeEmbedUrl(currentClip.videoUrl);

    return `
      <div class="movie-player-view active">
        <div class="movie-player-header">
          <div class="back-btn" id="movie-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2>${escapeHtml(currentClip.title)}</h2>
        </div>

        <div class="movie-video-container">
          ${embedUrl ? `<iframe src="${embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>` : `<div class="flex-center h-full" style="color: var(--text-muted);">Vídeo não disponível</div>`}
        </div>

        ${currentClip.hasSubtitles && currentClip.subtitles.length > 0 ? `
          <div class="subtitle-controls">
            <button class="chip chip-sm" id="prev-verse-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              Verso anterior
            </button>
            <button class="chip chip-sm ${justHeardMode ? 'active' : ''}" id="just-heard-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Just Heard
            </button>
          </div>

          <div class="subtitle-area no-scrollbar" id="subtitle-area">
            ${renderSubtitles(currentClip.subtitles)}
          </div>
        ` : `
          <div class="card mt-base" style="text-align: center; padding: var(--space-xl);">
            <p style="color: var(--text-muted);">Este clip não possui legendas</p>
          </div>
        `}
      </div>
    `;
  }

  function renderSubtitles(subtitles) {
    return subtitles.map((sub, i) => `
      <div class="subtitle-line ${i === 0 ? 'active' : ''}" data-sub-index="${i}">
        <span class="subtitle-time">${sub.time}</span>
        <span class="subtitle-text">
          ${sub.text.split(/\s+/).map(word => {
            const clean = word.replace(/[^a-zA-Z'-]/g, '');
            if (justHeardMode && clean) {
              return `<span class="word-censored" data-word="${clean}" data-original="${escapeHtml(word)}">●●●●</span>`;
            }
            return clean ? `<span class="word" data-word="${clean}">${escapeHtml(word)}</span>` : escapeHtml(word);
          }).join(' ')}
        </span>
      </div>
    `).join('');
  }

  function renderAllClips() {
    return `
      <div class="all-clips-view active">
        <div class="movie-player-header">
          <div class="back-btn" id="allclips-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2>${escapeHtml(currentSeries.seriesName)}</h2>
        </div>

        <div class="clips-grid">
          ${currentSeries.clips.map(clip => `
            <div class="thumb-card" data-play-clip="${clip.id}" data-series-id="${currentSeries.id}">
              <div class="thumb-img">
                ${getYoutubeThumbnail(clip.videoUrl) ? `<img src="${getYoutubeThumbnail(clip.videoUrl)}" alt="${escapeHtml(clip.title)}" loading="lazy">` : `<div class="flex-center h-full" style="color: var(--text-muted); font-size: 24px;">🎬</div>`}
              </div>
              <div class="thumb-title">${escapeHtml(clip.title)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAdminPanel() {
    const movies = Store.getMovies();

    return `
      <div class="admin-panel active">
        <div class="movie-player-header">
          <div class="back-btn" id="admin-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2>Modo Admin</h2>
        </div>

        <!-- Create Series -->
        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">📁 Nova Série / Título</h3>
          <div class="input-group mb-base">
            <input type="text" class="input-field" id="admin-series-name" placeholder="Ex: Spider-Man Movie">
          </div>
          <button class="btn btn-primary btn-block btn-sm" id="admin-create-series">Criar Série</button>
        </div>

        <!-- Add Clip -->
        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">🎬 Adicionar Clip</h3>
          
          <div class="admin-form-group">
            <label>Série</label>
            <select class="input-field" id="admin-clip-series" style="background: var(--bg-input);">
              <option value="">Selecione...</option>
              ${movies.map(m => `<option value="${m.id}">${escapeHtml(m.seriesName)}</option>`).join('')}
            </select>
          </div>

          <div class="admin-form-group">
            <label>Título do Clip</label>
            <input type="text" class="input-field" id="admin-clip-title" placeholder="Ex: Say Hello To My Little Friend">
          </div>

          <div class="admin-form-group">
            <label>Link do Vídeo (YouTube)</label>
            <input type="text" class="input-field" id="admin-clip-url" placeholder="https://youtube.com/watch?v=...">
          </div>

          <div class="admin-form-group">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="admin-clip-has-subs" checked style="width: 18px; height: 18px; accent-color: var(--accent);">
              Com legendas
            </label>
          </div>

          <div class="admin-form-group" id="admin-subs-group">
            <label>Legendas (formato: 0:00 texto)</label>
            <textarea class="input-field" id="admin-clip-subs" placeholder="0:00 Here&#10;0:05 she is. Did you think I wouldn't know&#10;0:09 the second you walked through the door?"></textarea>
          </div>

          <button class="btn btn-primary btn-block btn-sm" id="admin-add-clip">Adicionar Clip</button>
        </div>

        <!-- Add Playlist (batch) -->
        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">📋 Adicionar Playlist (Batch)</h3>
          <p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-base);">
            Cole vários clips no formato JSON. Cada item: { "title": "...", "videoUrl": "...", "subtitlesText": "..." }
          </p>

          <div class="admin-form-group">
            <label>Série</label>
            <select class="input-field" id="admin-batch-series" style="background: var(--bg-input);">
              <option value="">Selecione...</option>
              ${movies.map(m => `<option value="${m.id}">${escapeHtml(m.seriesName)}</option>`).join('')}
            </select>
          </div>

          <div class="admin-form-group">
            <textarea class="input-field" id="admin-batch-clips" placeholder='[{"title":"Clip 1","videoUrl":"https://..."},{"title":"Clip 2","videoUrl":"https://..."}]' style="min-height: 150px;"></textarea>
          </div>

          <button class="btn btn-primary btn-block btn-sm" id="admin-batch-add">Adicionar Playlist</button>
        </div>

        <!-- Manage Series -->
        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">🗑️ Gerenciar Séries</h3>
          ${movies.length > 0 ? movies.map(m => `
            <div class="flex-between mb-sm" style="padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-weight: 600;">${escapeHtml(m.seriesName)} (${m.clips.length} clips)</span>
              <button class="btn btn-sm btn-danger" data-delete-series="${m.id}">Deletar</button>
            </div>
          `).join('') : '<p style="color: var(--text-muted); font-size: var(--font-sm);">Nenhuma série criada.</p>'}
        </div>
      </div>
    `;
  }

  // ---- Helpers ----
  function getYoutubeId(url) {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  function getYoutubeThumbnail(url) {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
  }

  function getYoutubeEmbedUrl(url) {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Events ----
  function bindEvents(container) {
    // Admin button
    const adminBtn = container.querySelector('#movies-admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        if (isAdmin) {
          currentView = 'admin';
          App.refreshCurrentTab();
        } else {
          showAdminPasswordPrompt();
        }
      });
    }

    // Back buttons
    container.querySelector('#movie-back-btn')?.addEventListener('click', () => {
      currentView = 'list';
      currentClip = null;
      justHeardMode = false;
      App.refreshCurrentTab();
    });

    container.querySelector('#allclips-back-btn')?.addEventListener('click', () => {
      currentView = 'list';
      currentSeries = null;
      App.refreshCurrentTab();
    });

    container.querySelector('#admin-back-btn')?.addEventListener('click', () => {
      currentView = 'list';
      App.refreshCurrentTab();
    });

    // Play clip
    container.querySelectorAll('[data-play-clip]').forEach(el => {
      el.addEventListener('click', () => {
        const clipId = el.dataset.playClip;
        const seriesId = el.dataset.seriesId;
        const movies = Store.getMovies();
        const series = movies.find(m => m.id === seriesId);
        if (series) {
          const clip = series.clips.find(c => c.id === clipId);
          if (clip) {
            currentClip = clip;
            currentView = 'player';
            App.refreshCurrentTab();
          }
        }
      });
    });

    // See all clips
    container.querySelectorAll('[data-see-all]').forEach(el => {
      el.addEventListener('click', () => {
        const seriesId = el.dataset.seeAll;
        const movies = Store.getMovies();
        currentSeries = movies.find(m => m.id === seriesId);
        if (currentSeries) {
          currentView = 'allClips';
          App.refreshCurrentTab();
        }
      });
    });

    // Just Heard toggle
    container.querySelector('#just-heard-btn')?.addEventListener('click', () => {
      justHeardMode = !justHeardMode;
      App.refreshCurrentTab();
    });

    // Word click for translation
    container.querySelectorAll('.word').forEach(el => {
      el.addEventListener('click', () => {
        const word = el.dataset.word;
        if (word) showWordTranslation(word, el.closest('.subtitle-line'));
      });
    });

    // Censored word reveal
    container.querySelectorAll('.word-censored').forEach(el => {
      el.addEventListener('click', () => {
        el.textContent = el.dataset.original;
        el.classList.remove('word-censored');
        el.classList.add('word');
        el.style.color = 'var(--accent)';
      });
    });

    // Admin actions
    bindAdminEvents(container);
  }

  function bindAdminEvents(container) {
    // Create series
    container.querySelector('#admin-create-series')?.addEventListener('click', () => {
      const name = container.querySelector('#admin-series-name')?.value.trim();
      if (!name) return App.showToast('Digite o nome da série!', 'error');
      const result = Store.addSeries(name);
      App.showToast(result.message, result.success ? 'success' : 'error');
      if (result.success) App.refreshCurrentTab();
    });

    // Toggle subtitle visibility
    const hasSubs = container.querySelector('#admin-clip-has-subs');
    const subsGroup = container.querySelector('#admin-subs-group');
    if (hasSubs && subsGroup) {
      hasSubs.addEventListener('change', () => {
        subsGroup.style.display = hasSubs.checked ? 'block' : 'none';
      });
    }

    // Add clip
    container.querySelector('#admin-add-clip')?.addEventListener('click', () => {
      const seriesId = container.querySelector('#admin-clip-series')?.value;
      const title = container.querySelector('#admin-clip-title')?.value.trim();
      const url = container.querySelector('#admin-clip-url')?.value.trim();
      const hasSubs = container.querySelector('#admin-clip-has-subs')?.checked;
      const subs = container.querySelector('#admin-clip-subs')?.value.trim();

      if (!seriesId || !title || !url) {
        return App.showToast('Preencha série, título e URL!', 'error');
      }

      const result = Store.addClip(seriesId, title, url, subs, hasSubs);
      App.showToast(result.message, result.success ? 'success' : 'error');
      if (result.success) App.refreshCurrentTab();
    });

    // Batch add
    container.querySelector('#admin-batch-add')?.addEventListener('click', () => {
      const seriesId = container.querySelector('#admin-batch-series')?.value;
      const batchText = container.querySelector('#admin-batch-clips')?.value.trim();

      if (!seriesId || !batchText) {
        return App.showToast('Selecione a série e cole os clips!', 'error');
      }

      try {
        const clips = JSON.parse(batchText);
        if (!Array.isArray(clips)) throw new Error('not array');
        const result = Store.addClipsBatch(seriesId, clips);
        App.showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) App.refreshCurrentTab();
      } catch {
        App.showToast('JSON inválido! Verifique o formato.', 'error');
      }
    });

    // Delete series
    container.querySelectorAll('[data-delete-series]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Deletar esta série e todos os clips?')) {
          Store.deleteSeries(btn.dataset.deleteSeries);
          App.showToast('Série deletada!', 'success');
          App.refreshCurrentTab();
        }
      });
    });
  }

  function showAdminPasswordPrompt() {
    const password = prompt('🔒 Digite a senha de admin:');
    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      currentView = 'admin';
      App.showToast('Modo admin ativado!', 'success');
      App.refreshCurrentTab();
    } else if (password !== null) {
      App.showToast('Senha incorreta!', 'error');
    }
  }

  function showWordTranslation(word, subtitleLine) {
    // Simple dictionary lookup (basic translations)
    const translation = getBasicTranslation(word);
    const context = subtitleLine ? subtitleLine.querySelector('.subtitle-text')?.textContent.trim() : '';

    App.showWordBubble(word, translation, context, 'movies');
  }

  function getBasicTranslation(word) {
    // Basic dictionary for common words
    const dict = {
      'hello': 'olá', 'hi': 'oi', 'here': 'aqui', 'there': 'ali/lá', 'she': 'ela', 'he': 'ele',
      'is': 'é/está', 'are': 'são/estão', 'was': 'era/estava', 'were': 'eram/estavam',
      'the': 'o/a', 'a': 'um/uma', 'this': 'isto/este', 'that': 'aquilo/aquele',
      'you': 'você', 'I': 'eu', 'we': 'nós', 'they': 'eles', 'it': 'isso',
      'my': 'meu/minha', 'your': 'seu/sua', 'his': 'dele', 'her': 'dela',
      'do': 'fazer', 'did': 'fez', 'don\'t': 'não', 'can': 'pode/consegue',
      'know': 'saber/conhecer', 'think': 'pensar/achar', 'want': 'querer',
      'like': 'gostar/como', 'love': 'amor/amar', 'hate': 'odiar',
      'go': 'ir', 'come': 'vir', 'get': 'conseguir/pegar', 'make': 'fazer/criar',
      'take': 'pegar/levar', 'give': 'dar', 'tell': 'contar/dizer', 'say': 'dizer',
      'see': 'ver', 'look': 'olhar', 'find': 'encontrar', 'hear': 'ouvir',
      'feel': 'sentir', 'try': 'tentar', 'leave': 'sair/deixar', 'call': 'chamar/ligar',
      'need': 'precisar', 'keep': 'manter', 'let': 'deixar', 'put': 'colocar',
      'run': 'correr', 'walk': 'andar', 'talk': 'falar', 'turn': 'virar',
      'play': 'jogar/brincar', 'move': 'mover', 'live': 'viver', 'believe': 'acreditar',
      'well': 'bem', 'very': 'muito', 'just': 'apenas/só', 'also': 'também',
      'good': 'bom', 'bad': 'mau/ruim', 'big': 'grande', 'small': 'pequeno',
      'new': 'novo', 'old': 'velho', 'long': 'longo', 'little': 'pequeno/pouco',
      'right': 'certo/direita', 'wrong': 'errado', 'true': 'verdadeiro', 'real': 'real',
      'man': 'homem', 'woman': 'mulher', 'boy': 'garoto', 'girl': 'garota',
      'friend': 'amigo', 'world': 'mundo', 'life': 'vida', 'time': 'tempo',
      'day': 'dia', 'night': 'noite', 'home': 'lar/casa', 'house': 'casa',
      'work': 'trabalho/trabalhar', 'way': 'caminho', 'thing': 'coisa', 'place': 'lugar',
      'people': 'pessoas', 'hand': 'mão', 'door': 'porta', 'face': 'rosto',
      'eyes': 'olhos', 'head': 'cabeça', 'heart': 'coração', 'money': 'dinheiro',
      'back': 'de volta/costas', 'never': 'nunca', 'always': 'sempre', 'maybe': 'talvez',
      'yes': 'sim', 'no': 'não', 'not': 'não', 'but': 'mas', 'and': 'e',
      'with': 'com', 'for': 'para', 'from': 'de/desde', 'about': 'sobre',
      'what': 'o que', 'who': 'quem', 'where': 'onde', 'when': 'quando', 'why': 'por que',
      'how': 'como', 'all': 'tudo/todos', 'every': 'cada/todo', 'some': 'algum',
      'would': 'iria', 'could': 'poderia', 'should': 'deveria', 'will': 'vai/irá',
      'up': 'cima', 'down': 'baixo', 'out': 'fora', 'in': 'dentro',
      'on': 'em/sobre', 'off': 'desligado', 'over': 'sobre/acima', 'now': 'agora',
      'then': 'então', 'again': 'de novo', 'still': 'ainda', 'already': 'já',
      'too': 'também/demais', 'much': 'muito', 'more': 'mais', 'only': 'apenas',
      'around': 'ao redor', 'through': 'através', 'second': 'segundo', 'walked': 'andou',
      'wouldn\'t': 'não iria', 'scared': 'assustado', 'anymore': 'mais', 'broke': 'quebrou',
      'fall': 'cair', 'show': 'mostrar', 'drive': 'dirigir', 'pick': 'escolher',
      'throw': 'jogar', 'lover': 'amante', 'call': 'chamar',
    };
    return dict[word.toLowerCase()] || 'tradução indisponível';
  }

  return { render, bindEvents };
})();
