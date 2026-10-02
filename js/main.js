// ============================================
// SITE PUBLIC
// ============================================

const OWNER = /wafa\s+malik|malik,?\s+w(afa|\.)?/i;

// --- Navigation ---------------------------------------------------------

function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
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

    // Lien actif selon la section visible
    const links = new Map([...nav.querySelectorAll('a[href^="#"]')].map((a) => [a.hash.slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((a) => a.classList.remove('active'));
            links.get(entry.target.id)?.classList.add('active');
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
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

// --- Rendu --------------------------------------------------------------

function renderState(container, message, isError = false) {
    container.removeAttribute('aria-busy');
    container.innerHTML = `<p class="state${isError ? ' state-error' : ''}">${esc(message)}</p>`;
}

function highlightOwner(authors) {
    return esc(authors).replace(new RegExp(OWNER.source, 'gi'), (m) => `<strong>${m}</strong>`);
}

function renderPublications(items) {
    const container = document.getElementById('publications-list');
    if (!items.length) return renderState(container, 'Aucune publication pour le moment.');
    container.removeAttribute('aria-busy');
    container.innerHTML = items.map((pub) => {
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
    }).join('');
}

function groupByCountry(collaborators) {
    const groups = new Map();
    collaborators.forEach((c) => {
        const country = (c.country || 'Autres').trim();
        if (!groups.has(country)) groups.set(country, []);
        groups.get(country).push(c);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

function renderCollaborators(items) {
    const container = document.getElementById('collaborators-list');
    if (!items.length) return renderState(container, 'Aucun collaborateur pour le moment.');
    container.removeAttribute('aria-busy');

    container.innerHTML = groupByCountry(items).map(([country, people]) => `
        <div class="collab-group reveal">
            <h3 class="collab-country">${esc(country)} <span>${people.length}</span></h3>
            <ul class="collab-grid">
                ${people.map((c) => {
                    const image = safeUrl(c.image, { image: true });
                    const link = safeUrl(c.link);
                    const title = (c.title || '').trim();
                    const tag = link ? 'a' : 'div';
                    const attrs = link ? ` href="${esc(link)}" target="_blank" rel="noopener"` : '';
                    return `
                        <li>
                            <${tag} class="collab"${attrs}>
                                ${image
                                    ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" data-initials="${esc(initials(c.name))}">`
                                    : `<span class="avatar" aria-hidden="true">${esc(initials(c.name))}</span>`}
                                <span class="collab-text">
                                    <span class="collab-name">${esc(c.name)}</span>
                                    ${link ? '<span class="arrow" aria-hidden="true">↗</span>' : ''}
                                    ${title && title !== '-' ? `<span class="collab-role">${esc(title)}</span>` : ''}
                                    <span class="collab-inst">${esc(c.institution)}</span>
                                </span>
                            </${tag}>
                        </li>`;
                }).join('')}
            </ul>
        </div>`).join('');

    // Légende du globe
    const legend = document.getElementById('country-legend');
    legend.innerHTML = groupByCountry(items).map(([country, people]) =>
        `<li><span>${esc(country)}</span><b>${people.length}</b></li>`).join('');
}

function renderTeaching(items) {
    const container = document.getElementById('teaching-list');
    if (!items.length) return renderState(container, 'Aucun enseignement pour le moment.');
    container.removeAttribute('aria-busy');
    container.innerHTML = items.map((t) => {
        const image = safeUrl(t.image, { image: true });
        return `
            <article class="teach reveal">
                ${image ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async">` : ''}
                <div class="teach-body">
                    <p class="teach-meta">${[t.institution, t.location].filter(Boolean).map(esc).join(' · ')}</p>
                    <h3>${esc(t.title)}</h3>
                    ${t.description ? `<p>${esc(t.description)}</p>` : ''}
                </div>
            </article>`;
    }).join('');
}

function renderOutreach(items) {
    const container = document.getElementById('outreach-list');
    if (!items.length) return renderState(container, 'Aucun contenu pour le moment.');
    container.removeAttribute('aria-busy');
    container.innerHTML = items.map((item) => {
        const embed = toEmbedUrl(item.embed_url) || toEmbedUrl(item.link);
        const thumb = embed ? youtubeThumb(embed) : '';
        const link = safeUrl(item.link);
        const desc = String(item.description || '').trim();
        const [first, ...rest] = desc.split(/\n\s*\n/);
        return `
            <article class="outreach reveal">
                ${embed ? `
                    <button class="video" data-embed="${esc(embed)}" aria-label="Lire la vidéo : ${esc(item.title)}">
                        ${thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : ''}
                        <span class="play" aria-hidden="true"></span>
                    </button>` : ''}
                <div class="outreach-body">
                    <h3>${esc(item.title)}</h3>
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

function renderStats({ publications, collaborators }) {
    const countries = new Set(collaborators.map((c) => (c.country || '').trim()).filter(Boolean));
    const values = { publications: publications.length, collaborators: collaborators.length, countries: countries.size };
    document.querySelectorAll('[data-stat]').forEach((el) => {
        el.textContent = values[el.dataset.stat];
    });
}

// --- Chargement ---------------------------------------------------------

const RENDERERS = {
    publications: renderPublications,
    collaborators: renderCollaborators,
    teaching: renderTeaching,
    outreach: renderOutreach,
};

const CONTAINERS = {
    publications: 'publications-list',
    collaborators: 'collaborators-list',
    teaching: 'teaching-list',
    outreach: 'outreach-list',
};

async function loadContent() {
    const results = await Promise.allSettled(TABLES.map((t) => Content.list(t)));
    const data = {};
    results.forEach((result, i) => {
        const table = TABLES[i];
        if (result.status === 'fulfilled') {
            data[table] = result.value;
            RENDERERS[table](result.value);
        } else {
            data[table] = [];
            console.error(table, result.reason);
            renderState(document.getElementById(CONTAINERS[table]), 'Impossible de charger ce contenu pour le moment.', true);
        }
    });
    renderStats(data);
    observeReveal();
    initGlobe(document.getElementById('globe'), data.collaborators);
}

// Image distante cassée : initiales pour les collaborateurs, sinon on masque
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    initNavigation();
    observeReveal();
    loadContent();
});
