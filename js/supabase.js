// ============================================
// CONFIGURATION SUPABASE
// ============================================
// La clé "anon" est publique par nature : la sécurité repose sur les
// policies RLS définies dans supabase/schema.sql, pas sur ce fichier.

const SUPABASE_URL = 'https://vdcpnozdfsmdyiyepnmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkY3Bub3pkZnNtZHlpeWVwbm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjA1MzYsImV4cCI6MjA3OTEzNjUzNn0.aieffsexNXqjktfzcgG-MlYbI6bM11Hrl88eK0lACU0';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// ACCÈS AUX DONNÉES
// ============================================

const TABLES = ['publications', 'collaborators', 'teaching', 'outreach'];

const yearOf = (item) => parseInt(item.year, 10) || 0;
const createdOf = (item) => Date.parse(item.created_at) || 0;
const positionOf = (item) => (item.position ?? Number.MAX_SAFE_INTEGER);

// Ordre d'affichage par table
const SORTERS = {
    publications: (a, b) => yearOf(b) - yearOf(a) || createdOf(b) - createdOf(a),
    collaborators: (a, b) => positionOf(a) - positionOf(b) || createdOf(b) - createdOf(a),
    teaching: (a, b) => createdOf(b) - createdOf(a),
    outreach: (a, b) => createdOf(b) - createdOf(a),
};

const Content = {
    async list(table) {
        const { data, error } = await db.from(table).select('*');
        if (error) throw error;
        return (data || []).sort(SORTERS[table]);
    },
    async insert(table, row) {
        const { data, error } = await db.from(table).insert([row]).select();
        if (error) throw error;
        return data[0];
    },
    async update(table, id, changes) {
        const { data, error } = await db.from(table).update(changes).eq('id', id).select();
        if (error) throw error;
        if (!data.length) throw new Error('Modification refusée (droits insuffisants ?)');
        return data[0];
    },
    async remove(table, id) {
        const { data, error } = await db.from(table).delete().eq('id', id).select();
        if (error) throw error;
        if (!data.length) throw new Error('Suppression refusée (droits insuffisants ?)');
    },
};

// ============================================
// SÉCURITÉ DU RENDU
// ============================================

// Échappe une valeur avant insertion dans du HTML
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// N'autorise que http(s) (et data:image pour les images) — bloque javascript:, etc.
function safeUrl(value, { image = false } = {}) {
    const url = String(value ?? '').trim();
    if (!url) return '';
    if (image && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url)) return url;
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
        return '';
    }
}

// Convertit un lien YouTube / Vimeo en URL d'intégration sûre
function toEmbedUrl(value) {
    const url = safeUrl(value);
    if (!url) return '';
    const { hostname, pathname, searchParams } = new URL(url);
    const host = hostname.replace(/^www\.|^m\./, '');
    let youtubeId = '';
    if (host === 'youtu.be') youtubeId = pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        youtubeId = searchParams.get('v') || (pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || '';
    }
    if (/^[\w-]{6,20}$/.test(youtubeId)) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
    const vimeo = host === 'vimeo.com' || host === 'player.vimeo.com' ? pathname.match(/(\d{5,})/) : null;
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return '';
}

function youtubeThumb(embedUrl) {
    const id = (embedUrl.match(/youtube-nocookie\.com\/embed\/([\w-]+)/) || [])[1];
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

function initials(name) {
    return String(name || '')
        .replace(/^(Dr|Prof|Pr)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('');
}
