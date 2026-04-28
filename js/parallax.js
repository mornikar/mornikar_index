/**
 * MORNIKAR PORTFOLIO — PARALLAX BACKGROUND SYSTEM
 * Procedurally generates multi-layer parallax backgrounds using Canvas 2D
 */

(function() {
    'use strict';

    const layers = [
        { id: 'bg-layer-1', speed: 0.1, type: 'grid' },
        { id: 'bg-layer-2', speed: 0.3, type: 'shapes' },
        { id: 'bg-layer-3', speed: 0.6, type: 'beams' }
    ];

    const canvases = [];
    const contexts = [];
    let scrollY = 0;
    let ticking = false;
    let animationId = null;

    // ---- Initialize Canvases ----
    function init() {
        layers.forEach((layer, index) => {
            const canvas = document.getElementById(layer.id);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvases[index] = canvas;
            contexts[index] = ctx;

            resizeCanvas(canvas);
            drawLayer(index, layer.type, 0);
        });

        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, { passive: true });

        animate();
    }

    function resizeCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }

    function onResize() {
        canvases.forEach((canvas, i) => {
            if (canvas) resizeCanvas(canvas);
        });
        requestDraw();
    }

    function onScroll() {
        scrollY = window.scrollY;
        if (!ticking) {
            requestAnimationFrame(() => {
                requestDraw();
                ticking = false;
            });
            ticking = true;
        }
    }

    function requestDraw() {
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(() => {
            layers.forEach((layer, i) => {
                drawLayer(i, layer.type, scrollY * layer.speed);
            });
        });
    }

    function animate() {
        requestDraw();
    }

    // ---- Layer 1: Perspective Grid ----
    function drawGridLayer(ctx, w, h, offset) {
        ctx.clearRect(0, 0, w, h);

        const gridColor = 'rgba(0, 212, 255, 0.08)';
        const vanishX = w / 2;
        const vanishY = h / 2;
        const gridSize = 60;
        const perspective = 800;

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

        // Horizontal perspective lines
        for (let i = -10; i <= 20; i++) {
            const y = vanishY + (i * gridSize) - (offset * 0.5) % gridSize;
            const scale = perspective / (perspective + (y - vanishY));
            const lineWidth = w / scale;

            ctx.beginPath();
            ctx.moveTo(vanishX - lineWidth / 2, y);
            ctx.lineTo(vanishX + lineWidth / 2, y);
            ctx.stroke();
        }

        // Vertical perspective lines (radiating from vanishing point)
        for (let i = -15; i <= 15; i++) {
            const angle = (i * 8) * Math.PI / 180;
            ctx.beginPath();
            ctx.moveTo(vanishX, vanishY);
            ctx.lineTo(
                vanishX + Math.sin(angle) * w * 1.5,
                vanishY + Math.cos(angle) * h * 1.5
            );
            ctx.stroke();
        }

        // Scattered dots (stars)
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        const seed = 42;
        for (let i = 0; i < 80; i++) {
            const px = ((i * 137.5 + seed) % w);
            const py = ((i * 89.7 + seed * 2) % h);
            const size = 0.5 + (i % 3) * 0.5;
            const blink = Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5;
            ctx.globalAlpha = 0.2 * blink;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Hexagonal patterns in corners
        drawHexPattern(ctx, w * 0.1, h * 0.15, 30, offset);
        drawHexPattern(ctx, w * 0.9, h * 0.8, 25, offset);
    }

    function drawHexPattern(ctx, cx, cy, size, offset) {
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.lineWidth = 0.5;

        for (let ring = 1; ring <= 3; ring++) {
            const r = size * ring;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60 + offset * 0.1) * Math.PI / 180;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    // ---- Layer 2: Floating Geometric Shapes ----
    function drawShapesLayer(ctx, w, h, offset) {
        ctx.clearRect(0, 0, w, h);

        const shapes = [
            { type: 'cube', x: 0.15, y: 0.25, size: 40, rot: 0.5 },
            { type: 'triangle', x: 0.75, y: 0.15, size: 35, rot: 1.2 },
            { type: 'cube', x: 0.85, y: 0.65, size: 50, rot: 0.8 },
            { type: 'triangle', x: 0.25, y: 0.75, size: 30, rot: 1.5 },
            { type: 'line', x: 0.5, y: 0.4, size: 80, rot: 0.3 },
            { type: 'cube', x: 0.6, y: 0.85, size: 25, rot: 2.0 },
            { type: 'triangle', x: 0.1, y: 0.55, size: 20, rot: 0.7 },
            { type: 'line', x: 0.9, y: 0.35, size: 60, rot: 1.8 },
        ];

        shapes.forEach((shape, i) => {
            const x = shape.x * w;
            const y = shape.y * h + (offset * (0.3 + i * 0.05)) % h * 0.3;
            const rotation = shape.rot + offset * 0.0005;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);

            ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.shadowColor = 'rgba(0, 212, 255, 0.3)';
            ctx.shadowBlur = 10;

            if (shape.type === 'cube') {
                drawWireCube(ctx, 0, 0, shape.size);
            } else if (shape.type === 'triangle') {
                drawWireTriangle(ctx, 0, 0, shape.size);
            } else if (shape.type === 'line') {
                drawCircuitLine(ctx, 0, 0, shape.size);
            }

            ctx.restore();
        });
    }

    function drawWireCube(ctx, x, y, size) {
        const s = size / 2;
        // Front face
        ctx.strokeRect(x - s, y - s, size, size);
        // Back face (offset)
        const o = s * 0.4;
        ctx.strokeRect(x - s + o, y - s - o, size, size);
        // Connecting lines
        ctx.beginPath();
        ctx.moveTo(x - s, y - s);
        ctx.lineTo(x - s + o, y - s - o);
        ctx.moveTo(x + s, y - s);
        ctx.lineTo(x + s + o, y - s - o);
        ctx.moveTo(x - s, y + s);
        ctx.lineTo(x - s + o, y + s - o);
        ctx.moveTo(x + s, y + s);
        ctx.lineTo(x + s + o, y + s - o);
        ctx.stroke();
    }

    function drawWireTriangle(ctx, x, y, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s * 0.866, y + s * 0.5);
        ctx.lineTo(x - s * 0.866, y + s * 0.5);
        ctx.closePath();
        ctx.stroke();

        // Inner triangle
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.3);
        ctx.lineTo(x + s * 0.26, y + s * 0.15);
        ctx.lineTo(x - s * 0.26, y + s * 0.15);
        ctx.closePath();
        ctx.stroke();
    }

    function drawCircuitLine(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x - size / 2, y);
        ctx.lineTo(x - size / 4, y);
        ctx.lineTo(x - size / 8, y - size / 4);
        ctx.lineTo(x + size / 8, y + size / 4);
        ctx.lineTo(x + size / 4, y);
        ctx.lineTo(x + size / 2, y);
        ctx.stroke();

        // Dots on line
        ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
        [-size/2, -size/4, size/4, size/2].forEach(dx => {
            ctx.beginPath();
            ctx.arc(x + dx, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ---- Layer 3: Light Beams ----
    function drawBeamsLayer(ctx, w, h, offset) {
        ctx.clearRect(0, 0, w, h);

        const beams = [
            { x1: 0, y1: 0, x2: w * 0.6, y2: h, width: 100, alpha: 0.03 },
            { x1: w, y1: 0, x2: w * 0.4, y2: h, width: 80, alpha: 0.02 },
            { x1: w * 0.3, y1: 0, x2: w * 0.1, y2: h, width: 60, alpha: 0.025 },
        ];

        beams.forEach((beam, i) => {
            const shift = Math.sin(offset * 0.001 + i) * 20;

            ctx.save();
            ctx.globalAlpha = beam.alpha;

            const gradient = ctx.createLinearGradient(
                beam.x1, beam.y1 + shift,
                beam.x2, beam.y2 + shift
            );
            gradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(beam.x1 - beam.width / 2, beam.y1);
            ctx.lineTo(beam.x1 + beam.width / 2, beam.y1);
            ctx.lineTo(beam.x2 + beam.width / 3, beam.y2);
            ctx.lineTo(beam.x2 - beam.width / 3, beam.y2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });

        // Floating particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 30; i++) {
            const px = ((i * 73.3) % w);
            const py = ((i * 47.1 + offset * 0.2) % h);
            const size = 0.5 + (i % 2);
            ctx.globalAlpha = 0.15 + Math.sin(offset * 0.002 + i) * 0.1;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Corner lens flares
        drawLensFlare(ctx, w * 0.05, h * 0.1, 40, offset);
        drawLensFlare(ctx, w * 0.95, h * 0.9, 30, offset);
    }

    function drawLensFlare(ctx, x, y, size, offset) {
        const pulse = Math.sin(offset * 0.002) * 0.5 + 0.5;
        ctx.save();
        ctx.globalAlpha = 0.05 * pulse;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // ---- Main Draw Function ----
    function drawLayer(index, type, offset) {
        const canvas = canvases[index];
        const ctx = contexts[index];
        if (!canvas || !ctx) return;

        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        switch (type) {
            case 'grid':
                drawGridLayer(ctx, w, h, offset);
                break;
            case 'shapes':
                drawShapesLayer(ctx, w, h, offset);
                break;
            case 'beams':
                drawBeamsLayer(ctx, w, h, offset);
                break;
        }
    }

    // ---- Start ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
