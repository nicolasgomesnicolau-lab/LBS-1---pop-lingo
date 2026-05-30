const http = require('http');
const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');
const DICT = require('./dict.js');

// Load .env manually (no dotenv dependency)
(function() {
  try {
    var lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;
      var eq = line.indexOf('=');
      if (eq === -1) continue;
      var key = line.slice(0, eq).trim();
      var val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {}
})();

const PORT = process.env.PORT || 8000;
const dir = __dirname;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
const YT_API_KEY = process.env.YT_API_KEY || '';
const KARAOKE_NGROK = process.env.KARAOKE_NGROK || '';
const KARAOKE_API_KEY = process.env.KARAOKE_API_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// In-memory admin sessions (token → timestamp)
const SESSIONS = new Map();

async function callOpenRouter(messages, model, maxTokens, retries) {
  if (retries === undefined) retries = 3;
  for (var attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(function() { controller.abort(); }, 20000);
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + OPENROUTER_KEY,
          'X-Title': 'LBS #1'
        },
        body: JSON.stringify({ model: model || 'openrouter/free', messages, max_tokens: maxTokens || 1000, transforms: ['remove-reasoning'], provider: { ignore: ['Nvidia'] } }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      var json = await resp.json();
      if (attempt < retries - 1 && json.error) {
        continue;
      }
      return json;
    } catch (e) {
      clearTimeout(timeout);
      if (attempt < retries - 1) continue;
      return { error: { message: 'Request failed: ' + e.message } };
    }
  }
  return { error: { message: 'All retries failed' } };
}

