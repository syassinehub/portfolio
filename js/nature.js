// ============================================
// FOND ANIMÉ — ÉCOULEMENT DANS UN BASSIN VERSANT
// ============================================
// Des particules suivent un champ de flux (bruit de Perlin) avec une légère pente,
// comme l'eau qui ruisselle sur un territoire ; quelques-unes, ambrées, figurent l'azote.
// Le pointeur crée des remous. Désactivé si l'utilisateur réduit les animations.

(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // --- Bruit de Perlin 3D (implémentation de référence de Ken Perlin) ----
    const perm = new Uint8Array(512);
    (() => {
        const p = Array.from({ length: 256 }, (_, i) => i);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    })();
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    const grad = (h, x, y, z) => {
        const u = (h & 15) < 8 ? x : y;
        const v = (h & 15) < 4 ? y : (h & 15) === 12 || (h & 15) === 14 ? x : z;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    };
    function noise(x, y, z) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = fade(x), v = fade(y), w = fade(z);
        const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
        const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
        return lerp(
            lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
                lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
            lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
                lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
            w);
    }

    const COLORS = [
        [159, 211, 184], // menthe : végétation
        [159, 211, 184],
        [126, 186, 214], // eau
        [126, 186, 214],
        [190, 228, 205],
    ];
    const NITROGEN = [232, 176, 92]; // ambre : azote

    function createFlow(host) {
        const canvas = document.createElement('canvas');
        canvas.className = 'flow';
        canvas.setAttribute('aria-hidden', 'true');
        host.prepend(canvas);
        const ctx = canvas.getContext('2d');
        const small = window.matchMedia('(max-width: 700px)').matches;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const pointer = { x: -9999, y: -9999, active: false };
        let width = 0, height = 0, particles = [], onScreen = true, t = Math.random() * 100;

        function spawn(p = {}) {
            p.x = Math.random() * width;
            p.y = Math.random() * height;
            p.life = 0;
            p.maxLife = 180 + Math.random() * 320;
            p.speed = (0.45 + Math.random() * 0.9) * dpr;
            p.color = Math.random() < 0.08 ? NITROGEN : COLORS[(Math.random() * COLORS.length) | 0];
            p.width = (Math.random() < 0.15 ? 1.6 : 1) * dpr;
            return p;
        }

        function resize() {
            const rect = host.getBoundingClientRect();
            width = Math.max(1, Math.round(rect.width * dpr));
            height = Math.max(1, Math.round(rect.height * dpr));
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const area = rect.width * rect.height;
            const count = Math.round(Math.min(small ? 150 : 420, Math.max(70, area / (small ? 3800 : 5200))));
            particles = Array.from({ length: count }, () => spawn());
            particles.forEach((p) => { p.life = Math.random() * p.maxLife; });
        }

        function step() {
            requestAnimationFrame(step);
            if (!onScreen || document.hidden) return;
            t += 0.0025;

            // Traînées qui s'estompent (canvas noir + mix-blend-mode: screen en CSS)
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.055)';
            ctx.fillRect(0, 0, width, height);

            const scale = 0.0011 / dpr;
            const radius = 160 * dpr;
            ctx.lineCap = 'round';
            for (const p of particles) {
                const angle = noise(p.x * scale, p.y * scale, t) * Math.PI * 2.4;
                // pente douce : l'eau descend vers l'aval (bas-droite)
                let vx = Math.cos(angle) * p.speed + 0.28 * dpr;
                let vy = Math.sin(angle) * p.speed + 0.12 * dpr;

                if (pointer.active) {
                    const dx = p.x - pointer.x, dy = p.y - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < radius * radius) {
                        const force = 1 - Math.sqrt(d2) / radius;
                        // remous : rotation autour du pointeur + léger écartement
                        vx += (-dy * 0.018 + dx * 0.006) * force;
                        vy += (dx * 0.018 + dy * 0.006) * force;
                    }
                }

                const nx = p.x + vx, ny = p.y + vy;
                const lifeRatio = p.life / p.maxLife;
                const alpha = Math.sin(Math.PI * lifeRatio) * (p.color === NITROGEN ? 0.75 : 0.5);
                ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha.toFixed(3)})`;
                ctx.lineWidth = p.width;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(nx, ny);
                ctx.stroke();

                p.x = nx;
                p.y = ny;
                p.life++;
                if (p.life > p.maxLife || nx < -20 || ny < -20 || nx > width + 20 || ny > height + 20) spawn(p);
            }
        }

        host.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = (e.clientX - rect.left) * dpr;
            pointer.y = (e.clientY - rect.top) * dpr;
            pointer.active = true;
        }, { passive: true });
        host.addEventListener('pointerleave', () => { pointer.active = false; });

        new ResizeObserver(() => resize()).observe(host);
        new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(host);

        resize();
        step();
    }

    document.querySelectorAll('.hero, .page-hero').forEach(createFlow);
})();
