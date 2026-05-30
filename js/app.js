/* ========================================
   LBS #1 — App Core / Router
   ======================================== */

const App = (() => {
  let currentTab = 'study'; // Default tab

  // Store references to our modules
  const modules = {
    vocab: VocabTab,
    movies: MoviesTab,
    study: StudyTab,
    music: MusicTab,
    chat: ChatTab
  };

  function hideApp() {
    document.getElementById('app').style.display = 'none';
  }

  function showApp() {
    document.getElementById('app').style.display = '';
  }

  function updateUserBar() {
    var bar = document.getElementById('user-bar');
    var emailEl = document.getElementById('user-bar-email');
    var appEl = document.getElementById('app');
    if (!bar || !emailEl) return;
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn()) {
      var u = Auth.getUser();
      bar.style.display = 'flex';
      emailEl.textContent = u ? u.email : '';
      if (appEl) appEl.style.paddingTop = '32px';
    } else {
      bar.style.display = 'none';
      if (appEl) appEl.style.paddingTop = '';
    }
  }

  function init() {
    // Make sure we have our data structure initialized
    if (!localStorage.getItem('lbs_settings')) {
      Store.updateSettings({ studyDirection: 'en-pt' });
    }

    // Set up navigation events
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
          switchTab(navItem.dataset.tab);
        }
      });
    });

    // Close word bubble on clicking the overlay
    document.getElementById('global-overlay')?.addEventListener('click', hideWordBubble);

    // Logout button
    document.getElementById('user-bar-logout')?.addEventListener('click', function() {
      if (typeof Auth !== 'undefined' && Auth.logout) Auth.logout();
      updateUserBar();
      showLoginFirst();
    });

    // Show login screen first, then render app
    showLoginFirst();
  }

  function showLoginFirst() {
    var alreadyLoggedIn = typeof Auth !== 'undefined' && Auth.init && Auth.init();
    if (alreadyLoggedIn) {
      updateUserBar();
      switchTab(currentTab);
      showApp();
      return;
    }
    if (typeof Auth !== 'undefined' && Auth.showLoginScreen) {
      Auth.showLoginScreen().then(function() {
        updateUserBar();
        switchTab(currentTab);
        showApp();
      });
    } else {
      switchTab(currentTab);
      showApp();
    }
  }

  function switchTab(tabId) {
    if (!modules[tabId]) return;

    currentTab = tabId;

    // Update bottom nav UI
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.tab === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Render the active tab content
    refreshCurrentTab();
  }

  function refreshCurrentTab() {
    const tabContainer = document.getElementById(`tab-${currentTab}`);
    if (tabContainer && modules[currentTab]) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.remove('active');
      });

      // Show and render the current tab
      tabContainer.innerHTML = modules[currentTab].render();
      modules[currentTab].bindEvents(tabContainer);
      tabContainer.classList.add('active');
    }
  }

  // ---- Global Utilities ----

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icon = type === 'success' 
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    // Remove toast element after animation completes
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  function showWordBubble(word, translation, context, source = 'movies') {
    const bubble = document.getElementById('word-bubble');
    const overlay = document.getElementById('global-overlay');
    
    if (!bubble || !overlay) return;

    document.getElementById('bubble-word').textContent = word;
    document.getElementById('bubble-translation').textContent = translation;
    
    const contextEl = document.getElementById('bubble-context');
    if (context) {
      document.getElementById('bubble-context-text').textContent = context;
      contextEl.style.display = 'block';
    } else {
      contextEl.style.display = 'none';
    }

    // Set up save button
    const saveBtn = document.getElementById('bubble-save-btn');
    // Remove old listeners by cloning
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', () => {
      const result = Store.addWord(word, translation, source);
      if (result.success) {
        showToast(result.message, 'success');
        hideWordBubble();
      } else {
        showToast(result.message, 'error');
      }
    });

    // Close button
    document.getElementById('bubble-close-btn').onclick = hideWordBubble;

    // Show
    overlay.classList.add('active');
    bubble.classList.add('active');
  }

  function hideWordBubble() {
    const bubble = document.getElementById('word-bubble');
    const overlay = document.getElementById('global-overlay');
    
    if (bubble) bubble.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init,
    switchTab,
    refreshCurrentTab,
    showToast,
    showWordBubble,
    hideWordBubble,
    hideApp,
    showApp,
    updateUserBar
  };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
