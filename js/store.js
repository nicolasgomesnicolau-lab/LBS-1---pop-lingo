/* ========================================
   LBS #1 — Data Store (localStorage)
   ======================================== */

const Store = (() => {
  const KEYS = {
    WORDS: 'lbs_words',
    MOVIES: 'lbs_movies',
    MUSIC_HISTORY: 'lbs_music_history',
    STUDY_STATS: 'lbs_study_stats',
    SETTINGS: 'lbs_settings',
    PLAYLIST: 'lbs_playlist',
  };

  // ---- Helpers ----
  function get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  // ---- Words ----
  function getWords() {
    return get(KEYS.WORDS) || [];
  }

  function addWord(word, translation, source = 'manual') {
    const words = getWords();
    // Check duplicate
    const exists = words.find(
      w => w.word.toLowerCase() === word.toLowerCase() && w.translation.toLowerCase() === translation.toLowerCase()
    );
    if (exists) return { success: false, message: 'Palavra já existe na biblioteca!' };

    words.unshift({
      id: generateId(),
      word: word.trim(),
      translation: translation.trim(),
      source,
      createdAt: new Date().toISOString(),
      timesCorrect: 0,
      timesWrong: 0,
    });
    set(KEYS.WORDS, words);
    return { success: true, message: 'Palavra adicionada!' };
  }

  function deleteWord(id) {
    const words = getWords().filter(w => w.id !== id);
    set(KEYS.WORDS, words);
  }

  function updateWordStats(id, correct) {
    const words = getWords();
    const word = words.find(w => w.id === id);
    if (word) {
      if (correct) word.timesCorrect++;
      else word.timesWrong++;
      set(KEYS.WORDS, words);
    }
  }

  function getWordsBySource(source) {
    if (!source || source === 'all') return getWords();
    return getWords().filter(w => w.source === source);
  }

  function searchWords(query) {
    const q = query.toLowerCase();
    return getWords().filter(
      w => w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q)
    );
  }

  // ---- Movies ----
  function getMovies() {
    return get(KEYS.MOVIES) || [];
  }

  function addSeries(name) {
    const movies = getMovies();
    const exists = movies.find(m => m.seriesName.toLowerCase() === name.toLowerCase());
    if (exists) return { success: false, message: 'Série já existe!' };

    movies.push({
      id: generateId(),
      seriesName: name.trim(),
      clips: [],
    });
    set(KEYS.MOVIES, movies);
    return { success: true, message: 'Série criada!' };
  }

  function deleteSeries(id) {
    const movies = getMovies().filter(m => m.id !== id);
    set(KEYS.MOVIES, movies);
  }

  function addClip(seriesId, title, videoUrl, subtitlesText = '', hasSubtitles = true) {
    const movies = getMovies();
    const series = movies.find(m => m.id === seriesId);
    if (!series) return { success: false, message: 'Série não encontrada!' };

    let subtitles = [];
    if (subtitlesText && hasSubtitles) {
      subtitles = parseSubtitles(subtitlesText);
    }

    series.clips.push({
      id: generateId(),
      title: title.trim(),
      videoUrl: videoUrl.trim(),
      subtitles,
      hasSubtitles,
    });
    set(KEYS.MOVIES, movies);
    return { success: true, message: 'Clip adicionado!' };
  }

  function addClipsBatch(seriesId, clips) {
    const movies = getMovies();
    const series = movies.find(m => m.id === seriesId);
    if (!series) return { success: false, message: 'Série não encontrada!' };

    clips.forEach(clip => {
      let subtitles = [];
      if (clip.subtitlesText && clip.hasSubtitles !== false) {
        subtitles = parseSubtitles(clip.subtitlesText);
      }
      series.clips.push({
        id: generateId(),
        title: clip.title.trim(),
        videoUrl: clip.videoUrl.trim(),
        subtitles,
        hasSubtitles: clip.hasSubtitles !== false,
      });
    });
    set(KEYS.MOVIES, movies);
    return { success: true, message: `${clips.length} clips adicionados!` };
  }

  function deleteClip(seriesId, clipId) {
    const movies = getMovies();
    const series = movies.find(m => m.id === seriesId);
    if (series) {
      series.clips = series.clips.filter(c => c.id !== clipId);
      set(KEYS.MOVIES, movies);
    }
  }

  // Format: "00:00 text" or "0:00 text" per line
  function parseSubtitles(text) {
    const lines = text.trim().split('\n');
    return lines
      .map(line => {
        const match = line.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
        if (match) {
          return {
            time: match[1],
            timeSeconds: timeToSeconds(match[1]),
            text: match[2].trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  function timeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  // ---- Music History ----
  function getMusicHistory() {
    return get(KEYS.MUSIC_HISTORY) || [];
  }

  function addMusicHistory(song) {
    const history = getMusicHistory();
    const filtered = history.filter(
      h => !(h.title === song.title && h.artist === song.artist)
    );
    filtered.unshift({
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail || '',
      youtubeId: song.youtubeId || '',
      partsCompleted: song.partsCompleted || [],
      totalParts: song.totalParts || 3,
      addedAt: new Date().toISOString(),
    });
    set(KEYS.MUSIC_HISTORY, filtered.slice(0, 20));
  }

  function updateMusicProgress(title, artist, partIndex) {
    const history = getMusicHistory();
    const song = history.find(h => h.title === title && h.artist === artist);
    if (song && !song.partsCompleted.includes(partIndex)) {
      song.partsCompleted.push(partIndex);
      set(KEYS.MUSIC_HISTORY, history);
    }
  }

  // ---- Study Stats ----
  function getStudyStats() {
    return get(KEYS.STUDY_STATS) || {
      dailyGoal: 10,
      history: [],
    };
  }

  function recordStudyResult(correct) {
    const stats = getStudyStats();
    const today = new Date().toISOString().split('T')[0];
    let todayEntry = stats.history.find(h => h.date === today);

    if (!todayEntry) {
      todayEntry = { date: today, correct: 0, wrong: 0, wordsStudied: 0 };
      stats.history.push(todayEntry);
    }

    if (correct) todayEntry.correct++;
    else todayEntry.wrong++;
    todayEntry.wordsStudied++;

    set(KEYS.STUDY_STATS, stats);
    return todayEntry;
  }

  function getTodayStats() {
    const stats = getStudyStats();
    const today = new Date().toISOString().split('T')[0];
    return stats.history.find(h => h.date === today) || {
      date: today,
      correct: 0,
      wrong: 0,
      wordsStudied: 0,
    };
  }

  // ---- Playlist ----
  function getPlaylist() {
    return get(KEYS.PLAYLIST) || [];
  }

  function addToPlaylist(song) {
    const list = getPlaylist();
    const exists = list.some(s => s.title === song.title && s.artist === song.artist);
    if (exists) return { success: false, message: 'Música já está na playlist!' };
    list.push({ title: song.title, artist: song.artist, videoId: song.videoId });
    set(KEYS.PLAYLIST, list);
    return { success: true, message: 'Adicionada a playlist!' };
  }

  function removeFromPlaylist(title, artist) {
    const list = getPlaylist().filter(s => !(s.title === title && s.artist === artist));
    set(KEYS.PLAYLIST, list);
  }

  function isInPlaylist(title, artist) {
    return getPlaylist().some(s => s.title === title && s.artist === artist);
  }

  // ---- Settings ----
  function getSettings() {
    return get(KEYS.SETTINGS) || {
      studyDirection: 'en-pt',
    };
  }

  function updateSettings(updates) {
    const settings = getSettings();
    Object.assign(settings, updates);
    set(KEYS.SETTINGS, settings);
  }

  function getAggregatedStats(periodDays) {
    const stats = getStudyStats();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (periodDays || 7));
    const recent = stats.history.filter(h => new Date(h.date) >= cutoff);
    const totalCorrect = recent.reduce((sum, h) => sum + (h.correct || 0), 0);
    const totalWrong = recent.reduce((sum, h) => sum + (h.wrong || 0), 0);
    const totalWords = recent.reduce((sum, h) => sum + (h.wordsStudied || 0), 0);
    const daysStudied = recent.length;
    const goalsMet = recent.filter(h => (h.correct || 0) >= (stats.dailyGoal || 10)).length;
    return {
      freq: daysStudied,
      words: totalWords,
      correct: totalCorrect,
      wrong: totalWrong,
      goalMet: goalsMet,
    };
  }

  // ---- Public API ----
  return {
    getWords,
    addWord,
    deleteWord,
    updateWordStats,
    getWordsBySource,
    searchWords,

    getMovies,
    addSeries,
    deleteSeries,
    addClip,
    addClipsBatch,
    deleteClip,
    parseSubtitles,

    getMusicHistory,
    addMusicHistory,
    updateMusicProgress,

    getStudyStats,
    recordStudyResult,
    getTodayStats,

    getPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    isInPlaylist,

    getSettings,
    updateSettings,
    getAggregatedStats,
    generateId,
  };
})();