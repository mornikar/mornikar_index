/**
 * MORNIKAR PORTFOLIO v4.0 — PARALLAX ENGINE
 * 3-Layer Canvas Parallax System
 * Layer 0 (deep): Grid + distant stars — speed 0.05
 * Layer 1 (mid):  Geometric shapes + circuit traces — speed 0.15
 * Layer 2 (front): Light beams + floating particles — speed 0.35
 */

(function () {
    'use strict';

    const layers = {
        deep: { el: null, ctx: null, speed: .045, objects: [] },
        mid: { el: null, ctx: null, speed: .15, objects: [] },
        front: { el: null, ctx: null, speed: .35, objects: [] }
    };

    let W, H;
    let scrollY = 0;
    let targetScroll = 0;
    let mouseX = 0, mouseY = 0;
    let rafId;

    // ---- Init ----
    function init() {
        layers.deep.el = document.getElementById('layer-deep');
        layers.mid.el = document.getElementById('layer-mid');
        layers.front.el = document.getElementById('layer-front');

        if (!layers.deep.el || !layers.mid.el || !layers.front.el) return;

        layers.deep.ctx = layers.deep.el.getContext('2d');
        layers.mid.ctx = layers.mid.el.getContext('2d');
        layers.front.ctx = layers.front.el.getContext('2d');

        resize();
        buildLayerDeep();
        buildLayerMid();
        buildLayerFront();

        window.addEventListener('resize', resize);
        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('mousemove', onMouseMove, { passive: true });

        loop();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        [layers.deep, layers.mid, layers.front].forEach(l => {
            if (!l.el) return;
            l.el.width = W * 1.6;
            l.el.height = H * 1.6;
            l.el.style.width = W * 1.6 + 'px';
            l.el.style.height = H * 1.6 + 'px';
        });
        // Rebuild on major resize
        if (layers.deep.objects.length > 0) {
            buildLayerDeep();
            buildLayerMid();
            buildLayerFront();
        }
    }

    function onScroll(e) {
        targetScroll = window.scrollY;
    }
    function onMouseMove(e) {
        mouseX = (e.clientX / W - .5) * 2;   // -1 ~ 1
        mouseY = (e.clientY / H - .5) * 2;
    }

    // ========================================
    // LAYER 0: DEEP — Perspective grid + stars
    // ========================================
    function buildLayerDeep() {
        const arr = [];
        // Stars
        for (let i = 0; i < 120; i++) {
            arr.push({
                type: 'star',
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 1.5 + .3,
                alpha: Math.random() * .5 + .1,
                twinkleSpeed: Math.random() * .02 + .005,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
        // Hexagonal grid dots (sparse)
        const spacing = 80;
        const cols = Math.ceil(W * 1.6 / spacing) + 4;
        const rows = Math.ceil(H * 1.6 / spacing) + 4;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const ox = (r % 2) * spacing * .5;
                arr.push({
                    type: 'gridDot',
                    x: (c * spacing + ox) / (W * 1.6),
                    y: (r * spacing * .866) / (H * 1.6),
                    size: .8,
                    alpha: .06 + Math.random() * .06
                });
            }
        }
        layers.deep.objects = arr;
    }

    function drawDeep(t) {
        const ctx = layers.deep.ctx;
        const cw = W * 1.6, ch = H * 1.6;
        ctx.clearRect(0, 0, cw, ch);

        // Deep background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, cw, ch);
        bgGrad.addColorStop(0, '#060610');
        bgGrad.addColorStop(.5, '#0a0a18');
        bgGrad.addColorStop(1, '#050510');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cw, ch);

        // Subtle radial glow center
        const rg = ctx.createRadialGradient(cw * .45, ch * .4, 0, cw * .45, ch * .4, cw * .5);
        rg.addColorStop(0, 'rgba(0,212,255,.03)');
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, cw, ch);

        // Draw objects with scroll offset
        const offX = mouseX * 15 * layers.deep.speed;
        const offY = -(scrollY * layers.deep.speed);

        for (const o of layers.deep.objects) {
            let px = o.x * cw + offX;
            let py = ((o.y * ch + offY) % ch + ch) % ch;

            if (o.type === 'star') {
                const twinkle = Math.sin(t * o.twinkleSpeed + o.twinklePhase);
                ctx.globalAlpha = o.alpha * (.6 + twinkle * .4);
                ctx.fillStyle = '#cceeff';
                ctx.beginPath();
                ctx.arc(px, py, o.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (o.type === 'gridDot') {
                ctx.globalAlpha = o.alpha;
                ctx.fillStyle = '#00d4ff';
                ctx.beginPath();
                ctx.arc(px, py, o.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Draw perspective grid lines (vanishing point at center-top)
        ctx.save();
        ctx.translate(cw * .5 + offX * .3, offY * .2);
        ctx.strokeStyle = 'rgba(0,212,255,.04)';
        ctx.lineWidth = .5;
        const vanishY = -ch * .15;
        const horizonW = cw * 1.8;
        // Radial lines from vanishing point
        for (let i = -10; i <= 10; i++) {
            ctx.beginPath();
            ctx.moveTo(0, vanishY);
            ctx.lineTo(i * (horizonW / 20), ch);
            ctx.stroke();
        }
        // Horizontal lines getting closer toward vanishing point
        const hLines = 20;
        for (let i = 1; i <= hLines; i++) {
            const ratio = i / hLines;
            const y = vanishY + (ch - vanishY) * Math.pow(ratio, 1.7);
            const spread = ratio * horizonW * .55;
            ctx.globalAlpha = ratio * .07;
            ctx.beginPath();
            ctx.moveTo(-spread, y);
            ctx.lineTo(spread, y);
            ctx.stroke();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    // ========================================
    // LAYER 1: MID — Triangles + Circuit traces + Hexagons
    // ========================================
    function buildLayerMid() {
        const arr = [];
        // Large triangles (wireframe)
        for (let i = 0; i < 8; i++) {
            const size = 40 + Math.random() * 100;
            arr.push({
                type: 'tri',
                x: Math.random(), y: Math.random(),
                size: size,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - .5) * .0003,
                alpha: .04 + Math.random() * .08,
                stroke: 1,
                color: Math.random() > .7 ? '#ff3344' : '#00d4ff'
            });
        }
        // Small triangles (filled, very dim)
        for (let i = 0; i < 25; i++) {
            arr.push({
                type: 'triFilled',
                x: Math.random(), y: Math.random(),
                size: 8 + Math.random() * 30,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - .5) * .0008,
                alpha: .02 + Math.random() * .04,
                color: '#00d4ff'
            });
        }
        // Circuit traces
        for (let i = 0; i < 12; i++) {
            const pts = [];
            let cx = Math.random();
            let cy = Math.random();
            const segments = 3 + Math.floor(Math.random() * 4);
            for (let s = 0; s <= segments; s++) {
                pts.push({ x: cx, y: cy });
                if (s < segments) {
                    switch (Math.floor(Math.random() * 3)) {
                        case 0: cx += (Math.random() - .5) * .2; break;
                        case 1: cy += (Math.random() - .5) * .15; break;
                        default: cx += (Math.random() - .5) * .15; cy += (Math.random() - .5) * .1;
                    }
                }
            }
            arr.push({
                type: 'circuit',
                points: pts,
                alpha: .06 + Math.random() * .08,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
        // Hexagon outlines
        for (let i = 0; i < 5; i++) {
            arr.push({
                type: 'hex',
                x: Math.random(), y: Math.random(),
                size: 30 + Math.random() * 70,
                rot: Math.random() * Math.PI,
                rotSpeed: (Math.random() - .5) * .0004,
                alpha: .03 + Math.random() * .05
            });
        }
        layers.mid.objects = arr;
    }

    function drawTri(ctx, x, y, size, rot, strokeW, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * size;
            const py = Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    function drawTriFilled(ctx, x, y, size, rot, color, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * size;
            const py = Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawHex(ctx, x, y, size, rot, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = .8;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const px = Math.cos(a) * size;
            const py = Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    function drawMid(t) {
        const ctx = layers.mid.ctx;
        const cw = W * 1.6, ch = H * 1.6;
        ctx.clearRect(0, 0, cw, ch);

        const offX = mouseX * 35 * layers.mid.speed;
        const offY = -(scrollY * layers.mid.speed);

        for (const o of layers.mid.objects) {
            let px = o.x * cw + offX;
            let py = ((o.y * ch + offY) % ch + ch) % ch;

            if (o.type === 'tri') {
                o.rot += o.rotSpeed;
                drawTri(ctx, px, py, o.size, o.rot, o.stroke, o.color, o.alpha);
            } else if (o.type === 'triFilled') {
                o.rot += o.rotSpeed;
                drawTriFilled(ctx, px, py, o.size, o.rot, o.color, o.alpha);
            } else if (o.type === 'circuit') {
                const pulseAlpha = o.alpha * (.7 + .3 * Math.sin(t * .001 + o.pulsePhase));
                ctx.strokeStyle = '#00d4ff';
                ctx.lineWidth = .6;
                ctx.globalAlpha = pulseAlpha;
                ctx.beginPath();
                o.points.forEach((p, i) => {
                    const pxx = p.x * cw + offX;
                    const pyy = ((p.y * ch + offY) % ch + ch) % ch;
                    if (i === 0) ctx.moveTo(pxx, pyy); else ctx.lineTo(pxx, pyy);
                });
                ctx.stroke();

                // Nodes at vertices
                ctx.fillStyle = '#00d4ff';
                o.points.forEach(p => {
                    const pxx = p.x * cw + offX;
                    const pyy = ((p.y * ch + offY) % ch + ch) % ch;
                    ctx.globalAlpha = pulseAlpha * 2;
                    ctx.beginPath();
                    ctx.arc(pxx, pyy, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else if (o.type === 'hex') {
                o.rot += o.rotSpeed;
                drawHex(ctx, px, py, o.size, o.rot, o.alpha);
            }
        }
        ctx.globalAlpha = 1;
    }

    // ========================================
    // LAYER 2: FRONT — Light beams + floating particles
    // ========================================
    function buildLayerFront() {
        const arr = [];
        // Diagonal light beams
        for (let i = 0; i < 5; i++) {
            arr.push({
                type: 'beam',
                x: Math.random(), y: Math.random() - .2,
                width: 30 + Math.random() * 80,
                length: H * 1.2 + Math.random() * H,
                angle: -.4 + Math.random() * .2,
                alpha: .01 + Math.random() * .025,
                hue: Math.random() > .7 ? 340 : 190 // cyan or red-ish
            });
        }
        // Floating dust particles
        for (let i = 0; i < 60; i++) {
            arr.push({
                type: 'dust',
                x: Math.random(), y: Math.random(),
                size: .5 + Math.random() * 2,
                vx: (Math.random() - .5) * .0002,
                vy: (Math.random() - .5) * .00015 - .0001,
                alpha: .2 + Math.random() * .5
            });
        }
        // Small bright particles (like sparks)
        for (let i = 0; i < 15; i++) {
            arr.push({
                type: 'spark',
                x: Math.random(), y: Math.random(),
                size: 1 + Math.random() * 2,
                vx: (Math.random() - .5) * .0003,
                vy: (Math.random() - .5) * .0002,
                alpha: .3 + Math.random() * .4
            });
        }
        layers.front.objects = arr;
    }

    function drawFront(t) {
        const ctx = layers.front.ctx;
        const cw = W * 1.6, ch = H * 1.6;
        ctx.clearRect(0, 0, cw, ch);

        const offX = mouseX * 65 * layers.front.speed;
        const offY = -(scrollY * layers.front.speed);

        for (const o of layers.front.objects) {
            let px = o.x * cw + offX;
            let py = ((o.y * ch + offY) % ch + ch) % ch;

            if (o.type === 'beam') {
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(o.angle);
                const grad = ctx.createLinearGradient(0, 0, 0, o.length);
                if (o.hue === 190) {
                    grad.addColorStop(0, 'rgba(0,212,255,' + o.alpha + ')');
                    grad.addColorStop(.5, 'rgba(0,180,240,' + (o.alpha * .3) + ')');
                    grad.addColorStop(1, 'rgba(0,150,220,0)');
                } else {
                    grad.addColorStop(0, 'rgba(255,51,68,' + o.alpha + ')');
                    grad.addColorStop(.5, 'rgba(200,40,60,' + (o.alpha * .3) + ')');
                    grad.addColorStop(1, 'rgba(160,30,50,0)');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(-o.width / 2, 0, o.width, o.length);
                ctx.restore();
            } else if (o.type === 'dust') {
                o.x += o.vx;
                o.y += o.vy;
                // Wrap
                if (o.x < 0) o.x = 1;
                if (o.x > 1) o.x = 0;
                if (o.y < 0) o.y = 1;
                if (o.y > 1) o.y = 0;
                ctx.globalAlpha = o.alpha * (.5 + .5 * Math.sin(t * .002 + o.x * 10));
                ctx.fillStyle = '#aaccff';
                ctx.beginPath();
                ctx.arc(px, py, o.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (o.type === 'spark') {
                o.x += o.vx;
                o.y += o.vy;
                if (o.x < 0) o.x = 1;
                if (o.x > 1) o.x = 0;
                if (o.y < 0) o.y = 1;
                if (o.y > 1) o.y = 0;
                ctx.globalAlpha = o.alpha * (.4 + .6 * Math.abs(Math.sin(t * .003 + o.y * 15)));
                ctx.fillStyle = '#00d4ff';
                ctx.shadowColor = '#00d4ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(px, py, o.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;
    }

    // ========================================
    // MAIN LOOP
    // ========================================
    function loop(t) {
        // Smooth scroll interpolation
        scrollY += (targetScroll - scrollY) * .08;

        // Apply transforms to canvas elements
        const deepOff = scrollY * layers.deep.speed + mouseX * 12 * layers.deep.speed;
        const midOff = scrollY * layers.mid.speed + mouseX * 28 * layers.mid.speed;
        const frontOff = scrollY * layers.front.speed + mouseX * 50 * layers.front.speed;

        if (layers.deep.el) {
            layers.deep.el.style.transform = `translate(${-W*.2+mouseX*5}px, ${-H*.2+deepOff}px)`;
        }
        if (layers.mid.el) {
            layers.mid.el.style.transform = `translate(${-W*.2+mouseX*12}px, ${-H*.2+midOff}px)`;
        }
        if (layers.front.el) {
            layers.front.el.style.transform = `translate(${-W*.2+mouseX*22}px, ${-H*.2+frontOff}px)`;
        }

        drawDeep(t || 0);
        drawMid(t || 0);
        drawFront(t || 0);

        rafId = requestAnimationFrame(loop);
    }

    // ---- Expose public API ----
    window.PARALLAX_ENGINE = { init, destroy: () => cancelAnimationFrame(rafId) };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
