/* ========================================
   LBS #1 — Movies Tab
   ======================================== */

const MoviesTab = (() => {
  let isAdmin = false;
  let currentView = 'list'; // list | player | allClips | admin
  let currentSeries = null;
  let currentClip = null;
  let justHeardMode = false;

  // Server-backed movies cache (shared across all users)
  let serverMovies = [];
  let _adminToken = ''; // Legacy admin session token

  function loadMovies() {
    return fetch('/api/movies')
      .then(function(r) { return r.json(); })
      .then(function(movies) {
        serverMovies = movies || [];
        return serverMovies;
      })
      .catch(function() {
        serverMovies = [];
        return serverMovies;
      });
  }

  function saveMoviesToServer() {
    return fetch('/api/movies/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: _adminToken, movies: serverMovies })
    }).then(function(r) { return r.json(); });
  }

  // Load movies from server on init
  loadMovies().then(function() { if (typeof App !== 'undefined') App.refreshCurrentTab(); });

  // YouTube Player State
  let movieYTPlayer = null; // The YT.Player instance
  let moviePolling = null;  // The interval ID
  let movieCurrentTime = 0;
  let moviePlayerDuration = 0;
  let movieIsPlaying = false;
  let youtubeApiReady = false;

  // --- YouTube IFrame API Integration ---

  function onYouTubeIframeAPIReady() {
    youtubeApiReady = true;
    // If we are on the player view, create the player now
    if (currentView === 'player' && currentClip) {
      createMoviePlayer();
    }
  }

  function createMoviePlayer() {
    // Only create if API is ready and we have a clip
    if (!youtubeApiReady || !currentClip) return;

    const videoId = getYoutubeId(currentClip.videoUrl);
    if (!videoId) return;

    const playerContainer = document.getElementById('movie-youtube-player');
    if (!playerContainer) {
      // Retry in a bit if the DOM isn't ready yet
      setTimeout(createMoviePlayer, 150);
      return;
    }

    // Clean up existing player
    if (movieYTPlayer) {
      movieYTPlayer.destroy();
      movieYTPlayer = null;
    }

    // Create new YT.Player instance
    movieYTPlayer = new YT.Player('movie-youtube-player', {
      videoId: videoId,
      playerVars: {
        'autoplay': 1,
        'controls': 0,
        'rel': 0,
        'modestbranding': 1,
        'enablejsapi': 1,
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
      },
    });
  }

  function onPlayerReady(event) {
    moviePlayerDuration = event.target.getDuration();
    movieIsPlaying = true;
    startMovieSync(); // Start syncing subtitles
    updateMoviePlayerUI();
  }

  function onPlayerStateChange(event) {
    // YT.PlayerState.PLAYING (1)
    if (event.data === YT.PlayerState.PLAYING) {
      movieIsPlaying = true;
      startMovieSync();
    } 
    // YT.PlayerState.PAUSED (2) or ENDED (0)
    else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
      movieIsPlaying = false;
      stopMovieSync(); // Stop syncing when paused/ended
      if (event.data === YT.PlayerState.ENDED) {
        movieCurrentTime = 0; // Reset time if video ended
        // Track clip watch for achievements
        if (currentClip && typeof Store !== 'undefined' && Store.recordClipWatch) {
          Store.recordClipWatch(currentClip.id);
        }
        setTimeout(function() {
          if (typeof Achievements !== 'undefined') {
            Achievements.checkAll(Achievements.getState());
          }
        }, 100);
      }
    }
    updateMoviePlayerUI();
  }

  // --- Playback Controls ---

  function movieTogglePlay() {
    if (!movieYTPlayer) return;
    if (movieIsPlaying) {
      movieYTPlayer.pauseVideo();
    } else {
      movieYTPlayer.playVideo();
    }
  }

  function movieSkip(seconds) {
    if (!movieYTPlayer) return;
    let time = movieYTPlayer.getCurrentTime() + seconds;
    if (time < 0) time = 0;
    if (time > moviePlayerDuration) time = moviePlayerDuration;
    movieYTPlayer.seekTo(time, true);
  }

  function movieSeek(percent) {
    if (!movieYTPlayer || moviePlayerDuration <= 0) return;
    const time = (percent / 100) * moviePlayerDuration;
    movieYTPlayer.seekTo(time, true);
  }

  // --- Subtitle Synchronization ---

  function stopMovieSync() {
    if (moviePolling) {
      clearInterval(moviePolling);
      moviePolling = null;
    }
  }

  function startMovieSync() {
    stopMovieSync();
    // Poll every 200ms to update active subtitle
    moviePolling = setInterval(syncMovieTime, 200);
  }

  function syncMovieTime() {
    if (!movieYTPlayer || typeof movieYTPlayer.getCurrentTime !== 'function') return;
    
    // Get exact time from YouTube player
    movieCurrentTime = movieYTPlayer.getCurrentTime();
    
    // Ensure duration is known
    if (moviePlayerDuration === 0) {
      moviePlayerDuration = movieYTPlayer.getDuration() || 0;
    }

    highlightActiveSubtitle();
    updateMoviePlayerUI();
  }

  function highlightActiveSubtitle() {
    const subs = currentClip ? currentClip.subtitles : [];
    if (!subs || subs.length === 0) return;

    let activeIdx = -1;
    for (let i = subs.length - 1; i >= 0; i--) {
      if (movieCurrentTime >= subs[i].timeSeconds) {
        activeIdx = i;
        break;
      }
    }

    const lines = document.querySelectorAll('.subtitle-line');
    for (let i = 0; i < lines.length; i++) {
      const isActive = i === activeIdx;
      lines[i].classList.toggle('active', isActive);
      if (isActive) {
        lines[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function updateMoviePlayerUI() {
    // Update play/pause button icon
    const playBtn = document.getElementById('movie-play-btn');
    if (playBtn) {
      playBtn.innerHTML = movieIsPlaying
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    }

    // Update time displays
    const curEl = document.getElementById('movie-time-current');
    const totEl = document.getElementById('movie-time-total');
    if (curEl) curEl.textContent = formatTime(movieCurrentTime);
    if (totEl && moviePlayerDuration > 0) totEl.textContent = formatTime(moviePlayerDuration);

    // Update seekbar
    const seekbar = document.getElementById('movie-seekbar');
    if (seekbar && moviePlayerDuration > 0) {
      seekbar.value = (movieCurrentTime / moviePlayerDuration) * 100;
    }
  }

  // --- Render Functions ---

  function render() {
    if (currentView === 'player' && currentClip) return renderPlayer();
    if (currentView === 'allClips' && currentSeries) return renderAllClips();
    if (currentView === 'admin') return renderAdminPanel();
    return renderList();
  }

  function renderList() {
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

      ${serverMovies.length > 0 ? serverMovies.map(series => renderSeriesSection(series)).join('') : `
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
    return `
      <div class="movie-player-view active">
        <div class="movie-player-header">
          <div class="back-btn" id="movie-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2>${escapeHtml(currentClip.title)}</h2>
        </div>

        <div class="movie-video-container">
          <div id="movie-youtube-player"></div>
        </div>

        ${currentClip.hasSubtitles && currentClip.subtitles.length > 0 ? `
          <div class="player-controls-bottom">
            <div class="player-controls flex-center" style="gap:var(--space-lg);padding:var(--space-sm)">
              <button id="movie-skip-back" class="btn-icon" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-size:20px">⏪</button>
              <button id="movie-play-btn" class="player-play-btn" style="width:48px;height:48px;border-radius:50%;background:var(--accent);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
              <button id="movie-skip-fwd" class="btn-icon" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-size:20px">⏩</button>
            </div>

            <div class="player-progress flex-center mb-sm" style="gap:var(--space-sm);padding:0 var(--space-lg)">
              <span class="player-time" id="movie-time-current">0:00</span>
              <input type="range" class="player-seekbar" id="movie-seekbar" min="0" max="100" value="0" style="flex:1">
              <span class="player-time" id="movie-time-total">0:00</span>
            </div>

            <div class="subtitle-controls">
              <button class="chip chip-sm ${justHeardMode ? 'active' : ''}" id="just-heard-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Just Heard
              </button>
              <button class="chip chip-sm" id="study-movie-words-btn">📖 Estudar palavras</button>
            </div>
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
          ${currentSeries.clips.map(clip => {
            var cs = (typeof Store !== 'undefined' && Store.getMovieStudyScore) ? Store.getMovieStudyScore(clip.id) : null;
            var badge = '';
            if (cs) {
              badge = '<span class="badge ' + (cs.score >= 100 ? 'badge-success' : 'badge-warning') + '" style="font-size:10px;position:absolute;top:4px;right:4px;z-index:2">' + cs.score + '%</span>';
            }
            return '<div class="thumb-card" data-play-clip="' + clip.id + '" data-series-id="' + currentSeries.id + '">' +
              '<div class="thumb-img" style="position:relative">' +
              (getYoutubeThumbnail(clip.videoUrl) ? '<img src="' + getYoutubeThumbnail(clip.videoUrl) + '" alt="' + escapeHtml(clip.title) + '" loading="lazy">' : '<div class="flex-center h-full" style="color: var(--text-muted); font-size: 24px;">🎬</div>') +
              badge +
              '</div>' +
              '<div class="thumb-title">' + escapeHtml(clip.title) + '</div>' +
              '</div>';
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderAdminPanel() {
    return `
      <div class="admin-panel active">
        <div class="movie-player-header">
          <div class="back-btn" id="admin-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </div>
          <h2>Modo Admin</h2>
        </div>

        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">📁 Nova Série / Título</h3>
          <div class="input-group mb-base">
            <input type="text" class="input-field" id="admin-series-name" placeholder="Ex: Spider-Man Movie">
          </div>
          <button class="btn btn-primary btn-block btn-sm" id="admin-create-series">Criar Série</button>
        </div>

        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">🎬 Adicionar Clip</h3>
          <div class="admin-form-group">
            <label>Série</label>
            <select class="input-field" id="admin-clip-series" style="background: var(--bg-input);">
              <option value="">Selecione...</option>
              ${serverMovies.map(m => `<option value="${m.id}">${escapeHtml(m.seriesName)}</option>`).join('')}
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
            <textarea class="input-field" id="admin-clip-subs" placeholder="0:00 Here
0:05 she is. Did you think I wouldn't know
0:09 the second you walked through the door?" style="min-height:100px"></textarea>
            <button class="btn btn-secondary btn-sm mt-sm" id="admin-auto-subs" style="width:100%">⚡ Gerar Automaticamente</button>
          </div>
          <button class="btn btn-primary btn-block btn-sm" id="admin-add-clip">Adicionar Clip</button>
        </div>

        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">📋 Adicionar Playlist (Batch)</h3>
          <p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-base);">
            Cole vários clips no formato JSON. Cada item: { "title": "...", "videoUrl": "...", "subtitlesText": "..." }
          </p>
          <div class="admin-form-group">
            <label>Série</label>
            <select class="input-field" id="admin-batch-series" style="background: var(--bg-input);">
              <option value="">Selecione...</option>
              ${serverMovies.map(m => `<option value="${m.id}">${escapeHtml(m.seriesName)}</option>`).join('')}
            </select>
          </div>
          <div class="admin-form-group">
            <textarea class="input-field" id="admin-batch-clips" placeholder='[{"title":"Clip 1","videoUrl":"https://..."},{"title":"Clip 2","videoUrl":"https://..."}]' style="min-height: 150px;"></textarea>
          </div>
          <button class="btn btn-primary btn-block btn-sm" id="admin-batch-add">Adicionar Playlist</button>
        </div>

        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">🗑️ Gerenciar Séries & Clips</h3>
          ${serverMovies.length > 0 ? serverMovies.map(m => `
            <div style="margin-bottom: var(--space-base); padding: var(--space-sm); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
              <div class="flex-between mb-sm">
                <span style="font-weight: 600;">${escapeHtml(m.seriesName)} (${m.clips.length} clips)</span>
                <button class="btn btn-sm btn-danger" data-delete-series="${m.id}">Deletar série</button>
              </div>
              ${m.clips.length > 0 ? m.clips.map(c => `
                <div class="flex-between mb-xs" style="padding: 2px 0; font-size: var(--font-sm);">
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.title)}</span>
                  <button class="btn btn-sm btn-danger" data-delete-clip="${c.id}" data-series-id="${m.id}" style="font-size:11px;padding:2px 8px">✕</button>
                </div>
              `).join('') : '<p style="color:var(--text-muted);font-size:var(--font-sm)">Nenhum clip.</p>'}
            </div>
          `).join('') : '<p style="color: var(--text-muted); font-size: var(--font-sm);">Nenhuma série criada.</p>'}
        </div>

        <div class="card mb-lg" style="padding: var(--space-xl);">
          <h3 style="font-size: var(--font-md); margin-bottom: var(--space-base);">💾 Exportar / Importar</h3>
          <p style="font-size: var(--font-sm); color: var(--text-muted); margin-bottom: var(--space-base);">
            Exporte os dados para backup antes de fazer deploy. Importe após o deploy para restaurar.
          </p>
          <button class="btn btn-secondary btn-sm mb-base" id="admin-export-btn" style="width:100%">📥 Exportar JSON</button>
          <div class="admin-form-group">
            <textarea class="input-field" id="admin-import-json" placeholder="Cole o JSON exportado aqui..." style="min-height: 100px;"></textarea>
          </div>
          <button class="btn btn-primary btn-sm" id="admin-import-btn" style="width:100%">📤 Importar JSON</button>
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatTime(s) {
    s = s || 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // ---- Events ----

  function bindEvents(container) {
    // Admin button — password only
    container.querySelector('#movies-admin-btn')?.addEventListener('click', () => {
      if (isAdmin) {
        currentView = 'admin';
        App.refreshCurrentTab();
      } else {
        showAdminPasswordPrompt();
      }
    });

    // Back buttons
    container.querySelector('#movie-back-btn')?.addEventListener('click', () => {
      currentView = 'list';
      currentClip = null;
      justHeardMode = false;
      stopMovieSync();
      if (movieYTPlayer) {
        movieYTPlayer.destroy();
        movieYTPlayer = null;
      }
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
        const series = serverMovies.find(m => m.id === seriesId);
        if (series) {
          const clip = series.clips.find(c => c.id === clipId);
          if (clip) {
            currentClip = clip;
            currentView = 'player';
            movieCurrentTime = 0;
            App.refreshCurrentTab();
          }
        }
      });
    });

    // Player controls
    if (currentView === 'player' && currentClip) {
      // Initialize player
      if (window.YT && YT.Player) {
        createMoviePlayer();
      }

      container.querySelector('#movie-play-btn')?.addEventListener('click', movieTogglePlay);
      container.querySelector('#movie-skip-back')?.addEventListener('click', () => movieSkip(-10));
      container.querySelector('#movie-skip-fwd')?.addEventListener('click', () => movieSkip(10));

      container.querySelector('#movie-seekbar')?.addEventListener('input', function() {
        if (moviePlayerDuration > 0) {
          const preview = (this.value / 100) * moviePlayerDuration;
          const curEl = document.getElementById('movie-time-current');
          if (curEl) curEl.textContent = formatTime(preview);
        }
      });

      container.querySelector('#movie-seekbar')?.addEventListener('change', function() {
        movieSeek(this.value);
      });
    }

    // See all clips
    container.querySelectorAll('[data-see-all]').forEach(el => {
      el.addEventListener('click', () => {
        const seriesId = el.dataset.seeAll;
        currentSeries = serverMovies.find(m => m.id === seriesId);
        if (currentSeries) {
          currentView = 'allClips';
          App.refreshCurrentTab();
        }
      });
    });

    // Just Heard toggle — only re-render subtitles, not the whole tab
    container.querySelector('#just-heard-btn')?.addEventListener('click', () => {
      justHeardMode = !justHeardMode;
      var area = document.getElementById('subtitle-area');
      if (area && currentClip) {
        area.innerHTML = renderSubtitles(currentClip.subtitles);
        bindSubtitleEvents(container);
      }
    });

    // Study movie words button
    container.querySelector('#study-movie-words-btn')?.addEventListener('click', function() {
      if (!currentClip || !currentClip.subtitles) return;
      var allText = currentClip.subtitles.map(function(s) { return s.text; }).join(' ');
      var uniqueWords = extractUniqueWords(allText);
      if (uniqueWords.length === 0) { App.showToast('Nenhuma palavra encontrada nas legendas', 'error'); return; }
      // Show translation progress bar
      var subArea = document.getElementById('subtitle-area');
      if (subArea) {
        var prog = document.createElement('div');
        prog.id = 'translation-progress';
        prog.style.cssText = 'padding:var(--space-sm);text-align:center;font-size:var(--font-sm);color:var(--accent);background:rgba(99,102,241,0.1);border-radius:var(--radius-sm);margin-bottom:var(--space-sm)';
        prog.textContent = 'Traduzindo: 0/' + uniqueWords.length;
        subArea.parentNode.insertBefore(prog, subArea);
      }
      translateWordList(uniqueWords, function(translated) {
        var prog = document.getElementById('translation-progress');
        if (prog) {
          prog.textContent = '✅ ' + translated.length + ' palavras traduzidas';
          var startBtn = document.createElement('button');
          startBtn.className = 'btn btn-primary btn-sm mt-sm';
          startBtn.textContent = '📖 Começar estudo';
          startBtn.style.cssText = 'display:block;margin:var(--space-sm) auto 0';
          startBtn.addEventListener('click', function() {
            if (typeof StudyTab !== 'undefined' && StudyTab.startMediaSession) {
              StudyTab.startMediaSession(translated, 'standard', function(result) {
                if (typeof Store !== 'undefined' && Store.recordMovieStudyResult) {
                  Store.recordMovieStudyResult(currentClip.id, currentClip.title, result.correct, result.total);
                }
              });
            }
          });
          prog.appendChild(startBtn);
        }
      });
    });

    bindSubtitleEvents(container);
    bindAdminEvents(container);
  }

  function extractUniqueWords(text) {
    var words = text.toLowerCase().split(/\s+/);
    var seen = {};
    var result = [];
    for (var i = 0; i < words.length; i++) {
      var clean = words[i].replace(/[^a-z']/g, '');
      if (clean && clean.length > 1 && !seen[clean]) {
        seen[clean] = true;
        result.push(clean);
      }
    }
    return result;
  }

  function translateWordList(words, callback) {
    var result = [];
    var idx = 0;
    var total = words.length;
    var progressEl = document.getElementById('translation-progress');
    if (progressEl) progressEl.textContent = 'Traduzindo: 0/' + total;
    function next() {
      if (idx >= words.length) {
        if (progressEl) progressEl.textContent = 'Concluído!';
        callback(result);
        return;
      }
      var w = words[idx];
      Ai.translate(w, '').then(function(translation) {
        result.push({ word: w, translation: translation || w });
        idx++;
        if (progressEl) progressEl.textContent = 'Traduzindo: ' + idx + '/' + total;
        next();
      }).catch(function() {
        result.push({ word: w, translation: w });
        idx++;
        if (progressEl) progressEl.textContent = 'Traduzindo: ' + idx + '/' + total;
        next();
      });
    }
    next();
  }

  function bindSubtitleEvents(container) {
    container.addEventListener('click', (e) => {
      var wordEl = e.target.closest('.word');
      if (wordEl) {
        var word = wordEl.dataset.word;
        if (word) showWordTranslation(word, wordEl.closest('.subtitle-line'));
        return;
      }
      var censoredEl = e.target.closest('.word-censored');
      if (censoredEl) {
        censoredEl.textContent = censoredEl.dataset.original;
        censoredEl.classList.remove('word-censored');
        censoredEl.classList.add('word');
        censoredEl.style.color = 'var(--accent)';
        return;
      }
      var lineEl = e.target.closest('.subtitle-line');
      if (lineEl) {
        var idx = parseInt(lineEl.dataset.subIndex);
        if (!isNaN(idx) && currentClip && currentClip.subtitles[idx]) {
          var time = currentClip.subtitles[idx].timeSeconds;
          if (movieYTPlayer && typeof movieYTPlayer.seekTo === 'function') {
            movieYTPlayer.seekTo(time, true);
            movieYTPlayer.playVideo();
          }
        }
      }
    });
  }

  function bindAdminEvents(container) {
    container.querySelector('#admin-create-series')?.addEventListener('click', () => {
      const name = container.querySelector('#admin-series-name')?.value.trim();
      if (!name) return App.showToast('Digite o nome da série!', 'error');
      const exists = serverMovies.find(m => m.seriesName.toLowerCase() === name.toLowerCase());
      if (exists) return App.showToast('Série já existe!', 'error');
      serverMovies.push({
        id: Store.generateId(),
        seriesName: name,
        clips: [],
      });
      saveMoviesToServer().then(function(json) {
        App.showToast(json.success ? 'Série criada!' : 'Erro ao salvar', json.success ? 'success' : 'error');
        if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
      });
    });

    // Auto-fill title when URL is pasted
    var urlInput = container.querySelector('#admin-clip-url');
    var titleInput = container.querySelector('#admin-clip-title');
    if (urlInput && titleInput) {
      urlInput.addEventListener('blur', function() {
        if (titleInput.value.trim()) return;
        var videoId = getYoutubeId(urlInput.value.trim());
        if (!videoId) return;
        fetch('/api/video-info?videoId=' + encodeURIComponent(videoId))
          .then(function(r) { return r.json(); })
          .then(function(info) {
            if (info.title && !titleInput.value.trim()) titleInput.value = info.title;
          }).catch(function() {});
      });
    }

    const hasSubs = container.querySelector('#admin-clip-has-subs');
    const subsGroup = container.querySelector('#admin-subs-group');
    if (hasSubs && subsGroup) {
      hasSubs.addEventListener('change', () => {
        subsGroup.style.display = hasSubs.checked ? 'block' : 'none';
      });
    }

    container.querySelector('#admin-auto-subs')?.addEventListener('click', () => {
      var url = container.querySelector('#admin-clip-url')?.value.trim();
      if (!url) return App.showToast('Cole o link do YouTube primeiro!', 'error');
      var videoId = getYoutubeId(url);
      if (!videoId) return App.showToast('Link do YouTube inválido!', 'error');
      var btn = container.querySelector('#admin-auto-subs');
      btn.disabled = true;
      btn.textContent = '⏳ Gerando...';
      fetch('/api/video-info?videoId=' + encodeURIComponent(videoId))
        .then(function(r) { return r.json(); })
        .then(function(info) {
          if (info.error || !info.duration) throw new Error(info.error || 'sem info');
          if (info.duration > 360) {
            btn.disabled = false;
            btn.textContent = '⚡ Gerar Automaticamente';
            return App.showToast('Vídeo muito longo (mais de 6 min)! Precisa adicionar legendas manualmente.', 'error');
          }
          return fetch('/api/karaoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=' + videoId })
          }).then(function(r) { return r.json(); }).then(function(kJson) {
            btn.disabled = false;
            btn.textContent = '⚡ Gerar Automaticamente';
            if (kJson.status === 'success' && kJson.data && kJson.data.length > 0) {
              var lines = kJson.data.map(function(entry) {
                return formatTime(entry.start) + ' ' + (entry.text || '').trim();
              }).filter(function(l) { return l.length > 0; });
              container.querySelector('#admin-clip-subs').value = lines.join('\n');
              App.showToast(lines.length + ' linhas de legenda geradas!', 'success');
            } else {
              App.showToast('Não foi possível gerar legendas para este vídeo.', 'error');
            }
          });
        })
        .catch(function() {
          btn.disabled = false;
          btn.textContent = '⚡ Gerar Automaticamente';
          App.showToast('Erro ao processar vídeo.', 'error');
        });
    });

    container.querySelector('#admin-add-clip')?.addEventListener('click', () => {
      const seriesId = container.querySelector('#admin-clip-series')?.value;
      const title = container.querySelector('#admin-clip-title')?.value.trim();
      const url = container.querySelector('#admin-clip-url')?.value.trim();
      const hasSubs = container.querySelector('#admin-clip-has-subs')?.checked;
      const subs = container.querySelector('#admin-clip-subs')?.value.trim();
      if (!seriesId || !title || !url) return App.showToast('Preencha série, título e URL!', 'error');
      var series = serverMovies.find(m => m.id === seriesId);
      if (!series) return App.showToast('Série não encontrada!', 'error');
      var subtitles = [];
      if (subs && hasSubs) subtitles = Store.parseSubtitles(subs);
      series.clips.push({
        id: Store.generateId(),
        title: title,
        videoUrl: url,
        subtitles: subtitles,
        hasSubtitles: hasSubs,
      });
      saveMoviesToServer().then(function(json) {
        App.showToast(json.success ? 'Clip adicionado!' : 'Erro ao salvar', json.success ? 'success' : 'error');
        if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
      });
    });

    container.querySelector('#admin-batch-add')?.addEventListener('click', () => {
      const seriesId = container.querySelector('#admin-batch-series')?.value;
      const batchText = container.querySelector('#admin-batch-clips')?.value.trim();
      if (!seriesId || !batchText) return App.showToast('Selecione a série e cole os clips!', 'error');
      try {
        const clips = JSON.parse(batchText);
        if (!Array.isArray(clips)) throw new Error('not array');
        var series = serverMovies.find(m => m.id === seriesId);
        if (!series) return App.showToast('Série não encontrada!', 'error');
        clips.forEach(function(clip) {
          var subs = [];
          if (clip.subtitlesText && clip.hasSubtitles !== false) subs = Store.parseSubtitles(clip.subtitlesText);
          series.clips.push({
            id: Store.generateId(),
            title: clip.title,
            videoUrl: clip.videoUrl,
            subtitles: subs,
            hasSubtitles: clip.hasSubtitles !== false,
          });
        });
        saveMoviesToServer().then(function(json) {
          App.showToast(json.success ? clips.length + ' clips adicionados!' : 'Erro ao salvar', json.success ? 'success' : 'error');
          if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
        });
      } catch {
        App.showToast('JSON inválido! Verifique o formato.', 'error');
      }
    });

    container.querySelectorAll('[data-delete-series]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Deletar esta série e todos os clips?')) {
          var idx = serverMovies.findIndex(m => m.id === btn.dataset.deleteSeries);
          if (idx !== -1) serverMovies.splice(idx, 1);
          saveMoviesToServer().then(function(json) {
            App.showToast(json.success ? 'Série deletada!' : 'Erro ao salvar', json.success ? 'success' : 'error');
            if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
          });
        }
      });
    });

    container.querySelectorAll('[data-delete-clip]').forEach(btn => {
      btn.addEventListener('click', function() {
        if (!confirm('Deletar este clip?')) return;
        var seriesId = this.getAttribute('data-series-id');
        var clipId = this.getAttribute('data-delete-clip');
        var series = serverMovies.find(function(m) { return m.id === seriesId; });
        if (!series) return;
        var idx = series.clips.findIndex(function(c) { return c.id === clipId; });
        if (idx === -1) return;
        series.clips.splice(idx, 1);
        saveMoviesToServer().then(function(json) {
          App.showToast(json.success ? 'Clip deletado!' : 'Erro ao salvar', json.success ? 'success' : 'error');
          if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
        });
      });
    });

    container.querySelector('#admin-export-btn')?.addEventListener('click', () => {
      var json = JSON.stringify(serverMovies, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'movies-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
      App.showToast('Arquivo baixado! Guarde para importar depois do deploy.', 'success');
    });

    container.querySelector('#admin-import-btn')?.addEventListener('click', () => {
      var text = container.querySelector('#admin-import-json')?.value.trim();
      if (!text) return App.showToast('Cole o JSON primeiro!', 'error');
      try {
        var data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('precisa ser array');
        serverMovies = data;
        saveMoviesToServer().then(function(json) {
          App.showToast(json.success ? 'Dados importados!' : 'Erro ao salvar', json.success ? 'success' : 'error');
          if (json.success) loadMovies().then(function() { App.refreshCurrentTab(); });
        });
      } catch (e) {
        App.showToast('JSON inválido!', 'error');
      }
    });
  }

  function showAdminPasswordPrompt() {
    const password = prompt('🔒 Digite a senha de admin:');
    if (password === null) return;
    fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
      .then(function(r) { return r.json(); })
      .then(function(json) {
        if (json.success) {
          isAdmin = true;
          _adminToken = json.token;
          currentView = 'admin';
          App.showToast('Modo admin ativado!', 'success');
          App.refreshCurrentTab();
        } else {
          App.showToast('Senha incorreta!', 'error');
        }
      })
      .catch(function() {
        App.showToast('Erro ao verificar senha!', 'error');
      });
  }

  function showWordTranslation(word, subtitleLine) {
    const context = subtitleLine ? subtitleLine.querySelector('.subtitle-text')?.textContent.trim() : '';
    App.showWordBubble(word, 'Carregando...', context, 'movies');
    Ai.translate(word, context).then(function(translation) {
      var tEl = document.getElementById('bubble-translation');
      if (tEl) tEl.textContent = translation;
      var saveBtn = document.getElementById('bubble-save-btn');
      if (saveBtn) {
        var newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', function() {
          var result = Store.addWord(word, translation, 'movies');
          if (result.success) { App.showToast(result.message, 'success'); App.hideWordBubble(); }
          else { App.showToast(result.message, 'error'); }
        });
      }
    }).catch(function() {});
  }

  function getBasicTranslation(word) {
    const dict = {
      'hello': 'olá', 'hi': 'oi', 'here': 'aqui', 'there': 'ali/lá', 'she': 'ela', 'he': 'ele',
      'is': 'é/está', 'are': 'são/estão', 'was': 'era/estava', 'were': 'eram/estavam',
      'the': 'o/a', 'a': 'um/uma', 'this': 'isto/este', 'that': 'aquilo/aquele',
      'you': 'você', 'I': 'eu', 'we': 'nós', 'they': 'eles', 'it': 'isso',
      'my': 'meu/minha', 'your': 'seu/sua', 'his': 'dele', 'her': 'dela',
      'do': 'fazer', 'did': 'fez', "don't": 'não', 'can': 'pode/consegue',
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
      "wouldn't": 'não iria', 'scared': 'assustado', 'anymore': 'mais', 'broke': 'quebrou',
      'fall': 'cair', 'show': 'mostrar', 'drive': 'dirigir', 'pick': 'escolher',
      'throw': 'jogar', 'lover': 'amante',
    };
    return dict[word.toLowerCase()] || 'tradução indisponível';
  }

  // Expose API for external access (YouTube callback)
  window.onYouTubeIframeAPIReady = function() {
    if (typeof MoviesTab !== 'undefined' && MoviesTab.onYouTubeIframeAPIReady) {
      MoviesTab.onYouTubeIframeAPIReady();
    }
  };

  return { 
    render, 
    bindEvents,
    onYouTubeIframeAPIReady: onYouTubeIframeAPIReady
  };
})();