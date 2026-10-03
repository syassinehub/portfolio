// ============================================
// PAYSAGE GÉNÉRATIF — ARBRES ET HERBE DANS LE VENT
// ============================================
// Collines en silhouettes superposées, arbres fractals dont chaque branche plie
// selon sa profondeur, herbe qui ondule et feuilles emportées par les rafales.
// Le pointeur souffle du vent. Avec « réduire les animations » : une image fixe.

(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 700px)').matches;
    const TAU = Math.PI * 2;

    // Générateur pseudo-aléatoire reproductible (même paysage à chaque redimensionnement)
    function rng(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Ligne de crête : somme de sinusoïdes
    function ridge(rand, base, amp) {
        const waves = Array.from({ length: 4 }, (_, i) => ({
            f: (0.6 + rand() * 1.4) * (i + 1),
            p: rand() * TAU,
            a: amp / (i + 1.4),
        }));
        return (x) => base - waves.reduce((sum, w) => sum + Math.sin(x * w.f * TAU + w.p) * w.a, 0);
    }

    // Arbre fractal : structure générée une fois, seule la flexion est recalculée
    function growBranch(rand, depth, maxDepth, length, angle) {
        const branch = { length, angle, depth, flex: 0.6 + rand() * 0.8, phase: rand() * TAU, children: [] };
        if (depth < maxDepth) {
            const count = rand() < 0.25 && depth > 1 ? 3 : 2;
            for (let i = 0; i < count; i++) {
                const spread = (0.28 + rand() * 0.32) * (i === 0 ? -1 : i === 1 ? 1 : (rand() - 0.5));
                branch.children.push(growBranch(rand, depth + 1, maxDepth, length * (0.68 + rand() * 0.14), spread));
            }
        }
        return branch;
    }

    function createLandscape(host, opts) {
        const canvas = document.createElement('canvas');
        canvas.className = 'landscape';
        canvas.setAttribute('aria-hidden', 'true');
        host.prepend(canvas);
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const seed = opts.seed;

        let W = 0, H = 0, layers = [], trees = [], grass = [], leaves = [], hills = null;
        let t = 0, gust = 0, onScreen = true, lastPointerX = null;

        function build() {
            const rect = canvas.getBoundingClientRect();
            W = Math.max(1, Math.round(rect.width * dpr));
            H = Math.max(1, Math.round(rect.height * dpr));
            canvas.width = W;
            canvas.height = H;
            const rand = rng(seed);

            // Trois plans de collines, du plus lointain au plus proche
            layers = [
                { y: ridge(rand, H * 0.42, H * 0.12), color: 'rgba(159, 211, 184, 0.05)' },
                { y: ridge(rand, H * 0.62, H * 0.1), color: 'rgba(159, 211, 184, 0.08)' },
                { y: ridge(rand, H * 0.84, H * 0.05), color: 'rgba(159, 211, 184, 0.12)' },
            ];
            const yAt = (layer, px) => layers[layer].y(px / W);

            // Arbres : quelques-uns sur le plan lointain (petits, pâles), d'autres au milieu
            // Zone à laisser libre (la photo de l'accueil) si elle chevauche le paysage
            let avoid = null;
            const avoidEl = opts.avoid && host.querySelector(opts.avoid);
            if (avoidEl) {
                const r = avoidEl.getBoundingClientRect();
                if (r.bottom > rect.top && r.top < rect.bottom) {
                    avoid = [(r.left - rect.left - 40) * dpr, (r.right - rect.left + 40) * dpr];
                }
            }

            trees = [];
            const unit = H / 230;
            const count = Math.max(3, Math.round((W / dpr) / (small ? 110 : opts.spacing)));
            for (let i = 0; i < count; i++) {
                const far = rand() < 0.4;
                const x = ((i + 0.2 + rand() * 0.6) / count) * W;
                if (avoid && x > avoid[0] && x < avoid[1]) continue;
                const layer = far ? 0 : 1;
                const scale = (far ? 0.45 + rand() * 0.2 : 0.7 + rand() * 0.45) * unit * opts.treeScale;
                const maxDepth = small ? 6 : far ? 6 : 7 + (rand() < 0.4 ? 1 : 0);
                trees.push({
                    x,
                    y: yAt(layer, x) + 2 * dpr,
                    far,
                    width: (far ? 3 : 5.5) * scale * dpr,
                    crown: (far ? 2.6 : 3.6) * scale * dpr,
                    root: growBranch(rand, 0, maxDepth, 34 * scale * dpr, (rand() - 0.5) * 0.12),
                    color: far ? 'rgba(159, 211, 184, 0.10)' : 'rgba(159, 211, 184, 0.17)',
                });
            }
            trees.sort((a, b) => (a.far === b.far ? 0 : a.far ? -1 : 1));

            // Herbe sur le premier plan
            grass = [];
            const blades = Math.round((W / dpr) / (small ? 5 : 3.2));
            for (let i = 0; i < blades; i++) {
                const x = rand() * W;
                grass.push({ x, y: yAt(2, x) + 3 * dpr, h: (8 + rand() * 18) * dpr * opts.grassScale, lean: (rand() - 0.5) * 0.4, phase: rand() * TAU });
            }

            // Feuilles portées par le vent
            leaves = Array.from({ length: small ? 8 : opts.leaves }, () => spawnLeaf({}, rand, true));
            hills = null; // collines redessinées dans le cache au prochain rendu
        }

        function spawnLeaf(leaf, rand = Math.random, anywhere = false) {
            leaf.x = anywhere ? rand() * W : -20 * dpr;
            leaf.y = rand() * H * 0.7;
            leaf.vx = (0.6 + rand()) * dpr;
            leaf.vy = 0;
            leaf.rot = rand() * TAU;
            leaf.spin = (rand() - 0.5) * 0.08;
            leaf.size = (2.5 + rand() * 2.5) * dpr;
            leaf.phase = rand() * TAU;
            leaf.amber = rand() < 0.3;
            return leaf;
        }

        // Collines : statiques, rendues une fois dans un canvas hors écran
        function renderHills() {
            hills = document.createElement('canvas');
            hills.width = W;
            hills.height = H;
            const h = hills.getContext('2d');
            layers.forEach((layer) => {
                h.fillStyle = layer.color;
                h.beginPath();
                h.moveTo(0, H);
                for (let x = 0; x <= W; x += 8) h.lineTo(x, layer.y(x / W));
                h.lineTo(W, H);
                h.closePath();
                h.fill();
            });
        }

        // Vent : brise lente + rafales (somme de sinusoïdes) + souffle du pointeur
        const windAt = (x) => {
            const base = 0.35 + Math.sin(t * 0.37 + x * 0.0009) * 0.25 + Math.sin(t * 0.83 + x * 0.0021) * 0.15;
            const gustWave = Math.max(0, Math.sin(t * 0.21 - x * 0.0006)) ** 6 * 0.6;
            return base + gustWave + gust;
        };

        function drawTree(tree) {
            const wind = windAt(tree.x);
            const segments = [];
            const tips = [];
            (function walk(b, x, y, angle) {
                // plus la branche est fine (profonde), plus elle plie
                const sway = wind * 0.05 * b.flex * (b.depth + 1) * (tree.far ? 0.7 : 1)
                    + Math.sin(t * 2.4 + b.phase) * 0.012 * b.depth;
                const a = angle + b.angle + sway;
                const x2 = x + Math.sin(a) * b.length;
                const y2 = y - Math.cos(a) * b.length;
                (segments[b.depth] ||= []).push(x, y, x2, y2);
                if (!b.children.length) tips.push(x2, y2);
                b.children.forEach((c) => walk(c, x2, y2, a));
            })(tree.root, tree.x, tree.y, 0);

            ctx.strokeStyle = tree.color;
            ctx.fillStyle = tree.color;
            ctx.lineCap = 'round';
            segments.forEach((list, depth) => {
                ctx.lineWidth = Math.max(0.6 * dpr, tree.width * 0.7 ** depth);
                ctx.beginPath();
                for (let i = 0; i < list.length; i += 4) {
                    ctx.moveTo(list[i], list[i + 1]);
                    ctx.lineTo(list[i + 2], list[i + 3]);
                }
                ctx.stroke();
            });
            // feuillage : petites touffes aux extrémités
            ctx.beginPath();
            for (let i = 0; i < tips.length; i += 2) {
                ctx.moveTo(tips[i] + tree.crown, tips[i + 1]);
                ctx.arc(tips[i], tips[i + 1], tree.crown, 0, TAU);
            }
            ctx.fill();
        }

        function drawGrass() {
            ctx.strokeStyle = 'rgba(159, 211, 184, 0.22)';
            ctx.lineWidth = 1.1 * dpr;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (const g of grass) {
                const bend = (windAt(g.x) * 0.9 + Math.sin(t * 3 + g.phase) * 0.12 + g.lean) * g.h;
                ctx.moveTo(g.x, g.y);
                ctx.quadraticCurveTo(g.x + bend * 0.3, g.y - g.h * 0.6, g.x + bend, g.y - g.h + Math.abs(bend) * 0.25);
            }
            ctx.stroke();
        }

        function drawLeaves(step) {
            for (const leaf of leaves) {
                if (step) {
                    const wind = windAt(leaf.x);
                    leaf.vx += (wind * 2.2 * dpr - leaf.vx) * 0.02;
                    leaf.vy = Math.sin(t * 2 + leaf.phase) * 0.5 * dpr + 0.15 * dpr;
                    leaf.x += leaf.vx;
                    leaf.y += leaf.vy;
                    leaf.rot += leaf.spin + wind * 0.02;
                    if (leaf.x > W + 20 * dpr || leaf.y > H) spawnLeaf(leaf);
                }
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(leaf.rot);
                ctx.fillStyle = leaf.amber ? 'rgba(232, 176, 92, 0.75)' : 'rgba(159, 211, 184, 0.6)';
                ctx.beginPath();
                ctx.ellipse(0, 0, leaf.size, leaf.size * 0.45, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }

        function render(step = true) {
            if (!hills) renderHills();
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(hills, 0, 0);
            trees.forEach(drawTree);
            drawGrass();
            drawLeaves(step);
        }

        function loop() {
            requestAnimationFrame(loop);
            if (!onScreen || document.hidden) return;
            t += 1 / 60;
            gust *= 0.96;
            render();
        }

        // Le pointeur qui balaie l'en-tête crée une rafale
        host.addEventListener('pointermove', (e) => {
            if (lastPointerX !== null) gust = Math.max(-0.6, Math.min(1.2, gust + (e.clientX - lastPointerX) * 0.004));
            lastPointerX = e.clientX;
        }, { passive: true });
        host.addEventListener('pointerleave', () => { lastPointerX = null; });

        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { build(); render(false); }, 120);
        }).observe(canvas);
        new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(host);

        build();
        if (reduceMotion) {
            t = 4;
            render(false);
        } else {
            loop();
        }
    }

    const hero = document.querySelector('.hero');
    if (hero) createLandscape(hero, { avoid: '.hero-portrait', seed: 7, spacing: 150, treeScale: 1.15, grassScale: 1, leaves: 16 });
    const pageHero = document.querySelector('.page-hero');
    if (pageHero) {
        const seeds = { publications: 11, collaborators: 23, teaching: 37, outreach: 41 };
        createLandscape(pageHero, { seed: seeds[document.body.dataset.page] || 5, spacing: 190, treeScale: 0.8, grassScale: 0.8, leaves: 10 });
    }
})();
