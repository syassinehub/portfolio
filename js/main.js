// ============================================
// SITE PUBLIC
// ============================================
// Chaque page déclare <body data-page="..."> ; seul le rendu correspondant est exécuté.

const OWNER = /wafa\s+malik|malik,?\s+w(afa|\.)?/i;

const $ = (id) => document.getElementById(id);

// --- Commun à toutes les pages -----------------------------------------

function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = $('site-nav');
    const header = document.querySelector('.site-header');

    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        nav.classList.toggle('open', !open);
    });
    nav.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            toggle.setAttribute('aria-expanded', 'false');
            nav.classList.remove('open');
        }
    });

    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// Apparition douce des blocs au défilement
const reveal = 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                obs.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -8% 0px' })
    : null;

function observeReveal(root = document) {
    root.querySelectorAll('.reveal:not(.in)').forEach((el) => (reveal ? reveal.observe(el) : el.classList.add('in')));
}

// Image distante cassée : initiales pour les personnes, sinon on masque
document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.closest('main')) return;
    if (img.dataset.initials !== undefined) {
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.textContent = img.dataset.initials;
        img.replaceWith(avatar);
    } else {
        img.remove();
    }
}, true);

function renderState(container, message, isError = false) {
    container.removeAttribute('aria-busy');
    container.innerHTML = `<p class="state${isError ? ' state-error' : ''}">${esc(message)}</p>`;
}

function plural(n, word) {
    return `${n} ${word}${n > 1 ? 's' : ''}`;
}

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// --- Accueil ------------------------------------------------------------

async function initHome() {
    const [collaborators, ...counts] = await Promise.allSettled([
        Content.list('collaborators'),
        Content.count('publications'),
        Content.count('teaching'),
        Content.count('outreach'),
    ]);
    const people = collaborators.status === 'fulfilled' ? collaborators.value : [];
    const value = (r) => (r.status === 'fulfilled' ? r.value : '—');
    const stats = {
        publications: value(counts[0]),
        teaching: value(counts[1]),
        outreach: value(counts[2]),
        collaborators: collaborators.status === 'fulfilled' ? people.length : '—',
        countries: collaborators.status === 'fulfilled'
            ? new Set(people.map((c) => (c.country || '').trim()).filter(Boolean)).size
            : '—',
    };
    document.querySelectorAll('[data-stat]').forEach((el) => {
        el.textContent = stats[el.dataset.stat];
    });
}

// --- Publications -------------------------------------------------------

function highlightOwner(authors) {
    return esc(authors).replace(new RegExp(OWNER.source, 'gi'), (m) => `<strong>${m}</strong>`);
}

function publicationHtml(pub) {
    const link = safeUrl(pub.link);
    const image = safeUrl(pub.image, { image: true });
    const meta = [pub.journal, pub.year].filter(Boolean).map(esc).join(' · ');
    return `
        <li class="pub reveal">
            <div class="pub-year">${esc(pub.year)}</div>
            <div class="pub-body">
                <h3>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(pub.title)}</a>` : esc(pub.title)}</h3>
                <p class="pub-authors">${highlightOwner(pub.authors)}</p>
                ${meta ? `<p class="pub-meta">${meta}</p>` : ''}
                ${link ? `<a class="text-link" href="${esc(link)}" target="_blank" rel="noopener">Lire l'article ↗</a>` : ''}
            </div>
            ${image ? `<img class="pub-thumb" src="${esc(image)}" alt="" loading="lazy" decoding="async">` : ''}
        </li>`;
}

async function initPublications() {
    const container = $('publications-list');
    let items;
    try {
        items = await Content.list('publications');
    } catch (err) {
        console.error(err);
        return renderState(container, 'Impossible de charger les publications pour le moment.', true);
    }

    const render = () => {
        const query = normalize($('pub-search').value.trim());
        const shown = items.filter((p) => !query || normalize([p.title, p.authors, p.journal, p.year].join(' ')).includes(query));
        $('pub-count').textContent = query ? `${plural(shown.length, 'résultat')} sur ${items.length}` : plural(items.length, 'publication');
        container.removeAttribute('aria-busy');
        container.innerHTML = shown.length
            ? shown.map(publicationHtml).join('')
            : `<li class="state">${items.length ? 'Aucune publication ne correspond à la recherche.' : 'Aucune publication pour le moment.'}</li>`;
        observeReveal(container);
    };
    $('pub-search').addEventListener('input', render);
    render();
}

// --- Collaborateurs -----------------------------------------------------

function personMedia(c) {
    const image = safeUrl(c.image, { image: true });
    return image
        ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" data-initials="${esc(initials(c.name))}">`
        : `<span class="avatar" aria-hidden="true">${esc(initials(c.name))}</span>`;
}

