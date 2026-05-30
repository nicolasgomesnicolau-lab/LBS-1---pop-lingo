/* ========================================
   LBS #1 — Profile Tab
   ======================================== */

const ProfileTab = (() => {
  var currentFilter = 'all';

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

  var FAKE_AVATARS = ['😀','😎','🤓','🌟','🎯','💪','🔥','🎸','🎨','🚀','🌈','🦁','🐉','🦅','🐺','🌸','🍀','🎭','🏆','💎'];

  function getInitials(email) {
    if (!email) return '?';
    var parts = email.replace(/@.+/, '').split(/[._]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email[0].toUpperCase();
  }

  function getUserRank(achievedCount) {
    if (typeof Achievements !== 'undefined') return Achievements.getRank(achievedCount);
    return { id: 'bronze', label: '🥉 Bronze', min: 0 };
  }

  function getNextRank(currentRank) {
    if (typeof Achievements === 'undefined') return null;
    var ranks = Achievements.RANKS;
    for (var i = 0; i < ranks.length; i++) {
      if (ranks[i].id === currentRank.id && i < ranks.length - 1) return ranks[i + 1];
    }
    return null;
  }

  function generateLeaderboard(baseScore, currentUserEmail) {
    var players = [];
    var usedNames = {};

    function pickName() {
      var available = FAKE_NAMES.filter(function(n) { return !usedNames[n]; });
      if (available.length === 0) return FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
      var name = available[Math.floor(Math.random() * available.length)];
      usedNames[name] = true;
      return name;
    }

    for (var i = 0; i < 40; i++) {
      var variance = Math.floor(Math.random() * 600) - 300 + Math.floor(Math.random() * 200);
      var score = Math.max(10, baseScore + variance);
      players.push({
        name: pickName(),
        score: score,
        avatar: FAKE_AVATARS[i % FAKE_AVATARS.length],
        isUser: false,
      });
    }

    players.sort(function(a, b) { return b.score - a.score; });

    var userEntry = { name: currentUserEmail ? currentUserEmail.replace(/@.+/, '') : 'Visitante', score: baseScore, avatar: '🎯', isUser: true };
    players.splice(Math.min(7, players.length), 0, userEntry);
    players.sort(function(a, b) { return b.score - a.score; });

    return players.slice(0, 20);
  }

  function getScoreForLeaderboard() {
    var words = (typeof Store !== 'undefined' && Store.getWords) ? Store.getWords() : [];
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var totalCorrect = 0;
    var totalWords = 0;
    for (var i = 0; i < stats.history.length; i++) {
      totalCorrect += stats.history[i].correct || 0;
      totalWords += stats.history[i].wordsStudied || 0;
    }
    return totalCorrect * 10 + words.length * 15 + totalWords * 5;
  }

  function renderActivityGraph() {
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var dateMap = {};
    if (stats.history) {
      for (var i = 0; i < stats.history.length; i++) {
        dateMap[stats.history[i].date] = (stats.history[i].correct || 0) + (stats.history[i].wrong || 0);
      }
    }

    var cells = [];
    var today = new Date();
    var dayLabels = ['D','S','T','Q','Q','S','S'];

    var headerCells = '';
    headerCells += '<div class="activity-day-label"></div>';
    for (var d = 0; d < 7; d++) {
      headerCells += '<div class="activity-day-label">' + dayLabels[d] + '</div>';
    }

    var rows = 4;
    var totalDays = 28;
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
        if (count >= 3) level = 2;
        if (count >= 8) level = 3;
        if (count >= 15) level = 4;

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
    html += '</div>';

    return html;
  }

  function renderAchievements(filter) {
    if (typeof Achievements === 'undefined') return '<div class="profile-empty"><div class="profile-empty-icon">🏆</div><h3>Sistema de conquistas não disponível</h3></div>';

    filter = filter || 'all';
    var completed = Achievements.getCompleted();
    var list = Achievements.getCompletedList();
    var count = Achievements.getCount();

    var categories = {};
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

  function renderLeaderboard() {
    var user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    var email = user ? user.email : null;
    var score = getScoreForLeaderboard();
    var players = generateLeaderboard(score, email);

    var html = '<div class="profile-section">';
    html += '<div class="profile-section-header"><h2>🏆 Classificação</h2></div>';
    html += '<div class="leaderboard-card">';

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var pos = i + 1;
      var isUser = p.isUser;
      var itemClass = isUser ? 'leaderboard-item is-user' : 'leaderboard-item';
      var nameClass = isUser ? 'leaderboard-name is-user' : 'leaderboard-name';
      var avatarClass = isUser ? 'leaderboard-avatar is-user' : 'leaderboard-avatar';

      var posHtml = '';
      if (pos === 1) posHtml = '<div class="leaderboard-medal">🥇</div>';
      else if (pos === 2) posHtml = '<div class="leaderboard-medal">🥈</div>';
      else if (pos === 3) posHtml = '<div class="leaderboard-medal">🥉</div>';
      else posHtml = '<div class="leaderboard-pos">' + pos + '</div>';

      var rankTitle = '';
      if (typeof Achievements !== 'undefined') {
        var rankObj = getUserRank(Math.floor(p.score / 100));
        rankTitle = '<div class="leaderboard-rank-title">' + rankObj.label + '</div>';
      }

      html += '<div class="' + itemClass + '">';
      html += posHtml;
      html += '<div class="' + avatarClass + '">' + p.avatar + '</div>';
      html += '<div class="leaderboard-info">';
      html += '<div class="' + nameClass + '">' + escapeHtml(p.name) + '</div>';
      html += rankTitle;
      html += '</div>';
      html += '<div class="leaderboard-score"><strong>' + p.score + '</strong> pts</div>';
      html += '</div>';
    }

    html += '</div></div>';
    return html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function render() {
    var words = (typeof Store !== 'undefined' && Store.getWords) ? Store.getWords() : [];
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var todayStats = (typeof Store !== 'undefined' && Store.getTodayStats) ? Store.getTodayStats() : { correct: 0, wrong: 0, wordsStudied: 0 };

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
    var totalAchievements = (typeof Achievements !== 'undefined') ? Achievements.ALL.length : 38;
    var progressPct = nextRank ? Math.min(100, Math.round((achievedCount - rank.min) / (nextRank.min - rank.min) * 100)) : 100;

    var currentStreak = 0;
    if (typeof Achievements !== 'undefined') {
      var state = Achievements.getState();
      currentStreak = state.currentStreak || 0;
    }

    var user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    var email = user ? user.email : null;
    var avatarLetter = getInitials(email);

    var html = '';

    // Profile Header
    html += '<div class="profile-header">';
    html += '<div class="profile-avatar">' + avatarLetter + '</div>';
    html += '<div class="profile-name">' + (email ? escapeHtml(email.replace(/@.+/, '')) : 'Visitante') + '</div>';
    html += '<div class="profile-rank-badge">' + rank.label + '</div>';
    html += '<div class="profile-rank-progress">';
    html += '<div class="profile-rank-labels"><span>' + rank.label.replace(/^[^\s]+\s/, '') + '</span><span>' + (nextRank ? nextRank.label.replace(/^[^\s]+\s/, '') : 'MAX') + '</span></div>';
    html += '<div class="progress-bar"><div class="progress-bar-fill" style="width:' + progressPct + '%"></div></div>';
    html += '<div class="profile-rank-labels"><span>' + achievedCount + ' conquistas</span><span>' + (nextRank ? nextRank.min + ' necessários' : 'Completo!') + '</span></div>';
    html += '</div></div>';

    // Stats Grid
    html += '<div class="profile-stats">';
    html += '<div class="profile-stat-item"><span class="profile-stat-icon">📚</span><div class="profile-stat-value">' + wordCount + '</div><div class="profile-stat-label">Palavras</div></div>';
    html += '<div class="profile-stat-item"><span class="profile-stat-icon">🔥</span><div class="profile-stat-value">' + currentStreak + '</div><div class="profile-stat-label">Sequência</div></div>';
    html += '<div class="profile-stat-item"><span class="profile-stat-icon">🎯</span><div class="profile-stat-value">' + totalCorrect + '</div><div class="profile-stat-label">Acertos</div></div>';
    html += '<div class="profile-stat-item"><span class="profile-stat-icon">📅</span><div class="profile-stat-value">' + totalDays + '</div><div class="profile-stat-label">Dias</div></div>';
    html += '</div>';

    // Activity Graph
    html += '<div class="profile-section">';
    html += '<div class="profile-section-header"><h2>📊 Atividade</h2></div>';
    html += renderActivityGraph();
    html += '</div>';

    // Achievements
    html += '<div class="profile-section" id="profile-achievements-section">';
    html += '<div class="profile-section-header"><h2>🏆 Conquistas</h2></div>';
    html += renderAchievements(currentFilter);
    html += '</div>';

    // Leaderboard
    html += renderLeaderboard();

    return html;
  }

  function bindEvents(container) {
    if (!container) return;

    // Achievement filter chips
    var chips = container.querySelectorAll('.achievement-filter .chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function(e) {
        var chip = e.currentTarget;
        var category = chip.dataset.category;
        currentFilter = category;

        // Update active state
        var siblings = chip.parentElement.querySelectorAll('.chip');
        for (var j = 0; j < siblings.length; j++) {
          siblings[j].classList.remove('active');
        }
        chip.classList.add('active');

        // Re-render achievements section (keep header, replace rest)
        var section = document.getElementById('profile-achievements-section');
        if (section) {
          var header = section.querySelector('.profile-section-header');
          section.innerHTML = header ? header.outerHTML + renderAchievements(category) : renderAchievements(category);
          bindEvents(section);
        }
      });
    }
  }

  return {
    render: render,
    bindEvents: bindEvents,
  };
})();
