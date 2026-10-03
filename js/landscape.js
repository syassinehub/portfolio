// ============================================
// PAYSAGE GÉNÉRATIF — ARBRES DANS LE VENT
// ============================================
// Illustration plate en trois plans : collines, chênes/oliviers, pins parasols et
// cyprès (paysage méditerranéen), herbe et feuilles portées.
//
// Physique : le vent est un champ qui se déplace — une brise de fond, de la
// turbulence et des rafales qui traversent le paysage de gauche à droite.
// Chaque tronc et chaque branche est un ressort amorti (oscillateur angulaire) :
// un grand tronc oscille lentement, les branches plus vite et avec retard,
// et l'arbre se balance encore un peu après le passage d'une rafale.
// Avec « réduire les animations » : une image fixe.

(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 700px)').matches;
    const TAU = Math.PI * 2;
    const DT = 1 / 60;

    // Couleurs pleines : menthe mélangée au vert forêt du fond
    const FOREST = [22, 53, 42];
    const MINT = [159, 211, 184];
    const tone = (a) => `rgb(${FOREST.map((c, i) => Math.round(c + (MINT[i] - c) * a)).join(',')})`;
    const HILLS = [tone(0.06), tone(0.11), tone(0.16)];
    const PALETTES = {
        far: { wood: tone(0.1), shadow: tone(0.11), main: tone(0.14), light: tone(0.17) },
        near: { wood: tone(0.17), shadow: tone(0.19), main: tone(0.27), light: tone(0.37) },
        feature: { wood: tone(0.2), shadow: tone(0.22), main: tone(0.31), light: tone(0.42) },
    };
    const GRASS = tone(0.27);

    // Générateur pseudo-aléatoire reproductible
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
    const range = (rand, a, b) => a + rand() * (b - a);

    function ridge(rand, base, amp) {
        const waves = Array.from({ length: 3 }, (_, i) => ({ f: (0.5 + rand()) * (i + 1), p: rand() * TAU, a: amp / (i + 1.3) }));
        return (x) => base - waves.reduce((sum, w) => sum + Math.sin(x * w.f * TAU + w.p) * w.a, 0);
    }

    // --- Vent ---------------------------------------------------------------
    // Champ de vent en pixels CSS : brise + turbulence + rafales qui voyagent.
    function createWind(width) {
        const gusts = [];
        let nextGust = 1.5;
        return {
            gusts,
            update(t) {
                if (t > nextGust) {
                    const w = range(Math.random, 160, 320);
                    gusts.push({ born: t, x0: -w * 1.5, width: w, speed: range(Math.random, 140, 230), strength: range(Math.random, 0.6, 1.25) });
                    nextGust = t + range(Math.random, 3.5, 7.5);
                }
                for (let i = gusts.length - 1; i >= 0; i--) {
                    const g = gusts[i];
                    if (g.x0 + g.speed * (t - g.born) > width + g.width * 2) gusts.splice(i, 1);
                }
            },
            at(x, t) {
                let w = 0.28 + Math.sin(t * 0.23) * 0.08 + Math.sin(t * 0.61 + 1.3) * 0.05;
                for (const g of gusts) {
                    const d = (x - (g.x0 + g.speed * (t - g.born))) / g.width;
                    w += g.strength * Math.exp(-d * d);
                }
                // turbulence : petites variations rapides, plus fortes quand le vent forcit
                const turb = Math.sin(x * 0.013 + t * 2.3) * 0.5 + Math.sin(x * 0.031 - t * 3.7) * 0.3 + Math.sin(t * 5.1 + x * 0.007) * 0.2;
                return w * (1 + turb * 0.18);
            },
        };
    }

    // --- Arbres : squelette de segments-ressorts ----------------------------
    // Chaque nœud : longueur, angle de repos, ressort (fréquence propre, amortissement),
    // exposition au vent. Positions en pixels canvas, y vers le bas.
    function node(tree, parent, len, rest, width, freq, zeta, bendAt1, attach = 1) {
        const omega = TAU * freq;
        const n = {
            parent, len, rest, width, attach,
            k: omega * omega,
            c: 2 * zeta * omega,
            expo: bendAt1 * omega * omega, // flexion d'équilibre (rad) sous un vent de 1
            theta: 0, vel: 0,
            phase: Math.random() * TAU,
            ax: 0, ay: 0, bx: 0, by: 0, ang: 0,
        };
        tree.nodes.push(n);
        return n;
    }

    function clump(tree, at, dx, dy, r, rand, squash = 1) {
        const lobes = [];
        const count = 4 + Math.floor(rand() * 3);
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + rand() * 0.6;
            const d = i === 0 ? 0 : range(rand, 0.35, 0.6);
            lobes.push({ ox: Math.cos(a) * d, oy: Math.sin(a) * d * 0.75 * squash, r: range(rand, 0.5, 0.72) });
        }
        tree.clumps.push({ at, dx, dy, r, squash, lobes, phase: rand() * TAU });
    }

    function makeBroadleaf(tree, rand, h) {
        const fT = Math.min(0.85, Math.max(0.38, 0.95 - h / 380));
        const trunk = node(tree, null, h * 0.4, range(rand, -0.06, 0.06), h * 0.065, fT, 0.1, 0.07);
        const mains = 3 + (rand() < 0.5 ? 1 : 0);
        for (let i = 0; i < mains; i++) {
            const spread = (i / (mains - 1) - 0.5) * 1.5 + range(rand, -0.12, 0.12);
            const b = node(tree, trunk, h * range(rand, 0.2, 0.28), spread, h * 0.03, fT * 2.3, 0.16, 0.16, range(rand, 0.85, 1));
            clump(tree, b, 0, -0.1, h * range(rand, 0.15, 0.19), rand);
            if (rand() < 0.7) {
                const s = node(tree, b, h * range(rand, 0.1, 0.15), range(rand, -0.5, 0.5), h * 0.016, fT * 3.6, 0.2, 0.2, range(rand, 0.5, 0.7));
                clump(tree, s, 0, 0, h * range(rand, 0.1, 0.13), rand);
            }
        }
        clump(tree, trunk, 0, -h * 0.12, h * 0.2, rand);
    }

    function makeStonePine(tree, rand, h) {
        const fT = Math.min(0.7, Math.max(0.32, 0.8 - h / 420));
        const lean = range(rand, -0.12, 0.12);
        const t1 = node(tree, null, h * 0.42, lean, h * 0.05, fT, 0.09, 0.055);
        const t2 = node(tree, t1, h * 0.3, -lean * 1.6, h * 0.04, fT * 1.6, 0.12, 0.06);
        const arms = 4;
        for (let i = 0; i < arms; i++) {
            const side = i % 2 ? 1 : -1;
            const b = node(tree, t2, h * range(rand, 0.18, 0.26), side * range(rand, 0.9, 1.25), h * 0.022, fT * 2.6, 0.18, 0.14, range(rand, 0.7, 1));
            clump(tree, b, 0, 0, h * range(rand, 0.15, 0.19), rand, 0.5);
        }
        clump(tree, t2, 0, 0, h * 0.21, rand, 0.48);
    }

    function makeCypress(tree, rand, h) {
        const fT = Math.min(0.9, Math.max(0.45, 1.05 - h / 380));
        let parent = null;
        for (let i = 0; i < 4; i++) {
            parent = node(tree, parent, h * 0.25, i === 0 ? range(rand, -0.03, 0.03) : 0, h * 0.03, fT * (1 + i * 0.55), 0.12, 0.025 + i * 0.02);
        }
        tree.width = h * range(rand, 0.17, 0.21);
    }

    // Cinématique directe : positions des segments à partir des angles
    function pose(tree) {
        for (const n of tree.nodes) {
            if (n.parent) {
                const p = n.parent;
                n.ax = p.ax + (p.bx - p.ax) * n.attach;
                n.ay = p.ay + (p.by - p.ay) * n.attach;
                n.ang = p.ang + n.rest + n.theta;
            } else {
                n.ax = tree.x;
                n.ay = tree.base;
                n.ang = n.rest + n.theta;
            }
            n.bx = n.ax + Math.sin(n.ang) * n.len;
            n.by = n.ay - Math.cos(n.ang) * n.len;
        }
    }

    // Intégration (Euler semi-implicite) : θ'' = exposition·vent − k·θ − c·θ'
    function simulate(tree, wind, t, dpr) {
        for (const n of tree.nodes) {
            const w = wind.at(n.bx / dpr, t) + Math.sin(t * 7 + n.phase) * 0.04;
            const acc = n.expo * w * tree.exposure - n.k * n.theta - n.c * n.vel;
            n.vel += acc * DT;
            n.theta += n.vel * DT;
        }
        pose(tree);
    }

    // --- Rendu des arbres ---------------------------------------------------
    function drawBranches(ctx, tree) {
        ctx.strokeStyle = tree.palette.wood;
        ctx.lineCap = 'round';
        for (const n of tree.nodes) {
            ctx.lineWidth = n.width;
            ctx.beginPath();
            ctx.moveTo(n.ax, n.ay);
            // légère courbure : point de contrôle décalé dans le sens de la flexion
            const mx = (n.ax + n.bx) / 2 + Math.cos(n.ang) * n.theta * n.len * 0.25;
            const my = (n.ay + n.by) / 2 + Math.sin(n.ang) * n.theta * n.len * 0.25;
            ctx.quadraticCurveTo(mx, my, n.bx, n.by);
            ctx.stroke();
        }
    }

    function clumpCenters(tree, t, windNow) {
        return tree.clumps.map((c) => {
            const n = c.at;
            const cos = Math.cos(n.ang), sin = Math.sin(n.ang);
            // frémissement du feuillage, proportionnel au vent
            const flutter = Math.sin(t * 6 + c.phase) * c.r * 0.035 * windNow;
            return { c, x: n.bx + c.dx * cos - c.dy * sin + flutter, y: n.by + c.dx * sin + c.dy * cos };
        });
    }

    function drawFoliage(ctx, tree, t, windNow) {
        const centers = clumpCenters(tree, t, windNow);
        // trois passes : ombre (décalée en bas), masse, lumière (en haut à gauche)
        const pass = (color, scale, ox, oy) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            for (const { c, x, y } of centers) {
                for (const l of c.lobes) {
                    const r = c.r * l.r * scale;
                    const lx = x + (l.ox + ox) * c.r;
                    const ly = y + (l.oy + oy) * c.r;
                    ctx.moveTo(lx + r, ly);
                    ctx.ellipse(lx, ly, r, r * c.squash ** 0.5, 0, 0, TAU);
                }
            }
            ctx.fill();
        };
        pass(tree.palette.shadow, 1.04, 0.06, 0.12);
        pass(tree.palette.main, 0.94, 0, 0);
        if (!tree.far) pass(tree.palette.light, 0.5, -0.2, -0.28);
    }

    function drawCypress(ctx, tree) {
        const chain = tree.nodes;
        const pts = [[chain[0].ax, chain[0].ay], ...chain.map((n) => [n.bx, n.by])];
        const sample = (k) => {
            const f = k * chain.length;
            const i = Math.min(chain.length - 1, Math.floor(f));
            const u = f - i;
            return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u];
        };
        const outline = (widthScale, shift) => {
            const left = [], right = [];
            const steps = 18;
            for (let i = 0; i <= steps; i++) {
                const k = 0.05 + (i / steps) * 0.95;
                const [cx, cy] = sample(k);
                const w = tree.width / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.1 + k * 0.92)), 0.6) * (1 - 0.3 * k) * widthScale;
                left.push([cx - w + shift * w, cy]);
                right.push([cx + w + shift * w, cy]);
            }
            ctx.beginPath();
            ctx.moveTo(...left[0]);
            left.forEach((p) => ctx.lineTo(...p));
            right.reverse().forEach((p) => ctx.lineTo(...p));
            ctx.closePath();
            ctx.fill();
        };
        ctx.strokeStyle = tree.palette.wood;
        ctx.lineWidth = tree.width * 0.16;
        ctx.beginPath();
        ctx.moveTo(chain[0].ax, chain[0].ay);
        ctx.lineTo(...sample(0.12));
        ctx.stroke();
        ctx.fillStyle = tree.palette.shadow;
        outline(1.06, 0.06);
        ctx.fillStyle = tree.palette.main;
        outline(0.96, 0);
        if (!tree.far) {
            ctx.fillStyle = tree.palette.light;
            outline(0.42, -0.45);
        }
    }

    // --- Paysage ------------------------------------------------------------
    function createLandscape(host, opts) {
        const canvas = document.createElement('canvas');
        canvas.className = 'landscape';
        canvas.setAttribute('aria-hidden', 'true');
        const flow = host.querySelector('.flow');
        if (flow) flow.after(canvas);
        else host.prepend(canvas);
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        let W = 0, H = 0, layers = [], trees = [], grass = [], leaves = [], wind = null, t = 0, onScreen = true;

        function build() {
            const rect = canvas.getBoundingClientRect();
            W = Math.max(1, Math.round(rect.width * dpr));
            H = Math.max(1, Math.round(rect.height * dpr));
            canvas.width = W;
            canvas.height = H;
            const rand = rng(opts.seed);
            wind = createWind(rect.width);

            layers = [
                ridge(rand, H * 0.5, H * 0.1),
                ridge(rand, H * 0.68, H * 0.08),
                ridge(rand, H * 0.86, H * 0.04),
            ];
            const yAt = (layer, px) => layers[layer](px / W);

            let avoid = null;
            const avoidEl = opts.avoid && host.querySelector(opts.avoid);
            if (avoidEl) {
                const r = avoidEl.getBoundingClientRect();
                if (r.bottom > rect.top && r.top < rect.bottom) avoid = [(r.left - rect.left - 30) * dpr, (r.right - rect.left + 30) * dpr];
            }

            // Sous les titres, les arbres passent à l'arrière-plan pour ne pas gêner la lecture
            let textZone = null;
            const textEl = opts.text && host.querySelector(opts.text);
            if (textEl) {
                const r = textEl.getBoundingClientRect();
                textZone = [(r.left - rect.left) * dpr, (r.right - rect.left) * dpr];
            }

            trees = [];
            const count = Math.max(3, Math.round(rect.width / (small ? 95 : opts.spacing)));
            for (let i = 0; i < count; i++) {
                let far = rand() < 0.4;
                const x = ((i + 0.15 + rand() * 0.7) / count) * W;
                if (textZone && x > textZone[0] && x < textZone[1]) far = true;
                const roll = rand();
                const kind = roll < 0.45 ? 'broadleaf' : roll < 0.72 ? 'pine' : 'cypress';
                const sizeRand = rand();
                const treeRand = rng(opts.seed * 97 + i * 13);
                if (avoid && x > avoid[0] && x < avoid[1]) continue;
                const base = yAt(far ? 0 : 1, x) + 3 * dpr;
                const room = base - H * 0.1;
                const wanted = (far ? 0.26 + sizeRand * 0.12 : 0.48 + sizeRand * 0.22) * H * opts.treeScale;
                const h = Math.min(wanted * (kind === 'cypress' ? 1.1 : 1), room);
                const tree = { x, base, h, far, kind, nodes: [], clumps: [], palette: far ? PALETTES.far : PALETTES.near, exposure: far ? 0.8 : 1 };
                if (kind === 'broadleaf') makeBroadleaf(tree, treeRand, h);
                else if (kind === 'pine') makeStonePine(tree, treeRand, h);
                else makeCypress(tree, treeRand, h);
                pose(tree);
                trees.push(tree);
            }

            // Arbre « vedette » : un grand chêne au premier plan, là où le texte laisse de la place
            if (opts.feature && !small) {
                const x = opts.feature * W;
                const base = yAt(1, x) + 4 * dpr;
                const h = base - H * 0.05;
                const tree = { x, base, h, far: false, kind: 'broadleaf', nodes: [], clumps: [], palette: PALETTES.feature, exposure: 1 };
                makeBroadleaf(tree, rng(opts.seed * 31), h);
                pose(tree);
                trees.push(tree);
            }

            grass = [];
            const blades = Math.round(rect.width / (small ? 6 : 4));
            for (let i = 0; i < blades; i++) {
                const x = rand() * W;
                grass.push({ x, y: yAt(2, x) + 3 * dpr, h: (6 + rand() * 12) * dpr * opts.grassScale, lean: (rand() - 0.5) * 0.3, phase: rand() * TAU, bend: 0.3 });
            }

            leaves = Array.from({ length: small ? 5 : opts.leaves }, () => spawnLeaf({}, rand, true));

            // pré-chauffage : les arbres démarrent déjà en mouvement, pas figés
            for (let i = 0; i < 90; i++) step(false);
        }

        function spawnLeaf(leaf, rand = Math.random, anywhere = false) {
            leaf.x = anywhere ? rand() * W : -12 * dpr;
            leaf.y = H * (0.25 + rand() * 0.45);
            leaf.vx = (0.4 + rand() * 0.5) * dpr;
            leaf.vy = 0;
            leaf.rot = rand() * TAU;
            leaf.spin = (rand() - 0.5) * 0.05;
            leaf.size = (2.2 + rand() * 1.8) * dpr;
            leaf.phase = rand() * TAU;
            leaf.amber = rand() < 0.3;
            return leaf;
        }

        function step(advanceTime = true) {
            if (advanceTime) t += DT;
            wind.update(t);
            for (const tree of trees) simulate(tree, wind, t, dpr);
            for (const g of grass) {
                const target = wind.at(g.x / dpr, t) * 0.75 + g.lean;
                g.bend += (target - g.bend) * 0.12; // l'herbe suit le vent avec un léger retard
            }
            for (const leaf of leaves) {
                const w = wind.at(leaf.x / dpr, t);
                leaf.vx += (w * 2.4 * dpr - leaf.vx) * 0.03;
                leaf.vy += ((Math.sin(t * 1.7 + leaf.phase) * 0.4 + 0.12 - w * 0.25) * dpr - leaf.vy) * 0.05;
                leaf.x += leaf.vx;
                leaf.y += leaf.vy;
                leaf.rot += leaf.spin + w * 0.02;
                if (leaf.x > W + 12 * dpr || leaf.y > H * 0.95 || leaf.y < H * 0.1) spawnLeaf(leaf);
            }
        }

        function drawHill(i) {
            ctx.fillStyle = HILLS[i];
            ctx.beginPath();
            ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 6) ctx.lineTo(x, layers[i](x / W));
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fill();
        }

        function drawTrees(far) {
            for (const tree of trees) {
                if (tree.far !== far) continue;
                if (tree.kind === 'cypress') {
                    drawCypress(ctx, tree);
                } else {
                    drawBranches(ctx, tree);
                    drawFoliage(ctx, tree, t, wind.at(tree.x / dpr, t));
                }
            }
        }

        function render() {
            ctx.clearRect(0, 0, W, H);
            drawHill(0);
            drawTrees(true);
            drawHill(1);
            drawTrees(false);
            drawHill(2);

            ctx.strokeStyle = GRASS;
            ctx.lineWidth = 1.2 * dpr;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (const g of grass) {
                const bend = (g.bend + Math.sin(t * 2.6 + g.phase) * 0.06) * g.h;
                ctx.moveTo(g.x, g.y);
                ctx.quadraticCurveTo(g.x + bend * 0.25, g.y - g.h * 0.6, g.x + bend, g.y - g.h + Math.abs(bend) * 0.25);
            }
            ctx.stroke();

            for (const leaf of leaves) {
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

        function loop() {
            requestAnimationFrame(loop);
            if (!onScreen || document.hidden) return;
            step();
            render();
        }

        let resizeTimer;
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { build(); render(); }, 120);
        }).observe(canvas);
        new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(host);

        build();
        render();
        if (!reduceMotion) loop();
    }

    const hero = document.querySelector('.hero');
    if (hero) createLandscape(hero, { avoid: '.hero-portrait', seed: 7, spacing: 125, treeScale: 1, grassScale: 1, leaves: 10 });
    const pageHero = document.querySelector('.page-hero');
    if (pageHero) {
        const seeds = { publications: 11, collaborators: 23, teaching: 37, outreach: 41 };
        createLandscape(pageHero, { feature: 0.86, text: 'h1', seed: seeds[document.body.dataset.page] || 5, spacing: 140, treeScale: 0.9, grassScale: 0.8, leaves: 6 });
    }
})();
