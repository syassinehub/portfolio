// ============================================
// GLOBE DES COLLABORATIONS
// ============================================
// globe.gl (~1 Mo) n'est chargé que lorsque la section devient visible.

const GLOBE_SRC = 'https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js';
const GLOBE_TEXTURE = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/earth-blue-marble.jpg';

const HOME = { name: 'CIRAD — Montpellier', lat: 43.6108, lng: 3.8767 };

// Coordonnées approximatives (capitale / centre de recherche principal)
const COUNTRY_COORDS = {
    france: [46.6, 2.4],
    spain: [41.65, -0.88], espagne: [41.65, -0.88],
    usa: [37.5, -84.5], 'united states': [37.5, -84.5], 'états-unis': [37.5, -84.5],
    mexico: [22.77, -102.58], mexique: [22.77, -102.58],
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

function countryPoints(collaborators) {
    const byCountry = new Map();
    collaborators.forEach((c) => {
        const key = (c.country || '').trim().toLowerCase();
        const coords = COUNTRY_COORDS[key];
        if (!coords) return;
        if (!byCountry.has(key)) byCountry.set(key, { name: c.country.trim(), lat: coords[0], lng: coords[1], people: [] });
        byCountry.get(key).people.push(c.name);
    });
    return [...byCountry.values()];
}

function initGlobe(container, collaborators = []) {
    if (!container) return;
    const supportsWebGL = (() => {
        try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; }
    })();
    if (!supportsWebGL) {
        container.classList.add('globe-fallback');
        return;
    }

    const observer = new IntersectionObserver(async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        try {
            if (typeof Globe !== 'function') await loadScript(GLOBE_SRC);
            buildGlobe(container, countryPoints(collaborators));
        } catch (err) {
            console.error(err);
            container.classList.add('globe-fallback');
        }
    }, { rootMargin: '200px' });
    observer.observe(container);
}

function buildGlobe(container, points) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const arcs = points.map((p) => ({ startLat: HOME.lat, startLng: HOME.lng, endLat: p.lat, endLng: p.lng }));
    const markers = [{ ...HOME, home: true, people: [] }, ...points];

    const globe = Globe()(container)
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl(GLOBE_TEXTURE)
        .showAtmosphere(true)
        .atmosphereColor('#9fd3b8')
        .atmosphereAltitude(0.18)
        .arcsData(arcs)
        .arcColor(() => ['rgba(232, 176, 92, 0.95)', 'rgba(159, 211, 184, 0.95)'])
        .arcStroke(0.6)
        .arcAltitudeAutoScale(0.45)
        .arcDashLength(0.5)
        .arcDashGap(0.25)
        .arcDashAnimateTime(reduceMotion ? 0 : 3200)
        .pointsData(markers)
        .pointColor((d) => (d.home ? '#e8b05c' : '#ffffff'))
        .pointAltitude(0.01)
        .pointRadius((d) => (d.home ? 0.9 : 0.45 + d.people.length * 0.12))
        .pointLabel((d) => `
            <div class="globe-tip">
                <strong>${esc(d.name)}</strong>
                ${d.home ? '<span>Base de recherche</span>' : d.people.map((n) => `<span>${esc(n)}</span>`).join('')}
            </div>`);

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.35;
    globe.pointOfView({ lat: 30, lng: -30, altitude: 2.1 });

    const resize = () => globe.width(container.clientWidth).height(container.clientHeight);
    new ResizeObserver(resize).observe(container);
    resize();

    // Pause de la rotation quand le globe n'est plus visible (économie CPU/batterie)
    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) globe.resumeAnimation();
        else globe.pauseAnimation();
    }).observe(container);
}
