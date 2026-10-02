// ============================================
// ADMINISTRATION
// ============================================
// Authentification : Supabase Auth. Les droits d'écriture sont vérifiés
// côté serveur par RLS (public.is_admin()) — l'interface ne fait qu'en refléter l'état.

const SECTIONS = {
    publications: {
        label: 'Publications',
        singular: 'une publication',
        fields: [
            { name: 'title', label: 'Titre', required: true },
            { name: 'authors', label: 'Auteurs', required: true, hint: 'Ex. : Wafa Malik, Patrick Durand & François Oehler' },
            { name: 'journal', label: 'Revue' },
            { name: 'year', label: 'Année', type: 'number', min: 1950, max: 2100 },
            { name: 'link', label: 'Lien (DOI ou URL)', type: 'url' },
            { name: 'image', label: "URL de l'image", type: 'url' },
        ],
        summary: (p) => [p.authors, [p.journal, p.year].filter(Boolean).join(' · ')],
    },
    collaborators: {
        label: 'Collaborateurs',
        singular: 'un collaborateur',
        sortable: true,
        fields: [
            { name: 'name', label: 'Nom', required: true },
            { name: 'title', label: 'Fonction' },
            { name: 'institution', label: 'Institution', required: true },
            { name: 'country', label: 'Pays', required: true, hint: 'En anglais ou en français (France, Spain, USA, Tunisia…) — utilisé pour le globe' },
            { name: 'link', label: 'Lien vers le profil', type: 'url' },
            { name: 'image', label: 'URL de la photo', type: 'url' },
            { name: 'lat', label: 'Latitude (optionnel)', type: 'number', numeric: true, min: -90, max: 90, hint: 'Position exacte sur le globe. Vide = position de l\'institution si connue, sinon centre du pays.' },
            { name: 'lng', label: 'Longitude (optionnel)', type: 'number', numeric: true, min: -180, max: 180 },
        ],
        summary: (c) => [[c.title, c.institution].filter(Boolean).join(' — '), c.country],
    },
    teaching: {
        label: 'Enseignement',
        singular: 'un enseignement',
        fields: [
            { name: 'title', label: 'Titre', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'institution', label: 'Institution', required: true },
            { name: 'location', label: 'Lieu', required: true },
            { name: 'image', label: "URL de l'image", type: 'url' },
        ],
        summary: (t) => [[t.institution, t.location].filter(Boolean).join(' · ')],
    },
    outreach: {
        label: 'Médiation',
        singular: 'un contenu',
        fields: [
            { name: 'title', label: 'Titre', required: true },
            { name: 'description', label: 'Description', type: 'textarea', rows: 8, hint: 'Une ligne vide sépare les paragraphes ; seul le premier est affiché avant « Lire la suite ».' },
            { name: 'link', label: 'Lien externe', type: 'url' },
            { name: 'embed_url', label: 'Vidéo (YouTube ou Vimeo)', type: 'url', hint: "Coller simplement le lien de la vidéo, il est converti automatiquement." },
        ],
        summary: (o) => [String(o.description || '').slice(0, 140)],
    },
};

const state = { section: 'publications', items: [], editing: null };

const $ = (id) => document.getElementById(id);

// --- Interface ----------------------------------------------------------