function collaboratorHtml(c, { compact = false } = {}) {
    const link = safeUrl(c.link);
    const title = (c.title || '').trim();
    const tag = link ? 'a' : 'div';
    const attrs = link ? ` href="${esc(link)}" target="_blank" rel="noopener"` : '';
    return `
        <li${compact ? '' : ' class="reveal"'}>
            <${tag} class="collab${compact ? ' collab-compact' : ''}"${attrs}>
                ${personMedia(c)}
                <span class="collab-text">
                    <span class="collab-name">${esc(c.name)}</span>
                    ${title && title !== '-' ? `<span class="collab-role">${esc(title)}</span>` : ''}
                    <span class="collab-inst">${esc(c.institution)}</span>
                    ${compact ? '' : `<span class="collab-place">${esc((c.country || '').trim())}</span>`}
                </span>
                ${link ? '<span class="arrow" aria-hidden="true">↗</span>' : ''}
            </${tag}>
        </li>`;
}

async function initCollaborators() {
    const list = $('collaborators-list');
    let people;
    try {
        people = await Content.list('collaborators');
    } catch (err) {
        console.error(err);
        renderState($('location-list'), 'Globe indisponible.', true);
        return renderState(list, 'Impossible de charger les collaborateurs pour le moment.', true);
    }

    const locations = buildLocations(people);
    const filters = { query: '', country: '', location: null };
    let globeCtl = null;

    // Liste + filtres ---------------------------------------------------
    const countries = [...people.reduce((map, c) => {
        const country = (c.country || '').trim();
        if (country) map.set(country, (map.get(country) || 0) + 1);
        return map;
    }, new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    function renderChips() {
        const chip = (value, label, count) => `
            <button type="button" class="chip-btn" data-country="${esc(value)}" aria-pressed="${filters.country === value && !filters.location}">
                ${esc(label)} <span>${count}</span>
            </button>`;
        $('country-filters').innerHTML = chip('', 'Tous', people.length)
            + countries.map(([country, n]) => chip(country, country, n)).join('')
            + (filters.location ? `
                <button type="button" class="chip-btn chip-location" data-clear-location aria-pressed="true">
                    ${esc(filters.location.label)} <span aria-hidden="true">✕</span>
                    <span class="visually-hidden">Retirer le filtre de lieu</span>
                </button>` : '');
    }

    function renderList() {
        const query = normalize(filters.query);
        const shown = people.filter((c) => {
            if (filters.location && !filters.location.people.includes(c)) return false;
            if (filters.country && (c.country || '').trim() !== filters.country) return false;
            return !query || normalize([c.name, c.title, c.institution, c.country].join(' ')).includes(query);
        });
        const filtered = shown.length !== people.length;
        $('collab-count').textContent = filtered
            ? `${plural(shown.length, 'collaborateur')} sur ${people.length}`
            : plural(people.length, 'collaborateur');
        list.removeAttribute('aria-busy');
        list.innerHTML = shown.length
            ? shown.map((c) => collaboratorHtml(c)).join('')
            : `<li class="state">Aucun collaborateur ne correspond. <button type="button" class="link-btn" data-reset>Réinitialiser les filtres</button></li>`;
        observeReveal(list);
    }

    function update() {
        renderChips();
        renderList();
    }

    $('collab-search').addEventListener('input', (e) => {
        filters.query = e.target.value.trim();
        renderList();
    });
    $('country-filters').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        filters.location = null;
        if (btn.dataset.country !== undefined) filters.country = btn.dataset.country;
        update();
    });
    list.addEventListener('click', (e) => {
        if (!e.target.closest('[data-reset]')) return;
        Object.assign(filters, { query: '', country: '', location: null });
        $('collab-search').value = '';
        update();
    });

    // Panneau du globe -------------------------------------------------
    const side = $('globe-side');

    function showOverview() {
        side.classList.remove('has-selection');
        side.querySelector('.globe-side-inner').innerHTML = `
            <p class="globe-hint">Cliquez sur un point du globe ou choisissez un lieu.</p>
            <ul class="location-list">
                ${locations.map((l) => `
                    <li><button type="button" data-location="${esc(l.key)}">
                        <span>${esc(l.label)}</span><b>${l.people.length}</b>
                    </button></li>`).join('')}
            </ul>`;
    }

    function showLocation(loc) {
        side.classList.add('has-selection');
        side.querySelector('.globe-side-inner').innerHTML = `
            <button type="button" class="globe-back" data-back>← Tous les lieux</button>
            <h2 class="globe-place">${esc(loc.label)}</h2>
            <p class="globe-sub">${plural(loc.people.length, 'collaborateur')}</p>
            <ul class="globe-people">${loc.people.map((c) => collaboratorHtml(c, { compact: true })).join('')}</ul>
            <button type="button" class="btn btn-primary btn-block" data-filter-location="${esc(loc.key)}">Afficher dans la liste ↓</button>`;
    }

    function select(loc) {
        if (!loc) return showOverview();
        showLocation(loc);
        // Sur mobile le panneau est sous le globe : on l'amène à l'écran
        if (window.matchMedia('(max-width: 960px)').matches) side.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    side.addEventListener('click', (e) => {
        const locBtn = e.target.closest('[data-location]');
        if (locBtn) {
            const loc = locations.find((l) => l.key === locBtn.dataset.location);
            globeCtl?.focus(loc);
            showLocation(loc);
            return;
        }
        if (e.target.closest('[data-back]')) {
            globeCtl?.reset();
            showOverview();
            return;
        }
        const filterBtn = e.target.closest('[data-filter-location]');
        if (filterBtn) {
            filters.location = locations.find((l) => l.key === filterBtn.dataset.filterLocation);
            filters.country = '';
            update();
            $('collab-filters').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    showOverview();
    update();
    globeCtl = await initGlobe($('globe'), locations, select);
}

// --- Enseignement -------------------------------------------------------

async function initTeaching() {
    const container = $('teaching-list');
    let items;
    try {
        items = await Content.list('teaching');
    } catch (err) {
        console.error(err);
        return renderState(container, 'Impossible de charger les enseignements pour le moment.', true);
    }
    if (!items.length) return renderState(container, 'Aucun enseignement pour le moment.');
    container.removeAttribute('aria-busy');
    container.innerHTML = items.map((t) => {
        const image = safeUrl(t.image, { image: true });
        return `
            <article class="teach reveal">
                ${image ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">` : ''}
                <div class="teach-body">
                    <p class="teach-meta">${[t.institution, t.location].filter(Boolean).map(esc).join(' · ')}</p>
                    <h2>${esc(t.title)}</h2>
                    ${t.description ? `<p>${esc(t.description)}</p>` : ''}
                </div>
            </article>`;
    }).join('');
    observeReveal(container);
}

// --- Médiation ----------------------------------------------------------

async function initOutreach() {
    const container = $('outreach-list');
    let items;
    try {
        items = await Content.list('outreach');
    } catch (err) {
        console.error(err);
        return renderState(container, 'Impossible de charger les contenus pour le moment.', true);
    }
    if (!items.length) return renderState(container, 'Aucun contenu pour le moment.');
    container.removeAttribute('aria-busy');
    container.innerHTML = items.map((item) => {
        const embed = toEmbedUrl(item.embed_url) || toEmbedUrl(item.link);
        const thumb = embed ? youtubeThumb(embed) : '';
        const link = safeUrl(item.link);
        const [first, ...rest] = String(item.description || '').trim().split(/\n\s*\n/);
        return `
            <article class="outreach reveal">
                ${embed ? `
                    <button class="video" data-embed="${esc(embed)}" aria-label="Lire la vidéo : ${esc(item.title)}">
                        ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : ''}
                        <span class="play" aria-hidden="true"></span>
                    </button>` : ''}
                <div class="outreach-body">
                    <h2>${esc(item.title)}</h2>
                    ${first ? `<p>${esc(first)}</p>` : ''}
                    ${rest.length ? `
                        <details>
                            <summary>Lire la suite</summary>
                            ${rest.map((p) => `<p>${esc(p)}</p>`).join('')}
                        </details>` : ''}
                    ${link ? `<a class="text-link" href="${esc(link)}" target="_blank" rel="noopener">En savoir plus ↗</a>` : ''}
                </div>
            </article>`;
    }).join('');
    observeReveal(container);

    // Vidéo chargée seulement au clic (pas de traceurs ni de poids inutile)
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.video[data-embed]');
        if (!btn) return;
        const iframe = document.createElement('iframe');
        iframe.src = `${btn.dataset.embed}?autoplay=1`;
        iframe.title = btn.getAttribute('aria-label');
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        const frame = document.createElement('div');
        frame.className = 'video';
        frame.appendChild(iframe);
        btn.replaceWith(frame);
    });
}

// --- Initialisation -----------------------------------------------------

const PAGES = {
    home: initHome,
    publications: initPublications,
    collaborators: initCollaborators,
    teaching: initTeaching,
    outreach: initOutreach,
};

document.addEventListener('DOMContentLoaded', () => {
    $('year').textContent = new Date().getFullYear();
    initNavigation();
    observeReveal();
    PAGES[document.body.dataset.page]?.();
});
