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
const MongoStore = require('connect-mongo'); // <-- MODIFICATION : Importation pour les sessions
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Configuration ---
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://cherifmed:Mmedch86@notes.9gwg9o9.mongodb.net/?retryWrites=true&w=majority&appName=Notes";
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-pour-le-developpement';
const DEFAULT_SESSION_DURATION = 1000 * 60 * 60 * 24; // 1 jour
const REMEMBER_ME_DURATION = 1000 * 60 * 60 * 24 * 14; // 14 jours

// --- MODIFICATION : Configuration de la session avec persistance MongoDB ---

// Indique à Express de faire confiance au proxy de Vercel pour les cookies sécurisés
app.set('trust proxy', 1);

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // Stocker les sessions dans MongoDB
    store: MongoStore.create({
        mongoUrl: MONGO_URL,
        ttl: REMEMBER_ME_DURATION / 1000, // Durée de vie en secondes
        autoRemove: 'native'
    }),
    cookie: {
        secure: true, // Essentiel pour la production sur Vercel (HTTPS)
        httpOnly: true,
        maxAge: REMEMBER_ME_DURATION, // Durée de vie du cookie
        sameSite: 'lax' // Paramètre de sécurité recommandé
    }
}));


// --- DONNÉES : Enseignants, Permissions et Élèves ---

const allowedTeachers = {
    "Mohamed Ali": "Mohamed Ali",
    "Sami": "Sami",
    "Abas": "Abas",
    "Sylvano": "Sylvano",
    "Zine": "Zine",
    "Morched": "Morched",
    "Tonga": "Tonga",
    "Kamel": "Kamel",
    "Mohamed": "Mohamed" // Admin
};

const teacherPermissions = {
    Mohamed: 'admin',
    'Mohamed Ali': [
        { subject: 'P.E', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }
    ],
    Sami: [
        { subject: 'Musique', classes: ['PEI1', 'PEI2', 'PEI3'] },
        { subject: 'ART', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }
    ],
    Abas: [
        { subject: 'L.L', classes: ['PEI1','PEI2', 'PEI3', 'PEI4', 'DP2'] },
        { subject: 'I.S', classes: ['PEI4'] }
    ],
    Sylvano: [
        { subject: 'Maths', classes: ['PEI3', 'PEI4', 'DP2'] },
        { subject: 'I.S', classes: ['PEI1', 'PEI2', 'DP2'] }
    ],
    Zine: [
        { subject: 'Sciences', classes: ['PEI1'] },
        { subject: 'Biologie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] },
        { subject: 'E.S', classes: ['DP2'] }
    ],
    Morched: [
        { subject: 'Physique-Chimie', classes: ['PEI2', 'PEI3', 'PEI4', 'DP2'] },
        { subject: 'Maths', classes: ['PEI1', 'PEI2'] }
    ],
    Tonga: [
        { subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] },
        { subject: 'I.S', classes: ['PEI3'] },
        { subject: 'S.E.S', classes: ['DP2'] }  // ✅ ici pas d'accolade isolée
    ],
    Kamel: [
        { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }
    ]
};

const studentsByClass = {
    PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"],
    PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younes"],
    PEI3: ["Adam Kaaki", "Ahmad Mahayni", "Mohamed Chalak", "Seifeddine Ayadi", "Wajih Sabadine"],
    PEI4: ["Abdulrahman Bouaziz", "Mohamed Amine Sgheir", "Mohamed Younes", "Samir Kaaki", "Youssef Baakak"],
    DP2: ["Habib Lteif", "Mahdi Karimi", "Salah Boumalouga"]
};

const subjectsByClass = {};
Object.values(teacherPermissions).forEach(perms => {
    if (perms === 'admin') return;
    perms.forEach(p => {
        p.classes.forEach(c => {
            if (!subjectsByClass[c]) subjectsByClass[c] = new Set();
            subjectsByClass[c].add(p.subject);
        });
    });
});
for (const key in subjectsByClass) {
    subjectsByClass[key] = Array.from(subjectsByClass[key]).sort();
}

const allClasses = Object.keys(subjectsByClass).sort();
const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();

