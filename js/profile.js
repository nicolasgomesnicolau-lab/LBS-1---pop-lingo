// ============================================================
// ProfileTab - Módulo responsável pela aba de perfil do usuário
// Controle de avatar, conquistas, leaderboard, atividade e cores
// ============================================================
const ProfileTab = (() => {
  // Estado interno do módulo
  var currentFilter = 'all';       // Filtro ativo da seção de conquistas
  var activityExpanded = false;     // Controla se o gráfico de atividade está expandido

  // Lista de emojis disponíveis para o avatar do usuário
  var AVATAR_LIST = [
    '😀','😎','🤓','🤩','🥳','😈','👻','💀','🤖','👽',
    '🎃','😺','🙈','🦊','🐶','🐱','🦁','🐯','🐸','🐵',
    '🐉','🦅','🐺','🦋','🐙','🦄','🐧','🦉','🐬','🦈',
    '🌟','🎯','💪','🔥','🎸','🎨','🚀','🌈','🎭','🏆',
    '💎','👑','⚡','🌙','☀️','🍀','🎲','🎪','🛸','🗿',
  ];

  // Cores de fundo disponíveis para o círculo do avatar
  var BG_COLORS = [
    { label: 'Padrão', value: '#0a0f1a' },
    { label: 'Roxo Escuro', value: '#0d061a' },
    { label: 'Azul Marinho', value: '#06142e' },
    { label: 'Vinho', value: '#1a0a0a' },
    { label: 'Verde Escuro', value: '#0a1a0f' },
    { label: 'Cinza Chumbo', value: '#121212' },
    { label: 'Índigo', value: '#0a0a1a' },
    { label: 'Marrom', value: '#1a120a' },
  ];

  // Nomes fictícios usados para preencher o leaderboard
  var FAKE_NAMES = [
    'João S.', 'Maria C.', 'Pedro A.', 'Ana L.', 'Carlos M.',
    'Julia R.', 'Lucas F.', 'Beatriz N.', 'Rafael D.', 'Gabriela S.',
    'Felipe O.', 'Larissa M.', 'Thiago P.', 'Vanessa C.', 'Bruno H.',
    'Camila T.', 'Eduardo L.', 'Isabela G.', 'Marcos V.', 'Patricia R.',
    'Diego K.', 'Amanda S.', 'Rodrigo B.', 'Fernanda L.', 'Leonardo M.',
    'Tatiana N.', 'Gustavo P.', 'Aline S.', 'Hugo C.', 'Renata T.',
    'Vinicius A.', 'Luciana M.', 'André F.', 'Cristina D.', 'Roberto S.',
    'Sandra C.', 'Renato L.', 'Priscila V.', 'Daniel G.', 'Monique P.',
  ];

  // Avatares fictícios para os jogadores do leaderboard
  var FAKE_AVATARS = ['😀','😎','🤓','🌟','🎯','💪','🔥','🎸','🎨','🚀','🌈','🦁','🐉','🦅','🐺','🌸','🍀','🎭','🏆','💎'];

  // Extrai as iniciais de um email (ex: "joao.silva@email.com" -> "JS")
  function getInitials(email) {
    if (!email) return '?';
    var parts = email.replace(/@.+/, '').split(/[._]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email[0].toUpperCase();
  }

  // Retorna o objeto rank (elo) do usuário com base no número de conquistas
  function getUserRank(achievedCount) {
    if (typeof Achievements !== 'undefined') return Achievements.getRank(achievedCount);
    return { id: 'bronze', label: '🥉 Bronze', min: 0 };
  }

  // Encontra o próximo rank acima do atual
  function getNextRank(currentRank) {
    if (typeof Achievements === 'undefined') return null;
    var ranks = Achievements.RANKS;
    for (var i = 0; i < ranks.length; i++) {
      if (ranks[i].id === currentRank.id && i < ranks.length - 1) return ranks[i + 1];
    }
    return null;
  }

  // Retorna o emoji do avatar salvo nas configurações do usuário
  function getAvatar() {
    if (typeof Store !== 'undefined' && Store.getSettings) {
      var s = Store.getSettings();
      return s.avatar || null;
    }
    return null;
  }

  // Salva o emoji escolhido como avatar nas configurações
  function setAvatar(emoji) {
    if (typeof Store !== 'undefined' && Store.updateSettings) {
      Store.updateSettings({ avatar: emoji });
    }
  }

  // Retorna a cor de fundo salva nas configurações
  function getBgColor() {
    if (typeof Store !== 'undefined' && Store.getSettings) {
      var s = Store.getSettings();
      return s.bgColor || null;
    }
    return null;
  }

  // Aplica a cor de fundo no avatar e atualiza a UI dos chips
  function applyBgColor(color) {
    if (typeof Store !== 'undefined' && Store.updateSettings) {
      Store.updateSettings({ bgColor: color });
    }
    var avatar = document.querySelector('#profile-avatar-btn');
    if (avatar) {
      if (color) {
        avatar.style.background = color;
        avatar.style.border = '3px solid rgba(255,255,255,0.15)';
      } else {
        avatar.style.background = '';
        avatar.style.border = '';
      }
    }
    var chips = document.querySelectorAll('.bg-color-chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].dataset.color === color);
    }
  }

  // Gera lista simulada de jogadores para o leaderboard, posicionando o usuário real entre eles
  function generateLeaderboard(userAchievements, currentUserEmail) {
    var players = [];
    var usedNames = {};
    var totalAchievements = (typeof Achievements !== 'undefined') ? Achievements.ALL.length : 74;

    function pickName() {
      var available = FAKE_NAMES.filter(function(n) { return !usedNames[n]; });
      if (available.length === 0) return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      var name = available[Math.floor(Math.random() * available.length)];
      usedNames[name] = true;
      return name;
    }

    for (var i = 0; i < 40; i++) {
      var variance = Math.floor(Math.random() * 12) - 6;
      var count = Math.max(1, Math.min(totalAchievements, userAchievements + variance));
      players.push({
        name: pickName(),
        achievements: count,
        avatar: FAKE_AVATARS[i % FAKE_AVATARS.length],
        isUser: false,
      });
    }

    players.sort(function(a, b) { return b.achievements - a.achievements; });

    var userEntry = { name: currentUserEmail ? currentUserEmail.replace(/@.+/, '') : 'Visitante', achievements: userAchievements, avatar: getAvatar() || '🎯', isUser: true };
    players.splice(Math.min(7, players.length), 0, userEntry);
    players.sort(function(a, b) { return b.achievements - a.achievements; });

    return players.slice(0, 20);
  }

  // Renderiza o gráfico de atividade (calendário de contribuição) - 1 ou 4 semanas
  function renderActivityGraph() {
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var dateMap = {};
    if (stats.history) {
      for (var i = 0; i < stats.history.length; i++) {
        dateMap[stats.history[i].date] = (stats.history[i].correct || 0) + (stats.history[i].wrong || 0);
      }
    }

    var today = new Date();
    var dayLabels = ['D','S','T','Q','Q','S','S'];
    var rows = activityExpanded ? 4 : 1;
    var totalDays = rows * 7;

    var headerCells = '';
    headerCells += '<div class="activity-day-label"></div>';
    for (var d = 0; d < 7; d++) {
      headerCells += '<div class="activity-day-label">' + dayLabels[d] + '</div>';
    }

    var html = '';
    html += '<div class="activity-card">';
    html += '<div class="activity-headers">' + headerCells + '</div>';

    for (var row = 0; row < rows; row++) {
      html += '<div class="activity-grid">';
      var weekNum = rows - row;
      html += '<div class="activity-week-label">S' + weekNum + '</div>';

      for (var col = 0; col < 7; col++) {
        var dayOffset = (rows - 1 - row) * 7 + (6 - col);
        var date = new Date(today);
        date.setDate(date.getDate() - dayOffset);
        var dateStr = date.toISOString().split('T')[0];
        var count = dateMap[dateStr] || 0;

        var level = 0;
        if (count > 0) level = 1;
        if (count >= 5) level = 2;
        if (count >= 15) level = 3;
        if (count >= 30) level = 4;

        var dayName = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][date.getDay()];
        var tooltip = dayName + ' ' + date.getDate() + '/' + (date.getMonth()+1) + ': ' + count + ' palavras';

        html += '<div class="activity-cell level-' + level + '">';
        html += '<div class="activity-tooltip">' + tooltip + '</div>';
        html += '</div>';
      }

      html += '</div>';
    }

    html += '<div class="activity-legend">';
    html += '<span>Menos</span>';
    for (var l = 0; l <= 4; l++) {
      html += '<div class="activity-legend-cell level-' + l + '"></div>';
    }
    html += '<span>Mais</span>';
    html += '</div>';

    var expandLabel = activityExpanded ? 'Mostrar menos' : 'Expandir para o mês';
    html += '<button class="activity-expand-btn" id="activity-expand-btn">' + expandLabel + '</button>';

    html += '</div>';

    return html;
  }

  // Renderiza a grade de conquistas com filtro por categoria
  function renderAchievements(filter) {
    if (typeof Achievements === 'undefined') return '<div class="profile-empty"><div class="profile-empty-icon">🏆</div><h3>Sistema de conquistas não disponível</h3></div>';

    filter = filter || 'all';
    var list = Achievements.getCompletedList();
    var count = Achievements.getCount();

    var catOrder = ['all', 'Vocabulário', 'Study', 'Sequência', 'Music', 'Movies', 'Especiais'];
    var catLabels = { all: 'Todos', Vocabulário: '📚 Vocab', Study: '🎯 Study', Sequência: '🔥 Dias', Music: '🎵 Music', Movies: '🎬 Movies', Especiais: '⭐ Especiais' };

    var filterHtml = '<div class="achievement-filter">';
    for (var ci = 0; ci < catOrder.length; ci++) {
      var cat = catOrder[ci];
      var activeClass = filter === cat ? ' active' : '';
      filterHtml += '<div class="chip chip-sm' + activeClass + '" data-category="' + cat + '">' + catLabels[cat] + '</div>';
    }
    filterHtml += '</div>';
    filterHtml += '<div class="achievement-count">' + count + ' / ' + Achievements.ALL.length + ' conquistas</div>';

    var html = '<div class="achievement-grid">';
    for (var i = 0; i < list.length; i++) {
      var entry = list[i];
      if (filter !== 'all' && entry.achievement.category !== filter) continue;

      var unlocked = entry.unlocked;
      var cls = unlocked ? 'achievement-item unlocked' : 'achievement-item locked';
      var titleCls = unlocked ? 'achievement-title unlocked' : 'achievement-title locked';
      var check = unlocked ? '<div class="achievement-check">✓</div>' : '';

      html += '<div class="' + cls + '" data-id="' + entry.achievement.id + '">';
      html += check;
      html += '<span class="achievement-icon">' + entry.achievement.icon + '</span>';
      html += '<div class="' + titleCls + '">' + entry.achievement.title + '</div>';
      html += '<div class="achievement-desc">' + entry.achievement.desc + '</div>';
      html += '</div>';
    }
    html += '</div>';

    if (list.length === 0 || (filter !== 'all' && html.indexOf('achievement-item') === -1)) {
      html = '<div class="profile-empty"><div class="profile-empty-icon">🔍</div><h3>Nenhuma conquista nesta categoria</h3></div>';
    }

    return filterHtml + html;
  }

  // Renderiza a tabela de classificação (leaderboard) com jogadores fictícios + o usuário
  function renderLeaderboard() {
    var user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    var email = user ? user.email : null;
    var userAchievements = (typeof Achievements !== 'undefined') ? Achievements.getCount() : 0;
    var players = generateLeaderboard(userAchievements, email);

    var html = '<div class="profile-section">';
    html += '<div class="profile-section-header"><h2>🏆 Classificação</h2></div>';
    html += '<div class="leaderboard-card">';

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var pos = i + 1;
      var isUser = p.isUser;

      var posHtml = '';
      if (pos === 1) posHtml = '<div class="leaderboard-medal">🥇</div>';
      else if (pos === 2) posHtml = '<div class="leaderboard-medal">🥈</div>';
      else if (pos === 3) posHtml = '<div class="leaderboard-medal">🥉</div>';
      else posHtml = '<div class="leaderboard-pos">' + pos + '</div>';

      var rankObj = (typeof Achievements !== 'undefined') ? getUserRank(p.achievements) : { label: '🥉 Bronze' };

      html += '<div class="' + (isUser ? 'leaderboard-item is-user' : 'leaderboard-item') + '">';
      html += posHtml;
      html += '<div class="' + (isUser ? 'leaderboard-avatar is-user' : 'leaderboard-avatar') + '">' + p.avatar + '</div>';
      html += '<div class="leaderboard-info">';
      html += '<div class="' + (isUser ? 'leaderboard-name is-user' : 'leaderboard-name') + '">' + escapeHtml(p.name) + '</div>';
      html += '<div class="leaderboard-rank-title">' + rankObj.label + '</div>';
      html += '</div>';
      html += '<div class="leaderboard-score"><strong>' + p.achievements + '</strong> conquistas</div>';
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  // Renderiza a progressão de elos (collapsível), mostrando cada tier e a barra de progresso
  function renderRankProgression() {
    if (typeof Achievements === 'undefined') return '';
    var ranks = Achievements.RANKS;
    if (!ranks || ranks.length === 0) return '';
    var achievedCount = Achievements.getCount();

    var currentRank = getUserRank(achievedCount);
    var nextRank = getNextRank(currentRank);
    var nextMin = nextRank ? nextRank.min : ranks[ranks.length - 1].min;

    var summaryHtml = '';
    summaryHtml += '<div class="collapse-header" id="rank-toggle">';
    summaryHtml += '<span>📈 Progressão de Elos</span>';
    summaryHtml += '<span class="collapse-summary">' + currentRank.label + ' &middot; ' + achievedCount + ' conquistas</span>';
    summaryHtml += '<span class="collapse-arrow">▶</span>';
    summaryHtml += '</div>';

    var bodyHtml = '<div class="collapse-body" id="rank-body">';
    bodyHtml += '<div class="rank-progression-card">';

    for (var i = 0; i < ranks.length; i++) {
      var r = ranks[i];
      var nextMinRank = (i < ranks.length - 1) ? ranks[i + 1].min : Infinity;

      var unlocked = achievedCount >= r.min;
      var cls = 'rank-tier';
      if (unlocked) cls += ' rank-unlocked';
      if (r.id === currentRank.id) cls += ' rank-current';
      if (i === ranks.length - 1 && unlocked) cls += ' rank-maxed';

      var needed = nextMinRank - achievedCount;
      var neededLabel = '';
      if (i === ranks.length - 1) {
        neededLabel = unlocked ? '<span class="rank-needed rank-done">✅ Completo!</span>' : '<span class="rank-needed">' + (r.min - achievedCount) + ' faltam</span>';
      } else if (unlocked && achievedCount < nextMinRank) {
        neededLabel = '<span class="rank-needed">' + needed + ' para ' + ranks[i + 1].label.replace(/^[^\s]+\s/, '') + '</span>';
      } else if (unlocked) {
        neededLabel = '<span class="rank-needed rank-done">✅ Desbloqueado</span>';
      } else {
        neededLabel = '<span class="rank-needed">' + (r.min - achievedCount) + ' faltam</span>';
      }

      var progressFill = 0;
      if (r.id === currentRank.id && nextMinRank > r.min) {
        progressFill = Math.min(100, Math.round((achievedCount - r.min) / (nextMinRank - r.min) * 100));
      } else if (unlocked && nextMinRank > r.min) {
        progressFill = 100;
      } else if (unlocked && i === ranks.length - 1) {
        progressFill = 100;
      } else {
        progressFill = Math.min(100, Math.round((achievedCount - r.min) / (nextMinRank - r.min) * 100));
        if (progressFill < 0) progressFill = 0;
      }

      bodyHtml += '<div class="' + cls + '">';
      bodyHtml += '<div class="rank-tier-header">';
      bodyHtml += '<span class="rank-tier-icon">' + r.label.split(' ')[0] + '</span>';
      bodyHtml += '<span class="rank-tier-name">' + r.label.replace(/^[^\s]+\s/, '') + '</span>';
      bodyHtml += '<span class="rank-tier-min">' + r.min + '+</span>';
      bodyHtml += neededLabel;
      bodyHtml += '</div>';
      bodyHtml += '<div class="rank-tier-bar"><div class="rank-tier-fill" style="width:' + progressFill + '%"></div></div>';
      bodyHtml += '</div>';
    }

    bodyHtml += '</div></div>';

    return '<div class="profile-section collapse-section" id="rank-section">' + summaryHtml + bodyHtml + '</div>';
  }

  // Renderiza o seletor de cor de fundo do avatar
  function renderBgColorPicker() {
    var saved = getBgColor();
    var html = '<div class="profile-section">';
    html += '<div class="profile-section-header"><h2>🎨 Cor do Avatar</h2></div>';
    html += '<div class="bg-color-grid" id="bg-color-grid">';
    for (var i = 0; i < BG_COLORS.length; i++) {
      var c = BG_COLORS[i];
      var active = saved === c.value ? ' active' : '';
      html += '<div class="bg-color-chip' + active + '" data-color="' + c.value + '" title="' + c.label + '" style="background:' + c.value + '"><span>' + (active ? '✓' : '') + '</span></div>';
    }
    html += '</div></div>';
    return html;
  }

  // Renderiza o modal (overlay) com a grade de avatares para o usuário escolher
  function renderAvatarPicker() {
    var html = '<div class="avatar-picker-overlay" id="avatar-picker-overlay">';
    html += '<div class="avatar-picker-modal">';
    html += '<div class="avatar-picker-header">';
    html += '<h3>Escolha seu Avatar</h3>';
    html += '<button class="avatar-picker-close" id="avatar-picker-close">&times;</button>';
    html += '</div>';
    html += '<div class="avatar-picker-grid">';
    for (var i = 0; i < AVATAR_LIST.length; i++) {
      html += '<div class="avatar-picker-option" data-avatar="' + AVATAR_LIST[i] + '">' + AVATAR_LIST[i] + '</div>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  // Escapa caracteres HTML para prevenir XSS
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Função principal: monta todo o HTML da aba de perfil
  function render() {
    var words = (typeof Store !== 'undefined' && Store.getWords) ? Store.getWords() : [];
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };

    var wordCount = words.length;
    var totalCorrect = 0;
    var totalWrong = 0;
    var totalDays = stats.history ? stats.history.length : 0;

    if (stats.history) {
      for (var i = 0; i < stats.history.length; i++) {
        totalCorrect += stats.history[i].correct || 0;
        totalWrong += stats.history[i].wrong || 0;
      }
    }

    var achievedCount = (typeof Achievements !== 'undefined') ? Achievements.getCount() : 0;
    var rank = getUserRank(achievedCount);
    var nextRank = getNextRank(rank);
    var progressPct = nextRank ? Math.min(100, Math.round((achievedCount - rank.min) / (nextRank.min - rank.min) * 100)) : 100;

    var currentStreak = 0;
    if (typeof Achievements !== 'undefined') {
      var state = Achievements.getState();
      currentStreak = state.currentStreak || 0;
    }

    var user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    var email = user ? user.email : null;
    var savedAvatar = getAvatar();
    var avatarDisplay = savedAvatar || getInitials(email);

    var html = '';

    // Profile Header - avatar, nome, rank e barra de progresso

    // Stats Grid - palavras, sequência, acertos, dias

    // Cor de Fundo - seletor de cor do avatar

    // Rank Progression - seção colapsável de elos

    // Activity Graph - calendário de atividade diária

    // Achievements - grade de conquistas com filtro

    // Leaderboard - tabela de classificação

    // Avatar picker modal (hidden) - overlay para escolher avatar
    html += renderAvatarPicker();

    return html;
  }

  // Conecta os event listeners aos elementos do DOM após a renderização
  function bindEvents(container) {
    if (!container) return;

    // Avatar button - abre o seletor de avatar ao clicar

    // Fecha o modal do seletor de avatar pelo botão X

    // Fecha o modal clicando fora (no overlay)

    // Cada opção de avatar: salva e atualiza na UI

    // Expande/recolhe a seção de progressão de elos

    // Alterna entre 1 e 4 semanas no gráfico de atividade, re-renderizando apenas essa seção

    // Aplica a cor de fundo ao clicar num chip de cor

    // Filtro de categorias de conquistas: atualiza a grid e re-binda eventos
    var chips = container.querySelectorAll('.achievement-filter .chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function(e) {
        var chip = e.currentTarget;
        var category = chip.dataset.category;
        currentFilter = category;

        var siblings = chip.parentElement.querySelectorAll('.chip');
        for (var j = 0; j < siblings.length; j++) {
          siblings[j].classList.remove('active');
        }
        chip.classList.add('active');

        var section = document.getElementById('profile-achievements-section');
        if (section) {
          var header = section.querySelector('.profile-section-header');
          section.innerHTML = header ? header.outerHTML + renderAchievements(category) : renderAchievements(category);
          bindEvents(section);
        }
      });
    }
  }

  // Atualiza o avatar do usuário no leaderboard sem re-renderizar tudo
  function updateLeaderboardAvatar(emoji) {
    var userItems = document.querySelectorAll('.leaderboard-item.is-user .leaderboard-avatar');
    for (var i = 0; i < userItems.length; i++) {
      userItems[i].textContent = emoji;
    }
  }

  return {
    render: render,
    bindEvents: bindEvents,
  };
})();