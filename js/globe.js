// Globe initialization using the UMD (global) build of Globe.gl and Three.js
// This file defines window.initGlobe() which initializes the globe in #globe-container

(function() {
    function initGlobe() {
        // Robust init: wait for global `Globe` to be available (it's provided by globe.gl UMD)
        if (!document.getElementById('globe-container')) return;
        if (window._globeInstance) return; // already initialized

        const maxRetries = 20;
        let attempts = 0;

        const tryInit = () => {
            attempts++;
            if (typeof Globe === 'function') {
                try {
                    const popup = document.getElementById('globe-popup');
                    const closeBtn = document.getElementById('globe-popup-close');
                    closeBtn?.addEventListener('click', () => {
                        popup.classList.add('hidden');
                        popup.setAttribute('aria-hidden', 'true');
                    });

                    // Ensure container has explicit height (in case CSS missing)
                    const container = document.getElementById('globe-container');
                    if (container) {
                        const cs = window.getComputedStyle(container);
                        if (!cs.height || cs.height === '0px') {
                            container.style.height = '520px';
                        }
                    }

                    const points = [
                        { name: 'CIRAD - Montpellier', lat: 43.6045, lng: 1.444, color: '#ff8c00', size: 1.2, alt: 0.09, desc: 'CIRAD, Montpellier, France' },
                        { name: 'Université Paris', lat: 48.8566, lng: 2.3522, color: '#ef4444', size: 1.1, alt: 0.08, desc: 'Paris, France' },
                        { name: 'Université Rabat', lat: 34.0209, lng: -6.84165, color: '#f59e0b', size: 1.0, alt: 0.085, desc: 'Rabat, Morocco' }
                    ];

                    const globe = Globe()(container)
                        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
                        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
                        .pointsData(points)
                        .pointLat(d => d.lat)
                        .pointLng(d => d.lng)
                        .pointColor(d => d.color || '#ff8c00')
                        .pointRadius(d => Math.max(0.4, (d.size || 0.8)))
                        .pointAltitude(d => (d.alt || 0.08))
                        .pointsTransitionDuration(400)
                        .pointLabel(d => `<div style="font-size:12px"><b>${d.name}</b><div>${d.desc}</div></div>`)
                        .onPointClick(d => {
                            alert(d.name + '\n' + (d.desc || ''));
                        });

                    globe.controls().autoRotate = true;
                    globe.controls().autoRotateSpeed = 0.4;


                    // Set a default camera view to better frame Europe/Africa.
                    // Adjust the longitude/altitude based on container aspect ratio so
                    // wide screens center Europe instead of the Americas.
                    try {
                        const container = document.getElementById('globe-container');
                        const w = container ? container.offsetWidth : window.innerWidth;
                        const h = container ? container.offsetHeight : window.innerHeight;
                        const aspect = w / Math.max(h, 1);

                        // If very wide, shift longitude east to center Europe/Africa visually
                        if (aspect > 2.0) {
                            globe.pointOfView({ lat: 20, lng: 20, altitude: 1.8 }, 800);
                        } else if (aspect > 1.6) {
                            globe.pointOfView({ lat: 18, lng: 10, altitude: 2.0 }, 800);
                        } else {
                            globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 800);
                        }
                    } catch (e) {
                        console.warn('pointOfView not available on this Globe build', e);
                    }

                    window._globeInstance = globe;
                    // done
                } catch (err) {
                    console.error('Globe init failed:', err);
                }
            } else {
                if (attempts < maxRetries) {
                    // retry after short delay
                    setTimeout(tryInit, 150);
                } else {
                    console.error('Globe.gl did not load (Globe is undefined). Check CDN load and network.');
                }
            }
        };

        tryInit();
    }

    window.initGlobe = initGlobe;
})();
