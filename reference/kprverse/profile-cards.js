(function () {
  var DEFAULT_ICON_URL = '/images/newImage/profile-card-iconpattern.png';
  var DEFAULT_GRAIN_URL = '/images/newImage/profile-card-grain.webp';

  var profileCard = {
    name: 'AI产品经理',
    laserText: 'GT',
    title: 'GT/罗锦涛',
    handle: '1548324254@qq.com',
    status: '在线',
    contactText: '联系',
    avatarUrl: '/images/newImage/gt-avatar-cutout.png',
    miniAvatarUrl: '/images/newImage/gt-avatar-cutout.png',
    iconUrl: DEFAULT_ICON_URL,
    grainUrl: DEFAULT_GRAIN_URL,
    innerGradient: 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)',
    behindGlowEnabled: true,
    behindGlowColor: 'rgba(125, 190, 255, 0.67)',
    behindGlowSize: '50%',
    href: 'https://github.com/mornikar'
  };

  var smallCards = [
    {
      name: 'Mornikar',
      title: 'AI Product Builder',
      handle: 'mornikar',
      status: 'Online',
      contactText: 'Contact',
      avatarUrl: '/images/newImage/04.webp',
      miniAvatarUrl: '/images/newImage/04.webp',
      innerGradient: 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)',
      behindGlowEnabled: true,
      behindGlowColor: 'rgba(125, 190, 255, 0.67)',
      behindGlowSize: '50%',
      href: 'mailto:1548324254@qq.com'
    },
    {
      name: 'Skill Index',
      title: 'Knowledge System',
      handle: 'auto-skill',
      status: 'Syncing',
      contactText: 'Docs',
      avatarUrl: '/images/newImage/05.webp',
      miniAvatarUrl: '/images/newImage/05.webp',
      innerGradient: 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)',
      behindGlowEnabled: true,
      behindGlowColor: 'rgba(125, 190, 255, 0.67)',
      behindGlowSize: '50%',
      href: 'mailto:1548324254@qq.com'
    },
    {
      name: 'Codex Lab',
      title: 'Repair Agent',
      handle: 'local-fix',
      status: 'Active',
      contactText: 'Email',
      avatarUrl: '/images/newImage/01.webp',
      miniAvatarUrl: '/images/newImage/01.webp',
      innerGradient: 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)',
      behindGlowEnabled: true,
      behindGlowColor: 'rgba(125, 190, 255, 0.67)',
      behindGlowSize: '50%',
      href: 'mailto:1548324254@qq.com'
    }
  ];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function round(value, precision) {
    var p = precision == null ? 3 : precision;
    return parseFloat(value.toFixed(p));
  }

  function adjust(value, fromMin, fromMax, toMin, toMax) {
    return round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));
  }

  function setVarsFromXY(wrapper, shell, x, y) {
    var width = shell.clientWidth || 1;
    var height = shell.clientHeight || 1;
    var percentX = clamp((100 / width) * x, 0, 100);
    var percentY = clamp((100 / height) * y, 0, 100);
    var centerX = percentX - 50;
    var centerY = percentY - 50;

    wrapper.style.setProperty('--pointer-x', percentX + '%');
    wrapper.style.setProperty('--pointer-y', percentY + '%');
    wrapper.style.setProperty('--background-x', adjust(percentX, 0, 100, 35, 65) + '%');
    wrapper.style.setProperty('--background-y', adjust(percentY, 0, 100, 35, 65) + '%');
    wrapper.style.setProperty('--pointer-from-center', clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1));
    wrapper.style.setProperty('--pointer-from-top', percentY / 100);
    wrapper.style.setProperty('--pointer-from-left', percentX / 100);
    wrapper.style.setProperty('--rotate-x', round(-(centerX / 5)) + 'deg');
    wrapper.style.setProperty('--rotate-y', round(centerY / 4) + 'deg');
  }

  function wireTilt(wrapper) {
    var shell = wrapper.querySelector('.pc-card-shell');
    if (!shell) return;

    setVarsFromXY(wrapper, shell, (shell.clientWidth || 1) / 2, (shell.clientHeight || 1) / 2);

    shell.addEventListener('pointerenter', function (event) {
      wrapper.classList.add('active');
      shell.classList.add('active');
      shell.classList.add('entering');
      window.setTimeout(function () {
        shell.classList.remove('entering');
      }, 180);
      var rect = shell.getBoundingClientRect();
      setVarsFromXY(wrapper, shell, event.clientX - rect.left, event.clientY - rect.top);
    });

    shell.addEventListener('pointermove', function (event) {
      var rect = shell.getBoundingClientRect();
      setVarsFromXY(wrapper, shell, event.clientX - rect.left, event.clientY - rect.top);
    });

    shell.addEventListener('pointerleave', function () {
      setVarsFromXY(wrapper, shell, (shell.clientWidth || 1) / 2, (shell.clientHeight || 1) / 2);
      wrapper.classList.remove('active');
      shell.classList.remove('active');
    });
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function makeProfileCard(data, variant) {
    var wrapper = createElement('div', 'pc-card-wrapper pc-card-wrapper--' + variant);
    var iconUrl = data.iconUrl === '' ? '' : (data.iconUrl || DEFAULT_ICON_URL);
    var grainUrl = data.grainUrl === '' ? '' : (data.grainUrl || DEFAULT_GRAIN_URL);
    wrapper.style.setProperty('--icon', iconUrl ? 'url(' + iconUrl + ')' : 'none');
    wrapper.style.setProperty('--grain', grainUrl ? 'url(' + grainUrl + ')' : 'none');
    wrapper.style.setProperty('--inner-gradient', data.innerGradient || 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)');
    wrapper.style.setProperty('--behind-glow-color', data.behindGlowColor || 'rgba(125, 190, 255, 0.67)');
    wrapper.style.setProperty('--behind-glow-size', data.behindGlowSize || '50%');

    if (data.behindGlowEnabled !== false) {
      wrapper.appendChild(createElement('div', 'pc-behind'));
    }

    var shell = createElement('div', 'pc-card-shell');
    var section = createElement('section', 'pc-card');
    var inside = createElement('div', 'pc-inside');
    var shine = createElement('div', 'pc-shine');
    var glare = createElement('div', 'pc-glare');
    var laserText = createElement('div', 'pc-laser-text', data.laserText || '');
    var avatarContent = createElement('div', 'pc-content pc-avatar-content');
    var avatar = createElement('img', 'avatar');
    var userInfo = createElement('div', 'pc-user-info');
    var userDetails = createElement('div', 'pc-user-details');
    var miniAvatar = createElement('div', 'pc-mini-avatar');
    var miniImg = createElement('img');
    var userText = createElement('div', 'pc-user-text');
    var handle = createElement('div', 'pc-handle', '@' + data.handle);
    var status = createElement('div', 'pc-status', data.status);
    var contact = createElement('button', 'pc-contact-btn', data.contactText || 'Contact');
    var content = createElement('div', 'pc-content');
    var details = createElement('div', 'pc-details');
    var name = createElement('h3', '', data.name);
    var title = createElement('p', '', data.title);

    avatar.src = data.avatarUrl;
    avatar.alt = (data.name || 'User') + ' avatar';
    avatar.loading = 'lazy';
    avatar.onerror = function () {
      avatar.style.display = 'none';
    };

    miniImg.src = data.miniAvatarUrl || data.avatarUrl;
    miniImg.alt = (data.name || 'User') + ' mini avatar';
    miniImg.loading = 'lazy';
    miniImg.onerror = function () {
      miniImg.style.opacity = '0.5';
      miniImg.src = data.avatarUrl;
    };

    contact.type = 'button';
    contact.setAttribute('aria-label', 'Contact ' + (data.name || 'user'));
    contact.addEventListener('click', function (event) {
      event.stopPropagation();
      if (data.href) window.location.href = data.href;
    });
    laserText.setAttribute('aria-hidden', 'true');

    userText.appendChild(handle);
    userText.appendChild(status);
    miniAvatar.appendChild(miniImg);
    userDetails.appendChild(miniAvatar);
    userDetails.appendChild(userText);
    userInfo.appendChild(userDetails);
    userInfo.appendChild(contact);
    avatarContent.appendChild(avatar);
    avatarContent.appendChild(userInfo);
    details.appendChild(name);
    details.appendChild(title);
    content.appendChild(details);
    inside.appendChild(shine);
    inside.appendChild(glare);
    inside.appendChild(laserText);
    inside.appendChild(avatarContent);
    inside.appendChild(content);
    section.appendChild(inside);
    shell.appendChild(section);
    wrapper.appendChild(shell);
    wireTilt(wrapper);
    return wrapper;
  }

  function findMainTarget() {
    return document.querySelector('.homeProjectIntro__profileCard') ||
      document.querySelector('.homeProjectIntro .block--bottomleft.block') ||
      document.querySelector('.block--bottomleft.block');
  }

  function findFooterTarget() {
    if (document.documentElement.classList.contains('mornikar-external-shell')) {
      return ensureExternalShellProfileStage();
    }

    var footerTarget = document.querySelector('.the-footer .pointer-events-none');
    if (footerTarget && footerTarget.querySelector('.section.kpr')) return footerTarget;

    var allTargets = document.querySelectorAll('.pointer-events-none');
    for (var i = 0; i < allTargets.length; i += 1) {
      if (allTargets[i].querySelector('.section.kpr')) return allTargets[i];
    }
    return null;
  }

  function ensureExternalShellProfileStage() {
    var existing = document.querySelector('.mornikar-profile-stage.pointer-events-none');
    if (existing) return existing;

    var stage = createElement('div', 'pointer-events-none mornikar-profile-stage');
    stage.setAttribute('aria-hidden', 'true');
    document.body.appendChild(stage);
    return stage;
  }

  function removeOldBlockGrid(target) {
    var root = document.querySelector('.homeProjectIntro') || target;
    var grids = root.querySelectorAll('.mornikar-profile-grid--feature');
    for (var i = 0; i < grids.length; i += 1) {
      if (grids[i].parentNode !== target) {
        grids[i].parentNode.removeChild(grids[i]);
      }
    }
  }

  function syncFeatureCardWithHero(grid) {
    if (grid.dataset.mornikarHeroTransitionSynced === 'true') return;
    grid.dataset.mornikarHeroTransitionSynced = 'true';
    grid.classList.add('mornikar-profile-grid--hero-active');
  }

  function mountFeatureCard() {
    var target = findMainTarget();
    if (!target) return false;
    removeOldBlockGrid(target);
    var existing = target.querySelector('.mornikar-profile-grid--feature');
    if (existing) {
      syncFeatureCardWithHero(existing);
      return true;
    }

    target.style.pointerEvents = 'auto';
    var grid = createElement('div', 'mornikar-profile-grid mornikar-profile-grid--feature');
    grid.appendChild(makeProfileCard(profileCard, 'feature'));
    target.appendChild(grid);
    syncFeatureCardWithHero(grid);
    console.log('[profile-cards] React Bits feature ProfileCard mounted');
    return true;
  }

  function mountSmallCards() {
    var target = findFooterTarget();
    if (!target) return false;
    if (target.querySelector('.mornikar-profile-grid--mini-strip')) return true;

    var grid = createElement('div', 'mornikar-profile-grid mornikar-profile-grid--mini-strip');
    smallCards.forEach(function (card) {
      grid.appendChild(makeProfileCard(card, 'mini'));
    });
    target.appendChild(grid);
    console.log('[profile-cards] React Bits mini ProfileCards mounted');
    return true;
  }

  function setHackyText(root, text) {
    if (!root) return;
    var spacers = root.querySelectorAll ? root.querySelectorAll('.spacer') : [];
    var animations = root.querySelectorAll ? root.querySelectorAll('.animation') : [];
    for (var s = 0; s < spacers.length; s += 1) {
      if (spacers[s].textContent !== text) spacers[s].textContent = text;
    }
    for (var a = 0; a < animations.length; a += 1) {
      if (animations[a].textContent !== text) animations[a].textContent = text;
    }
    if (root.classList && root.classList.contains('animation') && root.textContent !== text) root.textContent = text;
    if (root.getAttribute && root.getAttribute('aria-label') !== text) root.setAttribute('aria-label', text);
  }

  var inlineLinkTargets = {
    'https://mornikar.github.io/': true,
    'https://mornikar.github.io/admin/': true,
    'https://github.com/mornikar': true,
    'https://space.bilibili.com/46336819': true,
    'https://opensea.io/profile': true
  };

  function shouldOpenInline(url) {
    return false;
  }

  function closeInlineLinkViewer() {
    var viewer = document.querySelector('.mornikar-link-viewer');
    if (!viewer) return;
    viewer.classList.remove('is-open');
    document.documentElement.classList.remove('mornikar-link-viewer-open');
    var iframe = viewer.querySelector('.mornikar-link-viewer__frame');
    if (iframe) iframe.src = 'about:blank';
  }

  function ensureInlineLinkViewer() {
    var existing = document.querySelector('.mornikar-link-viewer');
    if (existing) return existing;

    var viewer = createElement('div', 'mornikar-link-viewer');
    var backdrop = createElement('button', 'mornikar-link-viewer__backdrop');
    var panel = createElement('section', 'mornikar-link-viewer__panel');
    var toolbar = createElement('div', 'mornikar-link-viewer__toolbar');
    var meta = createElement('div', 'mornikar-link-viewer__meta');
    var title = createElement('div', 'mornikar-link-viewer__title');
    var urlText = createElement('div', 'mornikar-link-viewer__url');
    var actions = createElement('div', 'mornikar-link-viewer__actions');
    var open = createElement('a', 'mornikar-link-viewer__open', '打开');
    var close = createElement('button', 'mornikar-link-viewer__close', '关闭');
    var frameWrap = createElement('div', 'mornikar-link-viewer__frame-wrap');
    var fallback = createElement('div', 'mornikar-link-viewer__fallback', '如果目标网站限制内嵌，请使用右上角打开。');
    var iframe = createElement('iframe', 'mornikar-link-viewer__frame');

    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', '关闭链接预览');
    close.type = 'button';
    iframe.setAttribute('title', 'Mornikar link preview');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    backdrop.addEventListener('click', closeInlineLinkViewer);
    close.addEventListener('click', closeInlineLinkViewer);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeInlineLinkViewer();
    });

    meta.appendChild(title);
    meta.appendChild(urlText);
    actions.appendChild(open);
    actions.appendChild(close);
    toolbar.appendChild(meta);
    toolbar.appendChild(actions);
    frameWrap.appendChild(fallback);
    frameWrap.appendChild(iframe);
    panel.appendChild(toolbar);
    panel.appendChild(frameWrap);
    viewer.appendChild(backdrop);
    viewer.appendChild(panel);
    document.body.appendChild(viewer);
    return viewer;
  }

  function openInlineLinkViewer(url, titleText) {
    var viewer = ensureInlineLinkViewer();
    var title = viewer.querySelector('.mornikar-link-viewer__title');
    var urlText = viewer.querySelector('.mornikar-link-viewer__url');
    var open = viewer.querySelector('.mornikar-link-viewer__open');
    var iframe = viewer.querySelector('.mornikar-link-viewer__frame');
    if (title) title.textContent = titleText || 'Mornikar';
    if (urlText) urlText.textContent = url;
    if (open) {
      open.href = url;
      open.target = '_blank';
      open.rel = 'noopener noreferrer';
    }
    if (iframe) {
      iframe.src = 'about:blank';
      window.setTimeout(function () {
        iframe.src = url;
      }, 30);
    }
    viewer.classList.add('is-open');
    document.documentElement.classList.add('mornikar-link-viewer-open');
  }

  function wireJump(element, url) {
    var link = element.closest && (element.closest('a') || element.querySelector('a'));
    var clickable = link || (element.closest && element.closest('button')) || element;
    if (link) {
      link.href = url;
      link.target = '_self';
      link.rel = 'noopener noreferrer';
    }
    clickable.style.pointerEvents = 'auto';
    clickable.style.cursor = 'pointer';
    clickable.dataset.mornikarJumpUrl = url;
    clickable.dataset.mornikarJumpTitle = textOf(element) || textOf(clickable) || url;
    if (!clickable.dataset.mornikarJumpHandlerPatched) {
      clickable.dataset.mornikarJumpHandlerPatched = 'true';
      clickable.dataset.mornikarJumpPatched = 'true';
      clickable.addEventListener('click', function (event) {
        var targetUrl = clickable.dataset.mornikarJumpUrl || url;
        event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        event.stopPropagation();
        if (shouldOpenInline(targetUrl)) {
          openInlineLinkViewer(targetUrl, clickable.dataset.mornikarJumpTitle);
        } else {
          window.location.assign(targetUrl);
        }
      }, true);
    }
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
    return url === '/journal' ? '/protocol?shell=mornikar' : url;
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

  function installJumpCapture() {
    if (document.documentElement.dataset.mornikarJumpCapture === 'true') return;
    document.documentElement.dataset.mornikarJumpCapture = 'true';
    document.addEventListener('click', function (event) {
      var target = event.target;
      var clickable = target && target.closest && target.closest('[data-mornikar-jump-url]');
      var link = target && target.closest && target.closest('a[href]');
      var targetUrl = clickable && clickable.getAttribute('data-mornikar-jump-url');
      if (!targetUrl && link) targetUrl = shellRouteFromHref(link.getAttribute('href'));
      if (!targetUrl) return;
      event.preventDefault();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      event.stopPropagation();
      if (shouldOpenInline(targetUrl)) {
        openInlineLinkViewer(targetUrl, clickable.getAttribute('data-mornikar-jump-title') || targetUrl);
      } else {
        window.location.assign(targetUrl);
      }
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

  function textOf(element) {
    return (element.textContent || '').replace(/\s+/g, ' ').trim();
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
      element.querySelector && element.querySelector('.hacky-text') ||
      element;
  }

  function patchLabelByText(sourceText, nextText, url, options) {
    var patched = false;
    var shouldMatchNext = options && options.matchNext;
    var nodes = document.querySelectorAll('.hacky-text, .animation, a, button, .link-hover, .menu-nav-item');
    for (var i = 0; i < nodes.length; i += 1) {
      var rawLabel = canonicalText(nodes[i]);
      var label = rawLabel.toUpperCase();
      var nextMatches = shouldMatchNext && (options.caseSensitiveNext ? rawLabel === nextText : label === nextText.toUpperCase());
      if (label === sourceText.toUpperCase() || nextMatches) {
        setHackyText(findHackyRoot(nodes[i]), nextText);
        wireJump(nodes[i], url);
        patched = true;
      }
    }
    return patched;
  }

  function patchHomeLink() {
    var r1 = patchLabelByText('STORY', 'Home', '/', { matchNext: true, caseSensitiveNext: true });
    var r2 = patchLabelByText('HOME', 'Home', '/', { matchNext: true, caseSensitiveNext: true });
    return r1 || r2;
  }

  function patchJournalLink() {
    return patchLabelByText('JOURNAL', 'Mornikar', '/protocol?shell=mornikar', { matchNext: true, caseSensitiveNext: true });
  }

  function patchMenuNavItem() {
    return patchLabelByText('PROTOCOL', 'MMO_CMS', '/protocol', { matchNext: true, caseSensitiveNext: true });
  }

  function patchPortfolioLink() {
    var r1 = patchLabelByText('MEDIA', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    var r2 = patchLabelByText('KEEPERS', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    var r3 = patchLabelByText('PORTFOLIO', 'Portfolio', '/media', { matchNext: true, caseSensitiveNext: true });
    return r1 || r2 || r3;
  }

  function patchGalleryLink() {
    return patchLabelByText('GALLERY', 'GALLERY', '/gallery', { matchNext: true });
  }

  function patchAboutLink() {
    return patchLabelByText('ABOUT', 'ABOUT', '/about', { matchNext: true });
  }

  function patchGithubText() {
    var r1 = patchLabelByText('GITHUB', 'mornikar', '/mornikar', { matchNext: true, caseSensitiveNext: true });
    var r2 = patchLabelByText('CAREERS', 'mornikar', '/mornikar', { matchNext: true, caseSensitiveNext: true });
    return r1 || r2;
  }

  function patchAnimationLabel(sourceText, nextText, url) {
    return patchLabelByText(sourceText, nextText, url, { matchNext: sourceText.toUpperCase() === nextText.toUpperCase() || nextText.toUpperCase() === 'BILIBILI' });
  }

  function patchSocialLinks() {
    var r1 = patchAnimationLabel('TWITTER', 'BILIBILI', '/bilibili');
    var r2 = patchAnimationLabel('DISCORD', 'BILIBILI', '/bilibili');
    var r3 = patchAnimationLabel('OPENSEA', 'OPENSEA', '/opensea-profile');
    return r1 && r2 && r3;
  }

  function patchTextLinks() {
    patchRouteAnchors();
    return [
      patchHomeLink(),
      patchMenuNavItem(),
      patchJournalLink(),
      patchPortfolioLink(),
      patchGalleryLink(),
      patchAboutLink(),
      patchGithubText(),
      patchSocialLinks()
    ].filter(Boolean).length;
  }

  function mount() {
    var featureReady = mountFeatureCard();
    var miniReady = mountSmallCards();
    return featureReady && miniReady;
  }

  function scheduleTextPatch() {
    if (document.documentElement.dataset.mornikarTextPatchScheduled === 'true') return;
    document.documentElement.dataset.mornikarTextPatchScheduled = 'true';
    installJumpCapture();
    function patchTextLinksSoon() {
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
    if (window.MutationObserver) {
      var observerQueued = false;
      var observer = new MutationObserver(function () {
        if (observerQueued) return;
        observerQueued = true;
        window.requestAnimationFrame(function () {
          observerQueued = false;
          patchTextLinks();
        });
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    window.addEventListener('pageshow', patchTextLinksSoon);
    window.addEventListener('popstate', patchTextLinksSoon);
    window.addEventListener('focus', patchTextLinksSoon);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) patchTextLinksSoon();
    });
    patchTextLinksSoon();
  }

  function boot() {
    var runAfterPageReady = function () {
      window.setTimeout(function () {
        scheduleTextPatch();
        if (mount()) return;

        var tries = 0;
        var timer = window.setInterval(function () {
          tries += 1;
          if (mount() || tries > 40) window.clearInterval(timer);
        }, 500);
      }, 200);
    };

    if (document.readyState === 'complete') {
      runAfterPageReady();
    } else {
      window.addEventListener('load', runAfterPageReady, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
