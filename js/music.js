/* ========================================
   LBS #1 — Music Tab
   Karaoke + Player simples
   ======================================== */

const MusicTab = (() => {
  var view = 'list';
  var searchQuery = '';
  var searchResults = [];
  var currentSong = null;
  var isPlaying = false;
  var playerTime = 0;
  var playerDuration = 240;
  var ytPolling = null;
  var _currentVideoId = null;
  var _pausedAt = 0;
  var _playStartTime = 0;

  var karaokeStatus = 'idle';
  var karaokeData = [];
  var heardMode = false;
  var currentPhraseIdx = -1;
  var karaokeErrorMsg = '';
  var spotifySearchAll = false;

  function youtubeSearch(query) {
    return fetch('/api/youtube-search?q=' + encodeURIComponent(query))
      .then(function (r) { return r.json(); })
      .then(function (items) { return items || []; })
      .catch(function () { return []; });
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function extractVideoId(str) {
    if (!str) return null;
    str = str.trim();
    var m;
    m = str.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    return null;
  }

  var SONGS = [
    { title: "Shape of You", artist: "Ed Sheeran", videoId: "JGwWNGJdvx8" },
    { title: "Perfect", artist: "Ed Sheeran", videoId: "2Vv-BfVoq4g" },
    { title: "Thinking Out Loud", artist: "Ed Sheeran", videoId: "lp-EO5I60KA" },
    { title: "Someone Like You", artist: "Adele", videoId: "hLQl3WQQoQ0" },
    { title: "Rolling in the Deep", artist: "Adele", videoId: "rYEDA3JcQqw" },
    { title: "Hello", artist: "Adele", videoId: "YQHsXMglC9A" },
    { title: "Easy on Me", artist: "Adele", videoId: "U3ASj1L6_sY" },
    { title: "Bohemian Rhapsody", artist: "Queen", videoId: "fJ9rUzIMcZQ" },
    { title: "We Will Rock You", artist: "Queen", videoId: "-tJYN-eG1zk" },
    { title: "Don't Stop Me Now", artist: "Queen", videoId: "HgzGwKwLmgM" },
    { title: "Yesterday", artist: "The Beatles", videoId: "NrgmdOz227I" },
    { title: "Let It Be", artist: "The Beatles", videoId: "QDYfEBY9NM4" },
    { title: "Hey Jude", artist: "The Beatles", videoId: "A_MjCqQoLLA" },
    { title: "Imagine", artist: "John Lennon", videoId: "YkgkThdzX-8" },
    { title: "Hotel California", artist: "Eagles", videoId: "EqPtz5qN7HM" },
    { title: "Wonderwall", artist: "Oasis", videoId: "6hzrDeceEKc" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", videoId: "hTWKbfoikeg" },
    { title: "Billie Jean", artist: "Michael Jackson", videoId: "Zi_XLOBDo_Y" },
    { title: "Thriller", artist: "Michael Jackson", videoId: "sOnqjkJTMaA" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", videoId: "1w7OgIMMRc4" },
    { title: "Lose Yourself", artist: "Eminem", videoId: "_Yhyp-_hX2s" },
    { title: "Umbrella", artist: "Rihanna", videoId: "CvBfHwUxHIk" },
    { title: "Counting Stars", artist: "OneRepublic", videoId: "hT_nvWreIhg" },
    { title: "Shake It Off", artist: "Taylor Swift", videoId: "nfWlot6h_JM" },
    { title: "Blank Space", artist: "Taylor Swift", videoId: "e-ORhEE9VVg" },
    { title: "Love Story", artist: "Taylor Swift", videoId: "8xg3vE8Ie_E" },
    { title: "All of Me", artist: "John Legend", videoId: "450p7goxZqg" },
    { title: "Happy", artist: "Pharrell Williams", videoId: "ZbZSe6N_BXs" },
    { title: "Viva La Vida", artist: "Coldplay", videoId: "dvgZkm1xWPE" },
    { title: "Yellow", artist: "Coldplay", videoId: "yKNxeF4KMsY" },
    { title: "The Scientist", artist: "Coldplay", videoId: "RB-RcX5DS5A" },
    { title: "Fix You", artist: "Coldplay", videoId: "k4V3Mo61fJM" },
    { title: "Clocks", artist: "Coldplay", videoId: "d020hcWA_Wg" },
    { title: "Paradise", artist: "Coldplay", videoId: "1G4isv_Fylg" },
    { title: "Every Breath You Take", artist: "The Police", videoId: "nA2Se_VY18c" },
    { title: "With or Without You", artist: "U2", videoId: "ujNeHIo7oTE" },
    { title: "Nothing Else Matters", artist: "Metallica", videoId: "tAGnKpE4NJA" },
    { title: "Enter Sandman", artist: "Metallica", videoId: "CD-E-LDc384" },
    { title: "Paint It Black", artist: "The Rolling Stones", videoId: "O4irXQhgMqg" },
    { title: "Don't Stop Believin'", artist: "Journey", videoId: "1k8craCGpgs" },
    { title: "Eye of the Tiger", artist: "Survivor", videoId: "btPJPFnesV4" },
    { title: "I Will Always Love You", artist: "Whitney Houston", videoId: "3JWTaaS7LdU" },
    { title: "Blinding Lights", artist: "The Weeknd", videoId: "4NRXx6U8ABQ" },
    { title: "Save Your Tears", artist: "The Weeknd", videoId: "XXYlFuWEuKI" },
    { title: "Levitating", artist: "Dua Lipa", videoId: "TUVcZfQe-Kw" },
    { title: "Don't Start Now", artist: "Dua Lipa", videoId: "oygrmJFKYZY" },
    { title: "Watermelon Sugar", artist: "Harry Styles", videoId: "E07s5ZYygMg" },
    { title: "As It Was", artist: "Harry Styles", videoId: "H5v3kku4y6Q" },
    { title: "Bad Guy", artist: "Billie Eilish", videoId: "DyDfgMOUjCI" },
    { title: "Drivers License", artist: "Olivia Rodrigo", videoId: "ZmDBbnmKpqQ" },
    { title: "Stay", artist: "Justin Bieber & The Kid LAROI", videoId: "kTJczUoc26U" },
    { title: "Shallow", artist: "Lady Gaga & Bradley Cooper", videoId: "bo_efYhYU2A" },
    { title: "Bad Romance", artist: "Lady Gaga", videoId: "qrO4YZeyl0I" },
    { title: "Halo", artist: "Beyonce", videoId: "bnVUHWCynig" },
    { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", videoId: "OPf0YbXqDm0" },
    { title: "Just the Way You Are", artist: "Bruno Mars", videoId: "LjhCEhWiKXk" },
    { title: "Roar", artist: "Katy Perry", videoId: "CevxZvSJLk8" },
    { title: "Firework", artist: "Katy Perry", videoId: "QGJuMBdaqIw" },
    { title: "Flowers", artist: "Miley Cyrus", videoId: "G7KNmW9a75Y" },
    { title: "Wrecking Ball", artist: "Miley Cyrus", videoId: "My2FRPA3Gf8" },
    { title: "Radioactive", artist: "Imagine Dragons", videoId: "ktvTqknDobU" },
    { title: "Believer", artist: "Imagine Dragons", videoId: "7wtfhZwyrcc" },
    { title: "Thunder", artist: "Imagine Dragons", videoId: "fKopy74weus" },
    { title: "Demons", artist: "Imagine Dragons", videoId: "mWRsgZuwf_8" },
    { title: "Something Just Like This", artist: "The Chainsmokers & Coldplay", videoId: "FM7mfYFhN5E" },
    { title: "Closer", artist: "The Chainsmokers ft. Halsey", videoId: "PT2_F-1esPk" },
    { title: "Sugar", artist: "Maroon 5", videoId: "09R8_2nJtjg" },
    { title: "Memories", artist: "Maroon 5", videoId: "SlPhMPnCR58" },
    { title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", videoId: "RgKAFK5djSk" },
    { title: "Can't Stop the Feeling", artist: "Justin Timberlake", videoId: "ru0K8uYEZWw" },
    { title: "Mirrors", artist: "Justin Timberlake", videoId: "uuZE_IRwLNI" },
    { title: "Love Yourself", artist: "Justin Bieber", videoId: "oyEuk8j8imI" },
    { title: "Sorry", artist: "Justin Bieber", videoId: "fRh_vgS2dFE" },
    { title: "Stressed Out", artist: "Twenty One Pilots", videoId: "pXRviuL6vMY" },
    { title: "Heathens", artist: "Twenty One Pilots", videoId: "UprcpdwuwCg" },
    { title: "Dancing Queen", artist: "ABBA", videoId: "xFrGuyw1V8s" },
    { title: "Like a Virgin", artist: "Madonna", videoId: "s__rX_WL100" },
    { title: "Born in the USA", artist: "Bruce Springsteen", videoId: "4z-Cb6kR_iY" },
    { title: "We Don't Talk Anymore", artist: "Charlie Puth ft. Selena Gomez", videoId: "3AtDnEC4zak" },
    { title: "Treat You Better", artist: "Shawn Mendes", videoId: "lY2JH1ACtRg" },
    { title: "Stitches", artist: "Shawn Mendes", videoId: "Vbfpdl0U6W0" },
    { title: "Call Me Maybe", artist: "Carly Rae Jepsen", videoId: "fWNaR-rxAic" },
    { title: "Take On Me", artist: "a-ha", videoId: "djV11Xbc914" },
    { title: "Africa", artist: "Toto", videoId: "FTQbiNvZqaY" },
    { title: "Careless Whisper", artist: "George Michael", videoId: "izGwDsrQ1eQ" },
    { title: "Dance Monkey", artist: "Tones and I", videoId: "q0hyYWKXF0Q" },
    { title: "Heat Waves", artist: "Glass Animals", videoId: "mRD0-GxqHVo" },
    { title: "I Want It That Way", artist: "Backstreet Boys", videoId: "4fndeDfaWCg" },
    { title: "Wannabe", artist: "Spice Girls", videoId: "gJLIiF15wjQ" },
    { title: "Toxic", artist: "Britney Spears", videoId: "LOZuxwVk7TU" },
    { title: "Stand By Me", artist: "Ben E King", videoId: "hwZNL7QVJjE" },
    { title: "What a Wonderful World", artist: "Louis Armstrong", videoId: "A3yCcXgbKrE" },
    { title: "Purple Rain", artist: "Prince", videoId: "TvnYmWpD_T8" },
    { title: "Livin' on a Prayer", artist: "Bon Jovi", videoId: "lDK9QqIzhwk" },
    { title: "Sweet Dreams", artist: "Eurythmics", videoId: "qeMFqkcPYcg" },
    { title: "Single Ladies", artist: "Beyonce", videoId: "4m1EFMoRFvY" },
    { title: "If I Ain't Got You", artist: "Alicia Keys", videoId: "Ju8Hr50CxKc" },
    { title: "No One", artist: "Alicia Keys", videoId: "rywUS-oh5vc" },
    { title: "Empire State of Mind", artist: "Jay-Z ft. Alicia Keys", videoId: "vk6014HuxcE" },
    { title: "Cheap Thrills", artist: "Sia", videoId: "nYh-n7EOtMA" },
    { title: "Chandelier", artist: "Sia", videoId: "2vjPBrBU-TM" },
    { title: "Despacito", artist: "Luis Fonsi", videoId: "kJQP7kiw5Fk" },
    { title: "Havana", artist: "Camila Cabello", videoId: "HCjBFDNxEFY" },
    { title: "Senorita", artist: "Shawn Mendes", videoId: "Pkh8UtuejGw" },
    { title: "Let Her Go", artist: "Passenger", videoId: "RBumgq5yVrA" },
    { title: "Riptide", artist: "Vance Joy", videoId: "uJ_1HMAGb4k" },
    { title: "Hallelujah", artist: "Jeff Buckley", videoId: "y8AWFf7EAc4" },
    { title: "Creep", artist: "Radiohead", videoId: "XFkzRNyygfk" },
    { title: "Mr Brightside", artist: "The Killers", videoId: "gGdGFtwCNBE" },
    { title: "Seven Nation Army", artist: "The White Stripes", videoId: "0J2QdDbelmY" },
    { title: "Zombie", artist: "The Cranberries", videoId: "6Ejga4kJUts" },
    { title: "Stairway to Heaven", artist: "Led Zeppelin", videoId: "QkF3oxziUD4" },
    { title: "Come As You Are", artist: "Nirvana", videoId: "vabnZ9-ex7o" },
    { title: "Get Lucky", artist: "Daft Punk", videoId: "5NV6Rdv1a3I" },
    { title: "Lose Control", artist: "Teddy Swims", videoId: "gNi_6U5Pm_o" },
    { title: "good 4 u", artist: "Olivia Rodrigo", videoId: "gNi_6U5Pm_o" },
    { title: "Happier Than Ever", artist: "Billie Eilish", videoId: "5GJWxDKyk3A" },
    { title: "Ocean Eyes", artist: "Billie Eilish", videoId: "viimfQi_pUw" },
    { title: "Attention", artist: "Charlie Puth", videoId: "nfs8NYg7yQM" },
    { title: "We Found Love", artist: "Rihanna", videoId: "tg00YEETFzg" },
    { title: "Diamonds", artist: "Rihanna", videoId: "lWA2pjMjpBs" },
    { title: "Moves Like Jagger", artist: "Maroon 5", videoId: "iEPTlhBmwRg" },
    { title: "Payphone", artist: "Maroon 5", videoId: "KRaWnd3LJfs" },
    { title: "What Makes You Beautiful", artist: "One Direction", videoId: "QJO3ROT-A4E" },
    { title: "Story of My Life", artist: "One Direction", videoId: "W-TE_Ys4iwM" },
    { title: "Drag Me Down", artist: "One Direction", videoId: "Jwgf3wmiA04" },
    { title: "Night Changes", artist: "One Direction", videoId: "vYSFyH2XSsA" },
    { title: "Photograph", artist: "Ed Sheeran", videoId: "nSDgHBxUbVQ" },
    { title: "Bad Habits", artist: "Ed Sheeran", videoId: "orJSJGHjBLI" },
    { title: "Shivers", artist: "Ed Sheeran", videoId: "Il0S8BouvSA" },
    { title: "Castle on the Hill", artist: "Ed Sheeran", videoId: "6AhN3VkZ1pM" },
    { title: "Anti-Hero", artist: "Taylor Swift", videoId: "b1kbLwvqugk" },
    { title: "Cruel Summer", artist: "Taylor Swift", videoId: "ic8j13piAhQ" },
    { title: "All Too Well", artist: "Taylor Swift", videoId: "sRxrwjOtIag" },
    { title: "You Belong With Me", artist: "Taylor Swift", videoId: "VuNIsY6JdUw" },
    { title: "I Knew You Were Trouble", artist: "Taylor Swift", videoId: "vNoKguSdy4Y" },
    { title: "Bad Blood", artist: "Taylor Swift", videoId: "QcIy9NiNbmo" },
    { title: "Style", artist: "Taylor Swift", videoId: "-CmadmM5cOk" },
    { title: "Wildest Dreams", artist: "Taylor Swift", videoId: "IdneKLhsWOQ" },
    { title: "Baby One More Time", artist: "Britney Spears", videoId: "C-u5WLJ9Yk4" },
    { title: "Oops I Did It Again", artist: "Britney Spears", videoId: "CduA0TULnow" },
    { title: "Toxic", artist: "Britney Spears", videoId: "LOZuxwVk7TU" },
    { title: "Gimme More", artist: "Britney Spears", videoId: "lVhJ_A8XUgc" },
    { title: "Womanizer", artist: "Britney Spears", videoId: "rMqayQ-U74s" },
    { title: "Circus", artist: "Britney Spears", videoId: "lVhJ_A8XUgc" },
    { title: "What Do You Mean?", artist: "Justin Bieber", videoId: "DK_0jXPuIr0" },
    { title: "Baby", artist: "Justin Bieber", videoId: "kffacxfA7G4" },
    { title: "Boyfriend", artist: "Justin Bieber", videoId: "4GuqB1BQVr4" },
    { title: "Never Say Never", artist: "Justin Bieber", videoId: "_Z5-P9v3F8w" },
    { title: "Beauty and a Beat", artist: "Justin Bieber", videoId: "Ys7-6_t7OEQ" },
    { title: "Where Are U Now", artist: "Justin Bieber", videoId: "nntGTK2Fhb0" },
    { title: "SexyBack", artist: "Justin Timberlake", videoId: "3M_5oYU-IsU" },
    { title: "Cry Me a River", artist: "Justin Timberlake", videoId: "DksSPZTZcs0" },
    { title: "Rock Your Body", artist: "Justin Timberlake", videoId: "5E1aJVTzR1U" },
    { title: "Poker Face", artist: "Lady Gaga", videoId: "bESGLojNYSo" },
    { title: "Just Dance", artist: "Lady Gaga", videoId: "2abk_n2BkFw" },
    { title: "Paparazzi", artist: "Lady Gaga", videoId: "d2smz_1L2_0" },
    { title: "Alejandro", artist: "Lady Gaga", videoId: "niqrrmev4mA" },
    { title: "Applause", artist: "Lady Gaga", videoId: "pco91kroVgQ" },
    { title: "Million Reasons", artist: "Lady Gaga", videoId: "d2smz_1L2_0" },
    { title: "Always Remember Us This Way", artist: "Lady Gaga", videoId: "eAJgJeFypvk" },
    { title: "Materials Girl", artist: "Madonna", videoId: "6p-IDDYn1Nk" },
    { title: "Vogue", artist: "Madonna", videoId: "GuJQSAiODqI" },
    { title: "Hung Up", artist: "Madonna", videoId: "EDwbyljJzI0" },
    { title: "Like a Prayer", artist: "Madonna", videoId: "79fzeNUqQbQ" },
    { title: "La Isla Bonita", artist: "Madonna", videoId: "zpzdgmqIHOQ" },
    { title: "Not Like Us", artist: "Kendrick Lamar", videoId: "H58vbez_m4E" },
    { title: "Humble", artist: "Kendrick Lamar", videoId: "tvTRZJ-4EyI" },
    { title: "DNA", artist: "Kendrick Lamar", videoId: "NLZRYQMLDW8" },
    { title: "God's Plan", artist: "Drake", videoId: "xpVfcZ0ZcFM" },
    { title: "Hotline Bling", artist: "Drake", videoId: "uxpDa-c-4Mc" },
    { title: "One Dance", artist: "Drake", videoId: "iAbnEUA0wpA" },
    { title: "In My Feelings", artist: "Drake", videoId: "DRS_PpOrUZ4" },
    { title: "Passionfruit", artist: "Drake", videoId: "COz9lDCFHjw" },
    { title: "Nice for What", artist: "Drake", videoId: "U9BwYK2E5lQ" },
    { title: "Toosie Slide", artist: "Drake", videoId: "xWggTb45brM" },
    { title: "Laugh Now Cry Later", artist: "Drake", videoId: "JFm7YDVlqnI" },
  ];

  var seen = {};
  var SONGS_UNIQUE = SONGS.filter(function (s) {
    var k = s.title.toLowerCase() + '|' + s.artist.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });

  // ─── Player ───
  function embedVideo(videoId, startSeconds) {
    var container = document.getElementById('yt-player-host');
    if (!container) return;
    container.innerHTML = '';
    var src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3';
    if (startSeconds > 0) src += '&start=' + Math.floor(startSeconds);
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.cssText = 'width:100%;height:100%;border:none';
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    container.appendChild(iframe);
    _playStartTime = Date.now();
    isPlaying = true;
    updatePlayBtn();
    startPolling();
  }

  function destroyPlayer() {
    if (ytPolling) { clearInterval(ytPolling); ytPolling = null; }
    var container = document.getElementById('yt-player-host');
    if (container) container.innerHTML = '';
    isPlaying = false;
    _currentVideoId = null;
  }

  function karaokeClean(text) {
    return text.replace(/[^\w\s',!?.%-]/g, '').replace(/\s+/g, ' ').trim();
  }

  function handleKaraokeClick(e) {
    try {
      var wordEl = e.target.closest('.word');
      if (wordEl) {
        var word = wordEl.getAttribute('data-word');
        if (!word || word.length === 0) return;
        var line = wordEl.closest('.karaoke-line');
        var idx = line ? parseInt(line.getAttribute('data-idx')) : -1;
        var context = (idx >= 0 && karaokeData[idx]) ? karaokeData[idx].text : '';
        App.showWordBubble(word, 'Carregando...', context, 'music');
        Ai.translate(word, context).then(function (translation) {
          var tEl = document.getElementById('bubble-translation');
          if (tEl) tEl.textContent = translation;
          var saveBtn = document.getElementById('bubble-save-btn');
          if (saveBtn) {
            var newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', function () {
              var result = Store.addWord(word, translation, 'music');
              if (result.success) { App.showToast(result.message, 'success'); App.hideWordBubble(); }
              else { App.showToast(result.message, 'error'); }
            });
          }
        }).catch(function () {});
        return;
      }
      var line = e.target.closest('.karaoke-line');
      if (line && line.getAttribute('data-idx') !== null) {
        var idx = parseInt(line.getAttribute('data-idx'));
        var entry = karaokeData[idx];
        if (entry) seekTo(entry.start);
      }
    } catch (err) {
      console.log('CLICK HANDLER ERROR:', err);
    }
  }

  function updateKaraokeUI() {
    var existing = document.getElementById('karaoke-lyrics') || document.getElementById('karaoke-status');
    if (!existing) return;
    var parent = existing.parentNode;
    var newHtml = '';
    if (karaokeStatus === 'loading') {
      newHtml = '<div id="karaoke-status" class="flex-center" style="gap:var(--space-sm);padding:var(--space-lg)"><div class="spinner"></div><span>A IA esta ouvindo a musica...</span></div>';
    } else if (karaokeStatus === 'ready') {
      newHtml = '<div id="karaoke-lyrics" class="karaoke-lyrics">' + renderKaraokeLines() + '</div>';
    } else {
      newHtml = '<div id="karaoke-status" class="text-center text-muted" style="padding:var(--space-md);font-size:var(--font-sm)">' + escapeHtml(karaokeErrorMsg || 'Nenhuma legenda encontrada') + '<button class="btn btn-secondary btn-sm mt-base" id="karaoke-retry-btn" style="display:block;margin:var(--space-sm) auto 0">Tentar Novamente</button></div>';
    }
    var temp = document.createElement('div');
    temp.innerHTML = newHtml;
    var newEl = temp.firstChild;
    parent.replaceChild(newEl, existing);
    if (karaokeStatus === 'ready') {
      newEl.addEventListener('click', handleKaraokeClick);
    }
    var retryBtn = document.getElementById('karaoke-retry-btn');
    if (retryBtn && currentSong) retryBtn.addEventListener('click', function () { fetchKaraoke(currentSong.videoId); });
  }

  function fetchKaraoke(videoId) {
    karaokeData = [];
    currentPhraseIdx = -1;
    karaokeErrorMsg = '';

    var cached = localStorage.getItem('lbs_karaoke_' + videoId);
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          karaokeData = parsed;
          karaokeStatus = 'ready';
          updateKaraokeUI();
          return;
        }
      } catch (e) { }
    }

    karaokeStatus = 'loading';
    updateKaraokeUI();
    fetch('/api/karaoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=' + videoId })
    })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (json.status === 'success' && json.data && json.data.length > 0) {
          karaokeData = json.data.map(function (entry) {
            return { start: entry.start, end: entry.end, text: karaokeClean(entry.text) };
          }).filter(function (entry) { return entry.text.length > 0; });
          karaokeStatus = karaokeData.length > 0 ? 'ready' : 'error';
          if (karaokeStatus === 'ready') {
            localStorage.setItem('lbs_karaoke_' + videoId, JSON.stringify(karaokeData));
          }
        } else {
          karaokeStatus = 'error';
          karaokeErrorMsg = json.message || 'Nenhuma legenda encontrada';
        }
        updateKaraokeUI();
      })
      .catch(function () {
        karaokeStatus = 'error';
        karaokeErrorMsg = 'Erro de conexao com o servidor';
        updateKaraokeUI();
      });
  }

  function renderKaraokeLines() {
    if (karaokeData.length === 0) return '';
    var html = '';
    for (var i = 0; i < karaokeData.length; i++) {
      var entry = karaokeData[i];
      var text = heardMode ? entry.text.replace(/[a-zA-Z0-9]/g, '●').replace(/'/g, "'") : entry.text;
      var cls = 'karaoke-line';
      if (i === currentPhraseIdx) cls += ' karaoke-active';
      if (heardMode) {
        html += '<div class="' + cls + '" data-idx="' + i + '">' + escapeHtml(text) + '</div>';
      } else {
        var words = text.split(/\s+/);
        var wordsHtml = '';
        for (var w = 0; w < words.length; w++) {
          var raw = words[w];
          var clean = raw.replace(/^[^a-zA-ZÀ-ÿ']*|[^a-zA-ZÀ-ÿ']*$/g, '');
          if (clean.length > 0) {
            wordsHtml += '<span class="word" data-word="' + escapeHtml(clean.toLowerCase()) + '">' + escapeHtml(raw) + '</span> ';
          } else {
            wordsHtml += escapeHtml(raw) + ' ';
          }
        }
        html += '<div class="' + cls + '" data-idx="' + i + '">' + wordsHtml.trim() + '</div>';
      }
    }
    return html;
  }

  function syncKaraoke() {
    if (karaokeStatus !== 'ready' || karaokeData.length === 0) return;
    var newIdx = -1;
    for (var i = 0; i < karaokeData.length; i++) {
      if (playerTime >= karaokeData[i].start && playerTime < karaokeData[i].end + 1) {
        newIdx = i;
        break;
      }
    }
    if (newIdx !== currentPhraseIdx) {
      currentPhraseIdx = newIdx;
      var container = document.getElementById('karaoke-lyrics');
      if (container) container.innerHTML = renderKaraokeLines();
      if (newIdx >= 0 && container) {
        var active = container.querySelector('.karaoke-active');
        if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function playSong(song) {
    if (_currentVideoId !== song.videoId) {
      playerDuration = 240;
      _pausedAt = 0;
      playerTime = 0;
      // Fetch real duration from server
      fetch('/api/video-info?videoId=' + encodeURIComponent(song.videoId))
        .then(function(r) { return r.json(); })
        .then(function(info) {
          if (info.duration && info.duration > 0) {
            playerDuration = info.duration;
            updateSeekbar();
          }
        }).catch(function() {});
    }
    currentSong = song;
    _currentVideoId = song.videoId;
    view = 'player';
    karaokeStatus = 'loading';
    karaokeData = [];
    currentPhraseIdx = -1;
    karaokeErrorMsg = '';
    embedVideo(song.videoId, 0);
    App.refreshCurrentTab();
    fetchKaraoke(song.videoId);

    // Track in music history for achievements
    if (typeof Store !== 'undefined' && Store.addMusicHistory) {
      Store.addMusicHistory({ title: song.title, artist: song.artist, thumbnail: '', youtubeId: song.videoId, partsCompleted: [], totalParts: 3 });
    }
    if (typeof Store !== 'undefined' && Store.recordSongPlay) {
      Store.recordSongPlay(song.title, song.artist);
    }
    setTimeout(function() {
      if (typeof Achievements !== 'undefined') {
        Achievements.checkAll(Achievements.getState());
      }
    }, 200);
  }

  function togglePlay() {
    if (!_currentVideoId) return;
    if (isPlaying) {
      _pausedAt = playerTime;
      var container = document.getElementById('yt-player-host');
      if (container) container.innerHTML = '';
      isPlaying = false;
      if (ytPolling) { clearInterval(ytPolling); ytPolling = null; }
      updatePlayBtn();
    } else {
      embedVideo(_currentVideoId, _pausedAt);
    }
  }

  function seekTo(time) {
    if (!_currentVideoId) return;
    var wasPlaying = isPlaying;
    isPlaying = true;
    _pausedAt = time;
    playerTime = time;
    embedVideo(_currentVideoId, time);
    if (!wasPlaying) startPolling();
    updateSeekbar();
  }

  function startPolling() {
    if (ytPolling) clearInterval(ytPolling);
    ytPolling = setInterval(function () {
      if (isPlaying && _currentVideoId) {
        playerTime = _pausedAt + (Date.now() - _playStartTime) / 1000;
        if (playerTime >= playerDuration) {
          isPlaying = false;
          clearInterval(ytPolling);
          ytPolling = null;
          updatePlayBtn();
        }
        updateSeekbar();
        syncKaraoke();
      }
    }, 200);
  }

  function updatePlayBtn() {
    var btn = document.getElementById('player-play-btn');
    if (!btn) return;
    btn.innerHTML = isPlaying
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function updateSeekbar() {
    var seekbar = document.getElementById('player-seekbar');
    var curEl = document.getElementById('player-time-current');
    var totEl = document.getElementById('player-time-total');
    if (seekbar && playerDuration > 0) seekbar.value = (playerTime / playerDuration) * 100;
    if (curEl) curEl.textContent = formatTime(playerTime);
    if (totEl) totEl.textContent = formatTime(playerDuration);
  }

  // ─── Render ───
  function render() {
    if (view === 'player' && currentSong) return renderPlayer();
    return renderList();
  }

  function renderList() {
    var playlist = Store.getPlaylist() || [];

    var resultsHtml = '';
    var hasSpotifyUnsearched = false;
    if (searchResults.length > 0) {
      resultsHtml = '<div class="music-section"><div class="section-header"><h2>resultados</h2><span class="text-muted" style="font-size:var(--font-sm)">' + searchResults.length + '</span></div><div class="music-results">';
      for (var i = 0; i < searchResults.length; i++) {
        var s = searchResults[i];
        var thumbHtml = s.videoId
          ? '<img src="https://img.youtube.com/vi/' + s.videoId + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<span style=font-size:24px;display:flex;align-items:center;justify-content:center;height:100%>🎵</span>\'">'
          : '<span style="font-size:20px;display:flex;align-items:center;justify-content:center;height:100%;color:var(--accent)">🎧</span>';
        var badgeHtml = s.fromSpotify ? '<span class="badge badge-spotify">Spotify</span>' : '';
        var searchingHtml = s.searching ? ' <span class="badge" style="background:var(--accent)">buscando...</span>' : '';
        resultsHtml += '<div class="music-result-item" data-action="play" data-title="' + escapeHtml(s.title) + '" data-artist="' + escapeHtml(s.artist) + '" data-videoid="' + escapeHtml(s.videoId) + '"><div class="music-result-cover">' + thumbHtml + '</div><div class="music-result-info"><h4>' + escapeHtml(s.title) + ' ' + badgeHtml + searchingHtml + '</h4><p>' + escapeHtml(s.artist) + '</p></div><button class="btn btn-secondary btn-sm" data-action="playlist-add" style="flex-shrink:0">+</button></div>';
        if (s.fromSpotify && !s.videoId && !s.searching) hasSpotifyUnsearched = true;
      }
      resultsHtml += '</div></div>';
      resultsHtml += '<button class="btn btn-secondary btn-block mb-base" id="clear-results-btn">✕ Limpar resultados</button>';
      if (hasSpotifyUnsearched && !spotifySearchAll) {
        resultsHtml += '<button class="btn btn-primary btn-block mb-base" id="spotify-search-all-btn">🔍 Buscar todas no YouTube</button>';
      }
      if (spotifySearchAll) {
        resultsHtml += '<div class="flex-center mb-base" style="gap:var(--space-sm)"><div class="spinner"></div><span class="text-muted" style="font-size:var(--font-sm)">Buscando musicas no YouTube...</span></div>';
      }
    }

    var playlistHtml = '';
    if (playlist.length > 0) {
      playlistHtml = '<div class="music-section"><div class="section-header"><h2>playlist</h2><span class="text-muted" style="font-size:var(--font-sm)">' + playlist.length + '</span></div><div class="music-results">';
      for (var i = 0; i < playlist.length; i++) {
        var s = playlist[i];
        playlistHtml += '<div class="music-result-item" data-action="play" data-title="' + escapeHtml(s.title) + '" data-artist="' + escapeHtml(s.artist) + '" data-videoid="' + escapeHtml(s.videoId) + '"><div class="music-result-cover"><img src="https://img.youtube.com/vi/' + s.videoId + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<span style=font-size:24px;display:flex;align-items:center;justify-content:center;height:100%>🎵</span>\'"></div><div class="music-result-info"><h4>' + escapeHtml(s.title) + '</h4><p>' + escapeHtml(s.artist) + '</p></div><button class="btn btn-danger btn-sm" data-action="playlist-remove" style="flex-shrink:0">✕</button></div>';
      }
      playlistHtml += '</div></div>';
    }

    var popularHtml = '';
    if (searchResults.length === 0 && playlist.length === 0) {
      var popular = SONGS_UNIQUE.slice(0, 8);
      popularHtml = '<div class="music-section"><div class="section-header"><h2>populares</h2></div><div class="music-results">';
      for (var i = 0; i < popular.length; i++) {
        var s = popular[i];
        popularHtml += '<div class="music-result-item" data-action="play" data-title="' + escapeHtml(s.title) + '" data-artist="' + escapeHtml(s.artist) + '" data-videoid="' + escapeHtml(s.videoId) + '"><div class="music-result-cover"><img src="https://img.youtube.com/vi/' + s.videoId + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.parentElement.innerHTML=\'<span style=font-size:24px;display:flex;align-items:center;justify-content:center;height:100%>🎵</span>\'"></div><div class="music-result-info"><h4>' + escapeHtml(s.title) + '</h4><p>' + escapeHtml(s.artist) + '</p></div></div>';
      }
      popularHtml += '</div></div>';
    }

    return '<div class="tab-header"><div class="tab-header-icon">🎵</div><div class="tab-header-text"><h1>Music Lab</h1><p>Pesquise musicas em ingles</p></div></div>' +
      '<div class="music-search-form"><div class="input-group mb-base"><label class="input-label">Musica ou artista</label>' +
      '<input type="text" class="input-field" id="music-search-input" placeholder="Ex: Shape of You" value="' + escapeHtml(searchQuery) + '"></div>' +
      '<button type="button" class="btn btn-primary btn-block" id="music-search-btn">🔍 Buscar</button></div>' +

      '<div class="music-url-form mb-base"><div class="input-group mb-sm"><label class="input-label">Ou cole uma URL do YouTube</label>' +
      '<input type="text" class="input-field" id="music-url-input" placeholder="https://youtube.com/watch?v=..."></div>' +
      '<button class="btn btn-secondary btn-block" id="music-url-btn">🎬 Carregar URL</button></div>' +

      '<div class="music-spotify-form mb-base"><div class="input-group mb-sm"><label class="input-label">🎧 Importar playlist do Spotify</label>' +
      '<input type="text" class="input-field" id="spotify-url-input" placeholder="https://open.spotify.com/playlist/..."></div>' +
      '<button class="btn btn-primary btn-block" id="spotify-import-btn">📥 Buscar musicas da playlist</button></div>' +
      resultsHtml + popularHtml + playlistHtml;
  }

  function renderPlayer() {
    var s = currentSong;
    var inPlaylist = Store.isInPlaylist(s.title, s.artist);
    var playIcon = isPlaying
      ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

    var karaokeHtml = '';
    if (karaokeStatus === 'loading') {
      karaokeHtml = '<div id="karaoke-status" class="flex-center" style="gap:var(--space-sm);padding:var(--space-lg)"><div class="spinner"></div><span>A IA esta ouvindo a musica...</span></div>';
    } else if (karaokeStatus === 'ready') {
      karaokeHtml = '<div id="karaoke-lyrics" class="karaoke-lyrics">' + renderKaraokeLines() + '</div>';
    } else if (karaokeStatus === 'error') {
      karaokeHtml = '<div id="karaoke-status" class="text-center text-muted" style="padding:var(--space-md);font-size:var(--font-sm)">' + escapeHtml(karaokeErrorMsg || 'Nenhuma legenda encontrada') + '<button class="btn btn-secondary btn-sm mt-base" id="karaoke-retry-btn" style="display:block;margin:var(--space-sm) auto 0">Tentar Novamente</button></div>';
    }

    return '<div class="music-player-view active">' +
      '<div class="flex-between mb-base"><button class="btn btn-secondary btn-sm" id="player-back-btn">← Voltar</button>' +
      '<div style="display:flex;gap:var(--space-sm)"><button class="btn btn-secondary btn-sm" id="player-heard-btn">' + (heardMode ? '🔇 Heard On' : '🔊 Heard Off') + '</button>' +
      '<button class="btn btn-secondary btn-sm" id="player-playlist-btn">' + (inPlaylist ? '✕ Remover' : '+ Playlist') + '</button>' +
      '<button class="btn btn-secondary btn-sm" id="study-lyrics-btn">📖 Estudar</button></div></div>' +

      '<div class="music-player card mb-base"><div class="flex-center" style="padding:var(--space-xl);padding-bottom:0">' +
      '<div class="player-cover" style="width:100px;height:100px;border-radius:var(--radius-lg);overflow:hidden">' +
      '<img src="https://img.youtube.com/vi/' + s.videoId + '/mqdefault.jpg" alt="" style="width:100%;height:100%;object-fit:cover"></div></div>' +
      '<div class="player-info text-center mb-sm"><h3>' + escapeHtml(s.title) + '</h3><p class="text-muted">' + escapeHtml(s.artist) + '</p></div>' +

      '<div class="player-controls flex-center" style="gap:var(--space-lg);padding:var(--space-sm)">' +
      '<button id="player-skip-back" class="btn-icon" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-size:20px">⏪</button>' +
      '<button id="player-play-btn" class="player-play-btn" style="width:48px;height:48px;border-radius:50%;background:var(--accent);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer">' + playIcon + '</button>' +
      '<button id="player-skip-fwd" class="btn-icon" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-size:20px">⏩</button></div>' +

      '<div class="player-progress flex-center mb-sm" style="gap:var(--space-sm);padding:0 var(--space-lg)">' +
      '<span class="player-time" id="player-time-current">0:00</span>' +
      '<input type="range" class="player-seekbar" id="player-seekbar" min="0" max="100" value="0" style="flex:1">' +
      '<span class="player-time" id="player-time-total">' + formatTime(playerDuration) + '</span></div></div>' +

      karaokeHtml + '</div>';
  }

  // ─── Search ───
  function fallbackSearch(q) {
    searchResults = [];
    var source = SONGS_UNIQUE.length > 0 ? SONGS_UNIQUE : SONGS;
    for (var i = 0; i < source.length; i++) {
      var s = source[i];
      if (s.title.toLowerCase().indexOf(q) !== -1 || s.artist.toLowerCase().indexOf(q) !== -1) {
        searchResults.push(s);
      }
    }
    if (searchResults.length > 30) searchResults = searchResults.slice(0, 30);
  }

  function doSearch() {
    var input = document.getElementById('music-search-input');
    if (!input) return;
    var q = input.value.trim();
    if (!q) { searchResults = []; App.refreshCurrentTab(); return; }
    searchQuery = q;
    spotifySearchAll = false;

    youtubeSearch(q)
      .then(function (results) {
        if (results.length > 0) {
          searchResults = results.map(function (v) {
            return { title: v.title, artist: v.author, videoId: v.videoId };
          });
        } else {
          fallbackSearch(q.toLowerCase());
        }
        App.refreshCurrentTab();
      })
      .catch(function () {
        fallbackSearch(q.toLowerCase());
        App.refreshCurrentTab();
      });
  }

  function loadCustomUrl() {
    var input = document.getElementById('music-url-input');
    if (!input) return;
    var raw = input.value.trim();
    var videoId = extractVideoId(raw);
    if (!videoId) {
      App.showToast('URL invalida. Cole um link do YouTube.', 'error');
      return;
    }
    App.showToast('Carregando...', 'success');
    playSong({ title: raw.slice(0, 40), artist: 'YouTube', videoId: videoId });
  }

  function spotifyImport() {
    spotifySearchAll = false;
    var input = document.getElementById('spotify-url-input');
    if (!input) return;
    var url = input.value.trim();
    if (!url || url.indexOf('spotify.com/playlist/') === -1) {
      App.showToast('Cole uma URL de playlist do Spotify valida.', 'error');
      return;
    }
    var btn = document.getElementById('spotify-import-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }
    fetch('/api/spotify-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Buscar musicas da playlist'; }
      if (json.status === 'success' && json.data && json.data.length > 0) {
        searchResults = json.data.map(function (v) {
          return { title: v.title, artist: v.artist, videoId: '', fromSpotify: true };
        });
        input.value = '';
        App.showToast(json.data.length + ' musicas de "' + json.playlistName + '" — clique em qualquer uma pra buscar no YouTube', 'success');
        App.refreshCurrentTab();
      } else {
        var msg = json.message || 'Nao foi possivel extrair as musicas dessa playlist.';
        App.showToast(msg, 'error');
      }
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Buscar musicas da playlist'; }
      App.showToast('Erro de conexao: ' + err.message, 'error');
    });
  }

  function spotifySearchAllTracks() {
    spotifySearchAll = true;
    App.refreshCurrentTab();
    var pending = searchResults.filter(function (s) { return s.fromSpotify && !s.videoId && !s.searching; });
    if (pending.length === 0) { spotifySearchAll = false; App.refreshCurrentTab(); return; }
    var completed = 0;
    for (var i = 0; i < searchResults.length; i++) {
      if (searchResults[i].fromSpotify && !searchResults[i].videoId) {
        searchResults[i].searching = true;
      }
    }
    App.refreshCurrentTab();
    for (var i = 0; i < searchResults.length; i++) {
      var s = searchResults[i];
      if (s.fromSpotify && !s.videoId) {
        (function (idx) {
          youtubeSearch(searchResults[idx].title + ' ' + searchResults[idx].artist)
            .then(function (results) {
              if (results.length > 0) {
                searchResults[idx].videoId = results[0].videoId;
                searchResults[idx].title = results[0].title;
                searchResults[idx].artist = results[0].author;
              }
              searchResults[idx].searching = false;
              completed++;
              if (completed >= pending.length) { spotifySearchAll = false; App.refreshCurrentTab(); }
              else App.refreshCurrentTab();
            })
            .catch(function () {
              searchResults[idx].searching = false;
              completed++;
              if (completed >= pending.length) { spotifySearchAll = false; App.refreshCurrentTab(); }
              else App.refreshCurrentTab();
            });
        })(i);
      }
    }
  }

  // ─── Bind Events ───
  function bindEvents(container) {
    var searchInput = container.querySelector('#music-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) { searchQuery = e.target.value; });
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
      });
    }

    var searchBtn = container.querySelector('#music-search-btn');
    if (searchBtn) searchBtn.addEventListener('click', doSearch);

    var urlBtn = container.querySelector('#music-url-btn');
    if (urlBtn) urlBtn.addEventListener('click', loadCustomUrl);

    var urlInput = container.querySelector('#music-url-input');
    if (urlInput) {
      urlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') loadCustomUrl();
      });
    }

    var spotifyBtn = container.querySelector('#spotify-import-btn');
    if (spotifyBtn) spotifyBtn.addEventListener('click', spotifyImport);

    var spotifyInput = container.querySelector('#spotify-url-input');
    if (spotifyInput) {
      spotifyInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') spotifyImport();
      });
    }

    var searchAllBtn = container.querySelector('#spotify-search-all-btn');
    if (searchAllBtn) searchAllBtn.addEventListener('click', spotifySearchAllTracks);

    var clearBtn = container.querySelector('#clear-results-btn');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      searchResults = [];
      searchQuery = '';
      spotifySearchAll = false;
      App.refreshCurrentTab();
    });

    var items = container.querySelectorAll('[data-action="play"]');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function () {
        var title = this.getAttribute('data-title');
        var artist = this.getAttribute('data-artist');
        var videoId = this.getAttribute('data-videoid');
        if (videoId) {
          playSong({ title: title, artist: artist, videoId: videoId });
        } else {
          App.showToast('Buscando "' + title + '"...', 'success');
          youtubeSearch(title + ' ' + artist)
            .then(function (results) {
              if (results.length > 0) {
                var v = results[0];
                playSong({ title: v.title, artist: v.author, videoId: v.videoId });
              } else {
                App.showToast('Nao encontrada no YouTube: ' + title, 'error');
              }
            })
            .catch(function () {
              App.showToast('Erro ao buscar musica.', 'error');
            });
        }
      });
    }

    var addBtns = container.querySelectorAll('[data-action="playlist-add"]');
    for (var i = 0; i < addBtns.length; i++) {
      addBtns[i].addEventListener('click', function (e) {
        e.stopPropagation();
        var parent = this.closest('[data-action="play"]');
        if (parent) {
          var result = Store.addToPlaylist({ title: parent.getAttribute('data-title'), artist: parent.getAttribute('data-artist'), videoId: parent.getAttribute('data-videoid') });
          if (App) App.showToast(result.message, result.success ? 'success' : 'error');
        }
      });
    }

    var removeBtns = container.querySelectorAll('[data-action="playlist-remove"]');
    for (var i = 0; i < removeBtns.length; i++) {
      removeBtns[i].addEventListener('click', function (e) {
        e.stopPropagation();
        var parent = this.closest('[data-action="play"]');
        if (parent) {
          Store.removeFromPlaylist(parent.getAttribute('data-title'), parent.getAttribute('data-artist'));
          App.refreshCurrentTab();
        }
      });
    }

    bindPlayerEvents(container);
  }

  function bindPlayerEvents(container) {
    var backBtn = container.querySelector('#player-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        destroyPlayer();
        view = 'list';
        currentSong = null;
        karaokeStatus = 'idle';
        karaokeData = [];
        karaokeErrorMsg = '';
        App.refreshCurrentTab();
      });
    }

    var playlistBtn = container.querySelector('#player-playlist-btn');
    if (playlistBtn && currentSong) {
      playlistBtn.addEventListener('click', function () {
        if (Store.isInPlaylist(currentSong.title, currentSong.artist)) {
          Store.removeFromPlaylist(currentSong.title, currentSong.artist);
          App.showToast('Removida da playlist', 'success');
        } else {
          Store.addToPlaylist(currentSong);
          App.showToast('Adicionada a playlist', 'success');
        }
        App.refreshCurrentTab();
      });
    }

    var playBtn = container.querySelector('#player-play-btn');
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    var skipBack = container.querySelector('#player-skip-back');
    if (skipBack) skipBack.addEventListener('click', function () { seekTo(Math.max(0, playerTime - 10)); });

    var skipFwd = container.querySelector('#player-skip-fwd');
    if (skipFwd) skipFwd.addEventListener('click', function () { seekTo(Math.min(playerDuration, playerTime + 10)); });

    var seekbar = container.querySelector('#player-seekbar');
    if (seekbar) {
      seekbar.addEventListener('input', function () {
        if (playerDuration > 0) {
          var val = (this.value / 100) * playerDuration;
          var curEl = document.getElementById('player-time-current');
          if (curEl) curEl.textContent = formatTime(val);
        }
      });
      seekbar.addEventListener('change', function () {
        if (playerDuration > 0) seekTo((this.value / 100) * playerDuration);
      });
    }

    var heardBtn = container.querySelector('#player-heard-btn');
    if (heardBtn) {
      heardBtn.addEventListener('click', function () {
        heardMode = !heardMode;
        heardBtn.textContent = heardMode ? '🔇 Heard On' : '🔊 Heard Off';
        var ly = document.getElementById('karaoke-lyrics');
        if (ly) ly.innerHTML = renderKaraokeLines();
      });
    }

    // Study lyrics button
    var studyLyricsBtn = container.querySelector('#study-lyrics-btn');
    if (studyLyricsBtn) {
      studyLyricsBtn.addEventListener('click', function () {
        if (karaokeData.length === 0) { App.showToast('Nenhuma letra carregada', 'error'); return; }
        var allText = karaokeData.map(function(e) { return e.text; }).join(' ');
        var uniqueWords = musicExtractUniqueWords(allText);
        if (uniqueWords.length === 0) { App.showToast('Nenhuma palavra encontrada na letra', 'error'); return; }
        App.showToast('Traduzindo ' + uniqueWords.length + ' palavras...', 'info');
        musicTranslateWordList(uniqueWords, function(translated) {
          if (typeof StudyTab !== 'undefined' && StudyTab.startMediaSession) {
            StudyTab.startMediaSession(translated, 'standard');
          }
        });
      });
    }

    var retryBtn = container.querySelector('#karaoke-retry-btn');
    if (retryBtn && currentSong) {
      retryBtn.addEventListener('click', function () { fetchKaraoke(currentSong.videoId); });
    }

    var lyricsEl = container.querySelector('#karaoke-lyrics');
    if (lyricsEl) lyricsEl.addEventListener('click', handleKaraokeClick);
  }

  function musicExtractUniqueWords(text) {
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

  function musicTranslateWordList(words, callback) {
    var result = [];
    var idx = 0;
    function next() {
      if (idx >= words.length) { callback(result); return; }
      var w = words[idx++];
      Ai.translate(w, '').then(function(translation) {
        result.push({ word: w, translation: translation || w });
        next();
      }).catch(function() {
        result.push({ word: w, translation: w });
        next();
      });
    }
    next();
  }

  return { render: render, bindEvents: bindEvents };
})();
