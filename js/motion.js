// ============================================
// ANIMATIONS — GSAP + ScrollTrigger + SplitText, défilement Lenis
// ============================================
// Thème : croissance (pousses qui se dessinent, texte qui « pousse »),
// eau (rideau de transition en forme de vague). Tout est désactivé si
// l'utilisateur a demandé à réduire les animations (voir motion-flag.js).

(function () {
    const root = document.documentElement;
    if (!root.classList.contains('motion')) return;
    const { gsap, ScrollTrigger, SplitText, CustomEase, Lenis } = window;
    if (!gsap || !ScrollTrigger || !SplitText || !CustomEase || !Lenis) {
        root.classList.remove('motion', 'curtain-in');
        return;
    }
    window.__motion = true;

    gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
    CustomEase.create('grow', 'M0,0 C0.22,0.1 0.18,1 1,1');
    gsap.defaults({ ease: 'grow', duration: 1 });

    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
    const arriving = root.classList.contains('curtain-in');

    // --- Défilement fluide ------------------------------------------------
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -80 } });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Globe en plein écran : la page ne doit plus défiler derrière
    new MutationObserver(() => {
        if (document.body.classList.contains('globe-open')) lenis.stop();
        else lenis.start();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // --- Rideau de transition entre pages : une vague qui monte -------------
    const WAVE = 'M0 60 C 240 20, 480 20, 720 60 S 1200 100, 1440 60 V120 H0 Z';
    const SPROUT = `
        <svg class="sprout" viewBox="0 0 24 24" aria-hidden="true">
            <path class="stem" d="M12 22V11"/>
            <path class="leaf" d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z"/>
            <path class="leaf" d="M12 11C12 7.5 9.5 5 6 5c0 3.5 2.5 6 6 6z"/>
        </svg>`;

    const curtain = document.createElement('div');
    curtain.className = 'page-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = `
        <svg class="curtain-wave curtain-wave-top" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${WAVE}"/></svg>
        <div class="curtain-body">${SPROUT}</div>
        <svg class="curtain-wave curtain-wave-bottom" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="${WAVE}"/></svg>`;
    document.body.appendChild(curtain);

    const HIDDEN_BELOW = { yPercent: 100, y: 140 };
    const HIDDEN_ABOVE = { yPercent: -100, y: -140 };

    function drawSprout(svg, duration = 1.2) {
        const paths = $$('path', svg);
        paths.forEach((p) => {
            const len = p.getTotalLength();
            gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        });
        return gsap.timeline()
            .to(paths[0], { strokeDashoffset: 0, duration: duration * 0.5, ease: 'power2.out' })
            .to(paths.slice(1), { strokeDashoffset: 0, duration: duration * 0.6, stagger: 0.12, ease: 'power2.out' }, '-=0.15');
    }

    if (arriving) {
        gsap.set(curtain, { yPercent: 0, y: 0 });
        root.classList.remove('curtain-in');
        gsap.timeline({ delay: 0.15 })
            .to(curtain, { ...HIDDEN_ABOVE, duration: 1.05, ease: 'power3.inOut' })
            .set(curtain, HIDDEN_BELOW);
    } else {
        gsap.set(curtain, HIDDEN_BELOW);
    }

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || /admin\.html$/.test(url.pathname)) return;
        if (url.pathname === location.pathname) return; // ancre interne : Lenis s'en charge
        e.preventDefault();
        try { sessionStorage.setItem('wm-curtain', '1'); } catch (err) { /* sans rideau à l'arrivée */ }
        gsap.timeline({ onComplete: () => { location.href = url.href; } })
            .to(curtain, { yPercent: 0, y: 0, duration: 0.75, ease: 'power3.inOut' })
            .add(drawSprout($('.sprout', curtain), 0.7), '-=0.35');
    });

    // Retour arrière (bfcache) : la page revient sans rideau
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) gsap.set(curtain, HIDDEN_BELOW);
    });

    // --- Animations de contenu (après chargement des polices) ----------------
    document.fonts.ready.then(() => {
        const intro = arriving ? 0.55 : 0.1;

        // Hero de l'accueil
        const hero = $('.hero');
        if (hero) {
            const h1 = $('h1', hero);
            const title = SplitText.create(h1, { type: 'words,chars', mask: 'words' });
            const lede = SplitText.create($('.hero-lede', hero), { type: 'lines', mask: 'lines' });
            gsap.set([h1, $('.hero-lede', hero)], { visibility: 'visible' });

            gsap.timeline({ delay: intro })
                .from($('.eyebrow', hero), { autoAlpha: 0, y: 14, duration: 0.8 })
                .from(title.chars, { yPercent: 115, duration: 1.1, stagger: 0.03 }, '-=0.5')
                .from(lede.lines, { yPercent: 105, duration: 1, stagger: 0.09 }, '-=0.8')
                .from($$('.hero-actions > *, .hero-links li', hero), { autoAlpha: 0, y: 18, duration: 0.8, stagger: 0.07 }, '-=0.7')
                .fromTo($('.hero-portrait img', hero),
                    { clipPath: 'inset(100% 0% 0% 0% round 200px 200px 14px 14px)' },
                    { clipPath: 'inset(0% 0% 0% 0% round 200px 200px 14px 14px)', duration: 1.4, ease: 'power3.inOut' }, 0.15)
                .from($('.hero-portrait', hero), { autoAlpha: 0, duration: 0.6 }, 0.15)
                .from($('.hero-portrait figcaption', hero), { autoAlpha: 0, x: -24, duration: 0.8 }, '-=0.5');

            // Courbes de niveau qui se tracent, puis dérivent lentement au défilement
            const contours = $$('.hero-contours path', hero);
            contours.forEach((p) => {
                const len = p.getTotalLength();
                gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len },
                    { strokeDashoffset: 0, duration: 2.6, delay: intro + 0.2, ease: 'power2.inOut' });
            });
            gsap.to('.hero-contours', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
            gsap.to('.hero-portrait', { y: -50, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        }

        // En-tête des pages intérieures
        const pageHero = $('.page-hero');
        if (pageHero) {
            const h1 = $('h1', pageHero);
            const title = SplitText.create(h1, { type: 'lines,words', mask: 'lines' });
            gsap.set(h1, { visibility: 'visible' });
            gsap.timeline({ delay: intro })
                .from($('.eyebrow', pageHero), { autoAlpha: 0, y: 12, duration: 0.7 })
                .from(title.words, { yPercent: 110, duration: 1, stagger: 0.05 }, '-=0.45')
                .from($$('.page-intro, .page-hero-link', pageHero), { autoAlpha: 0, y: 16, duration: 0.8, stagger: 0.1 }, '-=0.6');
        }

        // Pousses qui se dessinent devant les intitulés de section
        $$('.section-index, .page-hero .eyebrow').forEach((label) => {
            label.insertAdjacentHTML('afterbegin', SPROUT);
            const svg = $('.sprout', label);
            const tl = drawSprout(svg, 1.1).pause();
            ScrollTrigger.create({ trigger: label, start: 'top 90%', once: true, onEnter: () => tl.delay(label.closest('.page-hero') ? intro : 0).play() });
        });

        // Titres de section : les lignes émergent
        $$('.section-head h2, .site-footer h2').forEach((h2) => {
            const split = SplitText.create(h2, { type: 'lines', mask: 'lines' });
            gsap.from(split.lines, {
                yPercent: 105, duration: 1.1, stagger: 0.1,
                scrollTrigger: { trigger: h2, start: 'top 88%', once: true },
            });
        });

        // Paragraphes d'introduction
        $$('.lead, .body-text').forEach((el) => {
            gsap.from(el, { autoAlpha: 0, y: 24, duration: 1, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });

        // Grilles : apparition en cascade
        const cascade = (selector, vars = {}) => {
            ScrollTrigger.batch(selector, {
                start: 'top 90%',
                once: true,
                onEnter: (els) => gsap.from(els, { autoAlpha: 0, y: 28, duration: 0.9, stagger: 0.08, ...vars }),
            });
        };
        cascade('.expertise li');
        cascade('.chips li', { y: 0, scale: 0.6, duration: 0.6, ease: 'back.out(2)' });
        cascade('.footer-links li', { y: 0, x: -20 });

        // Globe : léger zoom d'entrée
        const globePanel = $('.globe-panel');
        if (globePanel) {
            gsap.from(globePanel, { autoAlpha: 0, y: 40, scale: 0.98, duration: 1.2, delay: intro + 0.2 });
        }

        ScrollTrigger.refresh();
    });
})();