let toastTimer;
function toast(message, isError = false) {
    const el = $('toast');
    el.textContent = message;
    el.classList.toggle('toast-error', isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function showView(view) {
    $('login-view').hidden = view !== 'login';
    $('dashboard-view').hidden = view !== 'dashboard';
}

function renderTabs() {
    $('admin-tabs').innerHTML = Object.entries(SECTIONS).map(([key, s]) => `
        <button role="tab" data-section="${key}" aria-selected="${key === state.section}">${esc(s.label)}</button>
    `).join('');
}

function renderItems() {
    const section = SECTIONS[state.section];
    const container = $('items');
    $('section-title').textContent = section.label;

    if (!state.items.length) {
        container.innerHTML = `<p class="state">Aucun élément. Ajoutez ${esc(section.singular)}.</p>`;
        return;
    }

    container.innerHTML = state.items.map((item, index) => {
        const image = safeUrl(item.image, { image: true });
        const lines = section.summary(item).filter(Boolean);
        return `
            <article class="admin-item" data-id="${esc(item.id)}">
                ${section.sortable ? `
                    <div class="order">
                        <button class="icon-btn" data-action="up" aria-label="Monter" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="icon-btn" data-action="down" aria-label="Descendre" ${index === state.items.length - 1 ? 'disabled' : ''}>↓</button>
                    </div>` : ''}
                ${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ''}
                <div class="admin-item-text">
                    <h3>${esc(item.name || item.title)}</h3>
                    ${lines.map((l) => `<p>${esc(l)}</p>`).join('')}
                </div>
                <div class="admin-item-actions">
                    <button class="btn-small" data-action="edit">Modifier</button>
                    <button class="btn-small btn-danger" data-action="delete">Supprimer</button>
                </div>
            </article>`;
    }).join('');
}

async function loadSection(section) {
    state.section = section;
    renderTabs();
    $('items').innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try {
        state.items = await Content.list(section);
        renderItems();
    } catch (err) {
        console.error(err);
        $('items').innerHTML = `<p class="state state-error">Erreur de chargement : ${esc(err.message)}</p>`;
    }
}

// --- Éditeur ------------------------------------------------------------

function fieldHtml(field, value) {
    const id = `field-${field.name}`;
    const common = `id="${id}" name="${field.name}" ${field.required ? 'required' : ''}`;
    const input = field.type === 'textarea'
        ? `<textarea ${common} rows="${field.rows || 4}">${esc(value)}</textarea>`
        : `<input ${common} type="${field.type || 'text'}" value="${esc(value)}"${field.min !== undefined ? ` min="${field.min}" max="${field.max}"` : ''}${field.numeric ? ' step="any"' : ''}>`;
    return `
        <label for="${id}">
            <span>${esc(field.label)}${field.required ? ' <em>*</em>' : ''}</span>
            ${input}
            ${field.hint ? `<small>${esc(field.hint)}</small>` : ''}
        </label>`;
}

function openEditor(item = null) {
    const section = SECTIONS[state.section];
    state.editing = item;
    $('editor-title').textContent = item ? 'Modifier' : `Ajouter ${section.singular}`;
    $('editor-fields').innerHTML = section.fields.map((f) => fieldHtml(f, item?.[f.name])).join('');
    $('editor-error').textContent = '';
    $('editor').showModal();
    $('editor-fields').querySelector('input, textarea')?.focus();
}

function readEditor() {
    const form = new FormData($('editor-form'));
    const row = {};
    SECTIONS[state.section].fields.forEach((f) => {
        const value = String(form.get(f.name) ?? '').trim();
        row[f.name] = f.numeric ? (value === '' ? null : Number(value)) : value;
    });
    if ('embed_url' in row && row.embed_url) {
        const embed = toEmbedUrl(row.embed_url);
        if (!embed) throw new Error('Lien vidéo non reconnu (YouTube ou Vimeo uniquement).');
        row.embed_url = embed;
    }
    return row;
}

async function saveEditor(e) {
    e.preventDefault();
    const submit = e.submitter || $('editor-form').querySelector('[type="submit"]');
    submit.disabled = true;
    try {
        const row = readEditor();
        if (state.editing) {
            await Content.update(state.section, state.editing.id, row);
            toast('Modifications enregistrées');
        } else {
            if (SECTIONS[state.section].sortable) {
                row.position = state.items.reduce((max, i) => Math.max(max, i.position || 0), 0) + 1;
            }
            await Content.insert(state.section, row);
            toast('Élément ajouté');
        }
        $('editor').close();
        await loadSection(state.section);
    } catch (err) {
        console.error(err);
        $('editor-error').textContent = err.message || "Échec de l'enregistrement";
    } finally {
        submit.disabled = false;
    }
}

// --- Actions ------------------------------------------------------------

async function moveItem(id, delta) {
    const items = [...state.items];
    const from = items.findIndex((i) => String(i.id) === String(id));
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
    try {
        // Réécrit les positions 1..N uniquement là où elles changent
        await Promise.all(items.map((item, i) =>
            item.position === i + 1 ? null : Content.update(state.section, item.id, { position: i + 1 })));
        await loadSection(state.section);
    } catch (err) {
        toast(err.message, true);
        await loadSection(state.section);
    }
}

async function deleteItem(id) {
    const item = state.items.find((i) => String(i.id) === String(id));
    if (!confirm(`Supprimer « ${item?.name || item?.title} » ? Cette action est définitive.`)) return;
    try {
        await Content.remove(state.section, id);
        toast('Élément supprimé');
        await loadSection(state.section);
    } catch (err) {
        toast(err.message, true);
    }
}

// --- Authentification ---------------------------------------------------

async function enterDashboard(session) {
    const { data: isAdmin, error } = await db.rpc('is_admin');
    if (error || !isAdmin) {
        await db.auth.signOut();
        showView('login');
        $('login-error').textContent = error
            ? 'Configuration manquante : exécutez supabase/schema.sql.'
            : "Ce compte n'a pas les droits d'administration.";
        return;
    }
    $('admin-email').textContent = session.user.email;
    showView('dashboard');
    loadSection(state.section);
}

async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const submit = e.target.querySelector('[type="submit"]');
    submit.disabled = true;
    $('login-error').textContent = '';
    const { data, error } = await db.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
    });
    submit.disabled = false;
    if (error) {
        $('login-error').textContent = 'Identifiants incorrects.';
        return;
    }
    e.target.reset();
    enterDashboard(data.session);
}

// --- Initialisation -----------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
    $('login-form').addEventListener('submit', handleLogin);
    $('logout-btn').addEventListener('click', async () => {
        await db.auth.signOut();
        showView('login');
    });

    $('admin-tabs').addEventListener('click', (e) => {
        const tab = e.target.closest('[data-section]');
        if (tab) loadSection(tab.dataset.section);
    });
    $('add-btn').addEventListener('click', () => openEditor());
    $('items').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.closest('[data-id]').dataset.id;
        const item = state.items.find((i) => String(i.id) === id);
        if (btn.dataset.action === 'edit') openEditor(item);
        if (btn.dataset.action === 'delete') deleteItem(id);
        if (btn.dataset.action === 'up') moveItem(id, -1);
        if (btn.dataset.action === 'down') moveItem(id, 1);
    });

    $('items').addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') e.target.remove();
    }, true);
    $('editor-form').addEventListener('submit', saveEditor);
    $('editor').addEventListener('click', (e) => {
        if (e.target.closest('[data-close]') || e.target === $('editor')) $('editor').close();
    });

    db.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') showView('login');
    });

    const { data } = await db.auth.getSession();
    if (data.session) enterDashboard(data.session);
    else showView('login');
});
