/**
 * GitHub OAuth Login — 替换 KPR 原生的 main.bundle.js 登录 Widget
 * 等待 #widget-login-dropdown 被创建后注入 GitHub 登录按钮
 */
(function () {
  'use strict';

  /* ── Config ── */
  // 本地开发时留空，走 mock 模式（展示 UI 不做真实 OAuth）
  // 部署时填入 GitHub OAuth App 的 Client ID
  var GITHUB_CLIENT_ID = '';
  var REDIRECT_PATH = '/auth/github/callback';
  var SCOPES = 'read:user user:email';

  /* ── State ── */
  var user = null;
  try { user = JSON.parse(localStorage.getItem('gh_user')); } catch (e) {}

  /* ── SVG Icons ── */
  var GITHUB_ICON = '<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" style="vertical-align:-3px;margin-right:8px"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var AVATAR_PLACEHOLDER = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="vertical-align:-3px;margin-right:8px"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>';

  /* ── Wait for #widget-login-dropdown ── */
  function waitForElement(id, callback) {
    var el = document.getElementById(id);
    if (el) { callback(el); return; }
    var observer = new MutationObserver(function () {
      var el = document.getElementById(id);
      if (el) { observer.disconnect(); callback(el); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Fallback: check periodically
    var timer = setInterval(function () {
      var el = document.getElementById(id);
      if (el) { clearInterval(timer); observer.disconnect(); callback(el); }
    }, 500);
  }

  /* ── Initialize ── */
  function init() {
    waitForElement('widget-login-dropdown', function (dropdown) {
      // Block KPR's original widget from injecting content
      dropdown.innerHTML = '';
      dropdown.style.display = 'flex';

      if (user) {
        renderLoggedIn(dropdown, user);
      } else {
        renderSignInButton(dropdown);
      }
    });
  }

  /* ── Logged-out: Sign in button ── */
  function renderSignInButton(dropdown) {
    var btn = document.createElement('button');
    btn.className = 'gh-login-btn';
    btn.innerHTML = GITHUB_ICON + '<span>SIGN IN</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      showLoginModal();
    });
    dropdown.appendChild(btn);
  }

  /* ── Logged-in: User info ── */
  function renderLoggedIn(dropdown, userData) {
    var btn = document.createElement('button');
    btn.className = 'gh-user-btn';
    btn.innerHTML = '<img src="' + userData.avatar_url + '" class="gh-avatar-sm" />' +
      '<span class="gh-username">' + escapeHtml(userData.login) + '</span>';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleUserMenu(dropdown, userData);
    });
    dropdown.appendChild(btn);
  }

  function toggleUserMenu(dropdown, userData) {
    var existing = dropdown.querySelector('.gh-user-menu');
    if (existing) { existing.remove(); return; }

    var menu = document.createElement('div');
    menu.className = 'gh-user-menu';
    menu.innerHTML =
      '<div class="gh-menu-header">' +
        '<img src="' + userData.avatar_url + '" class="gh-avatar-md" />' +
        '<div class="gh-menu-info">' +
          '<div class="gh-menu-name">' + escapeHtml(userData.name || userData.login) + '</div>' +
          '<div class="gh-menu-login">@' + escapeHtml(userData.login) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="gh-menu-divider"></div>' +
      '<a href="' + userData.html_url + '" target="_blank" class="gh-menu-item">' +
        'View GitHub Profile' +
      '</a>' +
      '<button class="gh-menu-item gh-menu-danger" id="gh-signout">Sign out</button>';
    dropdown.appendChild(menu);

    // Close on outside click
    function closeMenu(e) {
      if (!dropdown.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    }
    setTimeout(function () { document.addEventListener('click', closeMenu); }, 0);

    // Sign out
    menu.querySelector('#gh-signout').addEventListener('click', function () {
      user = null;
      localStorage.removeItem('gh_user');
      dropdown.innerHTML = '';
      renderSignInButton(dropdown);
    });
  }

  /* ── Login Modal ── */
  function showLoginModal() {
    var overlay = document.getElementById('widget-login-kpr');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'widget-login-kpr';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    overlay.className = 'gh-modal-overlay';
    overlay.innerHTML =
      '<div class="gh-modal">' +
        '<button class="gh-modal-close">' + CLOSE_ICON + '</button>' +
        '<div class="gh-modal-body">' +
          '<div class="gh-modal-logo">' + GITHUB_ICON + '</div>' +
          '<h2 class="gh-modal-title">Sign in to Mornikar</h2>' +
          '<p class="gh-modal-desc">Connect your GitHub account to access your collection and profile.</p>' +
          '<button class="gh-oauth-btn" id="gh-oauth-start">' +
            GITHUB_ICON + 'Continue with GitHub' +
          '</button>' +
          (GITHUB_CLIENT_ID ? '' : '<p class="gh-modal-hint">⚠ OAuth not configured — running in demo mode</p>') +
        '</div>' +
      '</div>';

    // Close button
    overlay.querySelector('.gh-modal-close').addEventListener('click', function () {
      overlay.style.display = 'none';
    });

    // Click outside to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });

    // OAuth start
    overlay.querySelector('#gh-oauth-start').addEventListener('click', function () {
      if (!GITHUB_CLIENT_ID) {
        // Demo mode: simulate login
        demoLogin(overlay);
      } else {
        // Real OAuth: open popup
        var redirectUri = window.location.origin + REDIRECT_PATH;
        var authUrl = 'https://github.com/login/oauth/authorize' +
          '?client_id=' + encodeURIComponent(GITHUB_CLIENT_ID) +
          '&redirect_uri=' + encodeURIComponent(redirectUri) +
          '&scope=' + encodeURIComponent(SCOPES);
        window.open(authUrl, 'github-auth', 'width=600,height=700');
      }
    });
  }

  /* ── Demo Login (no real OAuth) ── */
  function demoLogin(overlay) {
    var btn = overlay.querySelector('#gh-oauth-start');
    btn.disabled = true;
    btn.innerHTML = '<span class="gh-spinner"></span> Connecting...';

    setTimeout(function () {
      var demoUser = {
        login: 'mornikar',
        name: 'Mornikar',
        avatar_url: 'https://avatars.githubusercontent.com/u/0?v=4',
        html_url: 'https://github.com/mornikar'
      };
      user = demoUser;
      localStorage.setItem('gh_user', JSON.stringify(demoUser));
      overlay.style.display = 'none';

      // Refresh button
      var dropdown = document.getElementById('widget-login-dropdown');
      if (dropdown) {
        dropdown.innerHTML = '';
        renderLoggedIn(dropdown, demoUser);
      }
    }, 1500);
  }

  /* ── OAuth Callback Handler (for popup window) ── */
  function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    if (!code) return;

    // Fetch user data from our server
    fetch('/auth/github/user?code=' + encodeURIComponent(code))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.user) {
          user = data.user;
          localStorage.setItem('gh_user', JSON.stringify(data.user));
          // Notify opener
          if (window.opener) {
            window.opener.postMessage({ type: 'gh-login-success', user: data.user }, '*');
            window.close();
          }
        }
      })
      .catch(function (err) {
        console.error('GitHub auth error:', err);
      });
  }

  /* ── Listen for popup callback ── */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'gh-login-success') {
      user = e.data.user;
      localStorage.setItem('gh_user', JSON.stringify(e.data.user));
      // Close modal
      var overlay = document.getElementById('widget-login-kpr');
      if (overlay) overlay.style.display = 'none';
      // Refresh dropdown
      var dropdown = document.getElementById('widget-login-dropdown');
      if (dropdown) {
        dropdown.innerHTML = '';
        renderLoggedIn(dropdown, user);
      }
    }
  });

  /* ── Helpers ── */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ── Boot ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Check if we're on the OAuth callback page
  if (window.location.pathname === REDIRECT_PATH) {
    handleOAuthCallback();
  }
})();
