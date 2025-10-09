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
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-pour-le-dev';
const DEFAULT_SESSION_DURATION = 1000 * 60 * 60 * 24; // 1 jour
const REMEMBER_ME_DURATION = 1000 * 60 * 60 * 24 * 14; // 14 jours

// --- CORRECTION SESSION : Indiquer à Express de faire confiance au proxy de Vercel ---
app.set('trust proxy', 1);

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Toujours sécurisé car Vercel est en HTTPS
        httpOnly: true,
        sameSite: 'lax' // Protection contre les attaques CSRF
    }
}));

// --- CORRECTION ADMIN : Ajout du compte "Mohamed" dans la liste des connexions ---
const allowedTeachers = {
    "Mohamed": "Mohamed", // Compte Admin
    "MohamedAli": "MohamedAli",
    "Abas": "Abas",
    "Sylvano": "Sylvano",
    "Zine": "Zine",
    "Morched": "Morched",
    "Tonga": "Tonga",
    "Kamel": "Kamel"
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

// --- CORRECTION ADMIN : Ajout des permissions "admin" pour le compte "Mohamed" ---
const teacherPermissions = {
    "Mohamed": "admin", // Mohamed peut tout voir et tout faire
    MohamedAli: [ { subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] } ],
    Abas: [ { subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] } ],
    Sylvano: [ { subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] } ],
    Zine: [ { subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] } ],
    Morched: [ { subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] } ],
    Tonga: [ { subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] } ],
    Kamel: [ { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] } ]
};

const teacherFullNames = {
    Mohamed: "Mohamed Admin", // Nom pour l'admin
    MohamedAli: "Mohamed Ali",
    Abas: "Abas French",
    Sylvano: "Sylvano Hervé",
    Zine: "Zine",
    Morched: "Morched",
    Tonga: "Tonga",
    Kamel: "Kamel"
};

const teacherSignatureImages = {};

function getAssignedTeacherFullName(subject, className) {
    for (const teacher in teacherPermissions) {
        if (teacher === 'Mohamed') continue;
        const perms = teacherPermissions[teacher];
        for (const perm of perms) {
            if (perm.subject === subject && perm.classes.includes(className)) {
                return teacherFullNames[teacher] || teacher;
            }
        }
    }
    return "N/D";
}

function getAssignedTeacherShortName(subject, className) {
    for (const teacher in teacherPermissions) {
        if (teacher === 'Mohamed') continue;
        const perms = teacherPermissions[teacher];
        for (const perm of perms) {
            if (perm.subject === subject && perm.classes.includes(className)) {
                return teacher;
            }
        }
    }
    return null;
}

function getUserAllowedOptions(username) {
    const permissions = teacherPermissions[username];
    if (permissions === 'admin') {
        return { classes: [...allClasses], subjects: [...allSubjects] };
    }
    if (!permissions) return { classes: [], subjects: [] };
    let allowedClasses = new Set();
    let allowedSubjects = new Set();
    permissions.forEach(perm => {
        allowedSubjects.add(perm.subject);
        perm.classes.forEach(cls => allowedClasses.add(cls));
    });
    return {
        classes: Array.from(allowedClasses).sort(),
        subjects: Array.from(allowedSubjects).sort()
    };
}

function buildMongoQueryForUser(username, semester) {
    const baseQuery = { semester: semester };
    const permissions = teacherPermissions[username];
    if (!permissions || permissions === 'admin') {
        return baseQuery;
    }
    const orConditions = permissions.flatMap(perm =>
        perm.classes.map(cls => ({ class: cls, subject: perm.subject }))
    );
    if (orConditions.length === 0) {
        return { _id: new mongoose.Types.ObjectId('000000000000000000000000') };
    }
    return { ...baseQuery, $or: orConditions };
}

mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- STRUCTURE PROJET : Servir les fichiers statiques depuis le dossier 'public' ---
app.use(express.static(path.join(__dirname, 'public')));

function isAuthenticated(req, res, next) {
    if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/images/') || req.path.startsWith('/fonts/')) {
        return next();
    }
    if (req.path === '/login' || req.path === '/login.html') {
        return next();
    }
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login.html');
    }
}
app.use(isAuthenticated);

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
    if (!semester || !['S1', 'S2'].includes(semester)) {
        return res.status(400).json({ error: 'Le paramètre semester (S1 ou S2) est requis.' });
    }
    try {
        const query = buildMongoQueryForUser(username, semester);
        const notes = await Note.find(query).lean();
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des notes' });
    }
});

