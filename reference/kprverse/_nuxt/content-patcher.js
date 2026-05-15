/**
 * Content Patcher for Mornikar Portfolio — Optimized v2
 * 
 * 2026-05-06 精简版：
 * - 移除 server.js 已覆盖的冗余代码（__NUXT__ 拦截/同步XHR/回退轮询/patchNuxtData/deepReplaceStrings/patchMetaTags/buildTextMap）
 * - 保留 AudioContext 修复、图片替换、MutationObserver DOM 兜底、轮播增强
 * - 55KB → ~18KB，消除同步 XHR 阻塞
 * 
 * 备份：content-patcher.js.55kb-backup-20260506-pre-optimization
 */
(function () {
  'use strict';

  console.log('[content-patcher] 🚀 Script loaded (optimized v2)');

  // ── Step 0: AudioContext autoplay policy fix ──
  // KPR site uses Howler.js which tries to play audio on every GSAP animation frame.
  // Without user gesture, AudioContext.resume() triggers a browser-level console warning
  // that CANNOT be intercepted via console.warn/error overrides (it's engine-level).
  // Fix: Override AudioContext.prototype.resume to silently return resolved promise
  //      when no user gesture has occurred. On first user gesture, replay all queued
  //      resume() calls for real.
  var _audioCtxResumed = false;
  var _pendingResumes = [];

  var _origResume = AudioContext.prototype.resume;
  AudioContext.prototype.resume = function () {
    var ctx = this;
    if (ctx.state === 'running') {
      return Promise.resolve();
    }
    if (_audioCtxResumed) {
      return _origResume.call(ctx);
    }
    _pendingResumes.push(ctx);
    return Promise.resolve();
  };

  function _resumeAllAudioCtx() {
    if (_audioCtxResumed) return;
    _audioCtxResumed = true;
    var count = _pendingResumes.length;
    if (count > 0) {
      console.log('[content-patcher] 🔊 User gesture detected, resuming', count, 'AudioContext(s)');
      _pendingResumes.forEach(function (ctx) {
        if (ctx.state === 'suspended') {
          _origResume.call(ctx).catch(function () {});
        }
      });
    }
    _pendingResumes = [];
  }

  ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'].forEach(function (evt) {
    document.addEventListener(evt, _resumeAllAudioCtx, { once: true, passive: true, capture: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) _resumeAllAudioCtx();
  }, { once: true, passive: true });

  // ── Load config (async, non-blocking) ──
  var config = null;
  var configLoaded = false;

  function loadConfig() {
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/site-config.json?v=' + Date.now(), true); // async
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            config = JSON.parse(xhr.responseText);
            configLoaded = true;
            console.log('[content-patcher] ✅ Config loaded, texts[]:', (config.texts && config.texts.length) || 0, 'images[]:', (config.images && config.images.length) || 0);
          } catch (e) {
            console.error('[content-patcher] Config parse error:', e);
          }
        } else {
          console.warn('[content-patcher] Config fetch failed:', xhr.status);
        }
        resolve(config);
      };
      xhr.onerror = function () {
        console.error('[content-patcher] Config fetch error');
        resolve(null);
      };
      xhr.send();
    });
  }

  // ── DOM text replacement (safety net for Canvas-external text) ──
  // server.js patchNuxtHtml() handles __NUXT__ data at the HTML source level.
  // This MutationObserver catches any remaining DOM text that Vue renders
  // after hydration (e.g., dynamically rendered components).
  var _matchedTextRules = {};

  function patchTextsImmediate() {
    if (!config || !config.texts || !Array.isArray(config.texts)) return;

    var validTexts = config.texts.filter(function (t) { return t.original && t.replacement; });
    if (validTexts.length === 0) return;

    var remainingTexts = validTexts.filter(function (t) { return !_matchedTextRules[t.original]; });
    if (remainingTexts.length === 0) return;

    remainingTexts.sort(function (a, b) { return b.original.length - a.original.length; });

    console.log('[content-patcher] 🔍 patchTextsImmediate:', remainingTexts.length, 'remaining rules');

    var replaced = 0;

    for (var i = 0; i < remainingTexts.length; i++) {
      var txt = remainingTexts[i];
      var matched = false;

      // Strategy 1: Selector-scoped matching
      if (txt.selector) {
        var els;
        try { els = document.querySelectorAll(txt.selector); }
        catch (e) { els = null; }

        if (els && els.length > 0) {
          for (var j = 0; j < els.length; j++) {
            var el = els[j];
            var elText = el.textContent.trim();

            if (elText === txt.original) {
              el.textContent = txt.replacement;
              replaced++;
              matched = true;
              _matchedTextRules[txt.original] = true;
              break;
            }
          }

          if (!matched) {
            var parent = els[0].parentElement;
            if (parent) {
              var parentText = parent.textContent.trim();
              if (parentText === txt.original) {
                parent.textContent = txt.replacement;
                replaced++;
                matched = true;
                _matchedTextRules[txt.original] = true;
              } else if (parentText.indexOf(txt.original) !== -1) {
                parent.textContent = parentText.split(txt.original).join(txt.replacement);
                replaced++;
                matched = true;
                _matchedTextRules[txt.original] = true;
              }
            }
          }

          if (!matched) {
            var elFullText = els[0].textContent.trim();
            if (elFullText === txt.replacement || elFullText.indexOf(txt.replacement) !== -1) {
              matched = true;
              _matchedTextRules[txt.original] = true;
            }
          }

          if (matched) continue;
        }
      }

      // Strategy 2: Exact text-node matching
      var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
            var parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            var tag = parent.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        },
        false
      );

      var node;
      while ((node = walker.nextNode())) {
        var text = node.textContent;

        if (text.trim() === txt.original) {
          node.textContent = txt.replacement;
          replaced++;
          matched = true;
          _matchedTextRules[txt.original] = true;
          break;
        }

        if (text.trim() === txt.replacement) {
          matched = true;
          _matchedTextRules[txt.original] = true;
          break;
        }

        var parent2 = node.parentElement;
        if (parent2 && !parent2._textReplaced) {
          var pText = parent2.textContent.trim();
          if (pText === txt.original) {
            parent2.textContent = txt.replacement;
            parent2._textReplaced = true;
            replaced++;
            matched = true;
            _matchedTextRules[txt.original] = true;
            break;
          }
          if (pText === txt.replacement) {
            matched = true;
            _matchedTextRules[txt.original] = true;
            break;
          }
        }
      }

      if (!matched && !_matchedTextRules['_warn_' + txt.original]) {
        _matchedTextRules['_warn_' + txt.original] = true;
        console.log('[content-patcher] ⚠ text rule not matched: "' + txt.original.substring(0, 40) + '..."');
      }
    }

    if (replaced > 0) {
      console.log('[content-patcher] texts[] DOM patch:', replaced, 'node(s) replaced');
    }
  }

  // ── Image replacement ──
  function patchImagesImmediate() {
    if (!config || !config.images || !Array.isArray(config.images)) return;
    config.images.forEach(function (img) {
      if (!img.selector || !img.src || img._comment) return;
      if (img._patched) return;
      var els;
      try { els = document.querySelectorAll(img.selector); }
      catch (e) { return; }
      if (els.length === 0) return;
      els.forEach(function (el) {
        if (el.tagName === 'IMG' && el.src !== img.src) {
          el.src = img.src;
        } else if (el.tagName === 'IMAGE' || el.tagName === 'image') {
          el.setAttribute('href', img.src);
          el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', img.src);
        } else if (img.backgroundImage && el.style) {
          el.style.backgroundImage = 'url("' + img.src + '")';
        }
      });
      img._patched = true;
    });
  }

  function patchImages() {
    if (!config || !config.images || !Array.isArray(config.images)) return;
    var validImgs = config.images.filter(function (img) { return img.selector && img.src && !img._comment; });
    if (validImgs.length === 0) return;

    var attempts = 0;
    function tryPatch() {
      attempts++;
      patchImagesImmediate();
      if (attempts < 10) {
        setTimeout(tryPatch, 500);
      }
    }
    setTimeout(tryPatch, 1500);
  }

  // ── MutationObserver (safety net for dynamic content) ──
  function startDOMObserver() {
    if (!config) return;

    var hasTexts = config.texts && Array.isArray(config.texts) && config.texts.length > 0;
    var hasImages = config.images && Array.isArray(config.images) && config.images.length > 0;
    if (!hasTexts && !hasImages) return;

    var _debounceTimer = null;
    var _patching = false;
    var _lastPatchTime = 0;

    function schedulePatch() {
      if (_patching) return;
      var now = Date.now();
      if (now - _lastPatchTime < 500) return;
      if (_debounceTimer) clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function () {
        _patching = true;
        _lastPatchTime = Date.now();
        try {
          if (hasTexts) patchTextsImmediate();
          if (hasImages) patchImagesImmediate();
        } finally {
          setTimeout(function () { _patching = false; }, 100);
        }
      }, 150);
    }

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) { schedulePatch(); return; }
        if (mutations[i].type === 'characterData') { schedulePatch(); return; }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    });

    // Initial passes
    setTimeout(function () {
      if (hasTexts) patchTextsImmediate();
      if (hasImages) patchImagesImmediate();
    }, 2000);
    setTimeout(function () {
      if (hasTexts) patchTextsImmediate();
    }, 5000);

    var totalRules = (hasTexts ? config.texts.length : 0) + (hasImages ? config.images.length : 0);
    console.log('[content-patcher] DOM observer started with', totalRules, 'replacement rules');
  }

  // ── Gallery Video Preview (Background Replacement) ──
  // Replaces card's default background with an auto-playing video preview.
  // Cards with video: video loops first N seconds, click opens full video in modal.
  // Cards without video: keep their default background.
  //
  // site-config.json → gallery.videos:
  //   [{ "cardIndex": 0, "bvid": "BV1xxx", "label": "Demo" }]
  function setupGalleryVideoPreview() {
    var galleryCfg = config && config.gallery;
    var videos = (galleryCfg && galleryCfg.videos) || [];

    if (videos.length === 0) return;

    var previewDuration = (galleryCfg && galleryCfg.previewDuration) || 10;

    console.log('[content-patcher] 🎬 Gallery video bg setup, videos:', videos.length, 'previewDuration:', previewDuration + 's');

    injectVideoPreviewStyles();
    createVideoModal();

    // Retry binding until gallery items appear (they are created dynamically by Vue/Three.js)
    var _bindAttempts = 0;
    var _boundBvids = {};

    function tryBindVideoCards() {
      _bindAttempts++;
      var allCards = document.querySelectorAll('.collectionGallery__item');

      if (allCards.length === 0 && _bindAttempts < 30) {
        setTimeout(tryBindVideoCards, 1000);
        return;
      }

      videos.forEach(function(v) {
        if (!v.bvid) return;
        if (_boundBvids[v.bvid]) return; // Already bound

        var cardIndex = (v.cardIndex !== undefined) ? v.cardIndex : -1;
        var el = null;

        // Match by cardIndex (primary) or selector (fallback)
        if (cardIndex >= 0 && cardIndex < allCards.length) {
          el = allCards[cardIndex];
        } else if (v.selector) {
          try { el = document.querySelector(v.selector); } catch(e) {}
        }

        if (!el || el._kprVideoBound) return;
        el._kprVideoBound = true;
        _boundBvids[v.bvid] = true;

        console.log('[content-patcher] 🎬 Binding video bg to card[' + cardIndex + ']:', v.bvid);

        // Mark as video item
        el.setAttribute('data-kpr-video-item', 'true');
        el.setAttribute('data-kpr-video-bvid', v.bvid);
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto';
        el.style.overflow = 'hidden';

        // Create auto-playing video background
        var video = document.createElement('video');
        video.className = 'kpr-v-bg';
        video.src = '/api/bilibili/preview/' + v.bvid;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');

        // Loop at previewDuration seconds
        video.addEventListener('timeupdate', function() {
          if (video.currentTime >= previewDuration) {
            video.currentTime = 0;
          }
        });

        // Once video starts playing, fade it in over the default background
        video.addEventListener('playing', function() {
          video.style.opacity = '1';
          console.log('[content-patcher] 🎬 Video bg playing:', v.bvid);
        });

        // If video fails to load, keep the card's original background
        video.addEventListener('error', function() {
          console.warn('[content-patcher] ⚠ Video bg load failed for', v.bvid, '— keeping default card background');
          video.remove();
        });

        el.appendChild(video);

        // Small "click to play" indicator (bottom-right, visible on hover)
        var indicator = document.createElement('div');
        indicator.className = 'kpr-v-indicator';
        indicator.innerHTML = '▶';
        el.appendChild(indicator);

        // Click to open full video in modal
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('[content-patcher] 🎬 Video card clicked:', v.bvid);
          openVideoModal(v.bvid, v.label || 'Video');
        }, true);
      });

      // Retry if some videos weren't bound yet (cards not in DOM)
      var boundCount = Object.keys(_boundBvids).length;
      if (_bindAttempts < 30 && boundCount < videos.length) {
        setTimeout(tryBindVideoCards, 1000);
      }
    }

    setTimeout(tryBindVideoCards, 2500);
  }

  function injectVideoPreviewStyles() {
    // Only inject once
    if (document.getElementById('kpr-vp-style')) return;

    var s = document.createElement('style');
    s.id = 'kpr-vp-style';
    s.textContent = [
      // ── Card base: rounded corners + overflow for video bg ──
      '.collectionGallery__item {',
      '  overflow: hidden;',
      '  border-radius: 10px;',
      '}',
      // Video background: auto-plays over the card's default bg
      // Starts invisible, fades in once playing
      '.kpr-v-bg {',
      '  position: absolute; top: 0; left: 0; width: 100%; height: 100%;',
      '  object-fit: cover; z-index: 2;',
      '  border-radius: inherit;',
      '  opacity: 0; transition: opacity 0.8s ease;',
      '  pointer-events: none;',
      '}',
      // ── Video card: glowing border effect ──
      '.collectionGallery__item[data-kpr-video-item] {',
      '  border: 1px solid rgba(180,120,200,0.25);',
      '  box-shadow: 0 2px 20px rgba(140,80,180,0.2), inset 0 0 12px rgba(140,80,180,0.08);',
      '}',
      '.collectionGallery__item[data-kpr-video-item]:hover {',
      '  border-color: rgba(200,140,230,0.5);',
      '  box-shadow: 0 4px 30px rgba(160,90,200,0.35), inset 0 0 16px rgba(160,90,200,0.12);',
      '}',
      // ── Play button: centered, visible on hover ──
      '.kpr-v-indicator {',
      '  position: absolute; top: 50%; left: 50%;',
      '  transform: translate(-50%, -50%);',
      '  z-index: 3; opacity: 0; transition: all 0.3s ease;',
      '  background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);',
      '  color: #fff;',
      '  border-radius: 50%; width: 48px; height: 48px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  font-size: 16px; pointer-events: none;',
      '  line-height: 1;',
      '  border: 1px solid rgba(255,255,255,0.15);',
      '  box-shadow: 0 2px 12px rgba(0,0,0,0.4);',
      '}',
      '.collectionGallery__item:hover .kpr-v-indicator {',
      '  opacity: 1;',
      '  transform: translate(-50%, -50%) scale(1.05);',
      '  background: rgba(140,60,180,0.65);',
      '  border-color: rgba(200,140,230,0.5);',
      '}',
      // Modal
      '.kpr-v-modal {',
      '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
      '  z-index: 99999; display: flex; align-items: center; justify-content: center;',
      '  background: rgba(0,0,0,0.92); backdrop-filter: blur(8px);',
      '  opacity: 0; transition: opacity 0.3s ease; pointer-events: none;',
      '}',
      '.kpr-v-modal.active { opacity: 1; pointer-events: auto; }',
      '.kpr-v-modal__box {',
      '  position: relative; width: min(90vw, 1100px); aspect-ratio: 16/9;',
      '  border-radius: 12px; overflow: hidden;',
      '  border: 1px solid rgba(115,48,79,0.6);',
      '  box-shadow: 0 0 40px rgba(115,48,79,0.4);',
      '}',
      '.kpr-v-modal__box iframe { width: 100%; height: 100%; border: none; display: block; }',
      '.kpr-v-modal__close {',
      '  position: absolute; top: -44px; right: 0;',
      '  color: rgba(255,255,255,0.7); font-size: 28px; cursor: pointer;',
      '  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);',
      '  border-radius: 8px; width: 38px; height: 38px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  transition: all 0.2s ease;',
      '}',
      '.kpr-v-modal__close:hover {',
      '  background: rgba(220,53,69,0.75); border-color: rgba(220,53,69,0.75); color: #fff;',
      '}',
      '.kpr-v-modal__title {',
      '  position: absolute; top: -44px; left: 0; right: 52px;',
      '  color: #fff; font-size: 15px; font-family: Orbitron, sans-serif;',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '  opacity: 0.75;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function createVideoModal() {
    if (document.getElementById('kpr-v-modal')) return;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createVideoModal);
      } else {
        setTimeout(createVideoModal, 50);
      }
      return;
    }
    var m = document.createElement('div');
    m.className = 'kpr-v-modal';
    m.id = 'kpr-v-modal';
    m.innerHTML = '<div class="kpr-v-modal__box">' +
      '<div class="kpr-v-modal__close" id="kpr-v-close">&times;</div>' +
      '<div class="kpr-v-modal__title" id="kpr-v-title">Video</div>' +
      '<iframe id="kpr-v-iframe" allowfullscreen="true" scrolling="no"></iframe>' +
      '</div>';
    document.body.appendChild(m);

    document.getElementById('kpr-v-close').addEventListener('click', closeVideoModal);
    m.addEventListener('click', function (e) { if (e.target === m) closeVideoModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeVideoModal(); });
  }

  function openVideoModal(bvid, label) {
    var m = document.getElementById('kpr-v-modal');
    var iframe = document.getElementById('kpr-v-iframe');
    var title = document.getElementById('kpr-v-title');

    if (m && iframe) {
      if (title) title.textContent = label || bvid;
      var embedUrl = 'https://player.bilibili.com/player.html?isOutside=true&bvid=' + encodeURIComponent(bvid) + '&autoplay=1&danmaku=0&high_quality=1';
      iframe.src = embedUrl;
      m.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Detect iframe load failure (X-Frame-Options block) after 3s
      setTimeout(function () {
        try {
          var doc = iframe.contentDocument || iframe.contentWindow.document;
          console.log('[content-patcher] ✅ Video iframe loaded successfully:', bvid);
        } catch (e) {
          console.log('[content-patcher] ⚠️  Video iframe blocked by X-Frame-Options, falling back to direct navigation:', bvid);
          closeVideoModal();
          var directUrl = 'https://www.bilibili.com/video/' + encodeURIComponent(bvid);
          console.log('[content-patcher] 🔗 Redirecting to:', directUrl);
          window.open(directUrl, '_blank');
        }
      }, 3000);
    } else {
      var embedUrl2 = 'https://player.bilibili.com/player.html?isOutside=true&bvid=' + encodeURIComponent(bvid) + '&autoplay=1&danmaku=0&high_quality=1';
      window.location.href = embedUrl2;
    }
  }

  function closeVideoModal() {
    var m = document.getElementById('kpr-v-modal');
    var iframe = document.getElementById('kpr-v-iframe');
    if (!m || !iframe) return;
    iframe.src = '';
    m.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ── Gallery Carousel: hover pause + wheel switch ──
  // Hover pauses auto-carousel, wheel switches cards.
  // Uses capture mode pointer events that fire before the Three.js Canvas.
  function setupGalleryCarousel() {
    var carouselInterval = (config && config.gallery && config.gallery.carouselInterval) || 10;

    // Initialize the global pause flag
    window.__kprCarouselPaused = false;

    var trySetup = 0;
    function attempt() {
      var gallery = document.getElementById('collection-gallery') || document.querySelector('.collectionGallery');
      if (!gallery && trySetup < 20) {
        trySetup++;
        setTimeout(attempt, 1000);
        return;
      }
      if (!gallery) {
        console.warn('[content-patcher] ⚠ Gallery element not found — hover pause disabled');
        return;
      }

      gallery.addEventListener('mouseenter', function() {
        window.__kprCarouselPaused = true;
      });

      gallery.addEventListener('mouseleave', function() {
        window.__kprCarouselPaused = false;
      });

      // ── Wheel-driven card switching ──
      var wheelThrottle = 0;
      document.addEventListener('wheel', function(e) {
        var card = e.target.closest ? e.target.closest('.collectionGallery__item') : null;
        if (!card && !isInGallery(e.clientX, e.clientY)) return;
        if (!card) return;

        e.preventDefault();

        var now = Date.now();
        if (now - wheelThrottle < 400) return;
        wheelThrottle = now;

        var g = window.__kprGallery;
        if (!g) return;

        var dir = e.deltaY > 0 ? 1 : -1;
        var currentIdx = g.props.index || 0;
        var newIdx = currentIdx + dir;
        if (newIdx < 0) newIdx = 0;

        console.log('[content-patcher] 🔄 Wheel: idx ' + currentIdx + ' → ' + newIdx);
        g.setIndex(newIdx, { firstTrigger: false });
      }, { passive: false, capture: true });

      console.log('[content-patcher] ✅ Gallery hover pause + wheel switch set up (interval: ' + carouselInterval + 's)');
    }

    function isInGallery(x, y) {
      var g = document.getElementById('collection-gallery') || document.querySelector('.collectionGallery');
      if (!g) return false;
      var r = g.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    attempt();
  }

  // ── Document-level video click handler (capture mode fallback) ──
  // Catches clicks on video items even if KPR's 3D Canvas consumes events.
  function setupDocumentLevelVideoHandler() {
    document.addEventListener('click', function(e) {
      var videoItems = document.querySelectorAll('[data-kpr-video-item]');
      for (var i = 0; i < videoItems.length; i++) {
        if (videoItems[i].contains(e.target)) {
          var bvid = videoItems[i].getAttribute('data-kpr-video-bvid');
          if (bvid) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[content-patcher] 🎬 Video clicked (document capture):', bvid);
            var galleryCfg = config && config.gallery;
            var videos = (galleryCfg && galleryCfg.videos) || [];
            var label = 'Video';
            for (var j = 0; j < videos.length; j++) {
              if (videos[j].bvid === bvid) { label = videos[j].label || 'Video'; break; }
            }
            openVideoModal(bvid, label);
            return;
          }
        }
      }
    }, true);
  }

  // ── Collection Character Portrait (DOM overlay) ──
  // The hero div has no GSAP animation. The real animations are on .block--left and .block--right:
  //   enter: fromTo(left/right, {y:vh, alpha:1}, {y:0, alpha:1})
  //   exit:  to(left/right, {alpha:0, y:-50*scale})
  // Mouse parallax is done in Three.js Canvas — we replicate with JS pointer tracking.
  function setupCollectionCharacterPortrait() {
    var charImg = (config && config.collectionIntro && config.collectionIntro.characterImage) || '/images/newImage/01.webp';

    var attempts = 0;
    function tryInsert() {
      attempts++;
      var heroWrap = document.querySelector('.homeCollectionIntro__heroWrap');
      var leftBlock = document.querySelector('[data-ui="left"].block--left');
      if ((!heroWrap || !leftBlock) && attempts < 30) {
        setTimeout(tryInsert, 1000);
        return;
      }
      if (!heroWrap || !leftBlock) return;

      if (heroWrap.querySelector('.mornikar-char-portrait')) return;

      // Inject styles — portrait overlays the 3D hero card
      if (!document.getElementById('mornikar-char-portrait-style')) {
        var s = document.createElement('style');
        s.id = 'mornikar-char-portrait-style';
        s.textContent =
          '.homeCollectionIntro__heroWrap { overflow: visible !important; position: relative; }' +
          '.homeCollectionIntro .block--middle { overflow: visible !important; }' +
          '.homeCollectionIntro .blocks { overflow: visible !important; }' +
          '.homeCollectionIntro__inner { overflow: visible !important; }' +
          '.homeCollectionIntro { overflow: visible !important; contain: none !important; }' +
          '.mornikar-char-portrait {' +
          '  position: absolute;' +
          '  top: 50%; left: 50%;' +
          '  transform: translate(-50%, -50%);' +
          '  pointer-events: none;' +
          '  z-index: 10;' +
          '}' +
          '.mornikar-char-portrait img {' +
          '  width: 53vw !important;' +
          '  max-width: none !important;' +
          '  height: auto !important;' +
          '  object-fit: contain !important;' +
          '  filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));' +
          '}';
        document.head.appendChild(s);
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'mornikar-char-portrait';
      var img = document.createElement('img');
      img.src = charImg;
      img.alt = 'Character';
      img.style.width = '53vw';
      img.style.maxWidth = 'none';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
      img.style.filter = 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))';
      wrapper.appendChild(img);
      heroWrap.appendChild(wrapper);

      // Mirror GSAP enter/exit animation from .block--left
      // Enter: fromTo({y:vh, alpha:1}, {y:0, alpha:1})
      // Exit:  to({alpha:0, y:-50*scale})
      var mo = new MutationObserver(function() {
        if (!document.body.contains(wrapper) || !document.body.contains(leftBlock)) return;
        var ct = getComputedStyle(leftBlock);
        var ty = ct.transform;       // matrix(a,b,c,d,tx,ty)
        var op = ct.opacity;
        // Extract translateY from matrix
        var match = ty.match(/matrix\(([^)]+)\)/);
        var offsetY = 0;
        if (match) {
          var vals = match[1].split(',').map(Number);
          offsetY = vals[5] || 0;    // ty component
        }
        wrapper.style.opacity = op;
        wrapper.style.transform = 'translate(calc(-50% + 0px), calc(-50% + ' + offsetY + 'px))';
      });
      mo.observe(leftBlock, { attributes: true, attributeFilter: ['style'] });

      // Mouse parallax: additive on top of GSAP mirror
      var parallaxStrength = 20;
      var pxX = 0, pxY = 0;
      document.addEventListener('pointermove', function(e) {
        if (!document.body.contains(wrapper)) return;
        pxX = (e.clientX / window.innerWidth - 0.5) * 2 * parallaxStrength;
        pxY = (e.clientY / window.innerHeight - 0.5) * 2 * parallaxStrength;
        // Re-read GSAP offset then add parallax
        var ct = getComputedStyle(leftBlock);
        var offsetY = 0;
        var match = ct.transform.match(/matrix\(([^)]+)\)/);
        if (match) { var vals = match[1].split(',').map(Number); offsetY = vals[5] || 0; }
        wrapper.style.transform = 'translate(calc(-50% + ' + pxX + 'px), calc(-50% + ' + (offsetY + pxY) + 'px))';
      });

      console.log('[content-patcher] ✅ Character portrait added + GSAP mirror + mouse parallax');
    }
    setTimeout(tryInsert, 2000);
  }

  // ── Collection MediaWrap image (08.webp) — DOM overlay with offset ──
  // The .mediaInner has overflow:hidden, so we overlay a new img on top like the character portrait
  // GSAP animations on .block--right are mirrored via MutationObserver
  function setupCollectionMediaOverlay() {
    var mediaSrc = '/images/newImage/08.webp';
    if (config && config.collectionIntro && config.collectionIntro.mediaImage) {
      mediaSrc = config.collectionIntro.mediaImage;
    }

    var attempts = 0;
    function tryInsert() {
      attempts++;
      var mediaWrap = document.querySelector('.homeCollectionIntro__mediaWrap');
      var rightBlock = document.querySelector('[data-ui="bottomRight"].block--rightBottom');
      if ((!mediaWrap || !rightBlock) && attempts < 30) {
        setTimeout(tryInsert, 1000);
        return;
      }
      if (!mediaWrap || !rightBlock) return;

      if (mediaWrap.querySelector('.mornikar-media-overlay')) return;

      // Inject styles
      if (!document.getElementById('mornikar-media-overlay-style')) {
        var s = document.createElement('style');
        s.id = 'mornikar-media-overlay-style';
        s.textContent =
          '.homeCollectionIntro__mediaWrap { overflow: visible !important; }' +
          '.block--rightBottom { overflow: visible !important; }' +
          '.block--right { overflow: visible !important; }' +
          '.homeCollectionIntro__mediaWrap .mediaInner { visibility: hidden !important; }' +
          '.mornikar-media-overlay {' +
          '  position: absolute;' +
          '  top: 400px; left: -220px;' +
          '  height: 125%;' +
          '  pointer-events: none;' +
          '  z-index: 10;' +
          '}' +
          '.mornikar-media-overlay img {' +
          '  height: 100%;' +
          '  width: auto;' +
          '  max-width: none;' +
          '  object-fit: contain;' +
          '  object-position: right center;' +
          '  filter: drop-shadow(0 4px 20px rgba(0,0,0,0.4));' +
          '}';
        document.head.appendChild(s);
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'mornikar-media-overlay';
      var img = document.createElement('img');
      img.src = mediaSrc;
      img.alt = 'Media';
      wrapper.appendChild(img);
      mediaWrap.appendChild(wrapper);

      // Mirror GSAP enter/exit from .block--right
      // Enter: fromTo({y:vh, alpha:1}, {y:0, alpha:1})
      // Exit:  to({alpha:0, y:-50*scale})
      var mo = new MutationObserver(function() {
        if (!document.body.contains(wrapper) || !document.body.contains(rightBlock)) return;
        var ct = getComputedStyle(rightBlock);
        var ty = ct.transform;
        var op = ct.opacity;
        var match = ty.match(/matrix\(([^)]+)\)/);
        var offsetY = 0;
        if (match) {
          var vals = match[1].split(',').map(Number);
          offsetY = vals[5] || 0;
        }
        wrapper.style.opacity = op;
        wrapper.style.transform = 'translateY(' + offsetY + 'px)';
      });
      mo.observe(rightBlock, { attributes: true, attributeFilter: ['style'] });

      // Mouse parallax (additive)
      var parallaxStrength = 15;
      var pxX = 0, pxY = 0;
      document.addEventListener('pointermove', function(e) {
        if (!document.body.contains(wrapper)) return;
        pxX = (e.clientX / window.innerWidth - 0.5) * 2 * parallaxStrength;
        pxY = (e.clientY / window.innerHeight - 0.5) * 2 * parallaxStrength;
        var ct = getComputedStyle(rightBlock);
        var offsetY = 0;
        var match = ct.transform.match(/matrix\(([^)]+)\)/);
        if (match) { var vals = match[1].split(',').map(Number); offsetY = vals[5] || 0; }
        wrapper.style.transform = 'translate(' + pxX + 'px, ' + (offsetY + pxY) + 'px)';
      });

      console.log('[content-patcher] ✅ Media overlay added + GSAP mirror + mouse parallax');
    }
    setTimeout(tryInsert, 2000);
  }


  // ── Initialize after config loads ──
  loadConfig().then(function () {
    if (!config) {
      console.warn('[content-patcher] ⚠ Config NOT loaded! No patches will be applied.');
      return;
    }

    // Start DOM patches (images + texts as safety net)
    patchImages();
    startDOMObserver();

    // Kick off gallery video preview (if configured)
    if (config.gallery && config.gallery.videos && config.gallery.videos.length > 0) {
      setupGalleryVideoPreview();
    }

    // Setup document-level handler after a delay to ensure DOM is ready
    setTimeout(setupDocumentLevelVideoHandler, 3000);

    // Kick off gallery carousel (auto-rotate + hover pause)
    setupGalleryCarousel();

    // Collection character portrait (DOM overlay inside hero)
    setupCollectionCharacterPortrait();

    // Collection media overlay (08.webp, offset like character portrait)
    setupCollectionMediaOverlay();


    console.log('[content-patcher] ✅ All modules initialized');
  });

})();
