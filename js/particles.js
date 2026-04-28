/**
 * MORNIKAR PORTFOLIO v4.0 — FX PARTICLES
 * Triangle + Circuit-line overlay particles
 * Renders on top of parallax layers, responds to mouse
 */

(function () {
    'use strict';

    let canvas, ctx;
    let W, H;
    let mouseX = 0, mouseY = 0;
    let rafId;

    // Particle pools
    const triangles = [];
    const circuits = [];
    const nodes = [];

    function init() {
        canvas = document.getElementById('fx-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        buildTriangles();
        buildCircuits();

        window.addEventListener('resize', resize);
        document.addEventListener('mousemove', onMouseMove, { passive: true });
        loop();
    }

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    }
    function onMouseMove(e) {
        mouseX = e.clientX / W;  // 0-1
        mouseY = e.clientY / H;
    }

    // ---- Build floating triangles ----
    function buildTriangles() {
        for (let i = 0; i < 10; i++) {
            triangles.push({
                x: Math.random(),
                y: Math.random(),
                size: 15 + Math.random() * 45,
                rot: Math.random() * Math.PI * 2,
                rotV: (Math.random() - .5) * .0008,
                vx: (Math.random() - .5) * .00008,
                vy: (Math.random() - .5) * .00006,
                alpha: .03 + Math.random() * .06,
                strokeW: .7 + Math.random() * 1,
                // Color mix: mostly cyan, some red accents
                color: Math.random() > .85 ? '#ff3344' : '#00d4ff'
            });
        }
    }

    // ---- Build circuit traces with animated data flow ----
    function buildCircuits() {
        for (let i = 0; i < 6; i++) {
            const pts = [];
            let cx = Math.random();
            let cy = Math.random();
            const segs = 2 + Math.floor(Math.random() * 3);
            for (let s = 0; s <= segs; s++) {
                pts.push({ x: cx, y: cy });
                if (s < segs) {
                    if (Math.random() > .5) cx += (Math.random() - .5) * .25;
                    else cy += (Math.random() - .5) * .18;
                }
            }
            circuits.push({
                points: pts,
                alpha: .04 + Math.random() * .06,
                phase: Math.random() * Math.PI * 2,
                dataPos: 0,   // animated data packet position along path
                dataSpeed: .3 + Math.random() * .5
            });
            // Nodes at each vertex
            pts.forEach(p => {
                nodes.push({
                    baseX: p.x,
                    baseY: p.y,
                    size: 1.5 + Math.random() * 1.5,
                    alpha: .15 + Math.random() * .25,
                    pulsePhase: Math.random() * Math.PI * 2
                });
            });
        }
    }

    // ---- Drawing ----
    function drawTriangle(t) {
        for (const tr of triangles) {
            // Update position (slow drift)
            tr.x += tr.vx;
            tr.y += tr.vy;
            tr.rot += tr.rotV;
            if (tr.x < -.1) tr.x = 1.1;
            if (tr.x > 1.1) tr.x = -.1;
            if (tr.y < -.1) tr.y = 1.1;
            if (tr.y > 1.1) tr.y = -.1;

            // Mouse parallax offset
            const px = tr.x * W + (mouseX - .5) * 30;
            const py = tr.y * H + (mouseY - .5) * 20;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(tr.rot);
            ctx.strokeStyle = tr.color;
            ctx.lineWidth = tr.strokeW;
            ctx.globalAlpha = tr.alpha;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const tx = Math.cos(a) * tr.size;
                const ty = Math.sin(a) * tr.size;
                if (i === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawCircuits(t) {
        const time = t * .001;

        for (const c of circuits) {
            const mouseOffX = (mouseX - .5) * 18;
            const mouseOffY = (mouseY - .5) * 12;
            const pulseAlpha = c.alpha * (.6 + .4 * Math.sin(time + c.phase));

            // Draw trace line
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = .5;
            ctx.globalAlpha = pulseAlpha;
            ctx.beginPath();
            c.points.forEach((p, i) => {
                const px = p.x * W + mouseOffX;
                const py = p.y * H + mouseOffY;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Animated data packet traveling along the path
            c.dataPos += c.dataSpeed * .0016;
            if (c.dataPos >= 1) c.dataPos = 0;
            if (c.points.length >= 2) {
                const totalLen = c.points.length - 1;
                const segIdx = Math.floor(c.dataPos * totalLen);
                const segFrac = (c.dataPos * totalLen) % 1;
                const p0 = c.points[Math.min(segIdx, c.points.length - 1)];
                const p1 = c.points[Math.min(segIdx + 1, c.points.length - 1)];
                const dpx = (p0.x + (p1.x - p0.x) * segFrac) * W + mouseOffX;
                const dpy = (p0.y + (p1.y - p0.y) * segFrac) * H + mouseOffY;

                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = '#00d4ff';
                ctx.shadowBlur = 12;
                ctx.globalAlpha = .6 + .4 * Math.sin(t * .01);
                ctx.beginPath();
                ctx.arc(dpx, dpy, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Draw nodes
        for (const n of nodes) {
            const npx = n.baseX * W + (mouseX - .5) * 18;
            const npy = n.baseY * H + (mouseY - .5) * 12;
            const pa = n.alpha * (.5 + .5 * Math.sin(t * .002 + n.pulsePhase));
            ctx.fillStyle = '#00d4ff';
            ctx.globalAlpha = pa;
            ctx.beginPath();
            ctx.arc(npx, npy, n.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function loop(t) {
        ctx.clearRect(0, 0, W, H);
        drawTriangle(t || 0);
        drawCircuits(t || 0);
        rafId = requestAnimationFrame(loop);
    }

    window.FX_PARTICLES = { init, destroy: () => cancelAnimationFrame(rafId) };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
