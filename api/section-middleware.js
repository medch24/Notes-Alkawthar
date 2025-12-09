// Middleware pour gérer les sections
const {
    allowedTeachersBoys,
    teacherPermissionsBoys,
    studentsByClassBoys,
    allowedTeachersGirls,
    teacherPermissionsGirls,
    studentsByClassGirls
} = require('./data-sections');

// Cache pour stocker les données de chaque section
const sectionsCache = {
    boys: null,
    girls: null
};

// Fonction pour construire subjectsByClass selon les permissions
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

// Initialiser le cache des sections
function initSectionData(section) {
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

// Obtenir les données d'une section (avec cache)
function getSectionData(section = 'boys') {
    if (!sectionsCache[section]) {
        sectionsCache[section] = initSectionData(section);
    }
    return sectionsCache[section];
}

// Middleware pour attacher les données de section à la requête
function sectionMiddleware(req, res, next) {
    const section = req.session?.section || 'boys';
    req.sectionData = getSectionData(section);
    next();
}

module.exports = {
    getSectionData,
    sectionMiddleware,
    initSectionData
};
