// api/index.js - VERSION FINALE SIMPLIFIÉE
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

const MONGO_URL = process.env.MONGO_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-par-defaut-tres-longue';

// Middlewares
app.set('trust proxy', 1);
app.use(bodyParser.json());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URL, ttl: 14 * 24 * 60 * 60 }),
    cookie: { secure: true, httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 }
}));

// Connexion MongoDB
mongoose.connect(MONGO_URL);

// Schéma et Modèle
const NoteSchema = new mongoose.Schema({ class: String, subject: String, studentName: String, semester: String, travauxClasse: Number, devoirs: Number, evaluation: Number, examen: Number, teacher: String });
const Note = mongoose.model('Note', NoteSchema);

// Données métier
const allowedTeachers = { "Mohamed": "Mohamed", "MohamedAli": "MohamedAli", "Abas": "Abas", "Sylvano": "Sylvano", "Zine": "Zine", "Morched": "Morched", "Tonga": "Tonga", "Kamel": "Kamel" };
const teacherPermissions = { "Mohamed": "admin", MohamedAli: [{ subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP1', 'DP2'] }], Abas: [{ subject: 'L.L', classes: ['PEI2', 'PEI3', 'PEI4', 'DP1'] }, { subject: 'I.S', classes: ['PEI4'] }], Sylvano: [{ subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] }, { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] }], Zine: [{ subject: 'Sciences', classes: ['PEI1'] }, { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'E.S', classes: ['DP2'] }], Morched: [{ subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] }, { subject: 'Maths', classes: ['PEI1', 'PEI2'] }], Tonga: [{ subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }, { subject: 'I.S', classes: ['PEI3'] }], Kamel: [{ subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }] };
const subjectsByClass = { PEI1: ['P.E', 'I.S', 'Maths', 'Sciences', 'Design', 'Anglais'], PEI2: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI3: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], PEI4: ['P.E', 'L.L', 'I.S', 'Maths', 'Biologie', 'Physique-Chimie', 'Design', 'Anglais'], DP1: ['L.L'], DP2: ['P.E', 'Maths', 'I.S', 'Biologie', 'E.S', 'Physique-Chimie', 'Anglais'] };

// ROUTES API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username;
        req.session.save(() => res.status(200).json({ message: 'Connexion réussie' }));
    } else {
        res.status(401).json({ message: 'Identifiants incorrects.' });
    }
});
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, username: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});
// ... autres routes API

// Export pour Vercel
module.exports = app;
