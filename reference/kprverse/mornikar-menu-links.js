(function () {
  function textOf(element) {
    return ((element && element.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function canonicalText(element) {
    var raw = textOf(element);
    var compact = raw.replace(/\s+/g, '');
    if (compact.length > 1 && compact.length % 2 === 0) {
      var half = compact.slice(0, compact.length / 2);
      if (half === compact.slice(compact.length / 2)) return half;
    }
    return raw;
  }

  function findHackyRoot(element) {
    if (!element) return null;
    if (element.classList && element.classList.contains('hacky-text')) return element;
    return (element.closest && element.closest('.hacky-text')) ||
      (element.querySelector && element.querySelector('.hacky-text')) ||
      element;
  }

  var shellRoutes = {
    '/protocol': true,
    '/journal': true,
    '/media': true,
    '/gallery': true,
    '/about': true,
    '/mornikar': true,
    '/bilibili': true,
    '/opensea-profile': true
  };

  function normalizeMenuRoute(url) {
    if (url === '/journal') return '/protocol?shell=mornikar';
    if (url.indexOf('/mornikar') === 0) return '/Mornikar/';
    return url;
  }

  function shellRouteFromHref(href) {
    if (!href) return '';
    try {
      var parsed = new URL(href, window.location.href);
      if (parsed.origin !== window.location.origin) return '';
      return shellRoutes[parsed.pathname] ? normalizeMenuRoute(parsed.pathname + parsed.search + parsed.hash) : '';
    } catch (error) {
      return shellRoutes[href] ? normalizeMenuRoute(href) : '';
    }
  }

  function setHackyText(root, text) {
    if (!root) return;
    var spacers = root.querySelectorAll ? root.querySelectorAll('.spacer') : [];
    var animations = root.querySelectorAll ? root.querySelectorAll('.animation') : [];
    for (var i = 0; i < spacers.length; i += 1) {
      if (spacers[i].textContent !== text) spacers[i].textContent = text;
    }
    for (var j = 0; j < animations.length; j += 1) {
      if (animations[j].textContent !== text) animations[j].textContent = text;
    }
    if (root.classList && root.classList.contains('animation') && root.textContent !== text) {
      root.textContent = text;
    }
    if (root.setAttribute) root.setAttribute('aria-label', text);
  }

  function wireJump(element, url) {
    var link = element.closest && (element.closest('a') || element.querySelector('a'));
    var clickable = link || (element.closest && element.closest('button')) || element;
    if (link) {
      link.href = url;
      link.target = '_self';
      link.rel = 'noopener noreferrer';
    }
    if (!clickable || !clickable.dataset) return;
    clickable.style.pointerEvents = 'auto';
    clickable.style.cursor = 'pointer';
    clickable.dataset.mornikarJumpUrl = url;
    if (clickable.dataset.mornikarMenuJumpPatched === 'true') return;
    clickable.dataset.mornikarMenuJumpPatched = 'true';
    clickable.addEventListener('click', function (event) {
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      event.stopPropagation();
      window.location.assign(clickable.dataset.mornikarJumpUrl || url);
    }, true);
  }

  function installJumpCapture() {
    if (document.documentElement.dataset.mornikarMenuJumpCapture === 'true') return;
    document.documentElement.dataset.mornikarMenuJumpCapture = 'true';
    document.addEventListener('click', function (event) {
      var target = event.target;
      var clickable = target && target.closest && target.closest('[data-mornikar-jump-url]');
      var link = target && target.closest && target.closest('a[href]');
      var url = clickable && clickable.getAttribute('data-mornikar-jump-url');
      if (!url && link) url = shellRouteFromHref(link.getAttribute('href'));
      if (!url) return;
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      event.stopPropagation();
      window.location.assign(url);
    }, true);
  }

  function patchRouteAnchors() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i += 1) {
      var url = shellRouteFromHref(links[i].getAttribute('href'));
      if (!url) continue;
      links[i].target = '_self';
      links[i].rel = 'noopener noreferrer';
      links[i].dataset.mornikarJumpUrl = url;
      links[i].style.pointerEvents = 'auto';
      links[i].style.cursor = 'pointer';
    }
  }

  function patchLabelByText(sourceText, nextText, url, options) {
    var patched = false;
    var source = sourceText.toUpperCase();
    var next = nextText.toUpperCase();
    var shouldMatchNext = options && options.matchNext;
    var caseSensitiveNext = options && options.caseSensitiveNext;
    var nodes = document.querySelectorAll('.hacky-text, .animation, a, button, .link-hover, .menu-nav-item');
    for (var i = 0; i < nodes.length; i += 1) {
      var rawLabel = canonicalText(nodes[i]);
      var label = rawLabel.toUpperCase();
      var nextMatches = shouldMatchNext && (caseSensitiveNext ? rawLabel === nextText : label === next);
      if (label === source || nextMatches) {
        setHackyText(findHackyRoot(nodes[i]), nextText);
        wireJump(nodes[i], url);
        patched = true;
      }
    }
    return patched;
  }

  function patchTextLinks() {
    patchRouteAnchors();
    patchLabelByText('STORY', 'Home', '/', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('HOME', 'Home', '/', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('PROTOCOL', 'MMO_CMS', '/protocol', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('MMO_CMS', 'MMO_CMS', '/protocol', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('JOURNAL', 'Mornikar', '/protocol?shell=mornikar', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('MORNIKAR', 'Mornikar', '/protocol?shell=mornikar', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('MEDIA', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('KEEPERS', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('PORTFOLIO', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('GALLERY', 'GALLERY', '/gallery', { matchNext: true });
    patchLabelByText('ABOUT', 'ABOUT', '/about', { matchNext: true });
    patchLabelByText('GITHUB', 'mornikar', '/Mornikar/', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('CAREERS', 'mornikar', '/Mornikar/', { matchNext: true, caseSensitiveNext: true });
    patchLabelByText('TWITTER', 'BILIBILI', '/bilibili', { matchNext: true });
    patchLabelByText('DISCORD', 'BILIBILI', '/bilibili', { matchNext: true });
    patchLabelByText('OPENSEA', 'OPENSEA', '/opensea-profile', { matchNext: true });
  }

  function scheduleTextPatch() {
    if (document.documentElement.dataset.mornikarMenuPatchScheduled === 'true') return;
    document.documentElement.dataset.mornikarMenuPatchScheduled = 'true';
    installJumpCapture();

    function patchSoon() {
      patchTextLinks();
      window.setTimeout(patchTextLinks, 120);
      window.setTimeout(patchTextLinks, 600);
    }

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      patchTextLinks();
      if (tries > 240) window.clearInterval(timer);
    }, 500);

    if (window.MutationObserver && document.body) {
      var queued = false;
      var observer = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          patchTextLinks();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    window.addEventListener('pageshow', patchSoon);
    window.addEventListener('popstate', patchSoon);
    window.addEventListener('focus', patchSoon);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) patchSoon();
    });
    patchSoon();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleTextPatch);
  } else {
    scheduleTextPatch();
  }
})();
