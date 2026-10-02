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

function buildGlobe(container, locations, onSelect) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const arcs = locations.map((l) => ({ startLat: HOME.lat, startLng: HOME.lng, endLat: l.lat, endLng: l.lng }));
    const markers = [{ ...HOME, home: true, people: [] }, ...locations];
    let selected = null;

    const radius = (d) => (d.home ? 0.55 : 0.5 + Math.min(d.people.length, 6) * 0.1);
    const color = (d) => (d.home ? '#e8b05c' : d === selected ? '#e8b05c' : '#ffffff');

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
        .pointAltitude((d) => (d === selected ? 0.06 : 0.02))
        .pointRadius(radius)
        .pointsMerge(false)
        .pointsTransitionDuration(300)
        .pointLabel((d) => `
            <div class="globe-tip">
                <strong>${esc(d.label)}</strong>
                <span>${d.home ? 'Base de recherche' : `${d.people.length} collaborateur${d.people.length > 1 ? 's' : ''} · cliquer pour voir`}</span>
            </div>`)
        .onPointHover((d) => { container.style.cursor = d && !d.home ? 'pointer' : ''; })
        .onPointClick((d) => {
            if (d.home) return;
            focus(d);
            onSelect(d);
        })
        .ringsData([])
        .ringColor(() => (t) => `rgba(232, 176, 92, ${1 - t})`)
        .ringMaxRadius(4)
        .ringPropagationSpeed(2.5)
        .ringRepeatPeriod(reduceMotion ? 0 : 1200)
        .onGlobeClick(() => {
            reset();
            onSelect(null);
        });

    const controls = globe.controls();
    controls.enableZoom = false; // la molette reste au défilement de la page
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.35;
    globe.pointOfView({ lat: 30, lng: -30, altitude: 2.1 });

    function refresh() {
        globe.pointColor(color).pointAltitude((d) => (d === selected ? 0.06 : 0.02));
        globe.ringsData(selected ? [selected] : []);
    }

    function focus(location) {
        selected = markers.find((m) => m.key === location.key) || null;
        controls.autoRotate = false;
        globe.pointOfView({ lat: location.lat, lng: location.lng, altitude: 1.5 }, 1000);
        refresh();
    }

    function reset() {
        selected = null;
        controls.autoRotate = !reduceMotion;
        globe.pointOfView({ altitude: 2.1 }, 800);
        refresh();
    }

    const resize = () => globe.width(container.clientWidth).height(container.clientHeight);
    new ResizeObserver(resize).observe(container);
    resize();

    // Pause du rendu quand le globe n'est plus visible (économie CPU/batterie)
    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
    }).observe(container);

    return { focus, reset };
}