async function checkUserPermissionAndSubjectExists(username, classToCheck, subjectToCheck) {
    if (!subjectsByClass[classToCheck] || !subjectsByClass[classToCheck].includes(subjectToCheck)) {
        return false;
    }
    if (teacherPermissions[username] === 'admin') return true;
    const permissions = teacherPermissions[username];
    return permissions.some(perm => perm.subject === subjectToCheck && perm.classes.includes(classToCheck));
}

app.post('/save-notes', async (req, res) => {
    const { class: studentClass, subject, studentName, semester, travauxClasse, devoirs, evaluation, examen } = req.body;
    const teacher = req.session.user;
    const hasPermission = await checkUserPermissionAndSubjectExists(teacher, studentClass, subject);
    if (!hasPermission) {
        return res.status(403).send('Permission refusée.');
    }
    try {
        const existingNote = await Note.findOne({ class: studentClass, subject, studentName, semester });
        if (existingNote) {
            return res.status(400).send('Notes déjà existantes. Modifiez-les via le tableau.');
        }
        const note = new Note({
            class: studentClass, subject, studentName, semester,
            travauxClasse: travauxClasse === '' ? null : Number(travauxClasse),
            devoirs: devoirs === '' ? null : Number(devoirs),
            evaluation: evaluation === '' ? null : Number(evaluation),
            examen: examen === '' ? null : Number(examen),
            teacher
        });
        await note.save();
        io.emit('note-added', { note: note.toObject(), semester });
        res.status(200).send('Notes sauvegardées avec succès');
    } catch (error) {
        res.status(500).send('Erreur serveur lors de la sauvegarde.');
    }
});

app.put('/update-note/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const teacher = req.session.user;
    try {
        const noteToUpdate = await Note.findById(id);
        if (!noteToUpdate) return res.status(404).send("Note non trouvée.");
        const hasPermission = await checkUserPermissionAndSubjectExists(teacher, noteToUpdate.class, noteToUpdate.subject);
        if (!hasPermission) return res.status(403).send('Permission refusée.');
        updatedData.teacher = teacher;
        const updatedNote = await Note.findByIdAndUpdate(id, updatedData, { new: true });
        io.emit("note-updated", { note: updatedNote.toObject(), semester: updatedNote.semester });
        res.status(200).send("Note mise à jour avec succès.");
    } catch (error) {
        res.status(500).send("Erreur serveur lors de la mise à jour.");
    }
});

app.delete('/delete-note/:id', async (req, res) => {
    const { id } = req.params;
    const teacher = req.session.user;
    try {
        const noteToDelete = await Note.findById(id);
        if (!noteToDelete) return res.status(404).send("Note non trouvée.");
        const hasPermission = await checkUserPermissionAndSubjectExists(teacher, noteToDelete.class, noteToDelete.subject);
        if (!hasPermission) return res.status(403).send('Permission refusée.');
        const deletedNote = await Note.findByIdAndDelete(id);
        io.emit("note-deleted", { id: id, semester: deletedNote.semester });
        res.status(200).send("Note supprimée avec succès.");
    } catch (error) {
        res.status(500).send("Erreur serveur lors de la suppression.");
    }
});

const studentsByClass = {
    PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"],
    PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younis"],
    PEI3: ["Adam Kaaki", "Ahmed Mehani", "Mohamed Chalak", "Seif Eddine Ayadi", "Wajih Sabadine"],
    PEI4: ["Abdulrahman Bouaziz", "Mohamed Younes", "Samir Kaaki", "Mohamed Amine", "Youssif Baakak"],
    DP2: ["Habib Ltief", "Mahdi Kreimi", "Saleh Boumalouga"],
    DP1: []
};

// --- ROUTES DE CONNEXION ---
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

io.on('connection', (socket) => {
    console.log(`⚡ Client connecté via WebSocket: ${socket.id}`);
    socket.on('disconnect', () => console.log(`⚡ Client déconnecté via WebSocket: ${socket.id}`));
});

// Démarrage du serveur
server.listen(PORT, () => console.log(`🚀 Serveur en écoute sur le port ${PORT}`));

// Le code pour la génération de fichiers Word et Excel est omis pour la lisibilité
// mais il doit être inclus ici, il n'a pas besoin de modification.
// Vous devez le reprendre de votre fichier original.
