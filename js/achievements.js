/* ========================================
   LBS #1 — Achievements System
   ======================================== */

const Achievements = (() => {
  var STORAGE_KEY = 'lbs_achievements';
  var completedCache = null;
  var notifyQueue = [];

  var RANKS = [
    { id: 'bronze', label: '🥉 Bronze', min: 0 },
    { id: 'prata', label: '🥈 Prata', min: 8 },
    { id: 'ouro', label: '🥇 Ouro', min: 18 },
    { id: 'platina', label: '💎 Platina', min: 30 },
    { id: 'diamante', label: '🔷 Diamante', min: 45 },
    { id: 'mestre', label: '👑 Mestre', min: 55 },
    { id: 'lenda', label: '🔥 Lenda', min: 74 },
  ];

  var ALL = [
    // 📚 Vocabulário
    { id: 'first_word', title: 'Primeira Palavra', desc: 'Adicione sua 1ª palavra', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 1; } },
    { id: 'ten_words', title: 'Começando a Coleção', desc: '10 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 10; } },
    { id: 'twentyfive_words', title: 'Colecionador', desc: '25 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 25; } },
    { id: 'fifty_words', title: 'Biblioteca Pessoal', desc: '50 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 50; } },
    { id: 'hundred_words', title: 'Vocabulário Rico', desc: '100 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 100; } },
    { id: 'hundredfifty_words', title: 'Arquivo Linguístico', desc: '150 palavras salvas', icon: '📚', category: 'Vocabulário', check: function(s) { return s.wordCount >= 150; } },
    // 📚 Biblioteca
    { id: 'organizado', title: 'Organizado', desc: 'Revise palavras adicionadas há mais de 7 dias', icon: '📚', category: 'Biblioteca', check: function(s) { return s.oldWordsReviewed >= 1; } },
    { id: 'tesouro_escondido', title: 'Tesouro Escondido', desc: 'Revise uma palavra esquecida há 30 dias', icon: '📚', category: 'Biblioteca', check: function(s) { return s.oldWordsReviewed30 >= 1; } },
    { id: 'guardiao_palavras', title: 'Guardião das Palavras', desc: 'Não remova nenhuma palavra por 30 dias', icon: '📚', category: 'Biblioteca', check: function(s) { return s.noDeletion30Days; } },
    { id: 'arquivo_historico', title: 'Arquivo Histórico', desc: 'Tenha palavras salvas em 10 datas diferentes', icon: '📚', category: 'Biblioteca', check: function(s) { return s.wordsOn10Dates; } },
    // 🎯 Study
    { id: 'first_correct', title: 'Primeiro Acerto', desc: '1 acerto no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 1; } },
    { id: 'ten_correct', title: 'Bom Começo', desc: '10 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 10; } },
    { id: 'fifty_correct', title: 'Mestre dos Acertos', desc: '50 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 50; } },
    { id: 'hundred_correct', title: 'Memória Afiada', desc: '100 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 100; } },
    { id: 'twohundred_correct', title: 'Especialista', desc: '200 acertos no Study', icon: '🎯', category: 'Study', check: function(s) { return s.totalCorrect >= 200; } },
    { id: 'virada_jogo', title: 'Virada de Jogo', desc: 'Acerte uma palavra após errá-la 3 vezes', icon: '🎯', category: 'Study', check: function(s) { return s.comebackWord >= 1; } },
    { id: 'recuperacao', title: 'Recuperação', desc: 'Acerte 5 palavras que já errou no passado', icon: '🎯', category: 'Study', check: function(s) { return s.firstReviewCount >= 5; } },
    { id: 'foco_total', title: 'Foco Total', desc: 'Complete 3 sessões seguidas', icon: '🎯', category: 'Study', check: function(s) { return s.bestStreak >= 3; } },
    { id: 'aprendizado_limpo', title: 'Aprendizado Limpo', desc: 'Complete uma sessão sem nenhum erro', icon: '🎯', category: 'Study', check: function(s) { return s.cleanSession; } },
    // 🔥 Sequência
    { id: 'three_days', title: '3 Dias Seguidos', desc: 'Pratique 3 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 3; } },
    { id: 'seven_days', title: 'Semana Cheia', desc: '7 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 7; } },
    { id: 'fourteen_days', title: 'Persistente', desc: '14 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 14; } },
    { id: 'twentyone_days', title: 'Disciplina', desc: '21 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 21; } },
    { id: 'thirty_days', title: 'Hábito Formado', desc: '30 dias seguidos', icon: '🔥', category: 'Sequência', check: function(s) { return s.bestStreak >= 30; } },
    // 🔥 Consistência
    { id: 'nem_um_dia_perdido', title: 'Nem Um Dia Perdido', desc: 'Complete a meta por 10 dias seguidos', icon: '🔥', category: 'Consistência', check: function(s) { return s.goalStreak >= 10; } },
    { id: 'presenca_garantida', title: 'Presença Garantida', desc: 'Entre no app 15 dias diferentes no mês', icon: '🔥', category: 'Consistência', check: function(s) { return s.daysInMonth >= 15; } },
    // 🎵 Music
    { id: 'first_music', title: 'Primeira Música', desc: 'Estude 1 música', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 1; } },
    { id: 'five_music', title: 'Melômano', desc: '5 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 5; } },
    { id: 'ten_music', title: 'Playlist Favorita', desc: '10 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 10; } },
    { id: 'twenty_music', title: 'Viciado em Música', desc: '20 músicas estudadas', icon: '🎵', category: 'Music', check: function(s) { return s.musicCount >= 20; } },
    { id: 'refrao_cabeca', title: 'Refrão na Cabeça', desc: 'Complete a mesma música 3 vezes', icon: '🎵', category: 'Music', check: function(s) { return s.songReplay3; } },
    { id: 'hit_dia', title: 'Hit do Dia', desc: 'Estude 3 músicas no mesmo dia', icon: '🎵', category: 'Music', check: function(s) { return s.dailySongsCount >= 3; } },
    { id: 'cantor_chuveiro', title: 'Cantor de Chuveiro', desc: 'Complete um karaokê inteiro', icon: '🎵', category: 'Music', check: function(s) { return s.karaokeCompleted; } },
    { id: 'maratona_musical', title: 'Maratona Musical', desc: 'Estude músicas por 30 minutos em um dia', icon: '🎵', category: 'Music', check: function(s) { return s.musicMinutes30; } },
    { id: 'descobridor_hits', title: 'Descobridor de Hits', desc: 'Estude 10 artistas diferentes', icon: '🎵', category: 'Music', check: function(s) { return s.uniqueArtists >= 10; } },
    { id: 'estudante_musical', title: 'Estudante Musical', desc: 'Complete o estudo de 1 música', icon: '🎵', category: 'Music', check: function(s) { return s.studiedSongsCount >= 1; } },
    { id: 'dedicado_musical', title: 'Dedicado Musical', desc: 'Complete o estudo de 5 músicas', icon: '🎵', category: 'Music', check: function(s) { return s.studiedSongsCount >= 5; } },
    { id: 'maestro', title: 'Maestro', desc: 'Complete o estudo de 10 músicas', icon: '🎵', category: 'Music', check: function(s) { return s.studiedSongsCount >= 10; } },
    { id: 'perfeicao_musical', title: 'Perfeição Musical', desc: 'Acerte 100% em 3 músicas diferentes', icon: '🎵', category: 'Music', check: function(s) { return s.perfectSongCount >= 3; } },
    // 🎬 Movies
    { id: 'first_clip', title: 'Primeira Cena', desc: 'Assista 1 vídeo', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 1; } },
    { id: 'five_clips', title: 'Cinéfilo', desc: '5 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 5; } },
    { id: 'ten_clips', title: 'Maratona', desc: '10 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 10; } },
    { id: 'twenty_clips', title: 'Pipoca Sempre Pronta', desc: '20 vídeos assistidos', icon: '🎬', category: 'Movies', check: function(s) { return s.clipCount >= 20; } },
    { id: 'sessao_tarde', title: 'Sessão da Tarde', desc: 'Assista 3 vídeos no mesmo dia', icon: '🎬', category: 'Movies', check: function(s) { return s.dailyClipCount >= 3; } },
    { id: 'diretor_favorito', title: 'Diretor Favorito', desc: 'Assista 5 vídeos completos na mesma semana', icon: '🎬', category: 'Movies', check: function(s) { return s.weeklyClipCount >= 5; } },
    { id: 'legenda_viva', title: 'Legenda Viva', desc: 'Aprenda 20 palavras através dos vídeos', icon: '🎬', category: 'Movies', check: function(s) { return s.wordsFromMovies >= 20; } },
    // ⭐ Especiais
    { id: 'explorer', title: 'Explorador', desc: 'Entre em todas as abas', icon: '⭐', category: 'Especiais', check: function(s) { return s.tabsVisited >= 6; } },
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
    { id: 'primeira_descoberta', title: 'Primeira Descoberta', desc: 'Revele sua primeira tradução', icon: '⭐', category: 'Especiais', check: function(s) { return s.translationsOpened >= 1; } },
    { id: 'cacador_expressoes', title: 'Caçador de Expressões', desc: 'Salve uma frase completa', icon: '⭐', category: 'Especiais', check: function(s) { return s.phrasesSaved >= 1; } },
    { id: 'no_embalo', title: 'No Embalo', desc: 'Faça Music e depois Study sem sair do app', icon: '⭐', category: 'Especiais', check: function(s) { return s.musicThenStudy; } },
    { id: 'mente_curiosa', title: 'Mente Curiosa', desc: 'Abra 10 palavras novas em um único dia', icon: '⭐', category: 'Especiais', check: function(s) { return s.dailyTranslations >= 10; } },
    { id: 'dia_perfeito', title: 'Dia Perfeito', desc: 'Complete a meta sem errar nenhuma questão', icon: '⭐', category: 'Especiais', check: function(s) { return s.perfectDay; } },
    { id: 'colecao_variada', title: 'Coleção Variada', desc: 'Salve palavras de 15 letras diferentes', icon: '⭐', category: 'Especiais', check: function(s) { return s.letterCount >= 15; } },
    { id: 'explorador_musical', title: 'Explorador Musical', desc: 'Estude músicas de 5 artistas diferentes', icon: '⭐', category: 'Especiais', check: function(s) { return s.uniqueArtists >= 5; } },
    { id: 'maratonista', title: 'Maratonista', desc: 'Passe 1 hora estudando em um único dia', icon: '⭐', category: 'Especiais', check: function(s) { return s.studyHourToday; } },
    // 🏆 Secretas
    { id: 'insomnia_linguistica', title: 'Insônia Linguística', desc: 'Estude entre 2h e 4h da manhã', icon: '🏆', category: 'Secretas', check: function(s) { return s.insomniaStudy; } },
    { id: 'velocista', title: 'Velocista', desc: 'Complete uma atividade em menos de 30 segundos', icon: '🏆', category: 'Secretas', check: function(s) { return s.lightning30s; } },
    { id: 'retorno_triunfal', title: 'Retorno Triunfal', desc: 'Volte após 30 dias sem entrar', icon: '🏆', category: 'Secretas', check: function(s) { return s.comeback30; } },
    { id: 'incansavel', title: 'O Incansável', desc: 'Estude 3 horas acumuladas em uma semana', icon: '🏆', category: 'Secretas', check: function(s) { return s.study3HoursWeek; } },
    { id: 'lenda_urbana', title: 'Lenda Urbana', desc: 'Desbloqueie 25 conquistas', icon: '🏆', category: 'Secretas', check: function(s) { return s.totalAchieved >= 25; } },
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
    var musicHistory = (typeof Store !== 'undefined' && Store.getMusicHistory) ? Store.getMusicHistory() : [];
    var stats = (typeof Store !== 'undefined' && Store.getStudyStats) ? Store.getStudyStats() : { history: [] };
    var today = new Date().toISOString().split('T')[0];
    var todayEntry = stats.history.find(function(h) { return h.date === today; }) || { correct: 0, wrong: 0, wordsStudied: 0 };
    var hour = new Date().getHours();

    // First letters
    var firstLetters = {};
    for (var wi = 0; wi < words.length; wi++) {
      var fl = words[wi].word.charAt(0).toLowerCase();
      if (fl.match(/[a-z]/)) firstLetters[fl] = true;
    }

    // Totals from history
    var totalCorrect = 0, totalWrong = 0;
    for (var hi = 0; hi < stats.history.length; hi++) {
      totalCorrect += stats.history[hi].correct || 0;
      totalWrong += stats.history[hi].wrong || 0;
    }
    var totalDaysStudied = stats.history.length;
    var bestStreak = calcBestStreak(stats.history);
    var currentStreak = calcCurrentStreak(stats.history);

    // Tracking data
    var track = (typeof Store !== 'undefined' && Store.getTrack) ? Store.getTrack() : {};
    // Ensure defaults
    if (!track.tabsVisited) track.tabsVisited = [];
    if (!track.dailyTabs) track.dailyTabs = {};
    if (!track.clipsWatched) track.clipsWatched = {};
    if (!track.songPlayCount) track.songPlayCount = {};
    if (!track.dailySongs) track.dailySongs = {};
    if (!track.dailyStudyTimeMs) track.dailyStudyTimeMs = {};
    if (!track.dailyTranslations) track.dailyTranslations = {};

    var musicCount = musicHistory.length;

    // Clip count — unique clips ever
    var clipWatchedSet = {};
    var clipDates = track.clipsWatched || {};
    for (var cd in clipDates) {
      var ids = clipDates[cd] || [];
      for (var ci = 0; ci < ids.length; ci++) clipWatchedSet[ids[ci]] = true;
    }
    var clipCount = Object.keys(clipWatchedSet).length;

    // Daily clips
    var dailyClipIds = clipDates[today] || [];
    var dailyClipCount = dailyClipIds.length;

    // Weekly clips — count unique clips in last 7 days
    var weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    var weeklyClipSet = {};
    for (var cd2 in clipDates) {
      if (cd2 >= weekAgo.toISOString().split('T')[0]) {
        for (var ci2 = 0; ci2 < (clipDates[cd2] || []).length; ci2++) {
          weeklyClipSet[clipDates[cd2][ci2]] = true;
        }
      }
    }
    var weeklyClipCount = Object.keys(weeklyClipSet).length;

    // Daily tabs (allInOneDay, multimediaDay)
    var daily = track.dailyTabs || {};
    var allInOneDay = false, multimediaDay = false;
    if (daily[today]) {
      var hasMusic = !!daily[today]['music'];
      var hasMovies = !!daily[today]['movies'];
      var hasStudy = !!daily[today]['study'];
      allInOneDay = hasMusic && hasMovies && hasStudy;
      multimediaDay = hasMusic && hasMovies;
    }

    // Words from movies source
    var wordsFromMovies = 0, phrasesSaved = 0;
    for (var w = 0; w < words.length; w++) {
      if (words[w].source === 'movies') wordsFromMovies++;
      if ((words[w].word || '').indexOf(' ') >= 0) phrasesSaved++;
    }

    // Unique word dates (Arquivo Histórico)
    var wordDates = {};
    for (var w2 = 0; w2 < words.length; w2++) {
      var cd3 = (words[w2].createdAt || '').split('T')[0];
      if (cd3) wordDates[cd3] = true;
    }
    var wordsOn10Dates = Object.keys(wordDates).length >= 10;

    // Old words reviewed (words added >7d ago with timesCorrect > 0)
    var oldWordsReviewed = 0, oldWordsReviewed30 = 0;
    var sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    var thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    for (var w3 = 0; w3 < words.length; w3++) {
      var created = new Date(words[w3].createdAt || 0);
      if (created < sevenDaysAgo && (words[w3].timesCorrect || 0) > 0) oldWordsReviewed++;
      if (created < thirtyDaysAgo && (words[w3].timesCorrect || 0) > 0) oldWordsReviewed30++;
    }

    // firstReview + comebackWord + firstReviewCount (words wrong then later correct)
    var firstReview = false, comebackWord = 0, firstReviewCount = 0;
    for (var w4 = 0; w4 < words.length; w4++) {
      if (words[w4].timesWrong > 0 && words[w4].timesCorrect > 0) {
        firstReview = true;
        firstReviewCount++;
        if (words[w4].timesWrong >= 3) comebackWord++;
      }
    }

    // Song replay (same song 3x)
    var songPlayCount = track.songPlayCount || {};
    var songReplay3 = false;
    for (var sp in songPlayCount) { if (songPlayCount[sp] >= 3) { songReplay3 = true; break; } }

    // Daily songs
    var dailySongs = track.dailySongs || {};
    var dailySongsCount = (dailySongs[today] || []).length;

    // Unique artists
    var artistSet = {};
    for (var mi = 0; mi < musicHistory.length; mi++) {
      if (musicHistory[mi].artist) artistSet[musicHistory[mi].artist] = true;
    }
    var uniqueArtists = Object.keys(artistSet).length;

    // Song study results (from completing the lyric study session)
    var songResults = (typeof Store !== 'undefined' && Store.getSongStudyResults) ? Store.getSongStudyResults() : {};
    var studiedSongsCount = 0;
    var perfectSongCount = 0;
    for (var sr in songResults) {
      if (songResults[sr] && songResults[sr].total > 0) {
        studiedSongsCount++;
        if (songResults[sr].score >= 100) perfectSongCount++;
      }
    }

    // Study time today
    var dailyStudyMs = track.dailyStudyTimeMs || {};
    var studyMsToday = dailyStudyMs[today] || 0;
    var studyHourToday = studyMsToday >= 3600000; // 1 hour

    // Weekly study time
    var weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    var weekMs = 0;
    for (var ds in dailyStudyMs) {
      if (ds >= weekStart.toISOString().split('T')[0]) weekMs += dailyStudyMs[ds];
    }
    var study3HoursWeek = weekMs >= 10800000; // 3 hours

    // Clean session (today, no errors)
    var cleanSession = todayEntry.wrong === 0 && todayEntry.wordsStudied > 0;
    var perfectDay = todayEntry.wrong === 0 && (todayEntry.correct || 0) >= (stats.dailyGoal || 10);

    // goalStreak
    var goalStreak = calcGoalStreak(stats);

    // comeback 7d + 30d
    var comeback = calcComeback(stats.history, 7);
    var comeback30 = calcComeback(stats.history, 30);

    // noDeletion30Days — check lastDeletionDate from track
    var lastDeletion = track.lastDeletionDate;
    var noDeletion30Days = !lastDeletion || ((Date.now() - new Date(lastDeletion).getTime()) > 30 * 24 * 60 * 60 * 1000);

    // Daily translations
    var dailyTrans = track.dailyTranslations || {};
    var dailyTranslationsCount = dailyTrans[today] || 0;

    // Days in month
    var thisMonth = today.substring(0, 7);
    var daysInMonth = 0;
    for (var hi2 = 0; hi2 < stats.history.length; hi2++) {
      if ((stats.history[hi2].date || '').substring(0, 7) === thisMonth) daysInMonth++;
    }

    // Music minutes 30
    // Approximate: count music session time from dailyStudyTimeMs that was music
    // For now, use a simpler check: musicCount > 0 and studyTime today > 30 min of music
    var musicMinutes30 = track.musicMinutesToday || false;

    // Karaoke completed
    var karaokeCompleted = track.karaokeCompleted || false;

    // Music then study (no_embalo)
    var musicThenStudy = track.musicThenStudy || false;

    // lightning30s (velocista)
    var lightning30s = track.lightning30s || false;

    // insomnia (2h-4h)
    var insomniaStudy = hour >= 2 && hour < 4;

    return {
      wordCount: words.length,
      totalCorrect: totalCorrect,
      totalWrong: totalWrong,
      bestStreak: bestStreak,
      currentStreak: currentStreak,
      musicCount: musicCount,
      clipCount: clipCount,
      tabsVisited: track.tabsVisited.length,
      dailyClipCount: dailyClipCount,
      weeklyClipCount: weeklyClipCount,
      allInOneDay: allInOneDay,
      multimediaDay: multimediaDay,
      earlyBird: hour < 6,
      nightOwl: hour >= 0 && hour < 4,
      insomniaStudy: insomniaStudy,
      weekendWarrior: calcWeekendWarrior(stats.history),
      noSkipSong: false,
      noTranslateVideo: false,
      lightningStudy: track.lightningStudy || false,
      lightning30s: lightning30s,
      bestStreakCorrect: track.bestCorrectStreak || 0,
      goalStreak: goalStreak,
      totalDaysStudied: totalDaysStudied,
      translationsOpened: track.translationsOpened || 0,
      dailyTranslations: dailyTranslationsCount,
      letterCount: Object.keys(firstLetters).length,
      firstReview: firstReview,
      firstReviewCount: firstReviewCount,
      comebackWord: comebackWord,
      comeback: comeback,
      comeback30: comeback30,
      cleanSession: cleanSession,
      perfectDay: perfectDay,
      wordsFromMovies: wordsFromMovies,
      phrasesSaved: phrasesSaved,
      wordsOn10Dates: wordsOn10Dates,
      oldWordsReviewed: oldWordsReviewed,
      oldWordsReviewed30: oldWordsReviewed30,
      noDeletion30Days: noDeletion30Days,
      songReplay3: songReplay3,
      dailySongsCount: dailySongsCount,
      uniqueArtists: uniqueArtists,
      musicMinutes30: musicMinutes30,
      karaokeCompleted: karaokeCompleted,
      studiedSongsCount: studiedSongsCount,
      perfectSongCount: perfectSongCount,
      studyHourToday: studyHourToday,
      study3HoursWeek: study3HoursWeek,
      daysInMonth: daysInMonth,
      musicThenStudy: musicThenStudy,
      totalAchieved: Object.keys(getCompleted()).length,
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

  function calcComeback(history, minDays) {
    if (!history || history.length < 2) return false;
    minDays = minDays || 7;
    var sorted = history.map(function(h) { return h.date; }).sort();
    for (var i = 1; i < sorted.length; i++) {
      var prev = new Date(sorted[i-1]);
      var curr = new Date(sorted[i]);
      var diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff >= minDays) return true;
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
