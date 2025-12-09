// Fichier de données pour les deux sections

// ==================== SECTION GARÇONS ====================

const allowedTeachersBoys = {
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

const teacherPermissionsBoys = {
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
        { subject: 'S.E.S', classes: ['DP2'] }
    ],
    Kamel: [
        { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'DP2'] }
    ]
};

const studentsByClassBoys = {
    PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"],
    PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younes"],
    PEI3: ["Adam Kaaki", "Ahmad Mahayni", "Mohamed Chalak", "Seifeddine Ayadi", "Wajih Sabadine"],
    PEI4: ["Abdulrahman Bouaziz", "Mohamed Amine Sgheir", "Mohamed Younes", "Samir Kaaki", "Youssef Baakak"],
    DP2: ["Habib Lteif", "Mahdi Karimi", "Salah Boumalouga"]
};

// ==================== SECTION FILLES ====================

const allowedTeachersGirls = {
    "Amal": "Amal",
    "Inas": "Inas",
    "Anouar": "Anouar",
    "Souha": "Souha",
    "Samira": "Samira",
    "Zohra": "Zohra",
    "Zohra Zidane": "Zohra Zidane",
    "Aichetou": "Aichetou",
    "Hiba": "Hiba",
    "Shanouja": "Shanouja",
    "Hana": "Hana",
    "Farah": "Farah",
    "Tayba": "Tayba",
    "Mohamed": "Mohamed" // Admin
};

const teacherPermissionsGirls = {
    Mohamed: 'admin',
    Zohra: 'admin',
    Amal: [
        { subject: 'Anglais', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] }
    ],
    Inas: [
        { subject: 'Maths', classes: ['PEI5', 'PEI4', 'DP1', 'DP2'] },
        { subject: 'Physique-Chimie', classes: ['PEI5', 'DP1', 'DP2'] },
        { subject: 'Études Scientifiques – ES', classes: ['DP1'] }
    ],
    Anouar: [
        { subject: 'Design', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4'] },
        { subject: 'Biologie', classes: ['PEI3', 'PEI4'] },
        { subject: 'Physique-Chimie', classes: ['PEI3'] },
        { subject: 'Maths', classes: ['PEI3'] }
    ],
    Souha: [
        { subject: 'Physique-Chimie', classes: ['PEI2'] },
        { subject: 'Maths', classes: ['PEI1', 'PEI2'] },
        { subject: 'Biologie', classes: ['PEI2', 'PEI5'] },
        { subject: 'Sciences Numériques et Technologiques – SNT', classes: ['PEI5'] },
        { subject: 'Sciences', classes: ['PEI1'] }
    ],
    Samira: [
        { subject: 'Individus et Sociétés', classes: ['PEI4', 'PEI5', 'DP1', 'DP2'] },
        { subject: 'Langue et Littérature', classes: ['PEI4', 'PEI5', 'DP1', 'DP2'] },
        { subject: 'Sciences Économiques et Sociales – SES', classes: ['DP1', 'DP2'] }
    ],
    'Zohra Zidane': [
        { subject: 'Physique-Chimie', classes: ['PEI4'] },
        { subject: 'Biologie', classes: ['DP1', 'DP2'] },
        { subject: 'Études Scientifiques – ES', classes: ['DP1', 'DP2'] }
    ],
    Aichetou: [
        { subject: 'Individus et Sociétés', classes: ['PEI1', 'PEI2', 'PEI3'] },
        { subject: 'Langue et Littérature', classes: ['PEI1', 'PEI2', 'PEI3'] },
        { subject: 'Sciences Économiques et Sociales – SES', classes: ['PEI5'] }
    ],
    Hiba: [
        { subject: 'Anglais', classes: ['DP1', 'DP2'] }
    ],
    Shanouja: [
        { subject: 'Anglais', classes: ['PEI5'] }
    ],
    Hana: [
        { subject: 'Éducation Physique et Sportive – EPS', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'PEI5', 'DP1', 'DP2'] }
    ],
    Farah: [
        { subject: 'Musique', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'PEI5', 'DP1', 'DP2'] }
    ],
    Tayba: [
        { subject: 'ART', classes: ['PEI1', 'PEI2', 'PEI3', 'PEI4', 'PEI5', 'DP1', 'DP2'] }
    ]
};

const studentsByClassGirls = {
    DP1: ["Yothna Masrouhi"],
    DP2: ["Isra Elalmi"],
    PEI1: ["Naya Sabbidine"],
    PEI2: ["Cynthia Fadlallah", "Dina Tlili", "Israa Alkattan", "Lina Tlili", "Neyla Molina"],
    PEI3: ["Jawahair Eshmawi"],
    PEI4: ["Maria Wahib", "Sarah Aldebasy", "Yousr Letaief"],
    PEI5: ["Badia Khaldi", "Luluwah Alghabashi"]
};

// Export des données
module.exports = {
    allowedTeachersBoys,
    teacherPermissionsBoys,
    studentsByClassBoys,
    allowedTeachersGirls,
    teacherPermissionsGirls,
    studentsByClassGirls
};
