// ============================================
// CONFIGURATION SUPABASE
// ============================================

// ⚠️ REMPLACEZ CES VALEURS PAR VOS PROPRES CLÉS SUPABASE
const SUPABASE_URL = 'https://vdcpnozdfsmdyiyepnmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkY3Bub3pkZnNtZHlpeWVwbm11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjA1MzYsImV4cCI6MjA3OTEzNjUzNn0.aieffsexNXqjktfzcgG-MlYbI6bM11Hrl88eK0lACU0';

// Create a named client to avoid clashing with the global `supabase` object
const supabaseClient = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : (window.supabaseClient || null);

// Expose the client on window so other scripts can access it as `supabaseClient`
window.supabaseClient = supabaseClient;

// ============================================
// FONCTIONS API
// ============================================

// Récupérer toutes les publications
async function getPublications() {
    try {
        const { data, error } = await supabaseClient
            .from('publications')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des publications:', error);
        return [];
    }
}

// Ajouter une publication
async function addPublication(publication) {
    try {
        const { data, error } = await supabaseClient
            .from('publications')
            .insert([publication])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la publication:', error);
        throw error;
    }
}

// Modifier une publication
async function updatePublication(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('publications')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        throw error;
    }
}

// Supprimer une publication
async function deletePublication(id) {
    try {
        const { error } = await supabaseClient
            .from('publications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        throw error;
    }
}

// ============================================
// COLLABORATORS
// ============================================

async function getCollaborators() {
    try {
        const { data, error } = await supabaseClient
            .from('collaborators')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function addCollaborator(collaborator) {
    try {
        const { data, error } = await supabaseClient
            .from('collaborators')
            .insert([collaborator])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function updateCollaborator(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('collaborators')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function deleteCollaborator(id) {
    try {
        const { error } = await supabaseClient
            .from('collaborators')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

// ============================================
// TEACHING
// ============================================

async function getTeaching() {
    try {
        const { data, error } = await supabaseClient
            .from('teaching')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function addTeaching(teaching) {
    try {
        const { data, error } = await supabaseClient
            .from('teaching')
            .insert([teaching])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function updateTeaching(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('teaching')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function deleteTeaching(id) {
    try {
        const { error } = await supabaseClient
            .from('teaching')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

// ============================================
// OUTREACH
// ============================================

async function getOutreach() {
    try {
        const { data, error } = await supabaseClient
            .from('outreach')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function addOutreach(outreach) {
    try {
        const { data, error } = await supabaseClient
            .from('outreach')
            .insert([outreach])
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function updateOutreach(id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from('outreach')
            .update(updates)
            .eq('id', id)
            .select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

async function deleteOutreach(id) {
    try {
        const { error } = await supabaseClient
            .from('outreach')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erreur:', error);
        throw error;
    }
}

// ============================================
// AUTHENTIFICATION UTILISATEURS SÉCURISÉE
// ============================================

// Inscription d'un nouvel utilisateur avec cryptage
async function registerUser(firstName, lastName, email, password) {
    try {
        const { data, error } = await supabaseClient
            .rpc('create_user', {
                p_first_name: firstName,
                p_last_name: lastName,
                p_email: email,
                p_password: password,
                p_role: 'user'
            });
        
        if (error) throw error;
        
        // La fonction retourne un tableau
        if (data && data.length > 0) {
            const result = data[0];
            if (result.success) {
                return { 
                    success: true, 
                    userId: result.user_id,
                    message: result.message
                };
            } else {
                return { 
                    success: false, 
                    error: result.message 
                };
            }
        }
        
        return { success: false, error: 'Erreur lors de la création du compte' };
    } catch (error) {
        console.error('Erreur inscription:', error);
        return { success: false, error: error.message };
    }
}

// Connexion d'un utilisateur avec vérification cryptée
async function loginUser(email, password) {
    try {
        const { data, error } = await supabaseClient
            .rpc('verify_login', {
                p_email: email,
                p_password: password
            });
        
        if (error) throw error;
        
        // La fonction retourne un tableau
        if (data && data.length > 0) {
            const result = data[0];
            if (result.success) {
                return { 
                    success: true, 
                    user: {
                        id: result.user_id,
                        firstName: result.first_name,
                        lastName: result.last_name,
                        email: result.email,
                        role: result.role
                    }
                };
            } else {
                return { 
                    success: false, 
                    error: result.message 
                };
            }
        }
        
        return { success: false, error: 'Erreur de connexion' };
    } catch (error) {
        console.error('Erreur connexion:', error);
        return { success: false, error: error.message };
    }
}

// Vérifier si l'utilisateur est admin
function isAdmin(user) {
    return user && user.role === 'admin';
}

// Obtenir l'utilisateur connecté depuis le localStorage
function getCurrentUser() {
    const userData = localStorage.getItem('current_user');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

// Sauvegarder l'utilisateur connecté
function saveCurrentUser(user) {
    localStorage.setItem('current_user', JSON.stringify(user));
    localStorage.setItem('auth_time', Date.now().toString());
}

// Déconnecter l'utilisateur
function logoutUser() {
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_time');
}

// Vérifier si la session est valide (24h)
function isSessionValid() {
    const authTime = localStorage.getItem('auth_time');
    if (!authTime) return false;
    
    const elapsed = Date.now() - parseInt(authTime);
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    return elapsed < twentyFourHours;
}

// Comments removed per user request.