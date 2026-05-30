/* ========================================
   LBS #1 — Auth (Supabase JWT)
   ======================================== */

const Auth = (() => {
  const STORAGE_KEY = 'lbs_auth_session';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function setSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function isLoggedIn() {
    var s = getSession();
    return !!(s && s.access_token);
  }

  function getToken() {
    var s = getSession();
    return s ? s.access_token : null;
  }

  function getUser() {
    var s = getSession();
    return s ? s.user : null;
  }

  function signup(email, password) {
    return fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function(r) { return r.json(); }).then(function(json) {
      if (json.success && json.session) {
        setSession({ access_token: json.session.access_token, user: json.user });
        syncAfterLogin();
      }
      return json;
    });
  }

  function login(email, password) {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    }).then(function(r) { return r.json(); }).then(function(json) {
      if (json.success && json.session) {
        setSession({ access_token: json.session.access_token, user: json.user });
        syncAfterLogin();
      }
      return json;
    });
  }

  function logout() {
    clearSession();
  }

  function syncAfterLogin() {
    if (typeof Store !== 'undefined' && Store.fetchVocabFromServer) {
      Store.fetchVocabFromServer();
    }
  }

  // Show login modal — returns promise that resolves with success/fail
  function showLoginModal() {
    return new Promise(function(resolve) {
      var overlay = document.getElementById('auth-overlay');
      var modal = document.getElementById('auth-modal');
      if (!overlay || !modal) { resolve(false); return; }

      var mode = 'login';
      var emailInput = modal.querySelector('#auth-email');
      var passInput = modal.querySelector('#auth-password');
      var submitBtn = modal.querySelector('#auth-submit');
      var toggleBtn = modal.querySelector('#auth-toggle');
      var errorEl = modal.querySelector('#auth-error');
      var titleEl = modal.querySelector('#auth-title');

      function setMode(m) {
        mode = m;
        titleEl.textContent = m === 'login' ? 'Entrar' : 'Criar Conta';
        submitBtn.textContent = m === 'login' ? 'Entrar' : 'Criar Conta';
        toggleBtn.textContent = m === 'login' ? 'Criar uma conta' : 'Já tem conta? Entrar';
        errorEl.textContent = '';
        emailInput.value = '';
        passInput.value = '';
        emailInput.focus();
      }

      function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }

      function doSubmit() {
        var email = emailInput.value.trim();
        var password = passInput.value.trim();
        if (!email || !password) { showError('Preencha email e senha'); return; }
        if (password.length < 6) { showError('Senha deve ter no mínimo 6 caracteres'); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Aguarde...';

        var promise = mode === 'login' ? login(email, password) : signup(email, password);

        promise.then(function(json) {
          submitBtn.disabled = false;
          if (json.success) {
            overlay.classList.remove('active');
            modal.classList.remove('active');
            resolve(true);
          } else {
            var msg = json.error || 'Erro desconhecido';
            if (msg === 'Invalid login credentials') msg = 'Email ou senha incorretos';
            if (msg.includes('already registered')) msg = 'Este email já está cadastrado';
            if (msg.includes('Email not confirmed')) msg = 'Confirme seu email antes de entrar';
            showError(msg);
            submitBtn.textContent = mode === 'login' ? 'Entrar' : 'Criar Conta';
          }
        });
      }

      // Clean up old listeners by cloning buttons
      var newSubmit = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newSubmit, submitBtn);
      var newToggle = toggleBtn.cloneNode(true);
      toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);

      newSubmit.addEventListener('click', doSubmit);
      newToggle.addEventListener('click', function() { setMode(mode === 'login' ? 'signup' : 'login'); });

      passInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doSubmit();
      });

      overlay.classList.add('active');
      modal.classList.add('active');
      setMode('login');

      // Close on overlay click
      overlay.addEventListener('click', function() {
        overlay.classList.remove('active');
        modal.classList.remove('active');
        resolve(false);
      }, { once: true });
    });
  }

  // Check session on load and sync vocab
  function init() {
    var token = getToken();
    if (!token) return;
    fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) { return r.json(); }).then(function(json) {
      if (json.user) {
        syncAfterLogin();
      } else {
        clearSession();
      }
    }).catch(function() { clearSession(); });
  }

  return {
    init: init,
    signup: signup,
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getToken: getToken,
    getUser: getUser,
    getSession: getSession,
    showLoginModal: showLoginModal
  };
})();
