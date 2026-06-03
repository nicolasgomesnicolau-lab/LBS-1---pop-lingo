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
      '<input type="text" class="input-field" id="chat-input" placeholder="Digite uma palavra ou duvida..."' + (isLoading ? ' disabled' : '') + '>' +
      '<button class="chat-send-btn" id="chat-send-btn"' + (isLoading ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>';
  }

  function renderWelcome() {
    return '<div class="chat-welcome">' +
      '<div class="chat-welcome-icon anim-float">🤖</div>' +
      '<h2>Ola! 👋</h2>' +
      '<p>Digite qualquer palavra em ingles que eu traduzo e vc pode salvar na biblioteca!</p>' +
      '<div class="chat-suggestions">' +
      suggestions.map(function(s) { return '<button class="chat-suggestion" data-suggestion="' + escapeHtml(s) + '">' + s + '</button>'; }).join('') +
      '</div></div>';
  }

  function renderMessages() {
    var html = '<div class="chat-messages">';
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      if (msg.role === 'user') {
        html += '<div class="chat-bubble chat-bubble-user">' + escapeHtml(msg.content) + '</div>';
      } else {
        html += '<div class="chat-bubble chat-bubble-bot">' + msg.content + '</div>';
      }
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

  function extractWordFromInput(text) {
    var clean = text.trim().replace(/[.,!?;:]+$/g, '').trim();
    if (/^[a-zA-ZÀ-ÿ']+$/.test(clean)) return clean.toLowerCase();
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
    var words = clean.split(/\s+/);
    for (var i = words.length - 1; i >= 0; i--) {
      if (/^[a-zA-ZÀ-ÿ]{2,}$/.test(words[i])) return words[i].toLowerCase();
    }
    return null;
  }

  function renderTranslateResult(word, translation) {
    var w = escapeHtml(word);
    var t = escapeHtml(translation);
    return '<div style="padding:4px 0">' +
      '<div style="font-size:var(--font-lg);font-weight:700;margin-bottom:4px">' + w + '</div>' +
      '<div style="font-size:var(--font-md);color:var(--accent);margin-bottom:12px">' + t + '</div>' +
      '<button class="btn btn-sm btn-primary chat-save-btn" data-save-word="' + w + '" data-save-translation="' + t + '" style="width:100%">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' +
      ' Salvar na biblioteca</button></div>';
  }

  function appendMessage(role, html) {
    var container = document.querySelector('.chat-messages');
    if (!container) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot');
    bubble.innerHTML = html;
    container.appendChild(bubble);
    scrollToBottom();
  }

  function removeLoading() {
    var el = document.querySelector('.chat-loading');
    if (el) el.remove();
  }

  function addLoading() {
    var container = document.querySelector('.chat-messages');
    if (!container) {
      // First message — need full re-render to create chat-messages
      return false;
    }
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-bot chat-loading';
    bubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(bubble);
    scrollToBottom();
    return true;
  }

  function sendMessage(text) {
    if (!text.trim() || isLoading) return;
    var clean = text.trim();
    messages.push({ role: 'user', content: clean });
    isLoading = true;

    var container = document.querySelector('.chat-messages');
    if (container) {
      appendMessage('user', escapeHtml(clean));
      var hasLoading = addLoading();
      if (!hasLoading) {
        App.refreshCurrentTab();
        isLoading = false;
        return;
      }
    } else {
      var tabEl = document.getElementById('tab-chat');
      tabEl.innerHTML = '<div class="tab-header">' +
        '<div class="tab-header-icon">💬</div>' +
        '<div class="tab-header-text"><h1>Chat IA</h1><p>Seu assistente de ingles</p></div></div>' +
        '<div class="chat-container"><div class="chat-messages"></div></div>' +
        '<div class="chat-input-area">' +
        '<input type="text" class="input-field" id="chat-input" placeholder="Digite uma palavra ou duvida..."' + (isLoading ? ' disabled' : '') + '>' +
        '<button class="chat-send-btn" id="chat-send-btn"' + (isLoading ? ' disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div>';
      for (var mi = 0; mi < messages.length; mi++) {
        appendMessage(messages[mi].role, messages[mi].role === 'user' ? escapeHtml(messages[mi].content) : messages[mi].content);
      }
      if (isLoading) {
        var chatMessages = tabEl.querySelector('.chat-messages');
        if (chatMessages) {
          var loadingBubble = document.createElement('div');
          loadingBubble.className = 'chat-bubble chat-bubble-bot chat-loading';
          loadingBubble.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
          chatMessages.appendChild(loadingBubble);
        }
      }
      bindEvents(tabEl);
    }

    var word = extractWordFromInput(clean);
    if (word) {
      Ai.translate(word, '').then(function(translation) {
        isLoading = false;
        removeLoading();
        var isSame = word.toLowerCase() === translation.toLowerCase();
        var displayText = isSame
          ? '<em style="color:var(--text-muted)">Nao consegui traduzir "' + escapeHtml(word) + '". Tente uma frase completa.</em>'
          : renderTranslateResult(word, translation);
        messages.push({ role: 'assistant', content: displayText });
        appendMessage('assistant', displayText);
        bindSaveButtons();
      });
    } else {
      Ai.chat(messages).then(function(result) {
        isLoading = false;
        removeLoading();
        var rawText = result.text || '...';
        var safeText = result.error ? 'Erro: ' + escapeHtml(result.error) : escapeHtml(rawText);
        var botText = safeText;
        var extraWord = extractWordFromInput(clean);
        if (extraWord && !result.error) {
          var m = rawText.match(/[""'']([^""'']+)[""'']/);
          var extraTrans = m ? m[1] : null;
          if (extraTrans && extraTrans.toLowerCase() !== extraWord.toLowerCase()) {
            botText += '<br><br>' + renderTranslateResult(extraWord, extraTrans);
          }
        }
        messages.push({ role: 'assistant', content: botText });
        appendMessage('assistant', botText);
        bindSaveButtons();
      }).catch(function() {
        isLoading = false;
        removeLoading();
        messages.push({ role: 'assistant', content: 'Erro de conexao. Tente novamente.' });
        appendMessage('assistant', 'Erro de conexao. Tente novamente.');
      });
    }
  }

  function scrollToBottom() {
    setTimeout(function() {
      var el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  function bindSaveButtons() {
    document.querySelectorAll('.chat-save-btn').forEach(function(btn) {
      // Avoid double-binding
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function() {
        var word = this.getAttribute('data-save-word');
        var translation = this.getAttribute('data-save-translation');
        var result = Store.addWord(word, translation, 'chat');
        if (result.success) {
          App.showToast(result.message, 'success');
          this.textContent = '✓ Salvo!';
          this.disabled = true;
          this.style.opacity = '0.5';
        } else {
          App.showToast(result.message, 'error');
        }
      });
    });
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

    bindSaveButtons();
    scrollToBottom();
  }

  return { render: render, bindEvents: bindEvents };
})();
