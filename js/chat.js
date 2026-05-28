/* ========================================
   LBS #1 — Chat Tab
   ======================================== */

const ChatTab = (() => {
  var messages = [];
  var isLoading = false;

  var suggestions = [
    "Como se diz 'obrigado'?",
    "Traduzir: I love you",
    "Diferença: make vs do",
    "O que é phrasal verb?",
    "Como usar 'would'?",
  ];

  function render() {
    return '<div class="tab-header">' +
      '<div class="tab-header-icon">💬</div>' +
      '<div class="tab-header-text"><h1>Chat IA</h1><p>Seu assistente de ingles</p></div></div>' +
      '<div class="chat-container">' + (messages.length === 0 ? renderWelcome() : renderMessages()) + '</div>' +
      '<div class="chat-input-area">' +
      '<input type="text" class="input-field" id="chat-input" placeholder="Digite sua duvida em ingles..."' + (isLoading ? ' disabled' : '') + '>' +
      '<button class="chat-send-btn" id="chat-send-btn"' + (isLoading ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>';
  }

  function renderWelcome() {
    return '<div class="chat-welcome">' +
      '<div class="chat-welcome-icon anim-float">🤖</div>' +
      '<h2>Ola! 👋</h2>' +
      '<p>Pergunte sobre traducoes, gramatica, ou pratique conversacao em ingles!</p>' +
      '<div class="chat-suggestions">' +
      suggestions.map(function(s) { return '<button class="chat-suggestion" data-suggestion="' + escapeHtml(s) + '">' + s + '</button>'; }).join('') +
      '</div></div>';
  }

  function renderMessages() {
    var html = '<div class="chat-messages">';
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      html += '<div class="chat-bubble ' + (msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot') + '">' + escapeHtml(msg.content) + '</div>';
    }
    if (isLoading) {
      html += '<div class="chat-bubble chat-bubble-bot chat-loading"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    }
    return html + '</div>';
  }

  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function isSingleWord(str) {
    return /^[a-zA-ZÀ-ÿ'-]+$/.test(str.trim());
  }

  function isTranslateRequest(text) {
    return /como se diz|traduz|traduzir|o que significa|como fala|meaning of|translate|o que quer dizer|qual a traducao|como se fala|dizer em ingles/i.test(text);
  }

  function extractWord(text) {
    var m = text.match(/[""'']([^""'']+)[""'']/);
    if (m) return m[1].trim();
    var prefixes = ['como se diz','traduza','traduzir','traduz','o que significa','como fala','meaning of','o que quer dizer','qual a traducao','como se fala','dizer em ingles','significado de'];
    for (var pi = 0; pi < prefixes.length; pi++) {
      var idx = text.toLowerCase().indexOf(prefixes[pi]);
      if (idx >= 0) {
        var after = text.slice(idx + prefixes[pi].length).replace(/^[""''\s]+|[""''\s]+$/g, '');
        if (after) return after;
      }
    }
    var words = text.split(/\s+/);
    for (var i = words.length - 1; i >= 0; i--) {
      if (/^[a-zA-ZÀ-ÿ]{2,}$/.test(words[i])) return words[i];
    }
    return null;
  }

  function extractTranslation(text, originalWord) {
    var m = text.match(/[""'']([^""'']+)[""'']/g);
    if (m) {
      for (var i = m.length - 1; i >= 0; i--) {
        var w = m[i].replace(/[""'']/g, '').trim();
        if (w && w.toLowerCase() !== originalWord.toLowerCase() && w.length < 30) return w;
      }
    }
    m = text.match(/(?:se diz|significa|traduz[ -]?se como|e|pode ser)\s+[""'']?([a-zA-ZÀ-ÿ\s]+?)[""'']?/i);
    if (m) {
      var w = m[1].replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
      if (w && w.toLowerCase() !== originalWord.toLowerCase()) return w;
    }
    return null;
  }

  function saveTranslate(original, translation, source) {
    if (!original || !translation || original.toLowerCase() === translation.toLowerCase()) return;
    var r = Store.addWord(original, translation, source);
    if (r.success) App.showToast(original + ' → ' + translation + ' salva!', 'success');
  }

  function sendMessage(text) {
    if (!text.trim() || isLoading) return;
    var clean = text.trim();
    messages.push({ role: 'user', content: clean });
    isLoading = true;
    App.refreshCurrentTab();
    scrollToBottom();

    var promise;
    if (isSingleWord(clean)) {
      promise = Ai.translate(clean, '').then(function(t) {
        saveTranslate(clean, t, 'chat');
        return { text: clean + ' = ' + t };
      });
    } else {
      promise = Ai.chat(messages).then(function(result) {
        if (!result.error && isTranslateRequest(clean)) {
          var word = extractWord(clean);
          var translation = extractTranslation(result.text, word || '');
          if (word && translation) saveTranslate(word, translation, 'chat');
        }
        return result;
      });
    }

    promise.then(function(result) {
      isLoading = false;
      if (result.error) {
        messages.push({ role: 'assistant', content: 'Erro: ' + result.error });
      } else {
        messages.push({ role: 'assistant', content: result.text });
      }
      App.refreshCurrentTab();
      scrollToBottom();
    }).catch(function() {
      isLoading = false;
      messages.push({ role: 'assistant', content: 'Erro de conexao. Tente novamente.' });
      App.refreshCurrentTab();
      scrollToBottom();
    });
  }

  function scrollToBottom() {
    setTimeout(function() {
      var el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  function bindEvents(container) {
    var sendBtn = container.querySelector('#chat-send-btn');
    var chatInput = container.querySelector('#chat-input');

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', function() {
        sendMessage(chatInput.value);
        chatInput.value = '';
      });
      chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
    }

    var sugBtns = container.querySelectorAll('[data-suggestion]');
    for (var i = 0; i < sugBtns.length; i++) {
      sugBtns[i].addEventListener('click', function() {
        sendMessage(this.getAttribute('data-suggestion'));
      });
    }

    scrollToBottom();
  }

  return { render: render, bindEvents: bindEvents };
})();
