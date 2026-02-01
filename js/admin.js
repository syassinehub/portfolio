// ============================================
// VÉRIFICATION ADMIN
// ============================================

let currentAdminSection = 'publications';
let currentAdminUser = null;

// Vérifier si l'utilisateur est admin
function checkAdminAccess() {
    const user = getCurrentUser();
    
    if (!user || !isSessionValid()) {
        // Pas connecté ou session expirée
        alert('Vous devez être connecté pour accéder à cette page');
        window.location.href = 'index.html';
        return false;
    }
    
    if (!isAdmin(user)) {
        // Connecté mais pas admin
        alert('Accès refusé. Vous n\'avez pas les droits d\'administrateur.');
        window.location.href = 'index.html';
        return false;
    }
    
    // Tout est bon
    currentAdminUser = user;
    updateAdminHeader();
    return true;
}

// Mettre à jour le header admin avec le nom
function updateAdminHeader() {
    if (currentAdminUser) {
        const adminInfo = document.createElement('span');
        adminInfo.className = 'text-white text-sm';
        adminInfo.textContent = `${currentAdminUser.firstName} ${currentAdminUser.lastName}`;
        
        const headerDiv = document.querySelector('.bg-gray-900 .flex');
        if (headerDiv && !document.getElementById('admin-user-info')) {
            adminInfo.id = 'admin-user-info';
            headerDiv.insertBefore(adminInfo, headerDiv.querySelector('#logout-btn'));
        }
    }
}

// Déconnexion
function logout() {
    logoutUser();
    alert('Vous êtes déconnecté');
    window.location.href = 'index.html';
}

document.getElementById('logout-btn')?.addEventListener('click', function() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        logout();
    }
});

// ============================================
// NAVIGATION ADMIN
// ============================================

function showAdminSection(section) {
    // Cacher toutes les sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Afficher la section sélectionnée
    const selectedSection = document.getElementById(`admin-${section}`);
    if (selectedSection) {
        selectedSection.classList.add('active');
        currentAdminSection = section;
        
        // Mettre à jour les boutons de navigation
        document.querySelectorAll('.admin-nav-btn').forEach((btn, index) => {
            const sections = ['publications', 'collaborators', 'teaching', 'outreach'];
            if (sections[index] === section) {
                btn.classList.add('active', 'bg-green-600');
                btn.classList.remove('hover:bg-gray-700');
            } else {
                btn.classList.remove('active', 'bg-green-600');
                btn.classList.add('hover:bg-gray-700');
            }
        });
    }
}

// ============================================
// CHARGER LES DONNÉES ADMIN
// ============================================

async function loadAllAdminData() {
    await loadAdminPublications();
    await loadAdminCollaborators();
    await loadAdminTeaching();
    await loadAdminOutreach();
}

// ============================================
// PUBLICATIONS ADMIN
// ============================================

