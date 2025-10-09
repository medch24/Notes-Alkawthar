// server.js - VERSION DÉFINITIVE ET STABLE
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialisation de l'application
const app = express();
const server = http.createServer(app);

// Configuration de Socket.io pour la production sur Vercel
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Constantes et variables d'environnement
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-tres-longue-et-aleatoire';

// --- CONFIGURATION DES MIDDLEWARES (dans le bon ordre) ---

// 1. Faire confiance au proxy de Vercel (crucial pour les sessions)
app.set('trust proxy', 1);

// 2. Servir les fichiers statiques (HTML, CSS, JS du client)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Parser les requêtes JSON et URL-encoded
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
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // Session de 24 heures
    }
}));

// Connexion à MongoDB
mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ Connexion à MongoDB réussie'))
    .catch(err => console.error('❌ ERREUR DE CONNEXION MONGODB:', err));

// Schéma Mongoose
const NoteSchema = new mongoose.Schema({
    class: String, subject: String, studentName: String,
    semester: { type: String, required: true, enum: ['S1', 'S2'] },
    travauxClasse: { type: Number, default: null },
    devoirs: { type: Number, default: null },
    evaluation: { type: Number, default: null },
    examen: { type: Number, default: null },
    teacher: { type: String }
});
const Note = mongoose.model('Note', NoteSchema);

// Logins, Permissions, et listes d'élèves
const allowedTeachers = { "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", "Abas": "Abas", "Sylvano": "Sylvano", "Zine": "Zine", "Morched": "Morched", "Tonga": "Tonga", "Kamel": "Kamel" };
const teacherPermissions = { "Mohamed": "admin", MohamedAli: [ { subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] } ], Abas: [ { subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] } ], Sylvano: [ { subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] } ], Zine: [ { subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] } ], Morched: [ { subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] } ], Tonga: [ { subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] } ], Kamel: [ { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] } ] };
const subjectsByClass = { PEI1: ['P.E', 'I.S', 'Maths', 'Sciences', 'Design', 'Anglais'], PEI2: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI3: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI4: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], DP1: ['L.L'], DP2: ['P.E', 'Maths', 'I.S', 'Biologie', 'E.S', 'Physique-Chimie', 'Anglais'] };
const allClasses = Object.keys(subjectsByClass);
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

// --- ROUTES PUBLIQUES (accessibles sans être connecté) ---

// Le serveur envoie la page de connexion
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Le client envoie les identifiants pour se connecter
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username; // La session est créée ici
        res.status(200).json({ message: 'Connexion réussie' });
    } else {
        res.status(401).json({ message: 'Login ou mot de passe incorrect.' });
    }
});

// Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login'); // Redirige vers la page de connexion
    });
});

// --- MIDDLEWARE DE SÉCURITÉ (le "gardien") ---
// Toutes les routes définies APRÈS ce middleware seront protégées.
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next(); // L'utilisateur est connecté, il peut continuer.
    }
    // Si l'utilisateur n'est pas connecté, on le renvoie vers la page de connexion
    res.redirect('/login');
};

// --- ROUTES PROTÉGÉES ---

// Route pour la page principale de l'application
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Création d'un routeur dédié pour l'API
const apiRouter = express.Router();
apiRouter.use(isAuthenticated); // Le gardien protège toutes les routes de l'API

// Obtenir les infos de l'utilisateur
apiRouter.get('/get-user', (req, res) => {
    const username = req.session.user;
    const permissions = getUserAllowedOptions(username);
    res.json({ username, permissions, subjectsByClass });
});

// Obtenir les notes
apiRouter.get('/all-notes', async (req, res) => {
    try {
        const query = buildMongoQueryForUser(req.session.user, req.query.semester);
        const notes = await Note.find(query).lean();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des notes." });
    }
});

// ENREGISTRER UNE NOTE
apiRouter.post('/save-notes', async (req, res) => {
    const teacher = req.session.user;
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
        const note = new Note({ class: studentClass, subject, studentName, semester, teacher, ...notesData });
        await note.save();
        io.emit('note-added', { note: note.toObject(), semester });
        res.status(201).json({ message: 'Note enregistrée avec succès.' });
    } catch (error) {
        res.status(500).json({ message: "Erreur du serveur lors de l'enregistrement." });
    }
});

// On dit à l'application d'utiliser ce routeur pour toutes les routes commençant par /api
app.use('/api', apiRouter);

// --- FONCTIONS UTILITAIRES ---
function checkUserPermission(username, classToCheck, subjectToCheck) {
    if (teacherPermissions[username] === 'admin') return true;
    const permissions = teacherPermissions[username];
    if (!permissions) return false;
    return permissions.some(p => p.subject === subjectToCheck && p.classes.includes(classToCheck));
}
function getUserAllowedOptions(username) {
    const permissions = teacherPermissions[username];
    if (permissions === 'admin') return { classes: [...allClasses], subjects: [...allSubjects] };
    if (!permissions) return { classes: [], subjects: [] };
    const allowedClasses = new Set();
    const allowedSubjects = new Set();
    permissions.forEach(p => { allowedSubjects.add(p.subject); p.classes.forEach(c => allowedClasses.add(c)); });
    return { classes: Array.from(allowedClasses).sort(), subjects: Array.from(allowedSubjects).sort() };
}
function buildMongoQueryForUser(username, semester) {
    const baseQuery = { semester };
    const permissions = teacherPermissions[username];
    if (!permissions || permissions === 'admin') return baseQuery;
    const orConditions = permissions.flatMap(p => p.classes.map(c => ({ class: c, subject: p.subject })));
    if (orConditions.length === 0) return { _id: null };
    return { ...baseQuery, $or: orConditions };
}

// Lancement du serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
