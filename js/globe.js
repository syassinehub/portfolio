// ============================================
// GLOBE DES COLLABORATIONS
// ============================================
// globe.gl (~1 Mo) n'est chargé que lorsque le globe devient visible.

const GLOBE_SRC = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';
const GLOBE_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-blue-marble.jpg';

const HOME = { key: 'home', label: 'CIRAD — Montpellier', lat: 43.6108, lng: 3.8767 };

// Position des institutions connues (recherche par mot-clé dans le nom de l'institution)
const INSTITUTION_COORDS = [
    [/kentucky/i, 38.03, -84.5, 'Lexington, Kentucky'],
    [/florida/i, 29.64, -82.35, 'Gainesville, Floride'],
    [/\bCITA\b|aragon/i, 41.72, -0.82, 'Saragosse'],
    [/\bCSIC\b|aula dei/i, 41.72, -0.82, 'Saragosse'],
    [/IAMZ/i, 41.66, -0.88, 'Saragosse'],
    [/zacatecas/i, 22.77, -102.58, 'Zacatecas'],
    [/INRAE|rennes/i, 48.11, -1.68, 'Rennes'],
    [/scheme/i, 48.11, -1.68, 'Rennes'],
    [/eure-et-loir|chartres/i, 48.45, 1.49, 'Chartres'],
    [/mograne|mogran/i, 36.42, 10.08, 'Mograne'],
    [/water research and technology|CERTE/i, 36.73, 10.42, 'Borj Cédria'],
    [/rural engineering|INRGREF/i, 36.83, 10.18, 'Tunis'],
    [/CIRAD/i, 43.61, 3.88, 'Montpellier'],
];

// Repli : centre de recherche principal / capitale du pays
const COUNTRY_COORDS = {
    france: [46.6, 2.4],
    spain: [40.42, -3.7], espagne: [40.42, -3.7],
    usa: [38.9, -77.04], 'united states': [38.9, -77.04], 'états-unis': [38.9, -77.04],
    mexico: [19.43, -99.13], mexique: [19.43, -99.13],
    tunisia: [36.8, 10.18], tunisie: [36.8, 10.18],
    morocco: [34.02, -6.84], maroc: [34.02, -6.84],
    algeria: [36.75, 3.06], algérie: [36.75, 3.06],
    italy: [41.9, 12.5], italie: [41.9, 12.5],
    germany: [52.52, 13.4], allemagne: [52.52, 13.4],
    portugal: [38.72, -9.14],
    belgium: [50.85, 4.35], belgique: [50.85, 4.35],
    netherlands: [52.37, 4.9], 'pays-bas': [52.37, 4.9],
    'united kingdom': [51.5, -0.12], uk: [51.5, -0.12], 'royaume-uni': [51.5, -0.12],
    canada: [45.42, -75.7],
    brazil: [-15.8, -47.9], brésil: [-15.8, -47.9],
    senegal: [14.7, -17.45], sénégal: [14.7, -17.45],
    egypt: [30.04, 31.24], égypte: [30.04, 31.24],
    china: [39.9, 116.4], chine: [39.9, 116.4],
    india: [28.6, 77.2], inde: [28.6, 77.2],
    australia: [-35.3, 149.1], australie: [-35.3, 149.1],
};

function locate(collaborator) {
    const lat = parseFloat(collaborator.lat);
    const lng = parseFloat(collaborator.lng);
    const country = (collaborator.country || '').trim();
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, place: country };
    const known = INSTITUTION_COORDS.find(([pattern]) => pattern.test(collaborator.institution || ''));
    if (known) return { lat: known[1], lng: known[2], city: known[3], country };
    const coords = COUNTRY_COORDS[country.toLowerCase()];
    return coords ? { lat: coords[0], lng: coords[1], city: '', country } : null;
}

// Regroupe les collaborateurs proches (< ~1,5°) en un seul point cliquable
const CLUSTER_DEGREES = 1.5;

