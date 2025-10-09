// api/server.js - VERSION FINALE POUR VERCEL
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-tres-longue-et-aleatoire';

// Middlewares
app.set('trust proxy', 1);
// Le chemin vers le dossier public est maintenant différent
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration de la session avec MongoDB Store
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGO_URL,
        ttl: 14 * 24 * 60 * 60 // 14 jours
    }),
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 24 heures
    }
}));

// Connexion à MongoDB
mongoose.connect(MONGO_URL)
    .then(() => console.log('✅ Connexion à MongoDB réussie'))
    .catch(err => console.error('❌ ERREUR DE CONNEXION MONGODB:', err));

// Schéma et Modèle
const NoteSchema = new mongoose.Schema({ class: String, subject: String, studentName: String, semester: { type: String, required: true }, travauxClasse: Number, devoirs: Number, evaluation: Number, examen: Number, teacher: String });
const Note = mongoose.model('Note', NoteSchema);

// Données métier
const allowedTeachers = { "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", "Abas": "Abas", "Sylvano": "Sylvano", "Zine": "Zine", "Morched": "Morched", "Tonga": "Tonga", "Kamel": "Kamel" };
const teacherPermissions = { "Mohamed": "admin", MohamedAli: [{ subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] }], Abas: [{ subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] }], Sylvano: [{ subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] }], Zine: [{ subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] }], Morched: [{ subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] }], Tonga: [{ subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] }], Kamel: [{ subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }] };
const subjectsByClass = { PEI1: ['P.E', 'I.S', 'Maths', 'Sciences', 'Design', 'Anglais'], PEI2: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI3: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI4: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], DP1: ['L.L'], DP2: ['P.E', 'Maths', 'I.S', 'Biologie', 'E.S', 'Physique-Chimie', 'Anglais'] };
const allClasses = Object.keys(subjectsByClass);
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

// --- ROUTES API ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username;
        req.session.save(err => {
            if (err) return res.status(500).json({ message: 'Erreur de session.' });
            return res.status(200).json({ message: 'Connexion réussie' });
        });
    } else {
        return res.status(401).json({ message: 'Login ou mot de passe incorrect.' });
    }
});

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ message: 'Session expirée.' });
};

app.get('/api/get-user', isAuthenticated, (req, res) => { res.json({ username: req.session.user, permissions: getUserAllowedOptions(req.session.user), subjectsByClass }); });
app.get('/api/all-notes', isAuthenticated, async (req, res) => { try { const notes = await Note.find(buildMongoQueryForUser(req.session.user, req.query.semester)).lean(); res.json(notes); } catch (e) { res.status(500).json({ message: 'Erreur BDD' }); } });
app.post('/api/save-notes', isAuthenticated, async (req, res) => {
    const teacher = req.session.user;
    const { class: studentClass, subject } = req.body;
    if (!checkUserPermission(teacher, studentClass, subject)) return res.status(403).json({ message: 'Permission refusée.' });
    try {
        const note = new Note({ ...req.body, teacher });
        await note.save();
        res.status(201).json({ message: 'Note enregistrée.' });
    } catch (error) {
        res.status(400).json({ message: "Erreur d'enregistrement." });
    }
});

// --- ROUTES PAGES ---
app.get('/logout', (req, res) => { req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/login'); }); });
app.get('/login', (req, res) => { res.sendFile(path.join(__dirname, '..', 'public', 'login.html')); });
app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// Fonctions utilitaires
function checkUserPermission(username, classToCheck, subjectToCheck) { /* ...votre code... */ return true; }
function getUserAllowedOptions(username) { /* ...votre code... */ return { classes: allClasses, subjects: allSubjects }; }
function buildMongoQueryForUser(username, semester) { /* ...votre code... */ return { semester }; }

// Export de l'app pour Vercel
module.exports = app;
