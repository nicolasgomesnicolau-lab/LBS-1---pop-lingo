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
      }
      return json;
    });
  }

  function logout() {
    // Sync everything before logout
    if (typeof Store !== 'undefined') {
      if (Store.syncVocabToServer) Store.syncVocabToServer();
      if (Store.syncPlaylistToServer) Store.syncPlaylistToServer();
      if (Store.syncTrackingToServer) Store.syncTrackingToServer();
    }
    clearSession();
    var screen = document.getElementById('login-screen');
    if (screen) screen.classList.add('active');
    if (typeof App !== 'undefined' && App.hideApp) App.hideApp();
  }

  function syncAfterLogin() {
    if (typeof Store !== 'undefined' && Store.fetchVocabFromServer) {
      Store.fetchVocabFromServer();
    }
    if (typeof Achievements !== 'undefined' && Achievements.fetchFromServer) {
      Achievements.fetchFromServer();
    }
    if (typeof Store !== 'undefined' && Store.fetchTrackingFromServer) {
      Store.fetchTrackingFromServer().then(function() {
        if (typeof Achievements !== 'undefined') {
          Achievements.checkAll(Achievements.getState());
        }
      });
    }
    if (typeof Store !== 'undefined' && Store.fetchPlaylistFromServer) {
      Store.fetchPlaylistFromServer();
    }
  }

  // Full-screen login page — returns promise resolving with true (logged in) or false (guest)
  function showLoginScreen() {
    return new Promise(function(resolve) {
      var screen = document.getElementById('login-screen');
      if (!screen) { resolve(false); return; }

      var emailInput = screen.querySelector('#login-email');
      var passInput = screen.querySelector('#login-password');
      var loginBtn = screen.querySelector('#login-btn');
      var signupBtn = screen.querySelector('#signup-btn');
      var skipBtn = screen.querySelector('#login-skip-btn');
      var errorEl = screen.querySelector('#login-error');
      var modeToggle = screen.querySelector('#login-mode-toggle');
      var titleEl = screen.querySelector('#login-title');
      var subtitleEl = screen.querySelector('#login-subtitle');

      var mode = 'login';

      function setMode(m) {
        mode = m;
        titleEl.textContent = m === 'login' ? 'Entrar' : 'Criar Conta';
        subtitleEl.textContent = m === 'login' ? 'Acesse sua conta para sincronizar seus estudos' : 'Crie uma conta e leve seu vocabulário para qualquer dispositivo';
        loginBtn.textContent = m === 'login' ? 'Entrar' : 'Criar Conta';
        signupBtn.style.display = m === 'login' ? 'none' : 'none';
        modeToggle.textContent = m === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar';
        errorEl.textContent = '';
        errorEl.style.display = 'none';
        emailInput.value = '';
        passInput.value = '';
      }

      function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
      }

      function doAuth() {
        var email = emailInput.value.trim();
        var password = passInput.value.trim();
        if (!email || !password) { showError('Preencha email e senha'); return; }
        if (password.length < 6) { showError('Senha deve ter no mínimo 6 caracteres'); return; }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="btn-spinner"></span> Aguarde...';

        var promise = mode === 'login' ? login(email, password) : signup(email, password);

        promise.then(function(json) {
          loginBtn.disabled = false;
          loginBtn.textContent = mode === 'login' ? 'Entrar' : 'Criar Conta';
          if (json.success) {
            screen.classList.remove('active');
            syncAfterLogin();
            resolve(true);
          } else {
            var msg = json.error || 'Erro desconhecido';
            if (msg === 'Invalid login credentials') msg = 'Email ou senha incorretos';
            if (msg.includes('already registered')) msg = 'Este email já está cadastrado';
            if (msg.includes('Email not confirmed')) msg = 'Confirme seu email antes de entrar';
            showError(msg);
            loginBtn.textContent = mode === 'login' ? 'Entrar' : 'Criar Conta';
          }
        });
      }

      // Clone buttons to remove old listeners
      var newLogin = loginBtn.cloneNode(true);
      loginBtn.parentNode.replaceChild(newLogin, loginBtn);
      var newToggle = modeToggle.cloneNode(true);
      modeToggle.parentNode.replaceChild(newToggle, modeToggle);
      var newSkip = skipBtn.cloneNode(true);
      skipBtn.parentNode.replaceChild(newSkip, skipBtn);

      newLogin.addEventListener('click', doAuth);
      newToggle.addEventListener('click', function() { setMode(mode === 'login' ? 'signup' : 'login'); });
      newSkip.addEventListener('click', function() {
        screen.classList.remove('active');
        resolve(false);
      });

      passInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') doAuth();
      });

      screen.classList.add('active');
      setMode('login');
      emailInput.focus();
    });
  }

  // Check session on load
  function init() {
    var token = getToken();
    if (!token) return false;
    fetch('/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) { return r.json(); }).then(function(json) {
      if (json.user) {
        syncAfterLogin();
      } else {
        clearSession();
      }
    }).catch(function() { clearSession(); });
    return true;
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
    showLoginScreen: showLoginScreen
  };
})();
