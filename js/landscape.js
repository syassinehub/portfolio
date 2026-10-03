// ============================================
// PAYSAGE GÉNÉRATIF — ARBRES ET HERBE DANS LE VENT
// ============================================
// Illustration plate : collines superposées, arbres ronds (chêne, olivier) et cyprès,
// herbe et quelques feuilles. Le vent (brise + rafales) fait plier chaque arbre
// depuis son pied. Avec « réduire les animations » : une image fixe.

(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 700px)').matches;
    const TAU = Math.PI * 2;

    // Couleurs pleines : menthe mélangée au vert forêt du fond (pas de superpositions translucides)
    const FOREST = [22, 53, 42];
    const MINT = [159, 211, 184];
    const tone = (a) => `rgb(${FOREST.map((c, i) => Math.round(c + (MINT[i] - c) * a)).join(',')})`;
    const COLORS = {
        hillFar: tone(0.06), treeFar: tone(0.1),
        hillMid: tone(0.11), treeMid: tone(0.17),
        hillNear: tone(0.16), grass: tone(0.27),
    };

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

    // Ligne de crête : somme de sinusoïdes douces
    function ridge(rand, base, amp) {
        const waves = Array.from({ length: 3 }, (_, i) => ({
            f: (0.5 + rand()) * (i + 1),
            p: rand() * TAU,
            a: amp / (i + 1.3),
        }));
        return (x) => base - waves.reduce((sum, w) => sum + Math.sin(x * w.f * TAU + w.p) * w.a, 0);
    }

    // Couronne d'un arbre rond : quelques disques qui forment un dôme
    function makeCrown(rand) {
        const lobes = [[0, 0, 1], [-0.58, 0.18, 0.72], [0.58, 0.16, 0.74], [-0.28, -0.42, 0.66], [0.3, -0.4, 0.64]];
        return lobes.map(([dx, dy, r]) => ({
            dx: dx + (rand() - 0.5) * 0.12,
            dy: dy + (rand() - 0.5) * 0.1,
            r: r * (0.92 + rand() * 0.16),
            phase: rand() * TAU,
        }));
    }

    function createLandscape(host, opts) {
        const canvas = document.createElement('canvas');
        canvas.className = 'landscape';
        canvas.setAttribute('aria-hidden', 'true');
        // au-dessus du courant d'eau (js/nature.js), sous le texte
        const flow = host.querySelector('.flow');
        if (flow) flow.after(canvas);
        else host.prepend(canvas);
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        let W = 0, H = 0, layers = [], trees = [], grass = [], leaves = [], t = 0, onScreen = true;

        function build() {
            const rect = canvas.getBoundingClientRect();
            W = Math.max(1, Math.round(rect.width * dpr));
            H = Math.max(1, Math.round(rect.height * dpr));
            canvas.width = W;
            canvas.height = H;
            const rand = rng(opts.seed);

            layers = [
                { y: ridge(rand, H * 0.5, H * 0.1), color: COLORS.hillFar },
                { y: ridge(rand, H * 0.68, H * 0.08), color: COLORS.hillMid },
                { y: ridge(rand, H * 0.86, H * 0.04), color: COLORS.hillNear },
            ];
            const yAt = (layer, px) => layers[layer].y(px / W);

            // Zone laissée libre (photo de l'accueil) si elle chevauche le paysage
            let avoid = null;
            const avoidEl = opts.avoid && host.querySelector(opts.avoid);
            if (avoidEl) {
                const r = avoidEl.getBoundingClientRect();
                if (r.bottom > rect.top && r.top < rect.bottom) avoid = [(r.left - rect.left - 30) * dpr, (r.right - rect.left + 30) * dpr];
            }

            trees = [];
            const count = Math.max(3, Math.round((W / dpr) / (small ? 85 : opts.spacing)));
            for (let i = 0; i < count; i++) {
                const far = rand() < 0.45;
                const x = ((i + 0.15 + rand() * 0.7) / count) * W;
                const cypress = rand() < 0.35;
                const crown = makeCrown(rand);
                const phase = rand() * TAU;
                const sizeRand = rand();
                if (avoid && x > avoid[0] && x < avoid[1]) continue;
                const base = yAt(far ? 0 : 1, x) + 3 * dpr;
                // hauteur plafonnée : la cime reste toujours dans le cadre
                const room = base - H * 0.16;
                const wanted = (far ? 0.2 + sizeRand * 0.1 : 0.36 + sizeRand * 0.2) * H * opts.treeScale;
                const h = Math.min(wanted * (cypress ? 1.15 : 1), room);
                trees.push({ x, base, h, far, cypress, crown, phase, color: far ? COLORS.treeFar : COLORS.treeMid });
            }
            trees.sort((a, b) => (a.far === b.far ? 0 : a.far ? -1 : 1));

            grass = [];
            const blades = Math.round((W / dpr) / (small ? 6 : 4));
            for (let i = 0; i < blades; i++) {
                const x = rand() * W;
                grass.push({ x, y: yAt(2, x) + 3 * dpr, h: (6 + rand() * 12) * dpr * opts.grassScale, lean: (rand() - 0.5) * 0.3, phase: rand() * TAU });
            }

            leaves = Array.from({ length: small ? 5 : opts.leaves }, () => spawnLeaf({}, rand, true));
        }

        function spawnLeaf(leaf, rand = Math.random, anywhere = false) {
            leaf.x = anywhere ? rand() * W : -12 * dpr;
            leaf.y = H * (0.25 + rand() * 0.45);
            leaf.vx = (0.5 + rand() * 0.6) * dpr;
            leaf.rot = rand() * TAU;
            leaf.spin = (rand() - 0.5) * 0.05;
            leaf.size = (2.2 + rand() * 1.8) * dpr;
            leaf.phase = rand() * TAU;
            leaf.amber = rand() < 0.3;
            return leaf;
        }

        // Vent : brise lente + rafales qui traversent le paysage de gauche à droite
        const windAt = (x) => {
            const breeze = 0.3 + Math.sin(t * 0.35 + x * 0.0008) * 0.18 + Math.sin(t * 0.9 + x * 0.002) * 0.08;
            const gust = Math.max(0, Math.sin(t * 0.18 - x * 0.0005)) ** 8 * 0.55;
            return breeze + gust;
        };

        // Décalage horizontal à une hauteur donnée : l'arbre plie depuis son pied
        const bendAt = (tree, wind, up) => wind * tree.h * (tree.cypress ? 0.09 : 0.07) * (up / tree.h) ** 1.8;

        function drawRoundTree(tree, wind) {
            const { x, base, h } = tree;
            const trunkTop = h * 0.62;
            const tw = Math.max(1.5 * dpr, h * 0.055);
            const R = h * 0.27;
            const cy = h * 0.66;
            ctx.beginPath();
            // tronc (sens horaire) — légèrement évasé au pied
            ctx.moveTo(x - tw * 0.75, base);
            ctx.lineTo(x - tw * 0.4 + bendAt(tree, wind, trunkTop), base - trunkTop);
            ctx.lineTo(x + tw * 0.4 + bendAt(tree, wind, trunkTop), base - trunkTop);
            ctx.lineTo(x + tw * 0.75, base);
            ctx.closePath();
            // couronne : disques fusionnés en une seule silhouette
            for (const lobe of tree.crown) {
                const up = cy - lobe.dy * R;
                const flutter = Math.sin(t * 2.2 + lobe.phase + tree.phase) * R * 0.025 * (0.5 + wind);
                const lx = x + lobe.dx * R + bendAt(tree, wind, up) + flutter;
                const ly = base - up;
                ctx.moveTo(lx + lobe.r * R, ly);
                ctx.arc(lx, ly, lobe.r * R, 0, TAU);
            }
            ctx.fill('nonzero');
        }

        function drawCypress(tree, wind) {
            const { x, base, h } = tree;
            const halfW = h * 0.1;
            const steps = 14;
            const left = [];
            const right = [];
            for (let i = 0; i <= steps; i++) {
                const k = i / steps;
                const up = h * (0.05 + k * 0.95);
                // silhouette en flamme : large en bas, pointue en haut
                const w = halfW * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + k * 0.92)), 0.55) * (1 - 0.25 * k);
                const cx = x + bendAt(tree, wind, up) + Math.sin(t * 2 + tree.phase + k * 3) * w * 0.04;
                left.push([cx - w, base - up]);
                right.push([cx + w, base - up]);
            }
            const tw = Math.max(1.2 * dpr, h * 0.025);
            ctx.beginPath();
            ctx.moveTo(x - tw, base);
            ctx.lineTo(x - tw, base - h * 0.06);
            left.forEach(([px, py]) => ctx.lineTo(px, py));
            right.reverse().forEach(([px, py]) => ctx.lineTo(px, py));
            ctx.lineTo(x + tw, base - h * 0.06);
            ctx.lineTo(x + tw, base);
            ctx.closePath();
            ctx.fill();
        }

        function drawGrass() {
            ctx.strokeStyle = COLORS.grass;
            ctx.lineWidth = 1.2 * dpr;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (const g of grass) {
                const bend = (windAt(g.x) * 0.7 + Math.sin(t * 2.6 + g.phase) * 0.08 + g.lean) * g.h;
                ctx.moveTo(g.x, g.y);
                ctx.quadraticCurveTo(g.x + bend * 0.25, g.y - g.h * 0.6, g.x + bend, g.y - g.h + Math.abs(bend) * 0.2);
            }
            ctx.stroke();
        }

        function drawLeaves(step) {
            for (const leaf of leaves) {
                if (step) {
                    const wind = windAt(leaf.x);
                    leaf.vx += (wind * 1.8 * dpr - leaf.vx) * 0.02;
                    leaf.x += leaf.vx;
                    leaf.y += Math.sin(t * 1.8 + leaf.phase) * 0.35 * dpr + 0.08 * dpr;
                    leaf.rot += leaf.spin + wind * 0.015;
                    if (leaf.x > W + 12 * dpr || leaf.y > H * 0.95) spawnLeaf(leaf);
                }
                ctx.save();
                ctx.translate(leaf.x, leaf.y);
                ctx.rotate(leaf.rot);
                ctx.fillStyle = leaf.amber ? 'rgba(232, 176, 92, 0.8)' : 'rgba(159, 211, 184, 0.65)';
                ctx.beginPath();
                ctx.ellipse(0, 0, leaf.size, leaf.size * 0.45, 0, 0, TAU);
                ctx.fill();
                ctx.restore();
            }
        }

        function render(step = true) {
            ctx.clearRect(0, 0, W, H);
            // plan lointain, arbres lointains, plan médian, arbres proches, premier plan
            const drawLayer = (i) => {
                ctx.fillStyle = layers[i].color;
                ctx.beginPath();
                ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 6) ctx.lineTo(x, layers[i].y(x / W));
                ctx.lineTo(W, H);
                ctx.closePath();
                ctx.fill();
            };
            const drawTrees = (far) => trees.filter((tr) => tr.far === far).forEach((tree) => {
                ctx.fillStyle = tree.color;
                const wind = windAt(tree.x);
                if (tree.cypress) drawCypress(tree, wind);
                else drawRoundTree(tree, wind);
            });
            drawLayer(0);
            drawTrees(true);
            drawLayer(1);
            drawTrees(false);
            drawLayer(2);
            drawGrass();
            drawLeaves(step);
        }

        function loop() {
            requestAnimationFrame(loop);
            if (!onScreen || document.hidden) return;
            t += 1 / 60;
            render();
        }

        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { build(); render(false); }, 120);
        }).observe(canvas);
        new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(host);

        build();
        if (reduceMotion) {
            t = 3;
            render(false);
        } else {
            loop();
        }
    }

    const hero = document.querySelector('.hero');
    if (hero) createLandscape(hero, { avoid: '.hero-portrait', seed: 7, spacing: 120, treeScale: 1, grassScale: 1, leaves: 10 });
    const pageHero = document.querySelector('.page-hero');
    if (pageHero) {
        const seeds = { publications: 11, collaborators: 23, teaching: 37, outreach: 41 };
        createLandscape(pageHero, { seed: seeds[document.body.dataset.page] || 5, spacing: 140, treeScale: 0.9, grassScale: 0.8, leaves: 6 });
    }
})();
