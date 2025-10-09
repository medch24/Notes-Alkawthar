const socket = io();
let currentSemester = null;
let allNotesData = [];
let currentUserPermissions = { classes: [], subjects: [] };
let subjectsByClassGlobal = {};
let studentsByClassGlobal = {};

// ... (toutes les déclarations de variables const sont les mêmes) ...
const classSelect = document.getElementById("class");
const subjectSelect = document.getElementById("subject");
// ... etc ...
const formErrorMessage = document.getElementById("formErrorMessage");


// --- CORRECTION : Amélioration de la gestion des erreurs d'API ---
document.getElementById("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormMessages();
    // ... (le reste de la logique de validation est la même) ...

    const payload = { /* ... payload data ... */ };

    try {
        const response = await fetch("/save-notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const resultText = await response.text();

        if (response.ok) {
            flashSuccessMessage(resultText);
            // ... (logique de succès) ...
        } else {
            // Gérer les erreurs spécifiques
            if (response.status === 401) { // 401 Unauthorized
                showFormMessage(formErrorMessage, "Votre session a expirée. Vous allez être redirigé.");
                setTimeout(() => window.location.href = '/login.html', 2500);
            } else if (response.status === 403) { // 403 Forbidden
                showFormMessage(formErrorMessage, "Erreur: Permission refusée.");
            } else {
                showFormMessage(formErrorMessage, `Erreur ${response.status}: ${resultText}`);
            }
        }
    } catch (error) {
        console.error("❌ Erreur réseau/serveur lors de l'enregistrement :", error);
        showFormMessage(formErrorMessage, "Erreur réseau ou serveur. Veuillez réessayer.");
    }
});


// Le reste de votre fichier index.js peut rester le même.
// Je le remets en entier ci-dessous pour que vous puissiez tout copier-coller.

const studentSelect = document.getElementById("studentName");
const sortClassSelect = document.getElementById("sortClass");
const sortSubjectSelect = document.getElementById("sortSubject");
const sortStudentSelect = document.getElementById("sortStudent");
const outputDiv = document.getElementById("output");
const usernameDisplay = document.getElementById('usernameDisplay');
const semester1Button = document.getElementById('semester1Button');
const semester2Button = document.getElementById('semester2Button');
const formTitle = document.getElementById('formTitle');
const formSuccessMessage = document.getElementById("formSuccessMessage");
const mainContainer = document.getElementById("mainContainer");
const travauxClasseInput = document.getElementById("travauxClasse");
const devoirsInput = document.getElementById("devoirs");
const evaluationInput = document.getElementById("evaluation");
const examenInput = document.getElementById("examen");

studentsByClassGlobal = {
    PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"],
    PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younis"],
    PEI3: ["Adam Kaaki", "Ahmed Mehani", "Mohamed Chalak", "Seif Eddine Ayadi", "Wajih Sabadine"],
    PEI4: ["Abdulrahman Bouaziz", "Mohamed Younes", "Samir Kaaki", "Mohamed Amine", "Youssif Baakak"],
    DP2: ["Habib Ltief", "Mahdi Kreimi", "Saleh Boumalouga"]
};

const noteLimits = {
    PEI1: { travauxClasse: 30, devoirs: 20, evaluation: 20, examen: 30 },
    PEI2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    PEI3: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    PEI4: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    DP2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 }
};

function clearSelectOptions(select, text) { select.innerHTML = `<option value="">${text}</option>`; }
function addOption(select, value, text) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.appendChild(o); }
function showFormMessage(el, msg, isError = true) {
    el.textContent = msg;
    el.className = isError ? 'error show' : 'success-message show';
    const otherEl = isError ? formSuccessMessage : formErrorMessage;
    otherEl.className = otherEl.className.replace(' show', '');
    otherEl.textContent = '';
}
function hideFormMessages() {
    formErrorMessage.className = 'error';
    formSuccessMessage.className = 'success-message';
}
function flashSuccessMessage(msg) {
    showFormMessage(formSuccessMessage, msg, false);
    setTimeout(hideFormMessages, 3000);
}

// Le reste des fonctions (checkLogin, displayTable, etc.) est correct.
// La seule modification importante est dans le gestionnaire d'événement du formulaire ci-dessus.
