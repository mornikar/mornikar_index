/**
 * MORNIKAR PORTFOLIO — MAIN INTERACTIONS
 * Loader, typewriter, scroll animations, nav, counters
 */

(function() {
    'use strict';

    // ============================================
    // LOADER
    // ============================================
    const loader = document.getElementById('loader');
    const loaderProgress = document.querySelector('.loader-progress');
    const loaderPercent = document.querySelector('.loader-percent');
    const loaderStatus = document.querySelector('.loader-status');

    function runLoader() {
        let progress = 0;
        const stages = [
            { at: 0, text: 'INITIALIZING' },
            { at: 30, text: 'LOADING ASSETS' },
            { at: 60, text: 'RENDERING LAYERS' },
            { at: 85, text: 'FINALIZING' },
        ];

        const interval = setInterval(() => {
            progress += Math.random() * 8 + 2;
            if (progress > 100) progress = 100;

            loaderProgress.style.width = progress + '%';
            loaderPercent.textContent = Math.floor(progress) + '%';

            const stage = stages.slice().reverse().find(s => progress >= s.at);
            if (stage) loaderStatus.textContent = stage.text;

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    loader.classList.add('hidden');
                    initAnimations();
                }, 500);
            }
        }, 80);
    }

    // ============================================
    // TYPEWRITER EFFECT
    // ============================================
    function typewriter(element, text, speed = 60) {
        let i = 0;
        element.textContent = '';
        element.style.opacity = '1';

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }

        setTimeout(type, 2200);
    }

    // ============================================
    // SCROLL REVEAL
    // ============================================
    function initScrollReveal() {
        const revealElements = document.querySelectorAll(
            '.project-card, .design-item, .oss-card, .about-terminal, .section-header'
        );

        revealElements.forEach(el => el.classList.add('reveal'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Counter animation for stats
                    const counters = entry.target.querySelectorAll('[data-count]');
                    counters.forEach(counter => animateCounter(counter));
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        revealElements.forEach(el => observer.observe(el));
    }

    // ============================================
    // COUNTER ANIMATION
    // ============================================
    function animateCounter(element) {
        if (element.dataset.animated) return;
        element.dataset.animated = 'true';

        const target = parseInt(element.dataset.count);
        const duration = 1500;
        const start = performance.now();
        const startValue = 0;

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(startValue + (target - startValue) * eased);

            element.textContent = current.toString().padStart(2, '0');

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toString().padStart(2, '0');
            }
        }

        requestAnimationFrame(update);
    }

    // ============================================
    // NAVIGATION
    // ============================================
    function initNav() {
        const nav = document.getElementById('nav');
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');

        // Show/hide nav on scroll
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;

            if (currentScroll > 100) {
                nav.classList.add('visible');
            } else {
                nav.classList.remove('visible');
            }

            // Active section highlight
            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 200 && rect.bottom > 200) {
                    const id = section.id;
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    });
                }
            });

            lastScroll = currentScroll;
        }, { passive: true });

        // Smooth scroll for nav links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ============================================
    // PARALLAX CARDS
    // ============================================
    function initParallaxCards() {
        const cards = document.querySelectorAll('[data-parallax]');

        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;

            cards.forEach(card => {
                const speed = parseFloat(card.dataset.parallax) || 1;
                const rect = card.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                const viewportCenter = window.innerHeight / 2;
                const offset = (centerY - viewportCenter) * 0.02 * speed;

                card.style.transform = `translateY(${offset}px)`;
            });
        }, { passive: true });
    }

    // ============================================
    // GLITCH EFFECT
    // ============================================
    function initGlitch() {
        const glitches = document.querySelectorAll('.project-glitch');

        glitches.forEach(el => {
            const originalText = el.dataset.text || el.textContent;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

            function glitch() {
                let iterations = 0;
                const maxIterations = 10;

                const interval = setInterval(() => {
                    el.textContent = originalText
                        .split('')
                        .map((char, i) => {
                            if (i < iterations) return originalText[i];
                            return chars[Math.floor(Math.random() * chars.length)];
                        })
                        .join('');

                    iterations += 1 / 3;
                    if (iterations >= maxIterations) {
                        clearInterval(interval);
                        el.textContent = originalText;
                    }
                }, 50);
            }

            // Trigger on hover
            el.closest('.project-card').addEventListener('mouseenter', glitch);
        });
    }

    // ============================================
    // SKILL BAR ANIMATION
    // ============================================
    function initSkillBars() {
        const skillBars = document.querySelectorAll('.skill-fill');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const width = bar.style.width;
                    bar.style.width = '0%';
                    setTimeout(() => {
                        bar.style.width = width;
                    }, 100);
                    observer.unobserve(bar);
                }
            });
        }, { threshold: 0.5 });

        skillBars.forEach(bar => observer.observe(bar));
    }

    // ============================================
    // INITIALIZE ALL
    // ============================================
    function initAnimations() {
        // Typewriter
        const typewriterEl = document.querySelector('.typewriter');
        if (typewriterEl) {
            typewriter(typewriterEl, typewriterEl.dataset.text || '');
        }

        initScrollReveal();
        initNav();
        initParallaxCards();
        initGlitch();
        initSkillBars();

        // Animate hero stats on load
        document.querySelectorAll('.hero-stats .stat-num').forEach(counter => {
            animateCounter(counter);
        });
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runLoader);
    } else {
        runLoader();
    }
})();
