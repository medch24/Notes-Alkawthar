const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const JSZip = require('jszip');
const axios = require('axios');
const XLSX = require('xlsx');
const session = require('express-session');
require('dotenv').config();

// Import des données de section
const {
    allowedTeachersBoys,
    teacherPermissionsBoys,
    studentsByClassBoys,
    allowedTeachersGirls,
    teacherPermissionsGirls,
    studentsByClassGirls
} = require(path.join(__dirname, 'data-sections'));

const app = express();

// --- Configuration ---
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://cherifmed:Mmedch86@notes.9gwg9o9.mongodb.net/?retryWrites=true&w=majority&appName=Notes";
const SESSION_SECRET = process.env.SESSION_SECRET || 'une-cle-secrete-pour-le-developpement';

// Connexion MongoDB (connection pooling pour serverless)
let cachedDb = null;
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    const connection = await mongoose.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
    });
    cachedDb = connection;
    return connection;
}

// Configuration Express pour Vercel
app.set('trust proxy', 1);

// Session avec MemoryStore (simplifié pour serverless)
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24h
        sameSite: 'lax'
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Schéma MongoDB
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

let Note;
try {
    Note = mongoose.model('Note');
} catch {
    Note = mongoose.model('Note', NoteSchema);
}

// Fonctions de gestion des sections
function getSectionData(section = 'boys') {
    let allowedTeachers, teacherPermissions, studentsByClass;
    
    if (section === 'girls') {
        allowedTeachers = {...allowedTeachersGirls};
        teacherPermissions = JSON.parse(JSON.stringify(teacherPermissionsGirls));
        studentsByClass = JSON.parse(JSON.stringify(studentsByClassGirls));
    } else {
        allowedTeachers = {...allowedTeachersBoys};
        teacherPermissions = JSON.parse(JSON.stringify(teacherPermissionsBoys));
        studentsByClass = JSON.parse(JSON.stringify(studentsByClassBoys));
    }
    
    const subjectsByClass = buildSubjectsByClass(teacherPermissions);
    const allClasses = Object.keys(subjectsByClass).sort();
    const allSubjects = [...new Set(Object.values(subjectsByClass).flat())].sort();
    
    return {
        allowedTeachers,
        teacherPermissions,
        studentsByClass,
        subjectsByClass,
        allClasses,
        allSubjects
    };
}

function buildSubjectsByClass(permissions) {
    const subjects = {};
    Object.values(permissions).forEach(perms => {
        if (perms === 'admin') return;
        perms.forEach(p => {
            p.classes.forEach(c => {
                if (!subjects[c]) subjects[c] = new Set();
                subjects[c].add(p.subject);
            });
        });
    });
    for (const key in subjects) {
        subjects[key] = Array.from(subjects[key]).sort();
    }
    return subjects;
}

// Middleware de section
function sectionMiddleware(req, res, next) {
    const section = req.session?.section || 'boys';
    req.sectionData = getSectionData(section);
    next();
}

// Fonctions utilitaires
function getAssignedTeacher(subject, className, teacherPermissions) {
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

function getUserAllowedOptions(username, sectionData) {
    const permissions = sectionData.teacherPermissions[username];
    if (permissions === 'admin') {
        return { classes: [...sectionData.allClasses], subjects: [...sectionData.allSubjects] };
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

function buildMongoQueryForUser(username, semester, teacherPermissions) {
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

async function checkUserPermissionAndSubjectExists(username, classToCheck, subjectToCheck, sectionData) {
    if (!sectionData.subjectsByClass[classToCheck] || !sectionData.subjectsByClass[classToCheck].includes(subjectToCheck)) {
        return false;
    }
    const permissions = sectionData.teacherPermissions[username];
    if (permissions === 'admin') return true;
    if (!permissions) return false;
    return permissions.some(p => p.subject === subjectToCheck && p.classes.includes(classToCheck));
}

// Routes publiques
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'section-selector.html'));
});

app.get('/login', (req, res) => {
    const { section } = req.query;
    if (section) {
        req.session.section = section;
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const section = req.session.section || 'boys';
    
    const sectionData = getSectionData(section);
    
    if (sectionData.allowedTeachers[username] && sectionData.allowedTeachers[username] === password) {
        req.session.user = username;
        req.session.section = section;
        console.log(`✅ Login successful for user: ${username} in section: ${section}`);
        res.redirect('/dashboard');
    } else {
        console.log(`❌ Login failed for user: ${username}`);
        res.redirect(`/login?section=${section}&error=1`);
    }
});

app.get('/logout', (req, res) => {
    const user = req.session.user;
    req.session.destroy(err => {
        if (err) console.error("❌ Error destroying session:", err);
        console.log(`🚪 User ${user} logged out.`);
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Middleware d'authentification
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        console.log(`🚫 User not authenticated trying to access ${req.path}`);
        res.redirect('/');
    }
});

// Middleware de section
app.use(sectionMiddleware);

// Routes protégées
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/get-user', (req, res) => {
    const username = req.session.user;
    const section = req.session.section || 'boys';
    res.json({
        username: username,
        section: section,
        permissions: getUserAllowedOptions(username, req.sectionData),
        subjectsByClass: req.sectionData.subjectsByClass,
        studentsByClass: req.sectionData.studentsByClass
    });
});

