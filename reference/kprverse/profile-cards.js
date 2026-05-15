(function () {
  var DEFAULT_ICON_URL = '/images/newImage/profile-card-icon-pattern.svg';

  var profileCard = {
    name: 'GT/罗锦涛',
    title: 'AI产品经理',
    handle: '1548324254@qq.com',
    status: '离职',
    contactText: '联系',
    avatarUrl: '/images/newImage/gt-avatar-cutout.png',
    miniAvatarUrl: '/images/newImage/gt-avatar-cutout.png',
    iconUrl: DEFAULT_ICON_URL,
    grainUrl: '',
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
    wrapper.style.setProperty('--icon', iconUrl ? 'url(' + iconUrl + ')' : 'none');
    wrapper.style.setProperty('--grain', data.grainUrl ? 'url(' + data.grainUrl + ')' : 'none');
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
    inside.appendChild(avatarContent);
    inside.appendChild(content);
    section.appendChild(inside);
    shell.appendChild(section);
    wrapper.appendChild(shell);
    wireTilt(wrapper);
    return wrapper;
  }

  function findMainTarget() {
    return document.querySelector('.homeProjectIntro__hero') ||
      document.querySelector('.homeProjectIntro .block--bottomleft.block') ||
      document.querySelector('.block--bottomleft.block');
  }

  function findFooterTarget() {
    var footerTarget = document.querySelector('.the-footer .pointer-events-none');
    if (footerTarget && footerTarget.querySelector('.section.kpr')) return footerTarget;

    var allTargets = document.querySelectorAll('.pointer-events-none');
    for (var i = 0; i < allTargets.length; i += 1) {
      if (allTargets[i].querySelector('.section.kpr')) return allTargets[i];
    }
    return null;
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

    var hero = document.querySelector('.homeProjectIntro__hero') || grid.parentNode;
    var section = document.querySelector('.homeProjectIntro');

    function frame() {
      if (!document.documentElement.contains(grid)) return;

      var rect = hero.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight || 1;
      var sectionOpacity = section ? parseFloat(window.getComputedStyle(section).opacity) : 1;
      if (!isFinite(sectionOpacity)) sectionOpacity = 1;

      var center = rect.top + rect.height / 2;
      var distance = Math.abs(center - vh * 0.55);
      var raw = 1 - clamp(distance / (vh * 0.75), 0, 1);
      var visible = rect.bottom > 0 && rect.top < vh && sectionOpacity > 0.02;
      var progress = visible ? Math.max(0, raw * sectionOpacity) : 0;

      grid.style.setProperty('--mornikar-hero-progress', progress.toFixed(3));
      grid.classList.toggle('mornikar-profile-grid--hero-active', progress > 0.12);
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
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
    var spacer = root.querySelector('.spacer');
    var animation = root.querySelector('.animation');
    if (spacer && spacer.textContent !== text) spacer.textContent = text;
    if (animation && animation.textContent !== text) animation.textContent = text;
    if (root.classList && root.classList.contains('animation') && root.textContent !== text) root.textContent = text;
    if (root.getAttribute && root.getAttribute('aria-label') !== text) root.setAttribute('aria-label', text);
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
    if (!clickable.dataset.mornikarJumpPatched) {
      clickable.dataset.mornikarJumpPatched = 'true';
      clickable.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        window.location.href = url;
      });
    }
  }

  function textOf(element) {
    return (element.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function patchJournalLink() {
    if (document.documentElement.dataset.mornikarJournalPatched === 'true') return true;
    var nodes = document.querySelectorAll('.hacky-text, a, button, .link-hover');
    for (var i = 0; i < nodes.length; i += 1) {
      if (textOf(nodes[i]).toUpperCase() === 'JOURNAL') {
        setHackyText(nodes[i].classList.contains('hacky-text') ? nodes[i] : (nodes[i].querySelector('.hacky-text') || nodes[i]), 'Mornikar');
        wireJump(nodes[i], 'https://mornikar.github.io/');
        document.documentElement.dataset.mornikarJournalPatched = 'true';
        return true;
      }
    }
    return false;
  }

  function patchMenuNavItem() {
    if (document.documentElement.dataset.mornikarCmsPatched === 'true') return true;
    var items = document.querySelectorAll('.menu-nav-item.pointer-events-auto, .menu-nav-item');
    var target = null;
    for (var i = 0; i < items.length; i += 1) {
      var label = textOf(items[i]).toUpperCase();
      if (label === 'PROTOCOL' || label === 'MEDIA' || label === 'GALLERY' || label === 'DISCOVER') {
        target = items[i];
        break;
      }
    }
    if (!target) return false;
    setHackyText(target.querySelector('.hacky-text') || target, 'MMO_CMS');
    wireJump(target, 'https://mornikar.github.io/admin/');
    document.documentElement.dataset.mornikarCmsPatched = 'true';
    return true;
  }

  function patchGithubText() {
    if (document.documentElement.dataset.mornikarGithubPatched === 'true') return true;
    var candidates = document.querySelectorAll('.the-footer .item.social a, .the-footer .item.social .hacky-text, a[href*="twitter"], a[href*="discord"]');
    var target = candidates[0] || null;
    if (!target) return false;
    setHackyText(target.querySelector('.hacky-text') || target, 'mornikar');
    wireJump(target, 'https://github.com/mornikar');
    document.documentElement.dataset.mornikarGithubPatched = 'true';
    return true;
  }

  function patchTextLinks() {
    return [patchJournalLink(), patchMenuNavItem(), patchGithubText()].filter(Boolean).length;
  }

  function mount() {
    var featureReady = mountFeatureCard();
    var miniReady = mountSmallCards();
    return featureReady && miniReady;
  }

  function scheduleTextPatch() {
    if (document.documentElement.dataset.mornikarTextPatchScheduled === 'true') return;
    document.documentElement.dataset.mornikarTextPatchScheduled = 'true';
    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      var count = patchTextLinks();
      if (count >= 3 || tries > 180) window.clearInterval(timer);
    }, 1000);
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
      }, 1000);
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
