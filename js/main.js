// ============================================
// AUTHENTIFICATION
// ============================================

// Vérifier l'état de connexion au chargement
function checkAuthStatus() {
    const user = getCurrentUser();
    if (user && isSessionValid()) {
        updateUIForLoggedInUser(user);
        
        // Rediriger vers admin si c'est un admin
        if (isAdmin(user) && window.location.pathname.includes('admin.html')) {
            // Déjà sur la page admin
        }
    } else {
        updateUIForLoggedOutUser();
        logoutUser();
    }
}

// Comments feature removed — page and handlers cleaned up to start from zero.

// Ensure OAuth user exists in DB: call registerUser RPC (create_user)
async function ensureOAuthUserRegistered(user) {
    if (!user || !user.email) return;

    // Build sensible defaults if names missing
    const firstName = user.firstName || (user.email ? user.email.split('@')[0] : '');
    const lastName = user.lastName || '';

    // Generate a random password (placeholder for OAuth-created users)
    const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);

    try {
        const result = await registerUser(firstName, lastName, user.email, randomPassword);
        if (result && result.success) {
            console.log('Utilisateur OAuth enregistré dans la base (RPC create_user).');
        } else {
            // If RPC indicates user already exists or other message, log but don't block
            console.log('registerUser response:', result);
        }
    } catch (error) {
        // If user already exists or other DB error, ignore gracefully
        console.warn('Erreur registerUser (peut-être utilisateur existant) :', error?.message || error);
    }
}

// Mettre à jour l'UI pour utilisateur connecté
function updateUIForLoggedInUser(user) {
    // Desktop
    document.getElementById('user-not-logged').classList.add('hidden');
    document.getElementById('user-logged').classList.remove('hidden');
    document.getElementById('user-name-display').textContent = `${user.firstName} ${user.lastName}`;
    
    // Mobile
    document.getElementById('user-not-logged-mobile').classList.add('hidden');
    document.getElementById('user-logged-mobile').classList.remove('hidden');
    document.getElementById('user-name-display-mobile').textContent = `${user.firstName} ${user.lastName}`;
    
    // Afficher lien admin si c'est un admin
    if (isAdmin(user)) {
        showAdminLink();
    }
}

// Mettre à jour l'UI pour utilisateur déconnecté
function updateUIForLoggedOutUser() {
    // Desktop
    document.getElementById('user-not-logged').classList.remove('hidden');
    document.getElementById('user-logged').classList.add('hidden');
    
    // Mobile
    document.getElementById('user-not-logged-mobile').classList.remove('hidden');
    document.getElementById('user-logged-mobile').classList.add('hidden');
    
    hideAdminLink();
}

// Afficher le lien admin
function showAdminLink() {
    const userLogged = document.getElementById('user-logged');
    if (!document.getElementById('admin-link')) {
        const adminBtn = document.createElement('a');
        adminBtn.id = 'admin-link';
        adminBtn.href = 'admin.html';
        adminBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition';
        adminBtn.textContent = 'Admin';
        userLogged.insertBefore(adminBtn, userLogged.firstChild);
    }
}

// Cacher le lien admin
function hideAdminLink() {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.remove();
    }
}

// Afficher le modal de connexion
function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => lucide.createIcons(), 100);
}

