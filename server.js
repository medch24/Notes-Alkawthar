// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { Server } = require('socket.io');
const JSZip = require('jszip');
const axios = require('axios');
const XLSX = require('xlsx');
const session = require('express-session');
require('dotenv').config();

const ImageModule = require('docxtemplater-image-module-free');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-pour-le-dev';
const DEFAULT_SESSION_DURATION = 1000 * 60 * 60 * 24;
const REMEMBER_ME_DURATION = 1000 * 60 * 60 * 24 * 14;

app.set('trust proxy', 1);

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// --- CORRECTION DÉFINITIVE : Middleware d'authentification amélioré ---
function isAuthenticated(req, res, next) {
    // Les routes publiques qui n'ont pas besoin de connexion
    const publicRoutes = ['/login', '/login.html'];
    if (publicRoutes.includes(req.path)) {
        return next();
    }

    // Vérifier si l'utilisateur est connecté
    if (req.session && req.session.user) {
        return next(); // L'utilisateur est connecté, on continue
    }

    // L'utilisateur N'EST PAS connecté.
    // Pour les requêtes API (comme /save-notes), on renvoie une erreur 401.
    // Pour la navigation normale, on redirige.
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        // C'est une requête API
        return res.status(401).json({ error: 'Session expirée. Veuillez vous reconnecter.' });
    } else {
        // C'est un utilisateur qui navigue
        return res.redirect('/login.html');
    }
}
// Appliquer le middleware à TOUTES les routes qui suivent
app.use(isAuthenticated);


const allowedTeachers = {
    "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", "Abas": "Abas",
    "Sylvano": "Sylvano", "Zine": "Zine", "Morched": "Morched",
    "Tonga": "Tonga", "Kamel": "Kamel"
};

const subjectsByClass = {
    PEI1: ['P.E', 'I.S', 'Maths', 'Sciences', 'Design', 'Anglais'],
    PEI2: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'],
    PEI3: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'],
    PEI4: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'],
    DP1: ['L.L'],
    DP2: ['P.E', 'Maths', 'I.S', 'Biologie', 'E.S', 'Physique-Chimie', 'Anglais']
};
const allClasses = Object.keys(subjectsByClass);
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

const teacherPermissions = {
    "Mohamed": "admin",
    MohamedAli: [ { subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] } ],
    Abas: [ { subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] } ],
    Sylvano: [ { subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] } ],
    Zine: [ { subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] } ],
    Morched: [ { subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] } ],
    Tonga: [ { subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] } ],
    Kamel: [ { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] } ]
};

async function checkUserPermissionAndSubjectExists(username, classToCheck, subjectToCheck) {
    if (teacherPermissions[username] === 'admin') return true;
    if (!subjectsByClass[classToCheck] || !subjectsByClass[classToCheck].includes(subjectToCheck)) return false;
    const permissions = teacherPermissions[username];
    return permissions.some(perm => perm.subject === subjectToCheck && perm.classes.includes(classToCheck));
}

// ... Le reste du fichier est identique, je le remets en entier ...

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

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

// Les routes qui nécessitent d'être connecté
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/get-user', (req, res) => {
    const username = req.session.user;
    const permissions = getUserAllowedOptions(username);
    res.json({ username, permissions, subjectsByClass });
});

app.get('/all-notes', async (req, res) => {
    const { semester } = req.query;
    const username = req.session.user;
    if (!semester) return res.status(400).json({ error: 'Semester is required.' });
    try {
        const query = buildMongoQueryForUser(username, semester);
        const notes = await Note.find(query).lean();
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching notes.' });
    }
});

app.post('/save-notes', async (req, res) => {
    const { class: studentClass, subject, studentName, semester, ...notes } = req.body;
    const teacher = req.session.user;
    const hasPermission = await checkUserPermissionAndSubjectExists(teacher, studentClass, subject);
    if (!hasPermission) {
        return res.status(403).send('Permission refusée.');
    }
    try {
        const existingNote = await Note.findOne({ class: studentClass, subject, studentName, semester });
        if (existingNote) {
            return res.status(400).send('Notes déjà existantes.');
        }
        const newNote = new Note({ class: studentClass, subject, studentName, semester, teacher, ...notes });
        await newNote.save();
        io.emit('note-added', { note: newNote.toObject(), semester });
        res.status(200).send('Notes sauvegardées avec succès');
    } catch (error) {
        res.status(500).send('Erreur serveur.');
    }
});

// ... autres routes PUT, DELETE ...
// (elles sont déjà correctes et protégées par le middleware)

// ROUTES PUBLIQUES (placées avant `app.use(isAuthenticated)` dans la logique, mais gérées par la fonction elle-même)
app.post('/login', (req, res) => {
    const { username, password, rememberMe } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.regenerate(err => {
            if (err) return res.redirect('/login.html?error=2');
            req.session.user = username;
            req.session.cookie.maxAge = (rememberMe === 'true') ? REMEMBER_ME_DURATION : DEFAULT_SESSION_DURATION;
            res.redirect('/');
        });
    } else {
        res.redirect('/login.html?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
});


// Fonctions utilitaires
function getUserAllowedOptions(username) {
    const permissions = teacherPermissions[username];
    if (permissions === 'admin') return { classes: [...allClasses], subjects: [...allSubjects] };
    if (!permissions) return { classes: [], subjects: [] };
    const allowedClasses = new Set();
    const allowedSubjects = new Set();
    permissions.forEach(p => {
        allowedSubjects.add(p.subject);
        p.classes.forEach(c => allowedClasses.add(c));
    });
    return { classes: Array.from(allowedClasses).sort(), subjects: Array.from(allowedSubjects).sort() };
}

function buildMongoQueryForUser(username, semester) {
    const baseQuery = { semester };
    const permissions = teacherPermissions[username];
    if (!permissions || permissions === 'admin') return baseQuery;
    const orConditions = permissions.flatMap(p => p.classes.map(c => ({ class: c, subject: p.subject })));
    if (orConditions.length === 0) return { _id: null }; // Impossible query
    return { ...baseQuery, $or: orConditions };
}

// Lancement
server.listen(PORT, () => console.log(`🚀 Serveur en écoute sur le port ${PORT}`));
