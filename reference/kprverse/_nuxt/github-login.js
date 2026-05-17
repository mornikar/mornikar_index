(function () {
  'use strict';

  var AUTH_STORAGE_KEY = 'mornikar_github_auth';
  var LEGACY_USER_KEY = 'gh_user';
  var PENDING_REDIRECT_KEY = 'mornikar_auth_pending_redirect';
  var REDIRECT_PATH = '/auth/github/callback';
  var SCOPES = 'read:user user:email';
  var DEFAULT_MMO_CMS_PATH = '/protocol';
  var githubClientId = window.MORNIKAR_GITHUB_CLIENT_ID || '';
  var githubConfigured = false;
  var user = readAuthUser();
  var lastWidgetSync = 0;

  window.__MORNIKAR_DISABLE_KPR_WIDGET = true;

  var GITHUB_ICON = '<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function readJson(key) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function readAuthUser() {
    var auth = readJson(AUTH_STORAGE_KEY);
    if (auth && auth.provider === 'github' && auth.user) return auth.user;
    return readJson(LEGACY_USER_KEY);
  }

  function writeAuth(nextUser, source) {
    var auth = {
      provider: 'github',
      source: source || 'github',
      user: nextUser,
      login: nextUser.login,
      authorizedAt: new Date().toISOString()
    };
    user = nextUser;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(nextUser));
    window.dispatchEvent(new CustomEvent('mornikar:github-auth', { detail: auth }));
    return auth;
  }

  function clearAuth() {
    user = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    window.dispatchEvent(new CustomEvent('mornikar:github-auth-clear'));
  }

  function isAuthorized() {
    return !!readAuthUser();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function normalizePath(pathname) {
    if (!pathname) return '/';
    return pathname !== '/' && pathname.charAt(pathname.length - 1) === '/' ? pathname.slice(0, -1) : pathname;
  }

  function isMmoCmsUrl(value) {
    if (!value) return false;
    try {
      var parsed = new URL(value, window.location.href);
      if (parsed.origin !== window.location.origin) return false;
      return normalizePath(parsed.pathname) === '/protocol' && parsed.searchParams.get('shell') !== 'mornikar';
    } catch (error) {
      return value === DEFAULT_MMO_CMS_PATH;
    }
  }

  function setPendingRedirect(url) {
    sessionStorage.setItem(PENDING_REDIRECT_KEY, url || DEFAULT_MMO_CMS_PATH);
  }

  function consumePendingRedirect() {
    var url = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    return url;
  }

  function continueAfterAuth() {
    var redirect = consumePendingRedirect();
    if (redirect) {
      window.location.assign(redirect);
      return;
    }
    if (isMmoCmsUrl(window.location.href)) {
      document.documentElement.classList.remove('mornikar-auth-lock');
      window.location.reload();
    }
  }

  function ensureDropdown() {
    var dropdown = document.getElementById('widget-login-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'widget-login-dropdown';
      document.body.appendChild(dropdown);
    }
    dropdown.style.display = 'flex';
    return dropdown;
  }

  function isLegacyLoginAsset(value) {
    return /dir8tnx7alyrd|main\.bundle|loginsignup-widget|widget_bundle/i.test(value || '');
  }

  function removeLegacyLoginArtifacts() {
    document.querySelectorAll('script[src],link[href]').forEach(function (node) {
      var value = node.getAttribute('src') || node.getAttribute('href') || '';
      if (value.indexOf('github-login') === -1 && isLegacyLoginAsset(value)) {
        node.remove();
      }
    });

    var overlay = document.getElementById('widget-login-kpr');
    if (overlay && !overlay.classList.contains('gh-modal-overlay')) {
      overlay.remove();
    }
  }

  function hasDirectChildClass(node, className) {
    return Array.prototype.some.call(node.children || [], function (child) {
      return child.classList && child.classList.contains(className);
    });
  }

  function hasLegacyLoginNodes(dropdown) {
    if (!dropdown) return false;
    return !!dropdown.querySelector(
      '.login-btn:not(.gh-login-btn), .widget-kpr, iframe, [class*="wallet"], [class*="connect"]'
    );
  }

  function syncAuthButton(force) {
    removeLegacyLoginArtifacts();
    var dropdown = document.getElementById('widget-login-dropdown');
    var currentUser = readAuthUser();
    var hasExpected = dropdown && (
      currentUser ? hasDirectChildClass(dropdown, 'gh-user-btn') : hasDirectChildClass(dropdown, 'gh-login-btn')
    );

    if (force || !dropdown || !hasExpected || hasLegacyLoginNodes(dropdown)) {
      renderAuthButton();
    }
  }

  function scheduleWidgetSync(force) {
    var now = Date.now();
    if (!force && now - lastWidgetSync < 120) return;
    lastWidgetSync = now;
    window.setTimeout(function () {
      syncAuthButton(!!force);
    }, 0);
  }

  function installWidgetTakeover() {
    if (document.documentElement.dataset.mornikarGithubWidgetTakeover === 'true') return;
    document.documentElement.dataset.mornikarGithubWidgetTakeover = 'true';

    syncAuthButton(true);

    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        scheduleWidgetSync(false);
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'href', 'class', 'style']
      });
    }

    [0, 100, 300, 700, 1500, 3000, 6000].forEach(function (delay) {
      window.setTimeout(function () {
        syncAuthButton(false);
      }, delay);
    });
  }

  function renderAuthButton() {
    var dropdown = ensureDropdown();
    dropdown.innerHTML = '';
    user = readAuthUser();
    if (user) {
      renderLoggedIn(dropdown, user);
    } else {
      renderSignInButton(dropdown);
    }
  }

  function renderSignInButton(dropdown) {
    var btn = document.createElement('button');
    btn.className = 'gh-login-btn';
    btn.type = 'button';
    btn.innerHTML = GITHUB_ICON + '<span>SIGN IN</span>';
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      showLoginModal({ reason: 'signin' });
    });
    dropdown.appendChild(btn);
  }

  function renderLoggedIn(dropdown, userData) {
    var btn = document.createElement('button');
    btn.className = 'gh-user-btn';
    btn.type = 'button';
    btn.innerHTML =
      '<img src="' + escapeHtml(userData.avatar_url || '') + '" class="gh-avatar-sm" alt="">' +
      '<span class="gh-username">' + escapeHtml(userData.login || 'GitHub') + '</span>';
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggleUserMenu(dropdown, userData);
    });
    dropdown.appendChild(btn);
  }

  function toggleUserMenu(dropdown, userData) {
    var existing = dropdown.querySelector('.gh-user-menu');
    if (existing) {
      existing.remove();
      return;
    }

    var menu = document.createElement('div');
    menu.className = 'gh-user-menu';
    menu.innerHTML =
      '<div class="gh-menu-header">' +
        '<img src="' + escapeHtml(userData.avatar_url || '') + '" class="gh-avatar-md" alt="">' +
        '<div class="gh-menu-info">' +
          '<div class="gh-menu-name">' + escapeHtml(userData.name || userData.login || 'GitHub') + '</div>' +
          '<div class="gh-menu-login">@' + escapeHtml(userData.login || 'github') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="gh-menu-divider"></div>' +
      '<a href="' + escapeHtml(userData.html_url || 'https://github.com') + '" target="_blank" rel="noopener noreferrer" class="gh-menu-item">View GitHub Profile</a>' +
      '<a href="' + DEFAULT_MMO_CMS_PATH + '" class="gh-menu-item gh-menu-primary" data-mornikar-mmo-cms>Open MMO_CMS</a>' +
      '<button class="gh-menu-item gh-menu-danger" id="gh-signout" type="button">Sign out</button>';
    dropdown.appendChild(menu);

    menu.querySelector('#gh-signout').addEventListener('click', function () {
      clearAuth();
      renderAuthButton();
    });

    window.setTimeout(function () {
      document.addEventListener('click', function closeMenu(event) {
        if (!dropdown.contains(event.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  function showLoginModal(options) {
    var overlay = document.getElementById('widget-login-kpr');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'widget-login-kpr';
      document.body.appendChild(overlay);
    }

    var isMmo = options && options.reason === 'mmo';
    overlay.style.display = 'flex';
    overlay.className = 'gh-modal-overlay';
    overlay.innerHTML =
      '<div class="gh-modal">' +
        '<button class="gh-modal-close" type="button" aria-label="Close">' + CLOSE_ICON + '</button>' +
        '<div class="gh-modal-body">' +
          '<div class="gh-modal-logo">' + GITHUB_ICON + '</div>' +
          '<h2 class="gh-modal-title">Sign in with GitHub</h2>' +
          '<p class="gh-modal-desc">' + (isMmo ? 'MMO_CMS requires GitHub authorization before opening.' : 'Authorize GitHub to continue with Mornikar.') + '</p>' +
          '<button class="gh-oauth-btn" id="gh-oauth-start" type="button">' + GITHUB_ICON + '<span>Continue with GitHub</span></button>' +
          (githubClientId ? '' : '<p class="gh-modal-hint">OAuth client is not configured, local demo authorization will be used.</p>') +
        '</div>' +
      '</div>';

    overlay.querySelector('.gh-modal-close').addEventListener('click', function () {
      overlay.style.display = 'none';
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) overlay.style.display = 'none';
    });
    overlay.querySelector('#gh-oauth-start').addEventListener('click', function () {
      startGithubAuth(overlay);
    });
  }

  function startGithubAuth(overlay) {
    if (!githubClientId) {
      demoLogin(overlay);
      return;
    }

    var state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('mornikar_github_oauth_state', state);
    var redirectUri = window.location.origin + REDIRECT_PATH;
    var authUrl = 'https://github.com/login/oauth/authorize' +
      '?client_id=' + encodeURIComponent(githubClientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&scope=' + encodeURIComponent(SCOPES) +
      '&state=' + encodeURIComponent(state);
    window.open(authUrl, 'github-auth', 'width=600,height=720');
  }

  function demoLogin(overlay) {
    var btn = overlay.querySelector('#gh-oauth-start');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="gh-spinner"></span><span>Authorizing...</span>';
    }

    window.setTimeout(function () {
      var demoUser = {
        login: 'mornikar',
        name: 'Mornikar',
        avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
        html_url: 'https://github.com/mornikar'
      };
      writeAuth(demoUser, 'demo');
      overlay.style.display = 'none';
      renderAuthButton();
      continueAfterAuth();
    }, 700);
  }

  function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    var state = params.get('state');
    if (!code) return;

    var expectedState = sessionStorage.getItem('mornikar_github_oauth_state');
    if (expectedState && state && expectedState !== state) {
      renderCallbackMessage('GitHub OAuth state mismatch.');
      return;
    }

    renderCallbackMessage('Authorizing GitHub...');
    fetch('/auth/github/user?code=' + encodeURIComponent(code) + '&state=' + encodeURIComponent(state || ''))
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (!data.user) throw new Error(data.error || 'GitHub authorization failed');
        if (window.opener) {
          window.opener.postMessage({ type: 'gh-login-success', user: data.user }, window.location.origin);
          window.close();
        } else {
          writeAuth(data.user, 'oauth');
          window.location.replace(consumePendingRedirect() || '/');
        }
      })
      .catch(function (error) {
        renderCallbackMessage(error.message || 'GitHub authorization failed.');
      });
  }

  function renderCallbackMessage(message) {
    document.body.innerHTML = '<div class="gh-callback-message">' + escapeHtml(message) + '</div>';
  }

  function loadOAuthConfig() {
    if (githubClientId) {
      githubConfigured = true;
      return Promise.resolve();
    }
    return fetch('/auth/github/config', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (config) {
        if (config && config.clientId) {
          githubClientId = config.clientId;
          githubConfigured = !!config.configured;
        }
      })
      .catch(function () {});
  }

  function installMmoCmsGuard() {
    if (document.documentElement.dataset.mornikarGithubMmoGuard === 'true') return;
    document.documentElement.dataset.mornikarGithubMmoGuard = 'true';

    document.addEventListener('click', function (event) {
      var target = event.target;
      var link = target && target.closest && target.closest('a[href]');
      if (!link || !isMmoCmsUrl(link.getAttribute('href'))) return;
      if (isAuthorized()) return;
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      event.stopPropagation();
      setPendingRedirect(link.getAttribute('href') || DEFAULT_MMO_CMS_PATH);
      document.documentElement.classList.add('mornikar-auth-lock');
      showLoginModal({ reason: 'mmo' });
    }, true);
  }

  function lockCurrentMmoCmsIfNeeded() {
    if (!isMmoCmsUrl(window.location.href) || isAuthorized()) return;
    document.documentElement.classList.add('mornikar-auth-lock');
    setPendingRedirect(DEFAULT_MMO_CMS_PATH);
    window.setTimeout(function () {
      showLoginModal({ reason: 'mmo' });
    }, 300);
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'gh-login-success' && event.data.user) {
      writeAuth(event.data.user, 'oauth');
      var overlay = document.getElementById('widget-login-kpr');
      if (overlay) overlay.style.display = 'none';
      renderAuthButton();
      continueAfterAuth();
    }
  });

  window.MORNIKAR_GITHUB_AUTH = {
    isAuthorized: isAuthorized,
    getUser: readAuthUser,
    signIn: function () { showLoginModal({ reason: 'signin' }); },
    signOut: function () { clearAuth(); renderAuthButton(); }
  };

  function boot() {
    installMmoCmsGuard();
    loadOAuthConfig().then(function () {
      if (window.location.pathname === REDIRECT_PATH) {
        handleOAuthCallback();
        return;
      }
      installWidgetTakeover();
      lockCurrentMmoCmsIfNeeded();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
