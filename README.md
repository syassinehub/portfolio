# Portfolio — Dr. Wafa Malik

Site statique (HTML/CSS/JS, aucun build) + contenu dynamique stocké dans Supabase.

```
index.html          accueil (présentation, recherche, accès aux sections) — site public en anglais
publications.html   publications (recherche plein texte)
collaborators.html  globe interactif + liste filtrable (recherche, pays, lieu)
teaching.html       enseignement & formation
outreach.html       médiation scientifique (vidéos, podcasts)
admin.html          administration du contenu
css/style.css       design system + site public
css/admin.css       styles de l'administration
js/supabase.js      client Supabase, accès aux données, helpers de sécurité (esc, safeUrl, toEmbedUrl)
js/main.js          rendu du site public (une fonction par page, via <body data-page>)
js/globe.js         globe des collaborations (globe.gl chargé à la demande)
js/nature.js        fond animé : écoulement d'eau/azote dans un bassin versant (canvas, bruit de Perlin)
js/landscape.js     paysage génératif : collines, arbres fractals et herbe dans le vent, feuilles portées
js/motion.js        animations GSAP + ScrollTrigger + SplitText, défilement Lenis, rideau de transition
js/motion-flag.js   active les animations (sauf « réduire les animations ») avant le rendu
js/vendor/          GSAP 3.15 et Lenis 1.3 (copies locales, voir README.txt)
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
- **Collaborateurs** affichés dans l'ordre réglé depuis l'admin (↑ / ↓), filtrables par recherche, pays ou lieu.
  Position sur le globe : champs *Latitude/Longitude* si remplis, sinon institution connue
  (`INSTITUTION_COORDS` dans `js/globe.js`), sinon centre du pays (`COUNTRY_COORDS`).
  Les points proches sont regroupés ; un clic sur un point affiche les collaborateurs du lieu.
- **Médiation** : coller un lien YouTube ou Vimeo, il est converti en lecteur intégré (chargé au clic, domaine `youtube-nocookie`).
