(function () {
  var metaUrl = document.querySelector('meta[name="mornikar-external-shell-url"]');
  var metaLabel = document.querySelector('meta[name="mornikar-external-shell-label"]');
  var config = window.MORNIKAR_EXTERNAL_SHELL || {};
  var targetUrl = config.url || (metaUrl && metaUrl.getAttribute('content'));
  var label = config.label || (metaLabel && metaLabel.getAttribute('content')) || 'External page';
  var intervalId = null;

  try {
    var params = new URLSearchParams(window.location.search || '');
    var pathname = window.location.pathname.replace(/\/$/, '') || '/';
    if ((pathname === '/protocol' || /\/protocol$/.test(pathname)) && params.get('shell') === 'mornikar') {
      targetUrl = 'https://mornikar.github.io/Mornikar/';
      label = 'Mornikar';
      window.MORNIKAR_EXTERNAL_SHELL = { label: label, url: targetUrl };
    }
  } catch (error) {}

  if (!targetUrl) return;

  function mount() {
    if (!document.body) return;
    document.documentElement.classList.add('mornikar-external-shell');
    normalizeFrameClasses();

    var existing = document.querySelector('.mornikar-external-shell-bg');
    if (existing) {
      var currentFrame = existing.querySelector('iframe');
      if (currentFrame && currentFrame.getAttribute('src') !== targetUrl) {
        currentFrame.setAttribute('src', targetUrl);
      }
      return;
    }

    var shell = document.createElement('div');
    shell.className = 'mornikar-external-shell-bg';
    shell.setAttribute('data-shell-label', label);

    var frame = document.createElement('iframe');
    frame.src = targetUrl;
    frame.title = label + ' background';
    frame.loading = 'eager';
    frame.referrerPolicy = 'no-referrer-when-downgrade';

    shell.appendChild(frame);
    document.body.insertBefore(shell, document.body.firstChild);
  }

  function normalizeFrameClasses() {
    var groups = document.querySelectorAll('.the-frame-submenu .group');
    for (var i = 0; i < groups.length; i += 1) {
      groups[i].classList.add('submenu');
    }
  }

  function keepMounted() {
    mount();
    if (!intervalId) intervalId = window.setInterval(mount, 1000);
    if (window.MutationObserver && document.body && !window.__mornikarExternalShellObserver) {
      window.__mornikarExternalShellObserver = new MutationObserver(mount);
      window.__mornikarExternalShellObserver.observe(document.body, { childList: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', keepMounted, { once: true });
  } else {
    keepMounted();
  }
})();