// Fermer le modal de connexion
function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Afficher le modal d'inscription
function showRegisterModal() {
    document.getElementById('register-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => lucide.createIcons(), 100);
}

// Fermer le modal d'inscription
function closeRegisterModal() {
    document.getElementById('register-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Basculer vers l'inscription
function switchToRegister() {
    closeLoginModal();
    showRegisterModal();
}

// Basculer vers la connexion
function switchToLogin() {
    closeRegisterModal();
    showLoginModal();
}

// Gérer la connexion
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connexion...';
    
    try {
        const result = await loginUser(email, password);
        
        if (result.success) {
            saveCurrentUser(result.user);
            updateUIForLoggedInUser(result.user);
            closeLoginModal();
            e.target.reset();
            alert('Connexion réussie !');
            
            // Rediriger vers admin si c'est un admin
            if (isAdmin(result.user)) {
                const goToAdmin = confirm('Voulez-vous accéder au panel d\'administration ?');
                if (goToAdmin) {
                    window.location.href = 'admin.html';
                }
            }
        } else {
            alert(result.error || 'Erreur de connexion');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Se connecter';
    }
}

// Gérer l'inscription
async function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('register-firstname').value;
    const lastName = document.getElementById('register-lastname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Création du compte...';
    
    try {
        const result = await registerUser(firstName, lastName, email, password);
        
        if (result.success) {
            alert('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
            closeRegisterModal();
            showLoginModal();
            e.target.reset();
            
            // Pré-remplir l'email de connexion
            document.getElementById('login-email').value = email;
        } else {
            alert(result.error || 'Erreur lors de la création du compte');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création du compte');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Créer mon compte';
    }
}

// Gérer la déconnexion
function handleLogout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        logoutUser();
        updateUIForLoggedOutUser();
        alert('Vous êtes déconnecté');
        
        // Rediriger si sur page admin
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        }
    }
}

// OAuth handlers removed (Google sign-in disabled)

let currentPage = 'home';

// Afficher une page
function showPage(pageName) {
    // Cacher toutes les pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    
    // Afficher la page sélectionnée
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
        currentPage = pageName;
        
        // Mettre à jour la navigation
        updateNavigation();
        
        // Fermer le menu mobile
        document.getElementById('mobile-menu').classList.add('hidden');
        
        // Charger les données si nécessaire
        loadPageData(pageName);

        // If collaborators page shown, initialize globe (deferred init to ensure container is visible)
        if (pageName === 'collaborators') {
            // small timeout ensures CSS display change has taken effect
            setTimeout(() => {
                try { if (window.initGlobe) window.initGlobe(); } catch (e) { console.error('initGlobe error', e); }
            }, 60);
        }

        // comments page removed — no-op
    }
}

// Mettre à jour l'apparence de la navigation
function updateNavigation() {
    // Desktop navigation
    document.querySelectorAll('.nav-link').forEach((link, index) => {
        const pages = ['home', 'publications', 'collaborators', 'teaching', 'outreach'];
        if (pages[index] === currentPage) {
            link.classList.add('active', 'bg-green-600', 'text-white');
            link.classList.remove('text-gray-700', 'hover:bg-green-50');
        } else {
            link.classList.remove('active', 'bg-green-600', 'text-white');
            link.classList.add('text-gray-700', 'hover:bg-green-50');
        }
    });
    
    // Mobile navigation
    document.querySelectorAll('.mobile-nav-link').forEach((link, index) => {
        const pages = ['home', 'publications', 'collaborators', 'teaching', 'outreach'];
        if (pages[index] === currentPage) {
            link.classList.add('active', 'bg-green-600', 'text-white');
            link.classList.remove('text-gray-700', 'hover:bg-green-50');
        } else {
            link.classList.remove('active', 'bg-green-600', 'text-white');
            link.classList.add('text-gray-700', 'hover:bg-green-50');
        }
    });
}

// Menu mobile toggle
document.getElementById('mobile-menu-btn')?.addEventListener('click', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

// Charger les données d'une page
async function loadPageData(pageName) {
    switch(pageName) {
        case 'publications':
            await loadPublications();
            break;
        case 'collaborators':
            await loadCollaborators();
            break;
        case 'teaching':
            await loadTeaching();
            break;
        case 'outreach':
            await loadOutreach();
            break;
    }
}

// ============================================
// PUBLICATIONS
// ============================================

async function loadPublications() {
    const container = document.getElementById('publications-list');
    container.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const publications = await getPublications();
        
        if (publications.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Aucune publication pour le moment.</p>';
            return;
        }
        
        container.innerHTML = publications.map(pub => `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1 card">
                <div class="md:flex">
                    ${pub.image ? `
                        <div class="md:w-1/3 bg-gray-100">
                            <img src="${pub.image}" alt="${pub.title}" class="w-full h-full object-cover">
                        </div>
                    ` : ''}
                    <div class="p-6 ${pub.image ? 'md:w-2/3' : 'w-full'}">
                        <h3 class="text-2xl font-bold text-gray-900 mb-3">${pub.title}</h3>
                        <p class="text-gray-600 mb-2">${pub.authors}</p>
                        ${pub.journal ? `<p class="text-green-600 font-semibold mb-2">${pub.journal}${pub.year ? ` (${pub.year})` : ''}</p>` : ''}
                        ${pub.link ? `
                            <a href="${pub.link}" target="_blank" rel="noopener noreferrer" 
                               class="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                Lire l'article
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-red-500">Erreur lors du chargement des publications.</p>';
        console.error(error);
    }
}

// ============================================
// COLLABORATORS
// ============================================



async function loadCollaborators() {
    const container = document.getElementById('collaborators-list');
    container.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        let collaborators = await getCollaborators();

        // Client-side sort: prefer explicit `position` if present
        collaborators = collaborators.sort((a, b) => {
            const pa = (typeof a.position !== 'undefined' && a.position !== null) ? a.position : Number.MAX_SAFE_INTEGER;
            const pb = (typeof b.position !== 'undefined' && b.position !== null) ? b.position : Number.MAX_SAFE_INTEGER;
            if (pa !== pb) return pa - pb;
            if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });
        
        if (collaborators.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Aucun collaborateur pour le moment.</p>';
            return;
        }
        
        // Render compact horizontal ID-card style collaborator cards
        container.innerHTML = collaborators.map(collab => `
            <div class="collaborator-card">
                ${collab.image ? `
                    <div class="collaborator-photo">
                        <img src="${collab.image}" alt="${collab.name}">
                    </div>
                ` : `
                    <div class="collaborator-photo image-placeholder">
                        ${collab.name ? `<span>${collab.name.split(' ').map(n=>n[0]).join('')}</span>` : ''}
                    </div>
                `}

                <div class="collaborator-content">
                    <div class="collab-bar"></div>
                    <h3 class="collab-name">${collab.name}</h3>
                    <p class="collab-title">${collab.title || ''}</p>
                    <p class="collab-institution">${collab.institution || ''}</p>
                    <p class="collab-country">${collab.country || ''}</p>
                    ${collab.link ? `
                        <a href="${collab.link}" target="_blank" rel="noopener noreferrer" class="collab-link">Profil</a>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-red-500">Erreur lors du chargement des collaborateurs.</p>';
        console.error(error);
    }
}

// ============================================
// TEACHING
// ============================================

async function loadTeaching() {
    const container = document.getElementById('teaching-list');
    container.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const teaching = await getTeaching();
        
        if (teaching.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Aucun enseignement pour le moment.</p>';
            return;
        }
        
        container.innerHTML = teaching.map(teach => `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-2 card">
                ${teach.image ? `
                    <div class="h-48 bg-gray-100">
                        <img src="${teach.image}" alt="${teach.title}" class="w-full h-full object-cover">
                    </div>
                ` : ''}
                <div class="p-6">
                    <h3 class="text-2xl font-bold text-gray-900 mb-3">${teach.title}</h3>
                    ${teach.description ? `<p class="text-gray-600 mb-3">${teach.description}</p>` : ''}
                    <div class="border-t pt-3 mt-3">
                        <p class="text-green-600 font-semibold">${teach.institution}</p>
                        <p class="text-gray-500 text-sm">${teach.location}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-red-500">Erreur lors du chargement des enseignements.</p>';
        console.error(error);
    }
}

// ============================================
// OUTREACH
// ============================================

async function loadOutreach() {
    const container = document.getElementById('outreach-list');
    container.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const outreach = await getOutreach();
        
        if (outreach.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Aucun contenu pour le moment.</p>';
            return;
        }
        
        container.innerHTML = outreach.map(item => `
            <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all card">
                <h3 class="text-2xl font-bold text-gray-900 mb-3">${item.title}</h3>
                ${item.description ? `<p class="text-gray-600 mb-4">${item.description}</p>` : ''}
                ${item.embed_url ? `
                    <div class="aspect-video mb-4 bg-gray-100 rounded-lg overflow-hidden">
                        <iframe 
                            src="${item.embed_url}" 
                            class="w-full h-full" 
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            referrerpolicy="strict-origin-when-cross-origin"
                            allowfullscreen
                        ></iframe>
                    </div>
                ` : ''}
                ${item.link ? `
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer" 
                       class="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
                        En savoir plus
                    </a>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="text-center text-red-500">Erreur lors du chargement des contenus.</p>';
        console.error(error);
    }
}

// ============================================
// INITIALISATION
// ============================================

// Charger la page d'accueil au démarrage
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    showPage('home');
    
    // Initialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // --- Supabase OAuth handling: check current session and listen for changes ---
    if (typeof supabaseClient !== 'undefined' && supabaseClient && supabaseClient.auth) {
        // check existing session (useful after redirect from OAuth)
        (async () => {
            try {
                const res = await supabaseClient.auth.getSession();
                const session = res?.data?.session;
                if (session && session.user) {
                    const u = session.user;
                    const userObj = {
                        id: u.id,
                        firstName: (u.user_metadata && (u.user_metadata.given_name || (u.user_metadata.name ? u.user_metadata.name.split(' ')[0] : ''))) || '',
                        lastName: (u.user_metadata && (u.user_metadata.family_name || '')) || '',
                        email: u.email || '',
                        role: 'user'
                    };
                    saveCurrentUser(userObj);
                    updateUIForLoggedInUser(userObj);
                }
            } catch (e) {
                console.error('Erreur récupération session Supabase :', e);
            }
        })();

        // Listen to auth state changes (SIGN_IN / SIGN_OUT)
        const { data: listener } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && session.user) {
                const u = session.user;
                const userObj = {
                    id: u.id,
                    firstName: (u.user_metadata && (u.user_metadata.given_name || (u.user_metadata.name ? u.user_metadata.name.split(' ')[0] : ''))) || '',
                    lastName: (u.user_metadata && (u.user_metadata.family_name || '')) || '',
                    email: u.email || '',
                    role: 'user'
                };
                saveCurrentUser(userObj);
                updateUIForLoggedInUser(userObj);
                closeLoginModal();
                closeRegisterModal();
                // comments feature removed; nothing to initialize here
            }

            if (event === 'SIGNED_OUT') {
                logoutUser();
                updateUIForLoggedOutUser();
                // comments feature removed; nothing to initialize here
            }
        });

        // unsubscribe on unload to avoid leaks
        window.addEventListener('beforeunload', () => {
            try { listener?.subscription?.unsubscribe(); } catch (e) {}
        });
    }

    // If redirected back with an OAuth error, show a helpful message and clean URL
    (function handleOAuthRedirectErrors() {
        try {
            const params = new URLSearchParams(window.location.search);
            const err = params.get('error') || params.get('error_code') || params.get('msg');
            const desc = params.get('error_description') || params.get('message') || params.get('error_message');
            if (err) {
                const serverMsg = desc || err;
                console.warn('Auth redirect error:', serverMsg);
                alert('Erreur d\'authentification : ' + serverMsg);
                // Remove query params so the message doesn't reappear on reload
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        } catch (e) {
            // ignore
        }
    })();
    
    // Fermer les modals en cliquant en dehors
    document.getElementById('login-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeLoginModal();
    });
    
    document.getElementById('register-modal')?.addEventListener('click', function(e) {
        if (e.target === this) closeRegisterModal();
    });
});

// Recharger les icônes après chaque changement de page
const originalShowPage = showPage;
showPage = function(pageName) {
    originalShowPage(pageName);
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
};