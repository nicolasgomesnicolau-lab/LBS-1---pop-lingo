const Ai = (() => {
  var translateCache = {};

  function translate(word, context) {
    var clean = word.replace(/[^a-zA-ZÀ-ÿ']/g, '').toLowerCase().trim();
    var cacheKey = clean + '|' + (context || '').toLowerCase();
    if (translateCache[cacheKey]) {
      return Promise.resolve(translateCache[cacheKey]);
    }
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 15000);
    return fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: clean }),
      signal: controller.signal
    }).then(function(r) { clearTimeout(timeout); return r.json(); }).then(function(json) {
      var translation = json.translation || clean;
      translateCache[cacheKey] = translation;
      return translation;
    }).catch(function() {
      return clean || word;
    });
  }

  function chat(messages) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages })
    }).then(function(r) { return r.json(); }).then(function(json) {
      if (json.error) return { error: json.error };
      return { text: json.text || '...' };
    }).catch(function(err) {
      return { error: 'Erro de conexao: ' + err.message };
    });
  }

  return { translate: translate, chat: chat };
})();