function readBody(req) {
  return new Promise(function(resolve) {
    var data = '';
    req.on('data', function(chunk) { data += chunk; });
    req.on('end', function() { resolve(data); });
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const MOVIES_PATH = path.join(__dirname, 'data', 'movies.json');

function readMoviesFile() {
  try {
    return JSON.parse(fs.readFileSync(MOVIES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeMoviesFile(movies) {
  try {
    var dir = path.dirname(MOVIES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MOVIES_PATH, JSON.stringify(movies, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function dataApiSearch(query) {
  return fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + '&key=' + YT_API_KEY + '&type=video&maxResults=10')
    .then(function(r) {
      if (r.status === 429) throw new Error('quota_exceeded');
      return r.json();
    })
    .then(function(json) {
      if (json.error) throw new Error(json.error.message);
      return (json.items || []).map(function(item) {
        return { title: item.snippet.title, author: item.snippet.channelTitle, videoId: item.id.videoId, thumbnail: item.snippet.thumbnails.default ? item.snippet.thumbnails.default.url : '' };
      });
    });
}

function ytSearchSearch(query) {
  return ytSearch({ query: query, hl: 'en', gl: 'US' }).then(function(result) {
    return (result.videos || []).slice(0, 15).map(function(v) {
      return {
        title: v.title,
        author: v.author ? v.author.name : 'YouTube',
        videoId: v.videoId,
        thumbnail: v.thumbnail || 'https://img.youtube.com/vi/' + v.videoId + '/mqdefault.jpg'
      };
    });
  });
}

function doYouTubeSearch(query) {
  return dataApiSearch(query).catch(function(err) {
    if (err.message === 'quota_exceeded') {
      return ytSearchSearch(query);
    }
    return ytSearchSearch(query);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === 'GET' && url.pathname === '/search') {
    const q = url.searchParams.get('q');
    if (!q || !q.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Faltando query' }));
      return;
    }
    searchYouTube(q.trim()).then((videos) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', data: videos }));
    }).catch((err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/chat') {
    readBody(req).then(function(body) {
      var data = JSON.parse(body);
      var messages = data.messages;
      if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid messages' }));
        return;
      }
      var systemMsg = { role: 'system', content: 'You help a Brazilian learn English. RULES: Respond in simple Portuguese. MAX 1 sentence. NO asterisks, NO markdown. If they ask "como se diz X", give the English translation. Be direct.' };
      return callOpenRouter([systemMsg].concat(messages), 'openrouter/free', 300).then(function(json) {
        if (json.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: json.error.message }));
          return;
        }
        var text = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: text }));
      });
    }).catch(function(err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/translate') {
    readBody(req).then(function(body) {
      var data = JSON.parse(body);
      var word = data.word;
      if (!word) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ translation: '' })); return; }
      var clean = word.toLowerCase().trim();
      var d = DICT[clean];
      if (d) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ translation: d })); return; }
      return callOpenRouter([
        { role: 'system', content: 'Translate the English word to Brazilian Portuguese. Reply with ONLY the translated word. No punctuation, no explanations.' },
        { role: 'user', content: clean }
      ], 'openrouter/free', 50).then(function(json) {
        if (json.error) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ translation: clean })); return; }
        var msg = json.choices && json.choices[0] && json.choices[0].message;
        var t = (msg && msg.content && msg.content.trim().replace(/^[""'']|[""'']$/g, '')) || clean;
        // If the AI just echoed the word back, retry with a more explicit prompt
        if (t === clean) {
          return callOpenRouter([
            { role: 'system', content: 'You are a translator. Translate the given English word to Brazilian Portuguese. If the word has multiple meanings, choose the most common one. Reply with ONLY the translated word, nothing else.' },
            { role: 'user', content: 'What is the Brazilian Portuguese translation of "' + clean + '"?' }
          ], 'openrouter/free', 50).then(function(json2) {
            var t2 = clean;
            if (!json2.error) {
              var msg2 = json2.choices && json2.choices[0] && json2.choices[0].message;
              t2 = (msg2 && msg2.content && msg2.content.trim().replace(/^[""'']|[""'']$/g, '')) || clean;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ translation: t2 }));
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ translation: t }));
      });
    }).catch(function() {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ translation: '' }));
    });
    return;
  }

  // Proxy for Jarvis karaoke transcription API
  if (method === 'POST' && url.pathname === '/api/karaoke') {
    readBody(req).then(function(body) {
      var data = JSON.parse(body);
      var videoUrl = data.url;
      if (!videoUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'URL faltando' }));
        return;
      }
      var videoId = '';
      var m = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
      if (m) videoId = m[1];

      // Server-side cache: check if already transcribed
      if (videoId) {
        var cachePath = path.join(__dirname, 'data', 'karaoke_cache', videoId + '.json');
        try {
          var cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          if (cached && cached.data && cached.data.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cached));
            return;
          }
        } catch (e) {}
      }

      fetch((KARAOKE_NGROK || '') + '/transcrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KARAOKE_API_KEY },
        body: JSON.stringify({ url: videoUrl })
      }).then(function(r) { return r.json(); }).then(function(json) {
        // Save to cache on success
        if (json.status === 'success' && json.data && json.data.length > 0 && videoId) {
          try {
            var cacheDir = path.join(__dirname, 'data', 'karaoke_cache');
            if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
            fs.writeFileSync(path.join(cacheDir, videoId + '.json'), JSON.stringify(json), 'utf8');
          } catch (e) {}
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(json));
      }).catch(function() {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Erro de conexao com o servidor de karaoke' }));
      });
    });
    return;
  }

  // YouTube search using YouTube Data API
  if (method === 'GET' && url.pathname === '/api/youtube-search') {
    var q = url.searchParams.get('q');
    if (!q || !q.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Faltando query' }));
      return;
    }
    doYouTubeSearch(q.trim()).then(function(videos) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(videos));
    }).catch(function(err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    });
    return;
  }

function dataApiVideoInfo(videoId) {
  return fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=' + encodeURIComponent(videoId) + '&key=' + YT_API_KEY)
    .then(function(r) {
      if (r.status === 429) throw new Error('quota_exceeded');
      return r.json();
    })
    .then(function(json) {
      if (json.error) throw new Error(json.error.message);
      if (json.items && json.items[0]) {
        var item = json.items[0];
        var title = item.snippet ? item.snippet.title : '';
        var durationStr = item.contentDetails ? item.contentDetails.duration : '';
        var totalSeconds = 0;
        if (durationStr) {
          var match = durationStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
          var hours = parseInt((match[1] || '').replace('H', '')) || 0;
          var minutes = parseInt((match[2] || '').replace('M', '')) || 0;
          var seconds = parseInt((match[3] || '').replace('S', '')) || 0;
          totalSeconds = hours * 3600 + minutes * 60 + seconds;
        }
        return { title: title, duration: totalSeconds };
      }
      return { error: 'Video nao encontrado' };
    });
}

function ytSearchVideoInfo(videoId) {
  return ytSearch({ query: videoId, hl: 'en', gl: 'US' }).then(function(result) {
    var v = (result.videos || []).find(function(v) { return v.videoId === videoId; });
    if (v) return { title: v.title, duration: v.duration ? v.duration.seconds : 0 };
    return { title: '', duration: 0 };
  });
}

function doYouTubeVideoInfo(videoId) {
  return dataApiVideoInfo(videoId).catch(function(err) {
    return ytSearchVideoInfo(videoId);
  });
}

