/**
 * MORNIKAR PORTFOLIO v4.1 — MAIN INTERACTIONS
 * Loader · Typewriter · Scroll Reveal · Nav · Counters · Skill Bars
 */

(function () {
    'use strict';

    // ========================================
    // LOADER
    // ========================================
    const loader = document.getElementById('loader');
    const loaderFill = loader ? loader.querySelector('.loader-fill') : null;
    const loaderPct = loader ? loader.querySelector('.loader-pct') : null;
    const loaderStatus = loader ? loader.querySelector('.loader-status') : null;

    function runLoader() {
        if (!loader) { initAfterLoad(); return; }

        let progress = 0;
        const stages = [
            { at: 0, text: 'INITIALIZING SYSTEM' },
            { at: 25, text: 'LOADING ASSETS' },
            { at: 55, text: 'RENDERING LAYERS' },
            { at: 80, text: 'COMPILING SHADERS' },
            { at: 95, text: 'FINALIZING' }
        ];

        const tick = setInterval(() => {
            progress += Math.random() * 7 + 2.5;
            if (progress > 100) progress = 100;

            if (loaderFill) loaderFill.style.width = progress + '%';
            if (loaderPct) loaderPct.textContent = Math.floor(progress) + '%';

            const stage = stages.slice().reverse().find(s => progress >= s.at);
            if (stage && loaderStatus) loaderStatus.textContent = stage.text;

            if (progress >= 100) {
                clearInterval(tick);
                setTimeout(() => {
                    loader.classList.add('out');
                    initAfterLoad();
                }, 550);
            }
        }, 70);
    }

    // ========================================
    // TYPEWRITER
    // ========================================
    function typewriter(el, speed) {
        const text = el.dataset.text || el.textContent || '';
        if (!text || !el) return;
        let i = 0;
        el.textContent = '';
        el.style.opacity = '1';

        function next() {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(next, speed || 55 + Math.random() * 30);
            }
        }
        setTimeout(next, 2100);
    }

    // ========================================
    // SCROLL REVEAL
    // ========================================
    function initScrollReveal() {
        const elements = document.querySelectorAll('.reveal');
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('vis');
                    entry.target.querySelectorAll('[data-count]').forEach(c => animateCounter(c));
                    entry.target.querySelectorAll('.skill-fill[data-w]').forEach(s => animateSkillBar(s));
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });

        elements.forEach(el => obs.observe(el));
    }

    // ========================================
    // COUNTER ANIMATION
    // ========================================
    function animateCounter(el) {
        if (el.dataset.animated) return;
        el.dataset.animated = '1';
        const target = parseInt(el.dataset.count, 10);
        const dur = 1400;
        const start = performance.now();

        function frame(now) {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.floor(target * ease)).padStart(2, '0');
            if (p < 1) requestAnimationFrame(frame);
            else el.textContent = String(target).padStart(2, '0');
        }
        requestAnimationFrame(frame);
    }

    // ========================================
    // SKILL BAR ANIMATION
    // ========================================
    function animateSkillBar(el) {
        if (el.dataset.filled) return;
        el.dataset.filled = '1';
        const w = el.dataset.w || '0';
        el.style.transition = 'none';
        el.style.width = '0%';
        void el.offsetWidth;
        el.style.transition = 'width 1.4s cubic-bezier(.16,1,.3,1)';
        el.style.width = w + '%';
    }

    function initSkillBars() {
        const term = document.querySelector('.term-out');
        if (!term) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.querySelectorAll('.skill-fill[data-w]').forEach(s => animateSkillBar(s));
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: .3 });
        obs.observe(term);
    }

    // ========================================
    // NAVIGATION
    // ========================================
    function initNav() {
        const nav = document.getElementById('nav');
        const sections = document.querySelectorAll('.sect');
        const links = document.querySelectorAll('.nav-item');

        window.addEventListener('scroll', () => {
            const sy = window.scrollY;
            nav.classList.toggle('show', sy > 120);

            sections.forEach(s => {
                const r = s.getBoundingClientRect();
                if (r.top <= 180 && r.bottom > 180) {
                    const id = s.id;
                    links.forEach(l => l.classList.toggle('active', l.dataset.section === id));
                }
            });
        }, { passive: true });

        links.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const t = document.querySelector(link.getAttribute('href'));
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ========================================
    // GLITCH EFFECT
    // ========================================
    function initGlitch() {
        document.querySelectorAll('.proj-card').forEach(card => {
            const wm = card.querySelector('.proj-watermark');
            if (!wm) return;
            card.addEventListener('mouseenter', () => {
                wm.style.animation = 'none';
                void wm.offsetWidth;
                wm.style.animation = '';
            });
        });
    }

    // ========================================
    // CAROUSEL SYSTEM
    // ========================================
    function initCarousel() {
        const carousel = document.querySelector('.carousel-container');
        if (!carousel) return;

        const track = carousel.querySelector('.carousel-track');
        const slides = carousel.querySelectorAll('.carousel-slide');
        const dots = carousel.querySelectorAll('.dot');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        if (!track || slides.length === 0) return;

        let currentSlide = Array.from(slides).findIndex(slide => slide.classList.contains('active'));
        if (currentSlide < 0) currentSlide = 0;
        let autoSlideInterval = null;
        let resumeTimer = null;

        // 归一化索引，保证首尾循环。
        function normalizeIndex(index) {
            if (index < 0) index = slides.length - 1;
            if (index >= slides.length) index = 0;
            return index;
        }

        // 同步轨道位置、卡片状态和分页点。
        function updateCarousel() {
            track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
            slides.forEach((slide, index) => {
                slide.classList.toggle('active', index === currentSlide);
            });
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        // 跳转到指定幻灯片
        function goToSlide(index) {
            currentSlide = normalizeIndex(index);
            updateCarousel();
        }

        // 下一张幻灯片
        function nextSlide() {
            goToSlide(currentSlide + 1);
        }

        // 上一张幻灯片
        function prevSlide() {
            goToSlide(currentSlide - 1);
        }

        // 开始自动轮播
        function startAutoSlide() {
            stopAutoSlide();
            if (slides.length <= 1) return;
            autoSlideInterval = window.setInterval(nextSlide, 5000); // 每5秒切换一次
        }

        // 停止自动轮播
        function stopAutoSlide() {
            if (autoSlideInterval) {
                window.clearInterval(autoSlideInterval);
                autoSlideInterval = null;
            }
        }

        // 用户手动操作后延迟恢复自动轮播。
        function scheduleAutoSlide() {
            if (resumeTimer) window.clearTimeout(resumeTimer);
            resumeTimer = window.setTimeout(startAutoSlide, 10000);
        }

        // 事件监听器
        if (prevBtn) prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            prevSlide();
            scheduleAutoSlide();
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            nextSlide();
            scheduleAutoSlide();
        });

        // 点点击事件
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                stopAutoSlide();
                goToSlide(index);
                scheduleAutoSlide();
            });
        });

        // 鼠标悬停暂停
        carousel.addEventListener('mouseenter', stopAutoSlide);
        carousel.addEventListener('mouseleave', scheduleAutoSlide);

        // 触摸滑动支持
        let startX = 0;
        let isDragging = false;

        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            stopAutoSlide();
        });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            
            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;
            
            if (Math.abs(diffX) > 50) { // 滑动阈值
                if (diffX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
            
            isDragging = false;
            scheduleAutoSlide();
        });

        updateCarousel();
        startAutoSlide();
    }

    // ========================================
    // VIDEO CARD
    // ========================================
    let videoModal = null;

    function ensureVideoModal() {
        if (videoModal) return videoModal;
        if (!document.body) return null;

        videoModal = document.createElement('div');
        videoModal.className = 'video-modal';
        videoModal.hidden = true;
        videoModal.innerHTML = [
            '<div class="video-modal__backdrop" data-video-close></div>',
            '<section class="video-modal__panel" aria-modal="true" role="dialog">',
            '  <button class="video-modal__close" type="button" aria-label="关闭视频" data-video-close>&times;</button>',
            '  <div class="video-modal__head">',
            '    <h3 class="video-modal__title">Video</h3>',
            '    <a class="video-modal__open" target="_blank" rel="noopener noreferrer">在 Bilibili 打开</a>',
            '  </div>',
            '  <div class="video-modal__frame-wrap">',
            '    <iframe class="video-modal__frame" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen scrolling="no"></iframe>',
            '  </div>',
            '</section>'
        ].join('');
        document.body.appendChild(videoModal);

        videoModal.addEventListener('click', event => {
            if (event.target.closest('[data-video-close]')) closeVideoModal();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && videoModal && !videoModal.hidden) closeVideoModal();
        });

        return videoModal;
    }

    function openVideoModal(bvid, title) {
        const modal = ensureVideoModal();
        const directUrl = 'https://www.bilibili.com/video/' + encodeURIComponent(bvid);
        if (!modal) {
            window.open(directUrl, '_blank', 'noopener');
            return;
        }

        const frame = modal.querySelector('.video-modal__frame');
        const titleEl = modal.querySelector('.video-modal__title');
        const openLink = modal.querySelector('.video-modal__open');
        const embedUrl = 'https://player.bilibili.com/player.html?isOutside=true&bvid=' + encodeURIComponent(bvid) + '&autoplay=1&danmaku=0&high_quality=1';

        if (titleEl) titleEl.textContent = title || 'Video';
        if (openLink) openLink.href = directUrl;
        if (frame) frame.src = embedUrl;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
    }

    function closeVideoModal() {
        if (!videoModal) return;
        const frame = videoModal.querySelector('.video-modal__frame');
        if (frame) frame.src = '';
        videoModal.hidden = true;
        document.body.style.overflow = '';
    }

    function initVideoCards() {
        const cards = document.querySelectorAll('[data-video-bvid]');
        if (!cards.length) return;

        cards.forEach(card => {
            if (card.dataset.videoReady === 'true') return;
            const visual = card.querySelector('.proj-visual') || card;
            const bvid = card.dataset.videoBvid;
            const title = card.dataset.videoTitle || 'Video';
            const coverUrl = card.dataset.videoCover;
            if (!bvid || !visual) return;

            card.dataset.videoReady = 'true';
            visual.classList.add('video-card-visual');

            const cover = document.createElement('button');
            cover.className = 'video-card-cover';
            cover.type = 'button';
            cover.setAttribute('aria-label', title + ' 视频预览');
            if (coverUrl) cover.style.backgroundImage = 'url("' + coverUrl + '")';
            cover.innerHTML = '<span class="video-card-play" aria-hidden="true"></span>';
            cover.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                openVideoModal(bvid, title);
            });

            visual.appendChild(cover);
        });
    }

    // ========================================
    // INIT ALL AFTER LOADER (更新)
    // ========================================
    function initAfterLoad() {
        const typeEl = document.querySelector('.hero-type');
        if (typeEl) typewriter(typeEl);

        initScrollReveal();
        initNav();
        initSkillBars();
        initGlitch();
        initCarousel(); // 新增轮播初始化
        initVideoCards();

        document.querySelectorAll('.hero-stats-grid [data-count]').forEach(c => animateCounter(c));

        const htCur = document.querySelector('.ht-cursor');
        if (htCur) {
            setInterval(() => { htCur.style.opacity = htCur.style.opacity === '0' ? '1' : '0'; }, 530);
        }
    }

    // ---- Start ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runLoader);
    } else {
        runLoader();
    }
})();