app.get('/all-notes', async (req, res) => {
    await connectToDatabase();
    const { semester } = req.query;
    const username = req.session.user;
    if (!semester || !['S1', 'S2'].includes(semester)) {
        return res.status(400).json({ error: 'Le paramètre semester (S1 ou S2) est requis.' });
    }
    try {
        const query = buildMongoQueryForUser(username, semester, req.sectionData.teacherPermissions);
        const notes = await Note.find(query).lean();
        res.status(200).json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des notes' });
    }
});

app.post('/save-notes', async (req, res) => {
    await connectToDatabase();
    const { class: studentClass, subject, studentName, semester, travauxClasse, devoirs, evaluation, examen } = req.body;
    const teacher = req.session.user;
    if (!await checkUserPermissionAndSubjectExists(teacher, studentClass, subject, req.sectionData)) {
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
        res.status(200).send('✅ Notes sauvegardées avec succès');
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).send('❌ Erreur serveur lors de la sauvegarde.');
    }
});

app.put('/update-note/:id', async (req, res) => {
    await connectToDatabase();
    const { id } = req.params;
    const updatedData = req.body;
    const teacher = req.session.user;
    try {
        const noteToUpdate = await Note.findById(id);
        if (!noteToUpdate) return res.status(404).send("❌ Note non trouvée.");
        if (!await checkUserPermissionAndSubjectExists(teacher, noteToUpdate.class, noteToUpdate.subject, req.sectionData)) {
            return res.status(403).send('❌ Permission refusée.');
        }
        const cleanData = {};
        ['travauxClasse', 'devoirs', 'evaluation', 'examen'].forEach(field => {
            const value = updatedData[field];
            if (value === '' || value === null) cleanData[field] = null;
            else if (!isNaN(parseFloat(value))) cleanData[field] = parseFloat(value);
        });
        cleanData.teacher = teacher;
        await Note.findByIdAndUpdate(id, cleanData, { new: true });
        res.status(200).send("✅ Note mise à jour.");
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).send("❌ Erreur serveur lors de la mise à jour.");
    }
});

app.delete('/delete-note/:id', async (req, res) => {
    await connectToDatabase();
    const { id } = req.params;
    const teacher = req.session.user;
    try {
        const noteToDelete = await Note.findById(id);
        if (!noteToDelete) return res.status(404).send("❌ Note non trouvée.");
        if (!await checkUserPermissionAndSubjectExists(teacher, noteToDelete.class, noteToDelete.subject, req.sectionData)) {
            return res.status(403).send('❌ Permission refusée.');
        }
        await Note.findByIdAndDelete(id);
        res.status(200).send("✅ Note supprimée.");
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).send("❌ Erreur serveur lors de la suppression.");
    }
});

app.post('/generate-word', async (req, res) => {
    await connectToDatabase();
    const { semester } = req.query;
    const username = req.session.user;
    try {
        const query = buildMongoQueryForUser(username, semester, req.sectionData.teacherPermissions);
        const notes = await Note.find(query).lean();
        if (notes.length === 0) return res.status(404).send(`❌ Aucune donnée pour le semestre ${semester}.`);
        
        const templateURL = 'https://cdn.glitch.global/2d2bcfb4-8233-494d-8e48-2d84f224e9d1/Notes%203%20(1)%20(1).docx?v=1748167642949';
        const response = await axios.get(templateURL, { responseType: 'arraybuffer' });
        const templateContent = response.data;

        const zip = new JSZip();
        const allowedOptions = getUserAllowedOptions(username, req.sectionData);
        
        const notesByClass = notes.reduce((acc, note) => {
            if (allowedOptions.classes.includes(note.class)) {
                (acc[note.class] = acc[note.class] || []).push(note);
            }
            return acc;
        }, {});

        for (const className in notesByClass) {
            const classStudentList = req.sectionData.studentsByClass[className] || [];
            if (classStudentList.length === 0) continue;

            const doc = new Docxtemplater(new PizZip(templateContent), { paragraphLoop: true, linebreaks: true, nullGetter: () => "" });

            const uniqueSubjectsInClassNotes = [...new Set(notesByClass[className].map(n => n.subject))];
            const subjectsToInclude = (req.sectionData.subjectsByClass[className] || []).filter(s => allowedOptions.subjects.includes(s) && uniqueSubjectsInClassNotes.includes(s)).sort();

            if (subjectsToInclude.length === 0) continue;

            const renderDataSubjects = subjectsToInclude.map(subjectName => ({
                subjectName: subjectName,
                assignedTeacher: getAssignedTeacher(subjectName, className, req.sectionData.teacherPermissions),
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
            return res.status(404).send(`❌ Aucun fichier n'a pu être généré.`);
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: "DEFLATE" });
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="Notes_${username}_${semester}.zip"`,
        }).send(zipBuffer);

    } catch (error) {
        console.error("❌ Error generating Word files:", error);
        res.status(500).send("❌ Erreur serveur lors de la génération.");
    }
});

app.get('/generate-excel', async (req, res) => {
    await connectToDatabase();
    const { semester } = req.query;
    const username = req.session.user;
    try {
        const query = buildMongoQueryForUser(username, semester, req.sectionData.teacherPermissions);
        const notes = await Note.find(query).lean();
        if (notes.length === 0) return res.status(404).send(`❌ Aucune note pour la génération Excel.`);

        const wb = XLSX.utils.book_new();
        const allowedOptions = getUserAllowedOptions(username, req.sectionData);

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
                    total.toFixed(2), note.teacher || '', getAssignedTeacher(note.subject, note.class, req.sectionData.teacherPermissions)
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
        res.status(500).send("❌ Erreur serveur.");
    }
});

// Export pour Vercel
module.exports = app;