// Get video info (title + duration) via YouTube Data API
  if (method === 'GET' && url.pathname === '/api/video-info') {
    var videoId = url.searchParams.get('videoId');
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Faltando videoId' }));
      return;
    }
    doYouTubeVideoInfo(videoId).then(function(info) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(info));
    }).catch(function() {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar info' }));
    });
    return;
  }

  // Get video duration via YouTube Data API (with fallback)
  if (method === 'GET' && url.pathname === '/api/video-duration') {
    var videoId = url.searchParams.get('videoId');
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Faltando videoId' }));
      return;
    }
    doYouTubeVideoInfo(videoId).then(function(info) {
      if (info.error) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: info.error }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ duration: info.duration }));
    }).catch(function() {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar duracao' }));
    });
    return;
  }

  // Admin password verification — returns session token
  if (method === 'POST' && url.pathname === '/api/admin/verify') {
    readBody(req).then(function(body) {
      var data = JSON.parse(body);
      var password = data.password || '';
      if (password === ADMIN_PASSWORD) {
        var token = '';
        var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (var i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
        SESSIONS.set(token, Date.now());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, token: token }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  // Movies API — shared server-side storage
  if (method === 'GET' && url.pathname === '/api/movies') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readMoviesFile()));
    return;
  }

  if (method === 'POST' && url.pathname === '/api/movies/save') {
    readBody(req).then(function(body) {
      var data = JSON.parse(body);
      if (!data.token || !SESSIONS.has(data.token)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Sessão inválida' }));
        return;
      }
      // Renew session
      SESSIONS.set(data.token, Date.now());
      if (writeMoviesFile(data.movies)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Salvo!' }));
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Erro ao salvar' }));
      }
    });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/spotify-playlist') {
    readBody(req).then(async function(body) {
      var data = JSON.parse(body);
      var playlistUrl = data.url && data.url.trim();
      if (!playlistUrl || !playlistUrl.includes('spotify.com/playlist/')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'URL de playlist do Spotify invalida' }));
        return;
      }
      var idMatch = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      var playlistId = idMatch ? idMatch[1] : '';
      if (!playlistId) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'error', message: 'ID nao encontrado' })); return; }
      try {
        var result = await parseSpotifyTracks(playlistId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Erro ao buscar playlist: ' + e.message }));
      }
    });
    return;
  }

  function extractTrack(node) {
    if (!node || typeof node !== 'object') return null;
    var uri = node.uri;
    var name = node.name;
    var isTrack = (typeof uri === 'string' && uri.indexOf('spotify:track:') === 0) || node.type === 'track' || node.__typename === 'Track';
    if (!isTrack || !name) return null;
    var artistName = '';
    if (node.artists) {
      var arr = Array.isArray(node.artists) ? node.artists : (node.artists.items || []);
      if (arr.length > 0) {
        artistName = arr[0].name || (arr[0].profile && arr[0].profile.name) || '';
      }
    }
    return { title: name, artist: artistName };
  }

  function walkTree(root, max) {
    var results = [];
    var stack = [root];
    var seen = new Set();
    while (stack.length > 0 && results.length < max) {
      var node = stack.pop();
      if (!node || typeof node !== 'object' || seen.has(node)) continue;
      seen.add(node);
      if (Array.isArray(node)) {
        for (var i = node.length - 1; i >= 0; i--) stack.push(node[i]);
      } else {
        var t = extractTrack(node);
        if (t && t.title && t.artist) { results.push(t); continue; }
        if (node.track && typeof node.track === 'object') stack.push(node.track);
        var keys = Object.keys(node);
        for (var i = keys.length - 1; i >= 0; i--) {
          var val = node[keys[i]];
          if (typeof val === 'object' && val !== null) stack.push(val);
        }
      }
    }
    return results;
  }

  function extractAllJsonScripts(html) {
    var scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    var all = [];
    for (var si = 0; si < scripts.length; si++) {
      var content = scripts[si].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '').trim();
      if (!content) continue;
      if (content.charAt(0) === '{' || content.charAt(0) === '[') {
        try { all.push(JSON.parse(content)); } catch(e) {}
      } else if (content.indexOf('window.__INITIAL_STATE__') !== -1 || content.indexOf('window.__remixContext') !== -1) {
        var eqIdx = content.indexOf('=');
        if (eqIdx > 0) {
          var jsonStr = content.slice(eqIdx + 1).trim().replace(/;$/,'');
          try { all.push(JSON.parse(jsonStr)); } catch(e) {}
        }
      }
    }
    return all;
  }

  function parseEntityTracks(entity) {
    if (!entity || typeof entity !== 'object') return [];
    var tracks = [];
    var list = entity.trackList || entity.tracks || [];
    if (!Array.isArray(list)) {
      if (list.items && Array.isArray(list.items)) list = list.items;
      else return [];
    }
    for (var i = 0; i < list.length && i < 100; i++) {
      var item = list[i];
      if (!item) continue;
      var trackObj = item.track || item;
      var title = trackObj.title || trackObj.name || '';
      var artist = '';
      if (trackObj.subtitle) {
        artist = trackObj.subtitle;
      } else if (trackObj.artists) {
        var arr = Array.isArray(trackObj.artists) ? trackObj.artists : (trackObj.artists.items || []);
        artist = arr.map(function(a) { return a.name || ''; }).filter(Boolean).join(', ');
      }
      if (title) tracks.push({ title: title, artist: artist || 'Unknown' });
    }
    return tracks;
  }

  async function parseSpotifyTracks(playlistId) {
    // Tenta a página embed primeiro (mais estável)
    var resp = await fetch('https://open.spotify.com/embed/playlist/' + playlistId, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/53736', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) {
      // Fallback: tenta a página normal
      resp = await fetch('https://open.spotify.com/playlist/' + playlistId, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/53736', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
      });
      if (!resp.ok) return { status: 'error', message: 'Spotify retornou status ' + resp.status + '. A playlist pode ser privada ou inexistente.' };
    }
    var html = await resp.text();

    var nameMatch = html.match(/<title>([^<]+)<\/title>/);
    var playlistName = nameMatch ? nameMatch[1].replace(/\s*[|]\s*Spotify$/, '').trim() : 'Spotify Playlist';

    var tracks = [];

    // Method 1: __NEXT_DATA__ — caminho específico do embed (props > pageProps > state > data > entity)
    var ndMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        var nd = JSON.parse(ndMatch[1]);
        var entity = nd;
        if (nd.props) entity = nd.props;
        if (entity.pageProps) entity = entity.pageProps;
        if (entity.state) entity = entity.state;
        if (entity.data) entity = entity.data;
        if (entity.entity) entity = entity.entity;
        tracks = parseEntityTracks(entity);
      } catch (e) {}
    }

    // Method 2: walkTree genérico no __NEXT_DATA__
    if (tracks.length === 0 && ndMatch) {
      try {
        var nd2 = JSON.parse(ndMatch[1]);
        tracks = walkTree(nd2.props || nd2, 100);
      } catch (e) {}
    }

    // Method 3: todos os JSON <script> tags
    if (tracks.length === 0) {
      var jsonScripts = extractAllJsonScripts(html);
      for (var js = 0; js < jsonScripts.length && tracks.length === 0; js++) {
        tracks = walkTree(jsonScripts[js], 100);
      }
    }

    // Method 4: regex — "name" + "uri" contendo spotify:track:
    if (tracks.length === 0) {
      var rx4 = /"name"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,200}"uri"\s*:\s*"spotify:track:[^"]+"/g;
      var m4;
      while ((m4 = rx4.exec(html)) !== null) {
        var t4 = m4[1].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        if (t4 && t4.length < 200) tracks.push({ title: t4, artist: '' });
      }
    }

    // Method 5: regex bruto — track + artist
    if (tracks.length === 0) {
      var rx5 = /"track"\s*:\s*\{[\s\S]{0,500}"name"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,300}"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      var m5;
      while ((m5 = rx5.exec(html)) !== null) {
        var tn = m5[1].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        var an = m5[2].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        if (tn && an && tn.length < 200 && an.length < 200) tracks.push({ title: tn, artist: an });
      }
    }

    var seen = {};
    var unique = [];
    for (var i = 0; i < tracks.length; i++) {
      var key = (tracks[i].title + '|' + tracks[i].artist).toLowerCase().trim();
      if (!seen[key] && tracks[i].title) { seen[key] = true; unique.push(tracks[i]); }
    }

    if (unique.length === 0) return { status: 'error', message: 'Nao foi possivel extrair as musicas. A playlist pode ser privada ou o formato do Spotify mudou.' };
    return { status: 'success', playlistName: playlistName, data: unique.slice(0, 100), total: unique.length };
  }

  let filePath = path.join(dir, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Servidor rodando em http://localhost:' + PORT);
  if (process.platform === 'win32') {
    const { exec } = require('child_process');
    exec('start http://localhost:' + PORT);
  }
});
