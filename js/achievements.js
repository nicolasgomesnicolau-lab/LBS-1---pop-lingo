/* ========================================
   LBS #1 — Achievements System
   ======================================== */

const Achievements = (() => {
  var STORAGE_KEY = 'lbs_achievements';
  var completedCache = null;
  var notifyQueue = [];

  var RANKS = [
    { id: 'bronze', label: '🥉 Bronze', min: 0 },
    { id: 'prata', label: '🥈 Prata', min: 10 },
    { id: 'ouro', label: '🥇 Ouro', min: 20 },
    { id: 'platina', label: '💎 Platina', min: 35 },
    { id: 'diamante', label: '🔷 Diamante', min: 50 },
    { id: 'mestre', label: '👑 Mestre', min: 70 },
    { id: 'lenda', label: '🔥 Lenda', min: 90 },
  ];

  var ALL = [
    // 📚 Vocabulário
    { id: 'first_word', title: 'Primeira Palavra', desc: 'Adicione sua 1ª palavra', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 1; } },
    { id: 'ten_words', title: 'Começando a Coleção', desc: '10 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 10; } },
    { id: 'twentyfive_words', title: 'Colecionador', desc: '25 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 25; } },
    { id: 'fifty_words', title: 'Biblioteca Pessoal', desc: '50 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 50; } },
    { id: 'hundred_words', title: 'Vocabulário Rico', desc: '100 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 100; } },
    { id: 'hundredfifty_words', title: 'Arquivo Linguístico', desc: '150 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 150; } },
    // 🎯 Study
    { id: 'first_correct', title: 'Primeiro Acerto', desc: '1 acerto no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 1; } },
    { id: 'ten_correct', title: 'Bom Começo', desc: '10 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 10; } },
    { id: 'fifty_correct', title: 'Mestre dos Acertos', desc: '50 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 50; } },
    { id: 'hundred_correct', title: 'Memória Afiada', desc: '100 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 100; } },
    { id: 'twohundred_correct', title: 'Especialista', desc: '200 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 200; } },
    // 🔥 Sequência
    { id: 'three_days', title: '3 Dias Seguidos', desc: 'Pratique 3 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 3; } },
    { id: 'seven_days', title: 'Semana Cheia', desc: '7 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 7; } },
    { id: 'fourteen_days', title: 'Persistente', desc: '14 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 14; } },
    { id: 'twentyone_days', title: 'Disciplina', desc: '21 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 21; } },
    { id: 'thirty_days', title: 'Hábito Formado', desc: '30 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 30; } },
    // 🎵 Music
    { id: 'first_music', title: 'Primeira Música', desc: 'Estude 1 música', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 1; } },
    { id: 'five_music', title: 'Melômano', desc: '5 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 5; } },
    { id: 'ten_music', title: 'Playlist Favorita', desc: '10 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 10; } },
    { id: 'twenty_music', title: 'Viciado em Música', desc: '20 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 20; } },
    // 🎬 Movies
    { id: 'first_clip', title: 'Primeira Cena', desc: 'Assista 1 vídeo', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 1; } },
    { id: 'five_clips', title: 'Cinéfilo', desc: '5 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 5; } },
    { id: 'ten_clips', title: 'Maratona', desc: '10 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 10; } },
    { id: 'twenty_clips', title: 'Pipoca Sempre Pronta', desc: '20 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 20; } },
    // ⭐ Especiais
    { id: 'explorer', title: 'Explorador', desc: 'Entre em todas as abas', icon: '⭐', category: 'Especiais', check: function(s) { return s.tabsVisited >= 5; } },
    { id: 'all_in_one_day', title: 'Tudo em Um Dia', desc: 'Use Music, Movies e Study no mesmo dia', icon: '⭐', category: 'Especiais', check: function(s) { return s.allInOneDay; } },
    { id: 'early_bird', title: 'Madrugador', desc: 'Estude antes das 6h', icon: '⭐', category: 'Especiais', check: function(s) { return s.earlyBird; } },
    { id: 'night_owl', title: 'Coruja', desc: 'Estude após meia-noite', icon: '⭐', category: 'Especiais', check: function(s) { return s.nightOwl; } },
    { id: 'weekend_warrior', title: 'Fim de Semana Produtivo', desc: 'Estude sábado e domingo', icon: '⭐', category: 'Especiais', check: function(s) { return s.weekendWarrior; } },
    { id: 'no_skip', title: 'Sem Pular', desc: 'Complete uma música sem pular partes', icon: '⭐', category: 'Especiais', check: function(s) { return s.noSkipSong; } },
    { id: 'no_translate', title: 'Olhos Atentos', desc: 'Termine um vídeo sem abrir traduções', icon: '⭐', category: 'Especiais', check: function(s) { return s.noTranslateVideo; } },
    { id: 'lightning_study', title: 'Estudo Relâmpago', desc: 'Complete uma sessão em menos de 2 min', icon: '⭐', category: 'Especiais', check: function(s) { return s.lightningStudy; } },
    { id: 'perfect_10', title: 'Perfeição', desc: '10 acertos seguidos', icon: '⭐', category: 'Especiais', check: function(s) { return s.bestStreakCorrect >= 10; } },
    { id: 'unstoppable_25', title: 'Imparável', desc: '25 acertos seguidos', icon: '⭐', category: 'Especiais', check: function(s) { return s.bestStreakCorrect >= 25; } },
    { id: 'goal_3days', title: 'Meta Cumprida', desc: 'Complete a meta diária 3 dias seguidos', icon: '⭐', category: 'Especiais', check: function(s) { return s.goalStreak >= 3; } },
    { id: 'goal_7days', title: 'Consistência', desc: 'Complete a meta diária 7 dias seguidos', icon: '⭐', category: 'Especiais', check: function(s) { return s.goalStreak >= 7; } },
    { id: 'month_days', title: 'Primeiro Mês', desc: 'Estude em 30 dias diferentes', icon: '⭐', category: 'Especiais', check: function(s) { return s.totalDaysStudied >= 30; } },
    { id: 'hundred_days', title: 'Veterano', desc: 'Estude em 100 dias diferentes', icon: '⭐', category: 'Especiais', check: function(s) { return s.totalDaysStudied >= 100; } },
    { id: 'curious_100', title: 'Curioso', desc: 'Abra 100 traduções', icon: '⭐', category: 'Especiais', check: function(s) { return s.translationsOpened >= 100; } },
    { id: 'letter_hunter', title: 'Caçador de Letras', desc: 'Aprenda palavras com 10 letras diferentes', icon: '⭐', category: 'Especiais', check: function(s) { return s.letterCount >= 10; } },
    { id: 'first_review', title: 'Primeira Revisão', desc: 'Acerte uma palavra que já errou antes', icon: '⭐', category: 'Especiais', check: function(s) { return s.firstReview; } },
    { id: 'comeback', title: 'De Volta ao Jogo', desc: 'Estude após ficar 7 dias sem entrar', icon: '⭐', category: 'Especiais', check: function(s) { return s.comeback; } },
    { id: 'multimedia_day', title: 'Multimídia', desc: 'Aprenda pela Music e Movies no mesmo dia', icon: '⭐', category: 'Especiais', check: function(s) { return s.multimediaDay; } },
  ];

  function getCompleted() {
    if (completedCache) return completedCache;
    try {
      completedCache = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      completedCache = {};
    }
    return completedCache;
  }

  function saveCompleted(completed) {
    completedCache = completed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    syncToServer(completed);
  }

  function getRank(achievedCount) {
    var rank = RANKS[0];
    for (var i = RANKS.length - 1; i >= 0; i--) {
      if (achievedCount >= RANKS[i].min) { rank = RANKS[i]; break; }
    }
    return rank;
  }

  function checkAll(state) {
    var completed = getCompleted();
    var newOnes = [];

    for (var i = 0; i < ALL.length; i++) {
      var a = ALL[i];
      if (!completed[a.id] && a.check(state)) {
        completed[a.id] = { unlockedAt: new Date().toISOString() };
        newOnes.push(a);
      }
    }

    if (newOnes.length > 0) {
      saveCompleted(completed);
      for (var j = 0; j < newOnes.length; j++) {
        showNotification(newOnes[j]);
      }
    }

    return newOnes;
  }

  function showNotification(achievement) {
    if (typeof App === 'undefined') return;
    var rank = getRank(Object.keys(getCompleted()).length);
    App.showToast(achievement.icon + ' ' + achievement.title + ' — ' + rank.label, 'success', 4000);
  }

  function getState() {
    var words = (typeof Store !== 'undefined' && Store.getWords) ? Store.getWords() : [];
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var today = new Date().toISOString().split('T')[0];
    var todayEntry = stats.history.find(function(h) { return h.date === today; }) || { correct: 0, wrong: 0, wordsStudied: 0 };

    var firstLetters = {};
    for (var wi = 0; wi < words.length; wi++) {
      var fl = words[wi].word.charAt(0).toLowerCase();
      if (fl.match(/[a-z]/)) firstLetters[fl] = true;
    }

    var totalCorrect = 0;
    var totalWrong = 0;
    var totalDaysStudied = stats.history.length;
    var bestStreak = calcBestStreak(stats.history);
    var currentStreak = calcCurrentStreak(stats.history);

    for (var hi = 0; hi < stats.history.length; hi++) {
      totalCorrect += stats.history[hi].correct || 0;
      totalWrong += stats.history[hi].wrong || 0;
    }

    var hour = new Date().getHours();

    // Read achievement tracking data
    var track = (typeof Store !== 'undefined' && Store.getTrack) ? Store.getTrack() : { tabsVisited: [], dailyTabs: {}, clipsWatched: {}, translationsOpened: 0, bestCorrectStreak: 0, lightningStudy: false };
    var musicCount = (typeof Store !== 'undefined' && Store.getMusicHistory) ? Store.getMusicHistory().length : 0;

    // Count unique clips ever watched
    var clipWatchedSet = {};
    var clipDates = track.clipsWatched || {};
    for (var cd in clipDates) {
      var ids = clipDates[cd] || [];
      for (var ci = 0; ci < ids.length; ci++) clipWatchedSet[ids[ci]] = true;
    }
    var clipCount = Object.keys(clipWatchedSet).length;

    // Compute allInOneDay: music + movies + study same day
    var daily = track.dailyTabs || {};
    var allInOneDay = false;
    var multimediaDay = false;
    if (daily[today]) {
      var hasMusic = !!daily[today]['music'];
      var hasMovies = !!daily[today]['movies'];
      var hasStudy = !!daily[today]['study'];
      allInOneDay = hasMusic && hasMovies && hasStudy;
      multimediaDay = hasMusic && hasMovies;
    }

    // weekendWarrior: studied on both Sat and Sun in any weekend
    var weekendWarrior = calcWeekendWarrior(stats.history);

    // goalStreak: consecutive days meeting dailyGoal
    var goalStreak = calcGoalStreak(stats);

    // comeback: studied after 7+ day gap
    var comeback = calcComeback(stats.history);

    // firstReview: check if any word was ever wrong then later correct
    var firstReview = false;
    for (var wri = 0; wri < words.length; wri++) {
      if (words[wri].timesWrong > 0 && words[wri].timesCorrect > 0) {
        firstReview = true;
        break;
      }
    }

    return {
      wordCount: words.length,
      totalCorrect: totalCorrect,
      totalWrong: totalWrong,
      bestStreak: bestStreak,
      currentStreak: currentStreak,
      musicCount: musicCount,
      clipCount: clipCount,
      tabsVisited: track.tabsVisited.length,
      allInOneDay: allInOneDay,
      earlyBird: hour < 6,
      nightOwl: hour >= 0 && hour < 4,
      weekendWarrior: weekendWarrior,
      noSkipSong: false,
      noTranslateVideo: false,
      lightningStudy: track.lightningStudy,
      bestStreakCorrect: track.bestCorrectStreak,
      goalStreak: goalStreak,
      totalDaysStudied: totalDaysStudied,
      translationsOpened: track.translationsOpened,
      letterCount: Object.keys(firstLetters).length,
      firstReview: firstReview,
      comeback: comeback,
      multimediaDay: multimediaDay,
    };
  }

  function calcBestStreak(history) {
    if (!history || history.length === 0) return 0;
    var sorted = history.map(function(h) { return h.date; }).sort();
    var best = 1;
    var current = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i-1]);
      var curr = new Date(sorted[i]);
      var diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }

  function calcCurrentStreak(history) {
    if (!history || history.length === 0) return 0;
    var today = new Date().toISOString().split('T')[0];
    var sorted = history.map(function(h) { return h.date; }).sort().reverse();
    if (sorted[0] !== today && sorted[0] !== getYesterday()) return 0;
    var streak = 1;
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i-1]);
      var curr = new Date(sorted[i]);
      var diff = (prev - curr) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  function getYesterday() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  function calcWeekendWarrior(history) {
    if (!history || history.length < 2) return false;
    var saturdays = {};
    for (var i = 0; i < history.length; i++) {
      var d = new Date(history[i].date);
      var day = d.getDay();
      var weekKey = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      if (day === 6) saturdays[weekKey] = true;
      if (day === 0) {
        // Sunday — check if Saturday of same weekend is present
        var sat = new Date(d);
        sat.setDate(sat.getDate() - 1);
        var satKey = sat.getFullYear() + '-' + sat.getMonth() + '-' + sat.getDate();
        if (saturdays[satKey]) return true;
      }
    }
    // Also check if today is weekend and the other day was studied
    var today = new Date();
    if (today.getDay() === 6) {
      var tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      var tomStr = tomorrow.toISOString().split('T')[0];
      if (history.some(function(h) { return h.date === tomStr; })) return true;
    }
    if (today.getDay() === 0) {
      var yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      var yesStr = yesterday.toISOString().split('T')[0];
      if (history.some(function(h) { return h.date === yesStr; })) return true;
    }
    return false;
  }

  function calcGoalStreak(stats) {
    if (!stats || !stats.history || stats.history.length === 0) return 0;
    var goal = stats.dailyGoal || 10;
    var sorted = stats.history.map(function(h) { return h; }).sort(function(a, b) { return a.date < b.date ? 1 : -1; });
    var streak = 0;
    for (var i = 0; i < sorted.length; i++) {
      if ((sorted[i].correct || 0) >= goal) streak++;
      else break;
    }
    return streak;
  }

  function calcComeback(history) {
    if (!history || history.length < 2) return false;
    var sorted = history.map(function(h) { return h.date; }).sort();
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i-1]);
      var curr = new Date(sorted[i]);
      var diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff >= 7) return true;
    }
    return false;
  }

  function getCompletedList() {
    var completed = getCompleted();
    var list = [];
    for (var i = 0; i < ALL.length; i++) {
      list.push({ achievement: ALL[i], unlocked: !!completed[ALL[i].id], unlockedAt: completed[ALL[i].id] ? completed[ALL[i].id].unlockedAt : null });
    }
    return list;
  }

  function getCount() {
    return Object.keys(getCompleted()).length;
  }

  var serverSyncTimer = null;
  function syncToServer(completed) {
    if (typeof Auth === 'undefined' || !Auth.getToken) return;
    var token = Auth.getToken();
    if (!token) return;
    if (serverSyncTimer) clearTimeout(serverSyncTimer);
    serverSyncTimer = setTimeout(function() {
      fetch('/api/achievements/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, achievements: completed })
      }).catch(function() {});
    }, 1000);
  }

  function fetchFromServer() {
    return new Promise(function(resolve) {
      if (typeof Auth === 'undefined' || !Auth.getToken) { resolve(null); return; }
      var token = Auth.getToken();
      if (!token) { resolve(null); return; }
      fetch('/api/achievements', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function(r) { return r.json(); }).then(function(json) {
        if (json.data) {
          completedCache = json.data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        }
        resolve(json.data);
      }).catch(function() { resolve(null); });
    });
  }

  return {
    ALL: ALL,
    RANKS: RANKS,
    getCompleted: getCompleted,
    getCompletedList: getCompletedList,
    getCount: getCount,
    getRank: getRank,
    getState: getState,
    checkAll: checkAll,
    fetchFromServer: fetchFromServer,
  };
})();
