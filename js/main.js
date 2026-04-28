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
    // INIT ALL AFTER LOADER
    // ========================================
    function initAfterLoad() {
        const typeEl = document.querySelector('.hero-type');
        if (typeEl) typewriter(typeEl);

        initScrollReveal();
        initNav();
        initSkillBars();
        initGlitch();

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
