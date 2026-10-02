# Portfolio — Dr. Wafa Malik

Site statique (HTML/CSS/JS, aucun build) + contenu dynamique stocké dans Supabase.

```
index.html          site public (une page, sections ancrées)
admin.html          administration du contenu
css/style.css       design system + site public
css/admin.css       styles de l'administration
js/supabase.js      client Supabase, accès aux données, helpers de sécurité (esc, safeUrl, toEmbedUrl)
js/main.js          rendu du site public
js/globe.js         globe des collaborations (globe.gl chargé à la demande)
js/admin.js         CRUD générique (publications, collaborateurs, enseignement, médiation)
supabase/schema.sql migration sécurité : Supabase Auth + RLS
```

## Lancer en local

```bash
python3 -m http.server 8000   # puis http://localhost:8000
```

## Mise en place de l'administration (une seule fois)

1. Supabase > **Authentication > Users > Add user** : créer le compte admin (email + mot de passe, « Auto confirm »).
2. Remplacer `REMPLACER_PAR_EMAIL_ADMIN` dans `supabase/schema.sql` par cet email.
3. Supabase > **SQL Editor** : exécuter `supabase/schema.sql` (supprime aussi l'ancienne table `users` et ses RPC ; script relançable).
4. Se connecter sur `/admin.html`.

Les droits sont vérifiés **côté base** (RLS + `public.is_admin()`) : la clé `anon` présente dans
`js/supabase.js` ne permet que la lecture du contenu public.

## Contenu

- **Publications** triées par année décroissante ; le nom de Wafa Malik est mis en gras dans les auteurs.
- **Collaborateurs** regroupés par pays ; le champ *Pays* alimente le globe (liste des pays reconnus dans `js/globe.js`, `COUNTRY_COORDS`). Ordre réglable depuis l'admin (↑ / ↓).
- **Médiation** : coller un lien YouTube ou Vimeo, il est converti en lecteur intégré (chargé au clic, domaine `youtube-nocookie`).
