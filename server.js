const http = require('http');
const fs = require('fs');
const path = require('path');
const ytSearch = require('yt-search');
const DICT = require('./dict.js');

const PORT = 8000;
const dir = __dirname;

const OPENROUTER_KEY = 'REMOVED';

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
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function searchYouTube(query) {
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ translation: t }));
      });
    }).catch(function() {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ translation: '' }));
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

  async function parseSpotifyTracks(playlistId) {
    var resp = await fetch('https://open.spotify.com/playlist/' + playlistId, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/53736', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) return { status: 'error', message: 'Spotify retornou status ' + resp.status + '. A playlist pode ser privada ou inexistente.' };
    var html = await resp.text();

    var nameMatch = html.match(/<title>([^<]+)<\/title>/);
    var playlistName = nameMatch ? nameMatch[1].replace(/\s*[|]\s*Spotify$/, '').trim() : 'Spotify Playlist';

    var tracks = [];

    // Method 1: __NEXT_DATA__
    var ndMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (ndMatch) {
      try {
        var nd = JSON.parse(ndMatch[1]);
        tracks = walkTree(nd.props || nd, 100);
      } catch (e) {}
    }

    // Method 2: all JSON <script> tags
    if (tracks.length === 0) {
      var jsonScripts = extractAllJsonScripts(html);
      for (var js = 0; js < jsonScripts.length && tracks.length === 0; js++) {
        tracks = walkTree(jsonScripts[js], 100);
      }
    }

    // Method 3: regex — "name" + "uri" containing spotify:track:
    if (tracks.length === 0) {
      var rx3 = /"name"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,200}"uri"\s*:\s*"spotify:track:[^"]+"/g;
      var m3;
      while ((m3 = rx3.exec(html)) !== null) {
        var t3 = m3[1].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        if (t3 && t3.length < 200) tracks.push({ title: t3, artist: '' });
      }
    }

    // Method 4: regex no HTML bruto — track + artist name
    if (tracks.length === 0) {
      var rx4 = /"track"\s*:\s*\{[\s\S]{0,500}"name"\s*:\s*"((?:[^"\\]|\\.)*)"[\s\S]{0,300}"name"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      var m4;
      while ((m4 = rx4.exec(html)) !== null) {
        var tn = m4[1].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        var an = m4[2].replace(/\\"/g, '"').replace(/\\u0026/g, '&');
        if (tn && an && tn.length < 200 && an.length < 200) tracks.push({ title: tn, artist: an });
      }
    }

    // Dedup
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
  const { exec } = require('child_process');
  exec('start http://localhost:' + PORT);
});