// --- Fonctions Utilitaires ---
function getAssignedTeacher(subject, className) {
    for (const [teacher, perms] of Object.entries(teacherPermissions)) {
        if (perms === 'admin') continue;
        for (const perm of perms) {
            if (perm.subject === subject && perm.classes.includes(className)) {
                return teacher;
            }
        }
    }
    return "N/D";
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

async function checkUserPermissionAndSubjectExists(username, classToCheck, subjectToCheck) {
    if (!subjectsByClass[classToCheck] || !subjectsByClass[classToCheck].includes(subjectToCheck)) {
        return false;
    }
    const permissions = teacherPermissions[username];
    if (permissions === 'admin') return true;
    if (!permissions) return false;
    return permissions.some(p => p.subject === subjectToCheck && p.classes.includes(classToCheck));
}

// --- Connexion MongoDB ---
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Middlewares ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

// --- Routes publiques (Login/Logout) ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password, rememberMe } = req.body;
    if (allowedTeachers[username] && allowedTeachers[username] === password) {
        req.session.user = username;
        // La durée de vie est déjà gérée dans la configuration du cookie
        console.log(`✅ Login successful for user: ${username}`);
        res.redirect('/');
    } else {
        console.log(`❌ Login failed for user: ${username}`);
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    const user = req.session.user;
    req.session.destroy(err => {
        if (err) console.error("❌ Error destroying session:", err);
        console.log(`🚪 User ${user} logged out.`);
        res.clearCookie('connect.sid'); // Nom du cookie par défaut de express-session
        res.redirect('/login');
    });
});

// --- Middleware d'authentification ---
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        console.log(`🚫 User not authenticated trying to access ${req.path}. Redirecting to login.`);
        res.redirect('/login');
    }
});

// --- Schéma et Modèle MongoDB ---
const NoteSchema = new mongoose.Schema({
    class: String,
    subject: String,
    studentName: String,
    semester: { type: String, required: true, enum: ['S1', 'S2'] },
    travauxClasse: { type: Number, default: null },
    devoirs: { type: Number, default: null },
    evaluation: { type: Number, default: null },
    examen: { type: Number, default: null },
    teacher: { type: String }
});
const Note = mongoose.model('Note', NoteSchema);

// --- Routes Protégées (API) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.get('/get-user', (req, res) => {
    const username = req.session.user;
    res.json({
        username: username,
        permissions: getUserAllowedOptions(username),
        subjectsByClass: subjectsByClass,
        studentsByClass: studentsByClass
    });
});

// ... (Le reste des routes /all-notes, /save-notes, etc. ne change pas)
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

app.post('/save-notes', async (req, res) => {
    const { class: studentClass, subject, studentName, semester, travauxClasse, devoirs, evaluation, examen } = req.body;
    const teacher = req.session.user;
    if (!await checkUserPermissionAndSubjectExists(teacher, studentClass, subject)) {
        return res.status(403).send(`❌ Permission refusée.`);
    }
    try {
        const existingNote = await Note.findOne({ class: studentClass, subject, studentName, semester });
        if (existingNote) {
            return res.status(400).send(`❌ Notes déjà existantes pour cet élève.`);
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
        res.status(200).send('✅ Notes sauvegardées avec succès');
    } catch (error) {
        res.status(500).send('❌ Erreur serveur lors de la sauvegarde.');
    }
});

app.put('/update-note/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const teacher = req.session.user;
    try {
        const noteToUpdate = await Note.findById(id);
        if (!noteToUpdate) return res.status(404).send("❌ Note non trouvée.");
        if (!await checkUserPermissionAndSubjectExists(teacher, noteToUpdate.class, noteToUpdate.subject)) {
            return res.status(403).send('❌ Permission refusée.');
        }
        const cleanData = {};
        ['travauxClasse', 'devoirs', 'evaluation', 'examen'].forEach(field => {
            const value = updatedData[field];
            if (value === '' || value === null) cleanData[field] = null;
            else if (!isNaN(parseFloat(value))) cleanData[field] = parseFloat(value);
        });
        cleanData.teacher = teacher;
        const updatedNote = await Note.findByIdAndUpdate(id, cleanData, { new: true });
        io.emit("note-updated", { note: updatedNote.toObject(), semester: updatedNote.semester });
        res.status(200).send("✅ Note mise à jour.");
    } catch (error) {
        res.status(500).send("❌ Erreur serveur lors de la mise à jour.");
    }
});

app.delete('/delete-note/:id', async (req, res) => {
    const { id } = req.params;
    const teacher = req.session.user;
    try {
        const noteToDelete = await Note.findById(id);
        if (!noteToDelete) return res.status(404).send("❌ Note non trouvée.");
        if (!await checkUserPermissionAndSubjectExists(teacher, noteToDelete.class, noteToDelete.subject)) {
            return res.status(403).send('❌ Permission refusée.');
        }
        const deletedNote = await Note.findByIdAndDelete(id);
        io.emit("note-deleted", { id: id, semester: deletedNote.semester });
        res.status(200).send("✅ Note supprimée.");
    } catch (error) {
        res.status(500).send("❌ Erreur serveur lors de la suppression.");
    }
});