async function loadAdminPublications() {
    const container = document.getElementById('publications-admin-list');
    container.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    
    try {
        const publications = await getPublications();
        
        if (publications.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Aucune publication. Ajoutez-en une !</p>';
            return;
        }
        
        container.innerHTML = publications.map(pub => {
            // Mode édition
            if (editingItem && editingItem.id === pub.id) {
                return `
                    <div class="admin-card bg-blue-50">
                        <h4 class="text-lg font-bold mb-3">Modifier la publication</h4>
                        <input type="text" value="${pub.title}" id="edit-pub-title-${pub.id}" class="w-full p-2 border rounded mb-2" placeholder="Titre">
                        <input type="text" value="${pub.authors}" id="edit-pub-authors-${pub.id}" class="w-full p-2 border rounded mb-2" placeholder="Auteurs">
                        <input type="text" value="${pub.journal || ''}" id="edit-pub-journal-${pub.id}" class="w-full p-2 border rounded mb-2" placeholder="Journal">
                        <input type="text" value="${pub.year || ''}" id="edit-pub-year-${pub.id}" class="w-full p-2 border rounded mb-2" placeholder="Année">
                        <input type="url" value="${pub.link || ''}" id="edit-pub-link-${pub.id}" class="w-full p-2 border rounded mb-2" placeholder="Lien">
                        <input type="url" value="${pub.image || ''}" id="edit-pub-image-${pub.id}" class="w-full p-2 border rounded mb-3" placeholder="URL image">
                        <div class="flex gap-2">
                            <button onclick="savePublicationEdit(${pub.id})" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                Enregistrer
                            </button>
                            <button onclick="cancelEdit()" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                                Annuler
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Mode affichage normal
            return `
                <div class="admin-card">
                    <h3 class="text-xl font-bold text-gray-900 mb-2">${pub.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${pub.authors}</p>
                    <p class="text-green-600 text-sm mb-3">${pub.journal || ''} ${pub.year || ''}</p>
                    <div class="flex gap-2">
                        <button onclick='editPublication(${JSON.stringify(pub).replace(/'/g, "&apos;")})' class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                            <i data-lucide="edit-2" class="w-3 h-3"></i>
                            Modifier
                        </button>
                        <button onclick="deleteItem('publication', ${pub.id})" class="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 flex items-center gap-1 text-sm">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

// Éditer une publication
function editPublication(pub) {
    editingItem = pub;
    editingType = 'publication';
    loadAdminPublications();
}

// Sauvegarder l'édition
async function savePublicationEdit(id) {
    const data = {
        title: document.getElementById(`edit-pub-title-${id}`).value,
        authors: document.getElementById(`edit-pub-authors-${id}`).value,
        journal: document.getElementById(`edit-pub-journal-${id}`).value,
        year: document.getElementById(`edit-pub-year-${id}`).value,
        link: document.getElementById(`edit-pub-link-${id}`).value,
        image: document.getElementById(`edit-pub-image-${id}`).value
    };
    
    await updatePublicationData(id, data);
}

function showAddForm(type) {
    document.getElementById(`add-${type}-form`).classList.remove('hidden');
}

function hideAddForm(type) {
    document.getElementById(`add-${type}-form`).classList.add('hidden');
}

async function handleAddPublication(e) {
    e.preventDefault();
    
    const publication = {
        title: document.getElementById('pub-title').value,
        authors: document.getElementById('pub-authors').value,
        journal: document.getElementById('pub-journal').value,
        year: document.getElementById('pub-year').value,
        link: document.getElementById('pub-link').value,
        image: document.getElementById('pub-image').value
    };
    
    try {
        await addPublication(publication);
        alert('Publication ajoutée avec succès !');
        hideAddForm('publication');
        e.target.reset();
        await loadAdminPublications();
    } catch (error) {
        alert('Erreur lors de l\'ajout');
    }
}

// ============================================
// COLLABORATORS ADMIN
// ============================================

async function loadAdminCollaborators() {
    const container = document.getElementById('collaborators-admin-list');
    container.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    
    try {
        let collaborators = await getCollaborators();

        // Client-side sort: prefer explicit `position` if present, otherwise keep server order
        collaborators = collaborators.sort((a, b) => {
            const pa = (typeof a.position !== 'undefined' && a.position !== null) ? a.position : Number.MAX_SAFE_INTEGER;
            const pb = (typeof b.position !== 'undefined' && b.position !== null) ? b.position : Number.MAX_SAFE_INTEGER;
            if (pa !== pb) return pa - pb;
            // fallback to created_at desc for consistent display
            if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });
        
        if (collaborators.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Aucun collaborateur. Ajoutez-en un !</p>';
            return;
        }
        
        container.innerHTML = collaborators.map(collab => {
            // Mode édition
            if (editingItem && editingItem.id === collab.id) {
                return `
                    <div class="admin-card col-span-full bg-blue-50">
                        <h4 class="text-lg font-bold mb-3">Modifier le collaborateur</h4>
                        <input type="text" value="${collab.name}" id="edit-collab-name-${collab.id}" class="w-full p-2 border rounded mb-2" placeholder="Nom">
                        <input type="text" value="${collab.title}" id="edit-collab-title-${collab.id}" class="w-full p-2 border rounded mb-2" placeholder="Titre">
                        <input type="text" value="${collab.institution}" id="edit-collab-institution-${collab.id}" class="w-full p-2 border rounded mb-2" placeholder="Institution">
                        <input type="text" value="${collab.country}" id="edit-collab-country-${collab.id}" class="w-full p-2 border rounded mb-2" placeholder="Pays">
                        <input type="url" value="${collab.link || ''}" id="edit-collab-link-${collab.id}" class="w-full p-2 border rounded mb-2" placeholder="Lien">
                        <input type="url" value="${collab.image || ''}" id="edit-collab-image-${collab.id}" class="w-full p-2 border rounded mb-3" placeholder="URL image">
                        <div class="flex gap-2">
                            <button onclick="saveCollaboratorEdit(${collab.id})" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                Enregistrer
                            </button>
                            <button onclick="cancelEdit()" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                                Annuler
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Mode affichage normal
            return `
                <div class="admin-card">
                    ${collab.image ? `
                        <div class="mb-3 -mx-6 -mt-6">
                            <img src="${collab.image}" alt="${collab.name}" class="w-full h-32 object-cover rounded-t-xl">
                        </div>
                    ` : ''}
                    <h3 class="text-lg font-bold text-gray-900 mb-1">${collab.name}</h3>
                    <p class="text-gray-600 text-sm mb-1">${collab.title}</p>
                    <p class="text-teal-600 text-sm mb-1">${collab.institution}</p>
                    <p class="text-gray-500 text-sm mb-3">${collab.country}</p>
                    <div class="flex gap-2 items-center">
                        <button title="Monter en haut" onclick="moveCollaboratorToTop(${collab.id})" class="bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 flex items-center gap-1 text-sm">
                            <i data-lucide="chevrons-up" class="w-4 h-4"></i>
                        </button>
                        <button title="Descendre en bas" onclick="moveCollaboratorToBottom(${collab.id})" class="bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 flex items-center gap-1 text-sm">
                            <i data-lucide="chevrons-down" class="w-4 h-4"></i>
                        </button>

                        <button onclick='editCollaborator(${JSON.stringify(collab).replace(/'/g, "&apos;")})' class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                            <i data-lucide="edit-2" class="w-3 h-3"></i>
                            Modifier
                        </button>
                        <button onclick="deleteItem('collaborator', ${collab.id})" class="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 flex items-center gap-1 text-sm">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

// Éditer un collaborateur
function editCollaborator(collab) {
    editingItem = collab;
    editingType = 'collaborator';
    loadAdminCollaborators();
}

// Sauvegarder l'édition
async function saveCollaboratorEdit(id) {
    const data = {
        name: document.getElementById(`edit-collab-name-${id}`).value,
        title: document.getElementById(`edit-collab-title-${id}`).value,
        institution: document.getElementById(`edit-collab-institution-${id}`).value,
        country: document.getElementById(`edit-collab-country-${id}`).value,
        link: document.getElementById(`edit-collab-link-${id}`).value,
        image: document.getElementById(`edit-collab-image-${id}`).value
    };
    
    await updateCollaboratorData(id, data);
}

async function handleAddCollaborator(e) {
    e.preventDefault();
    
    const collaborator = {
        name: document.getElementById('collab-name').value,
        title: document.getElementById('collab-title').value,
        institution: document.getElementById('collab-institution').value,
        country: document.getElementById('collab-country').value,
        link: document.getElementById('collab-link').value,
        image: document.getElementById('collab-image').value
    };
    
    try {
        // Determine next position (append to bottom). If `position` column not present on DB,
        // addCollaborator will fail and we catch the error below and show guidance.
        try {
            const existing = await getCollaborators();
            // find max defined position
            const maxPos = existing.reduce((acc, c) => {
                const p = (typeof c.position !== 'undefined' && c.position !== null) ? Number(c.position) : acc;
                return Math.max(acc, isNaN(p) ? acc : p);
            }, 0);
            collaborator.position = maxPos + 1;
        } catch (e) {
            // if reading collaborators fails, proceed without position — DB may not have the column
        }

        await addCollaborator(collaborator);
        alert('Collaborateur ajouté avec succès !');
        hideAddForm('collaborator');
        e.target.reset();
        await loadAdminCollaborators();
    } catch (error) {
        console.error('Erreur ajout collaborateur:', error);
        alert('Erreur lors de l\'ajout. Si l\'erreur concerne le champ `position`, ajoutez une colonne entière `position` dans la table `collaborators` dans Supabase (integer).');
    }
}

// Déplacer un collaborateur en première position
async function moveCollaboratorToTop(id) {
    try {
        const collabs = await getCollaborators();
        if (!collabs || collabs.length === 0) return;

        // compute current min position (use large number when undefined)
        let minPos = Number.MAX_SAFE_INTEGER;
        collabs.forEach(c => {
            if (typeof c.position !== 'undefined' && c.position !== null) {
                const p = Number(c.position);
                if (!isNaN(p)) minPos = Math.min(minPos, p);
            }
        });

        const newPos = (minPos === Number.MAX_SAFE_INTEGER) ? 1 : (minPos - 1);

        await updateCollaborator(id, { position: newPos });
        await normalizeCollaboratorPositions();
        await loadAdminCollaborators();
    } catch (error) {
        console.error('moveCollaboratorToTop error', error);
        alert('Impossible de modifier l\'ordre. Vérifiez que la colonne `position` existe dans la table `collaborators` et que votre clé a les droits d\'écriture.');
    }
}

// Déplacer un collaborateur en dernière position
async function moveCollaboratorToBottom(id) {
    try {
        const collabs = await getCollaborators();
        if (!collabs || collabs.length === 0) return;

        // compute current max position
        let maxPos = 0;
        collabs.forEach(c => {
            if (typeof c.position !== 'undefined' && c.position !== null) {
                const p = Number(c.position);
                if (!isNaN(p)) maxPos = Math.max(maxPos, p);
            }
        });

        const newPos = (maxPos === 0) ? collabs.length + 1 : (maxPos + 1);

        await updateCollaborator(id, { position: newPos });
        await normalizeCollaboratorPositions();
        await loadAdminCollaborators();
    } catch (error) {
        console.error('moveCollaboratorToBottom error', error);
        alert('Impossible de modifier l\'ordre. Vérifiez que la colonne `position` existe dans la table `collaborators` et que votre clé a les droits d\'écriture.');
    }
}

// Normaliser les positions en séquence 1..N pour éviter des positions négatives/éparses
async function normalizeCollaboratorPositions() {
    try {
        let collabs = await getCollaborators();
        // sort by position if present else created_at desc
        collabs = collabs.sort((a, b) => {
            const pa = (typeof a.position !== 'undefined' && a.position !== null) ? a.position : Number.MAX_SAFE_INTEGER;
            const pb = (typeof b.position !== 'undefined' && b.position !== null) ? b.position : Number.MAX_SAFE_INTEGER;
            if (pa !== pb) return pa - pb;
            if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });

        // assign sequential positions starting from 1
        for (let i = 0; i < collabs.length; i++) {
            const desired = i + 1;
            const c = collabs[i];
            const current = (typeof c.position !== 'undefined' && c.position !== null) ? Number(c.position) : null;
            if (current !== desired) {
                try {
                    await updateCollaborator(c.id, { position: desired });
                } catch (e) {
                    // if update fails, warn and stop attempting further updates
                    console.error('normalize update failed for id', c.id, e);
                    throw e;
                }
            }
        }
    } catch (error) {
        console.error('normalizeCollaboratorPositions error', error);
        // don't show repeated alerts; caller handles guidance
    }
}

// ============================================
// GESTION DES IMAGES COLLABORATEURS
// ============================================

// (Code supprimé - retour à la version simple sans upload d'images)

// ============================================
// TEACHING ADMIN
// ============================================

async function loadAdminTeaching() {
    const container = document.getElementById('teaching-admin-list');
    container.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    
    try {
        const teaching = await getTeaching();
        
        if (teaching.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Aucun enseignement. Ajoutez-en un !</p>';
            return;
        }
        
        container.innerHTML = teaching.map(teach => {
            // Mode édition
            if (editingItem && editingItem.id === teach.id) {
                return `
                    <div class="admin-card col-span-full bg-blue-50">
                        <h4 class="text-lg font-bold mb-3">Modifier l'enseignement</h4>
                        <input type="text" value="${teach.title}" id="edit-teach-title-${teach.id}" class="w-full p-2 border rounded mb-2" placeholder="Titre">
                        <textarea id="edit-teach-description-${teach.id}" class="w-full p-2 border rounded mb-2 h-20" placeholder="Description">${teach.description || ''}</textarea>
                        <input type="text" value="${teach.institution}" id="edit-teach-institution-${teach.id}" class="w-full p-2 border rounded mb-2" placeholder="Institution">
                        <input type="text" value="${teach.location}" id="edit-teach-location-${teach.id}" class="w-full p-2 border rounded mb-2" placeholder="Lieu">
                        <input type="url" value="${teach.image || ''}" id="edit-teach-image-${teach.id}" class="w-full p-2 border rounded mb-3" placeholder="URL image">
                        <div class="flex gap-2">
                            <button onclick="saveTeachingEdit(${teach.id})" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                Enregistrer
                            </button>
                            <button onclick="cancelEdit()" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                                Annuler
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Mode affichage normal
            return `
                <div class="admin-card">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">${teach.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${teach.description || ''}</p>
                    <p class="text-green-600 text-sm mb-1">${teach.institution}</p>
                    <p class="text-gray-500 text-sm mb-3">${teach.location}</p>
                    <div class="flex gap-2">
                        <button onclick='editTeaching(${JSON.stringify(teach).replace(/'/g, "&apos;")})' class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                            <i data-lucide="edit-2" class="w-3 h-3"></i>
                            Modifier
                        </button>
                        <button onclick="deleteItem('teaching', ${teach.id})" class="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 flex items-center gap-1 text-sm">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

// Éditer un enseignement
function editTeaching(teach) {
    editingItem = teach;
    editingType = 'teaching';
    loadAdminTeaching();
}

// Sauvegarder l'édition
async function saveTeachingEdit(id) {
    const data = {
        title: document.getElementById(`edit-teach-title-${id}`).value,
        description: document.getElementById(`edit-teach-description-${id}`).value,
        institution: document.getElementById(`edit-teach-institution-${id}`).value,
        location: document.getElementById(`edit-teach-location-${id}`).value,
        image: document.getElementById(`edit-teach-image-${id}`).value
    };
    
    await updateTeachingData(id, data);
}

async function handleAddTeaching(e) {
    e.preventDefault();
    
    const teaching = {
        title: document.getElementById('teach-title').value,
        description: document.getElementById('teach-description').value,
        institution: document.getElementById('teach-institution').value,
        location: document.getElementById('teach-location').value,
        image: document.getElementById('teach-image').value
    };
    
    try {
        await addTeaching(teaching);
        alert('Enseignement ajouté avec succès !');
        hideAddForm('teaching');
        e.target.reset();
        await loadAdminTeaching();
    } catch (error) {
        alert('Erreur lors de l\'ajout');
    }
}

// ============================================
// OUTREACH ADMIN
// ============================================

async function loadAdminOutreach() {
    const container = document.getElementById('outreach-admin-list');
    container.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    
    try {
        const outreach = await getOutreach();
        
        if (outreach.length === 0) {
            container.innerHTML = '<p class="text-gray-500">Aucun contenu. Ajoutez-en un !</p>';
            return;
        }
        
        container.innerHTML = outreach.map(item => {
            // Mode édition
            if (editingItem && editingItem.id === item.id) {
                return `
                    <div class="admin-card bg-blue-50">
                        <h4 class="text-lg font-bold mb-3">Modifier le contenu</h4>
                        <input type="text" value="${item.title}" id="edit-out-title-${item.id}" class="w-full p-2 border rounded mb-2" placeholder="Titre">
                        <textarea id="edit-out-description-${item.id}" class="w-full p-2 border rounded mb-2 h-20" placeholder="Description">${item.description || ''}</textarea>
                        <input type="url" value="${item.link || ''}" id="edit-out-link-${item.id}" class="w-full p-2 border rounded mb-2" placeholder="Lien">
                        <input type="url" value="${item.embed_url || ''}" id="edit-out-embed-${item.id}" class="w-full p-2 border rounded mb-3" placeholder="URL embed YouTube">
                        <div class="flex gap-2">
                            <button onclick="saveOutreachEdit(${item.id})" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2">
                                <i data-lucide="save" class="w-4 h-4"></i>
                                Enregistrer
                            </button>
                            <button onclick="cancelEdit()" class="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                                Annuler
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Mode affichage normal
            return `
                <div class="admin-card">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">${item.title}</h3>
                    <p class="text-gray-600 text-sm mb-3">${item.description || ''}</p>
                    <div class="flex gap-2">
                        <button onclick='editOutreach(${JSON.stringify(item).replace(/'/g, "&apos;")})' class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                            <i data-lucide="edit-2" class="w-3 h-3"></i>
                            Modifier
                        </button>
                        <button onclick="deleteItem('outreach', ${item.id})" class="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 flex items-center gap-1 text-sm">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                            Supprimer
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        lucide.createIcons();
    } catch (error) {
        container.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

// Éditer un contenu outreach
function editOutreach(item) {
    editingItem = item;
    editingType = 'outreach';
    loadAdminOutreach();
}

// Sauvegarder l'édition
async function saveOutreachEdit(id) {
    const data = {
        title: document.getElementById(`edit-out-title-${id}`).value,
        description: document.getElementById(`edit-out-description-${id}`).value,
        link: document.getElementById(`edit-out-link-${id}`).value,
        embed_url: document.getElementById(`edit-out-embed-${id}`).value
    };
    
    await updateOutreachData(id, data);
}

async function handleAddOutreach(e) {
    e.preventDefault();
    
    const outreach = {
        title: document.getElementById('out-title').value,
        description: document.getElementById('out-description').value,
        link: document.getElementById('out-link').value,
        embed_url: document.getElementById('out-embed').value
    };
    
    try {
        await addOutreach(outreach);
        alert('Contenu ajouté avec succès !');
        hideAddForm('outreach');
        e.target.reset();
        await loadAdminOutreach();
    } catch (error) {
        alert('Erreur lors de l\'ajout');
    }
}

// ============================================
// MODIFICATION DES ÉLÉMENTS
// ============================================

// Variables globales pour l'édition
let editingItem = null;
let editingType = null;

// Afficher le formulaire d'édition
function showEditForm(type, item) {
    editingItem = item;
    editingType = type;
    
    // Masquer l'affichage normal et afficher le formulaire
    const container = document.getElementById(`${type}s-admin-list`);
    loadAdminData(type);
}

// Annuler l'édition
function cancelEdit() {
    editingItem = null;
    editingType = null;
    loadAllAdminData();
}

// Mettre à jour une publication
async function updatePublicationData(id, data) {
    try {
        await updatePublication(id, data);
        alert('Publication modifiée avec succès !');
        editingItem = null;
        await loadAdminPublications();
    } catch (error) {
        alert('Erreur lors de la modification');
    }
}

// Mettre à jour un collaborateur
async function updateCollaboratorData(id, data) {
    try {
        await updateCollaborator(id, data);
        alert('Collaborateur modifié avec succès !');
        editingItem = null;
        await loadAdminCollaborators();
    } catch (error) {
        alert('Erreur lors de la modification');
    }
}

// Mettre à jour un enseignement
async function updateTeachingData(id, data) {
    try {
        await updateTeaching(id, data);
        alert('Enseignement modifié avec succès !');
        editingItem = null;
        await loadAdminTeaching();
    } catch (error) {
        alert('Erreur lors de la modification');
    }
}

// Mettre à jour un contenu outreach
async function updateOutreachData(id, data) {
    try {
        await updateOutreach(id, data);
        alert('Contenu modifié avec succès !');
        editingItem = null;
        await loadAdminOutreach();
    } catch (error) {
        alert('Erreur lors de la modification');
    }
}

// ============================================
// SUPPRESSION
// ============================================

async function deleteItem(type, id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        return;
    }
    
    try {
        switch(type) {
            case 'publication':
                await deletePublication(id);
                await loadAdminPublications();
                break;
            case 'collaborator':
                await deleteCollaborator(id);
                await loadAdminCollaborators();
                break;
            case 'teaching':
                await deleteTeaching(id);
                await loadAdminTeaching();
                break;
            case 'outreach':
                await deleteOutreach(id);
                await loadAdminOutreach();
                break;
        }
        alert('Élément supprimé avec succès !');
    } catch (error) {
        alert('Erreur lors de la suppression');
    }
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'accès admin
    if (!checkAdminAccess()) {
        return;
    }
    
    // Charger les données
    showAdminSection('publications');
    loadAllAdminData();
    
    // Initialiser les icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});