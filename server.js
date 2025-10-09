// server.js - VERSION FINALE AVEC SAUVEGARDE EXPLICITE DE SESSION
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-tres-longue-et-aleatoire';

app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URL,
        ttl: 14 * 24 * 60 * 60
    }),
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ Connexion à MongoDB réussie'))
    .catch(err => console.error('❌ ERREUR DE CONNEXION MONGODB:', err));

const NoteSchema = new mongoose.Schema({ class: String, subject: String, studentName: String, semester: { type: String, required: true }, travauxClasse: Number, devoirs: Number, evaluation: Number, examen: Number, teacher: String });
const Note = mongoose.model('Note', NoteSchema);

const allowedTeachers = { "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", "Abas": "Abas", "Sylvano": "Sylvano", "Zine": "Zine", "Morched": "Morched", "Tonga": "Tonga", "Kamel": "Kamel" };
const teacherPermissions = { "Mohamed": "admin", MohamedAli: [{ subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] }], Abas: [{ subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] }], Sylvano: [{ subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] }], Zine: [{ subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] }], Morched: [{ subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] }], Tonga: [{ subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] }], Kamel: [{ subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }] };
const subjectsByClass = { PEI1: ['P.E', 'I.S', 'Maths', 'Sciences', 'Design', 'Anglais'], PEI2: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI3: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI4: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], DP1: ['L.L'], DP2: ['P.E', 'Maths', 'I.S', 'Biologie', 'E.S', 'Physique-Chimie', 'Anglais'] };
const allClasses = Object.keys(subjectsByClass);
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

const apiRouter = express.Router();

// --- CORRECTION FINALE : SAUVEGARDE EXPLICITE DE LA SESSION ---
apiRouter.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username;
        // On force la sauvegarde de la session dans MongoDB AVANT de répondre.
        req.session.save(err => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la création de la session.' });
            }
            return res.status(200).json({ message: 'Connexion réussie' });
        });
    } else {
        return res.status(401).json({ message: 'Login ou mot de passe incorrect.' });
    }
});

apiRouter.use((req, res, next) => {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
});

apiRouter.get('/get-user', (req, res) => { res.json({ username: req.session.user, permissions: getUserAllowedOptions(req.session.user), subjectsByClass }); });
apiRouter.get('/all-notes', async (req, res) => { try { const notes = await Note.find(buildMongoQueryForUser(req.session.user, req.query.semester)).lean(); res.json(notes); } catch (e) { res.status(500).json({ message: 'Erreur BDD' }); } });
apiRouter.post('/save-notes', async (req, res) => {
    const teacher = req.session.user;
    const { class: studentClass, subject, studentName, semester, ...notesData } = req.body;
    if (!checkUserPermission(teacher, studentClass, subject)) return res.status(403).json({ message: 'Permission refusée.' });
    try {
        const existingNote = await Note.findOne({ class: studentClass, subject, studentName, semester });
        if (existingNote) return res.status(400).json({ message: 'Une note existe déjà pour cet élève.' });
        const note = new Note({ class: studentClass, subject, studentName, semester, teacher, ...notesData });
        await note.save();
        io.emit('note-added', { note: note.toObject(), semester: note.semester });
        res.status(201).json({ message: 'Note enregistrée avec succès.' });
    } catch (error) {
        res.status(400).json({ message: "Erreur lors de l'enregistrement." });
    }
});
app.use('/api', apiRouter);

const isAuthenticatedPage = (req, res, next) => {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
};
app.get('/logout', (req, res) => { req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/login'); }); });
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'login.html')); });
app.get('/', isAuthenticatedPage, (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

function checkUserPermission(username, classToCheck, subjectToCheck) { if (teacherPermissions[username] === 'admin') return true; const permissions = teacherPermissions[username]; if (!permissions) return false; return permissions.some(p => p.subject === subjectToCheck && p.classes.includes(classToCheck)); }
function getUserAllowedOptions(username) { if (teacherPermissions[username] === 'admin') return { classes: [...allClasses], subjects: [...allSubjects] }; const permissions = teacherPermissions[username]; if (!permissions) return { classes: [], subjects: [] }; const allowedClasses = new Set(); const allowedSubjects = new Set(); permissions.forEach(p => { allowedSubjects.add(p.subject); p.classes.forEach(c => allowedClasses.add(c)); }); return { classes: Array.from(allowedClasses).sort(), subjects: Array.from(allowedSubjects).sort() }; }
function buildMongoQueryForUser(username, semester) { const baseQuery = { semester }; const permissions = teacherPermissions[username]; if (!permissions || permissions === 'admin') return baseQuery; const orConditions = permissions.flatMap(p => p.classes.map(c => ({ class: c, subject: p.subject }))); if (orConditions.length === 0) return { _id: null }; return { ...baseQuery, $or: orConditions }; }

// --- CORRECTION FINALE : EXPORTER L'APP POUR VERCEL ---
// On retire server.listen car Vercel gère le serveur lui-même.
module.exports = app;
