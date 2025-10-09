// server.js - VERSION DÉFINITIVE
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialisation de l'application Express
const app = express();
const server = http.createServer(app);

// Configuration de Socket.io pour la production
const io = new Server(server, {
  cors: {
    origin: "*", // Autorise les connexions WebSocket de n'importe où
    methods: ["GET", "POST"]
  }
});

// Variables d'environnement et constantes
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-tres-longue-et-aleatoire';

// --- CONFIGURATION DES MIDDLEWARES DANS LE BON ORDRE ---

// 1. Faire confiance au proxy de Vercel (crucial pour les sessions sécurisées)
app.set('trust proxy', 1);

// 2. Servir les fichiers statiques (HTML, CSS, JS client) AVANT tout le reste
app.use(express.static(path.join(__dirname, 'public')));

// 3. Activer le parsing des requêtes JSON et URL-encoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 4. Configurer la session
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax', // Politique de cookie standard et sécurisée
        maxAge: 1000 * 60 * 60 * 24 // Session de 24 heures
    }
}));


// --- MODÈLE DE DONNÉES ET CONFIGURATIONS MÉTIER ---

// Connexion à MongoDB
mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ Connexion à MongoDB réussie'))
    .catch(err => console.error('❌ ERREUR DE CONNEXION MONGODB:', err));

// Schéma des notes
const NoteSchema = new mongoose.Schema({ /* ... votre schéma ... */ });
const Note = mongoose.model('Note', NoteSchema);

// Logins et Permissions (inchangés)
const allowedTeachers = { "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", /* ... etc ... */ };
const teacherPermissions = { "Mohamed": "admin", /* ... etc ... */ };
const subjectsByClass = { /* ... etc ... */ };
const studentsByClass = { /* ... etc ... */ };
const allClasses = Object.keys(subjectsByClass);
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

// --- ROUTES PUBLIQUES (ne nécessitent pas de connexion) ---

// Route pour la page de connexion (pour la redirection)
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route pour le processus de connexion
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username; // Création de la session
        return res.status(200).json({ message: 'Connexion réussie' });
    }
    return res.status(401).json({ message: 'Login ou mot de passe incorrect.' });
});

// Route de déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});


// --- MIDDLEWARE DE SÉCURITÉ (le "gardien") ---
// Toutes les routes définies APRÈS ce middleware seront protégées.
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); // L'utilisateur est connecté, il peut passer.
    }
    // L'utilisateur n'est pas connecté, on renvoie une erreur claire.
    return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
};

// --- ROUTES PROTÉGÉES (API) ---
// On applique le gardien à toutes les routes API.
const apiRouter = express.Router();
apiRouter.use(isAuthenticated);

// Obtenir les informations de l'utilisateur connecté
apiRouter.get('/get-user', (req, res) => {
    const username = req.session.user;
    const permissions = getUserAllowedOptions(username);
    res.json({ username, permissions, subjectsByClass });
});

// Obtenir toutes les notes autorisées
apiRouter.get('/all-notes', async (req, res) => {
    // ... votre logique existante ...
    const query = buildMongoQueryForUser(req.session.user, req.query.semester);
    const notes = await Note.find(query).lean();
    res.json(notes);
});

// ENREGISTRER UNE NOTE
apiRouter.post('/save-notes', async (req, res) => {
    const teacher = req.session.user; // Garanti d'exister grâce au middleware
    const { class: studentClass, subject, studentName, semester, ...notesData } = req.body;

    const hasPermission = checkUserPermission(teacher, studentClass, subject);
    if (!hasPermission) {
        return res.status(403).json({ message: 'Permission refusée.' });
    }

    try {
        const existingNote = await Note.findOne({ class: studentClass, subject, studentName, semester });
        if (existingNote) {
            return res.status(400).json({ message: 'Une note existe déjà pour cet élève.' });
        }
        
        const note = new Note({
            class: studentClass, subject, studentName, semester, teacher,
            ...notesData
        });
        await note.save();
        io.emit('note-added', { note: note.toObject(), semester });
        res.status(201).json({ message: 'Note enregistrée avec succès.' });
    } catch (error) {
        console.error("Erreur d'enregistrement:", error);
        res.status(500).json({ message: "Erreur du serveur lors de l'enregistrement." });
    }
});

// ... autres routes (PUT, DELETE) à placer ici ...

// On dit à l'application principale d'utiliser ce routeur protégé
app.use('/api', apiRouter);


// --- ROUTE PRINCIPALE (pour charger l'application après connexion) ---
// Cette route doit être protégée aussi.
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- FONCTIONS UTILITAIRES ---
function checkUserPermission(username, classToCheck, subjectToCheck) {
    if (teacherPermissions[username] === 'admin') return true;
    const permissions = teacherPermissions[username];
    if (!permissions) return false;
    return permissions.some(p => p.subject === subjectToCheck && p.classes.includes(classToCheck));
}
// ... autres fonctions (getUserAllowedOptions, etc.) ...


// Lancement du serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