function buildLocations(collaborators) {
    const locations = [];
    collaborators.forEach((c) => {
        const pos = locate(c);
        if (!pos) return;
        let loc = locations.find((l) => Math.hypot(l.lat - pos.lat, l.lng - pos.lng) < CLUSTER_DEGREES);
        if (!loc) {
            loc = { key: `${pos.lat.toFixed(2)},${pos.lng.toFixed(2)}`, lat: pos.lat, lng: pos.lng, country: pos.country, cities: [], people: [] };
            locations.push(loc);
        }
        if (pos.city && !loc.cities.includes(pos.city)) loc.cities.push(pos.city);
        loc.people.push(c);
    });
    locations.forEach((l) => {
        l.label = l.cities.length && l.cities.length <= 2 ? `${l.cities.join(' · ')}, ${l.country}` : l.country;
    });
    return locations.sort((a, b) => b.people.length - a.people.length);
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Échec du chargement : ${src}`));
        document.head.appendChild(script);
    });
}

function supportsWebGL() {
    try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; }
}

// Initialise le globe ; onSelect(location | null) est appelé à chaque clic.
// Renvoie une promesse d'un contrôleur { focus(location), reset() }.
function initGlobe(container, locations, onSelect) {
    if (!container || !supportsWebGL()) {
        container?.classList.add('globe-fallback');
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const observer = new IntersectionObserver(async (entries) => {
            if (!entries.some((e) => e.isIntersecting)) return;
            observer.disconnect();
            try {
                if (typeof Globe !== 'function') await loadScript(GLOBE_SRC);
                resolve(buildGlobe(container, locations, onSelect));
            } catch (err) {
                console.error(err);
                container.classList.add('globe-fallback');
                resolve(null);
            }
        }, { rootMargin: '200px' });
        observer.observe(container);
    });
}

// Altitude caméra (en rayons terrestres) : bornes du zoom
const ALT_MIN = 0.35;
const ALT_MAX = 3.2;
const ALT_HOME = 2.1;
const ALT_FOCUS = 1.2;
const ALT_LABELS = 1.3; // en dessous : noms des lieux affichés

function buildGlobe(container, locations, onSelect) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const panel = container.closest('.globe-panel');
    const help = panel?.querySelector('.globe-help');
    const arcs = locations.map((l) => ({ startLat: HOME.lat, startLng: HOME.lng, endLat: l.lat, endLng: l.lng }));
    const markers = [{ ...HOME, home: true, people: [] }, ...locations];
    const shortName = (d) => (d.home ? 'Montpellier' : d.cities.length === 1 ? d.cities[0] : d.country);
    let selected = null;
    let hovered = null;
    let expanded = false;
    let idleTimer;
    let zoomScale = 1; // les points rétrécissent quand on zoome

    // Points plus gros au doigt pour être faciles à toucher
    const scale = touch ? 1.5 : 1;
    const radius = (d) => scale * zoomScale * (d.home ? 0.55 : 0.5 + Math.min(d.people.length, 6) * 0.1) * (d === hovered ? 1.35 : 1);
    const color = (d) => (d.home || d === selected ? '#e8b05c' : d === hovered ? '#9fd3b8' : '#ffffff');
    const altitude = (d) => (d === selected ? 0.06 : d === hovered ? 0.04 : 0.02);

    const select = (d) => {
        if (!d || d.home) return;
        focus(d);
        onSelect(d);
    };

    const globe = Globe()(container)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl(GLOBE_TEXTURE)
        .showAtmosphere(true)
        .atmosphereColor('#9fd3b8')
        .atmosphereAltitude(0.18)
        .arcsData(arcs)
        .arcColor(() => ['rgba(232, 176, 92, 0.9)', 'rgba(159, 211, 184, 0.9)'])
        .arcStroke(0.5)
        .arcAltitudeAutoScale(0.45)
        .arcDashLength(0.5)
        .arcDashGap(0.25)
        .arcDashAnimateTime(reduceMotion ? 0 : 3200)
        .pointsData(markers)
        .pointColor(color)
        .pointAltitude(altitude)
        .pointRadius(radius)
        .pointsMerge(false)
        .pointsTransitionDuration(250)
        .pointLabel((d) => (touch ? '' : `
            <div class="globe-tip">
                <strong>${esc(d.label)}</strong>
                <span>${d.home ? 'Base de recherche' : `${d.people.length} collaborateur${d.people.length > 1 ? 's' : ''} · cliquer pour voir`}</span>
            </div>`))
        .onPointHover((d) => {
            hovered = d && !d.home ? d : null;
            container.style.cursor = hovered ? 'pointer' : '';
            refresh();
        })
        .onPointClick(select)
        .labelsData([])
        .labelText(shortName)
        .labelSize(0.55)
        .labelDotRadius(radius)
        .labelDotOrientation(() => 'right')
        .labelAltitude(0.021)
        .labelColor((d) => (d.home || d === selected ? '#e8b05c' : 'rgba(255, 255, 255, 0.92)'))
        .labelResolution(3)
        .onLabelClick(select)
        .ringsData([])
        .ringColor(() => (t) => `rgba(232, 176, 92, ${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(2.5)
        .ringRepeatPeriod(reduceMotion ? 0 : 1200)
        .onGlobeClick(() => {
            if (!selected) return;
            reset();
            onSelect(null);
        })
        .onZoom(({ altitude: alt }) => {
            const next = Math.round(Math.min(1, Math.max(0.3, alt / ALT_HOME)) * 10) / 10;
            if (next !== zoomScale) {
                zoomScale = next;
                globe.pointRadius(radius).labelDotRadius(radius);
            }
            const showLabels = alt < ALT_LABELS;
            if (showLabels !== globe.labelsData().length > 0) globe.labelsData(showLabels ? markers : []);
        });

    // --- Contrôles caméra -------------------------------------------------
    const controls = globe.controls();
    const R = globe.getGlobeRadius();
    controls.enableZoom = true;
    controls.minDistance = R * (1 + ALT_MIN);
    controls.maxDistance = R * (1 + ALT_MAX);
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.35;
    globe.pointOfView({ lat: 30, lng: -30, altitude: ALT_HOME });

    // La rotation auto s'arrête pendant l'interaction et reprend après 6 s d'inactivité
    controls.addEventListener('start', () => {
        clearTimeout(idleTimer);
        controls.autoRotate = false;
    });
    controls.addEventListener('end', () => {
        clearTimeout(idleTimer);
        if (!selected && !reduceMotion) idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
    });

    // Molette : zoom seulement avec Ctrl/⌘ (ou en plein écran), sinon la page défile normalement
    container.addEventListener('wheel', (e) => {
        if (expanded || e.ctrlKey || e.metaKey) return;
        e.stopPropagation();
        flashHelp();
    }, { capture: true, passive: true });

    // Tactile : glisser vertical = défiler la page ; horizontal = tourner ; pincer = zoomer.
    // En plein écran, le globe capte tous les gestes.
    const canvas = globe.renderer().domElement;
    const applyTouchMode = () => { canvas.style.touchAction = expanded ? 'none' : 'pan-y'; };
    applyTouchMode();

    function zoomBy(factor) {
        const { altitude: alt } = globe.pointOfView();
        globe.pointOfView({ altitude: Math.min(ALT_MAX, Math.max(ALT_MIN, alt * factor)) }, 450);
    }

    // --- Aide contextuelle ----------------------------------------------
    const helpText = () => {
        if (touch) return expanded ? 'Glisser pour tourner · pincer pour zoomer' : 'Pincer pour zoomer · ⤢ plein écran';
        return expanded ? 'Glisser pour tourner · molette pour zoomer · Échap pour fermer' : 'Glisser pour tourner · Ctrl + molette pour zoomer';
    };
    let helpTimer;
    function flashHelp() {
        if (!help) return;
        help.classList.add('flash');
        clearTimeout(helpTimer);
        helpTimer = setTimeout(() => help.classList.remove('flash'), 1600);
    }
    if (help) help.textContent = helpText();

    // --- Plein écran (overlay CSS : fonctionne aussi sur iPhone) -------------
    const expandBtn = panel?.querySelector('[data-globe="expand"]');
    function setExpanded(value) {
        expanded = value;
        panel?.classList.toggle('expanded', value);
        document.body.classList.toggle('globe-open', value);
        expandBtn?.setAttribute('aria-pressed', String(value));
        expandBtn?.setAttribute('aria-label', value ? 'Quitter le plein écran' : 'Plein écran');
        applyTouchMode();
        if (help) help.textContent = helpText();
        requestAnimationFrame(resize);
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && expanded) setExpanded(false);
    });

    panel?.querySelector('.globe-tools')?.addEventListener('click', (e) => {
        const action = e.target.closest('[data-globe]')?.dataset.globe;
        if (action === 'in') zoomBy(0.65);
        if (action === 'out') zoomBy(1.5);
        if (action === 'home') {
            reset();
            onSelect(null);
        }
        if (action === 'expand') setExpanded(!expanded);
    });

    // --- Sélection --------------------------------------------------------
    function refresh() {
        globe.pointColor(color).pointAltitude(altitude).pointRadius(radius);
        if (globe.labelsData().length) globe.labelsData([...markers]);
        globe.ringsData(selected ? [selected] : []);
    }

    function focus(location) {
        selected = markers.find((m) => m.key === location.key) || null;
        clearTimeout(idleTimer);
        controls.autoRotate = false;
        const { altitude: alt } = globe.pointOfView();
        globe.pointOfView({ lat: location.lat, lng: location.lng, altitude: Math.min(alt, ALT_FOCUS) }, 1000);
        refresh();
    }

    function reset() {
        selected = null;
        controls.autoRotate = !reduceMotion;
        globe.pointOfView({ altitude: ALT_HOME }, 800);
        refresh();
    }

    function resize() {
        globe.width(container.clientWidth).height(container.clientHeight);
    }
    new ResizeObserver(resize).observe(container);
    resize();

    // Pause du rendu quand le globe n'est plus visible (économie CPU/batterie)
    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
    }).observe(container);

    return { focus, reset, collapse: () => setExpanded(false), isExpanded: () => expanded };
}