app.post('/generate-word', async (req, res) => {
    const { semester } = req.query;
    const username = req.session.user;
    try {
        const query = buildMongoQueryForUser(username, semester);
        const notes = await Note.find(query).lean();
        if (notes.length === 0) return res.status(404).send(`❌ Aucune donnée pour le semestre ${semester}.`);
        
        const templateURL = 'https://cdn.glitch.global/2d2bcfb4-8233-494d-8e48-2d84f224e9d1/Notes%203%20(1)%20(1).docx?v=1748167642949';
        const response = await axios.get(templateURL, { responseType: 'arraybuffer' });
        const templateContent = response.data;

        const zip = new JSZip();
        const allowedOptions = getUserAllowedOptions(username);
        
        const notesByClass = notes.reduce((acc, note) => {
            if (allowedOptions.classes.includes(note.class)) {
                (acc[note.class] = acc[note.class] || []).push(note);
            }
            return acc;
        }, {});

        for (const className in notesByClass) {
            const classStudentList = studentsByClass[className] || [];
            if (classStudentList.length === 0) continue;

            const doc = new Docxtemplater(new PizZip(templateContent), { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });

            const uniqueSubjectsInClassNotes = [...new Set(notesByClass[className].map(n => n.subject))];
            const subjectsToInclude = (subjectsByClass[className] || []).filter(s => allowedOptions.subjects.includes(s) && uniqueSubjectsInClassNotes.includes(s)).sort();

            if (subjectsToInclude.length === 0) continue;

            const renderDataSubjects = subjectsToInclude.map(subjectName => ({
                subjectName: subjectName,
                assignedTeacher: getAssignedTeacher(subjectName, className),
                students: classStudentList.map(studentName => {
                    const note = notesByClass[className].find(n => n.studentName === studentName && n.subject === subjectName);
                    const total = (note?.travauxClasse ?? 0) + (note?.devoirs ?? 0) + (note?.evaluation ?? 0) + (note?.examen ?? 0);
                    return {
                        studentName,
                        travauxClasse: note?.travauxClasse ?? "",
                        devoirs: note?.devoirs ?? "",
                        evaluation: note?.evaluation ?? "",
                        examen: note?.examen ?? "",
                        total: note ? total.toFixed(2) : ""
                    };
                })
            }));

            doc.render({ className, semesterDisplay: semester, subjects: renderDataSubjects });
            const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: "DEFLATE" });
            zip.file(`${className}_${semester}.docx`, buffer);
        }

        if (Object.keys(zip.files).length === 0) {
            return res.status(404).send(`❌ Aucun fichier n'a pu être généré avec les permissions actuelles.`);
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: "DEFLATE" });
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="Notes_${username}_${semester}.zip"`,
        }).send(zipBuffer);

    } catch (error) {
        console.error("❌ Error generating Word files:", error);
        res.status(500).send("❌ Erreur serveur lors de la génération des fichiers Word.");
    }
});

app.get('/generate-excel', async (req, res) => {
    const { semester } = req.query;
    const username = req.session.user;
    try {
        const query = buildMongoQueryForUser(username, semester);
        const notes = await Note.find(query).lean();
        if (notes.length === 0) return res.status(404).send(`❌ Aucune note pour la génération Excel.`);

        const wb = XLSX.utils.book_new();
        const allowedOptions = getUserAllowedOptions(username);

        allowedOptions.classes.forEach(className => {
            const classNotes = notes.filter(n => n.class === className);
            if (classNotes.length === 0) return;
            
            const wsData = [
                ['Classe', 'Matière', 'Élève', 'Travaux Classe', 'Devoirs', 'Évaluation', 'Examen', 'Total', 'Enseignant Saisie', 'Enseignant Attitré']
            ];
            classNotes.sort((a,b) => a.studentName.localeCompare(b.studentName) || a.subject.localeCompare(b.subject))
            .forEach(note => {
                const total = (note.travauxClasse ?? 0) + (note.devoirs ?? 0) + (note.evaluation ?? 0) + (note.examen ?? 0);
                wsData.push([
                    note.class, note.subject, note.studentName,
                    note.travauxClasse ?? '', note.devoirs ?? '', note.evaluation ?? '', note.examen ?? '',
                    total.toFixed(2), note.teacher || '', getAssignedTeacher(note.subject, note.class)
                ]);
            });
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = Array(10).fill({ wch: 20 });
            XLSX.utils.book_append_sheet(wb, ws, className);
        });

        if (wb.SheetNames.length === 0) {
             return res.status(404).send(`❌ Aucune donnée à exporter en Excel.`);
        }
        
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="Notes_${username}_${semester}.xlsx"`,
        }).send(buffer);

    } catch (error) {
        console.error("❌ Error generating Excel file:", error);
        res.status(500).send("❌ Erreur serveur lors de la génération du fichier Excel.");
    }
});


// --- WebSocket ---
io.on('connection', (socket) => {
    console.log(`⚡ Client connecté via WebSocket: ${socket.id}`);
    socket.on('disconnect', () => console.log(`⚡ Client déconnecté: ${socket.id}`));
});

// --- Export pour Vercel ---
module.exports = app;



