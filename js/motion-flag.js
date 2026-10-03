// Chargé dans <head>, avant le rendu : active les animations (sauf si l'utilisateur
// les réduit) et prépare le rideau de transition si l'on arrive depuis une autre page.
(function () {
    var root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('motion');
    try {
        if (sessionStorage.getItem('wm-curtain')) {
            sessionStorage.removeItem('wm-curtain');
            root.classList.add('curtain-in');
        }
    } catch (e) { /* stockage indisponible : pas de rideau */ }
    // Filet de sécurité : si les animations ne démarrent pas, on rend la page visible
    setTimeout(function () {
        if (!window.__motion) root.classList.remove('motion', 'curtain-in');
    }, 4000);
})();
