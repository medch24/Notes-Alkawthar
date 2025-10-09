// public/index.js - VERSION DÉFINITIVE ET STABLE
const socket = io();

// --- GESTION DE LA PAGE DE CONNEXION ---
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const errorMessageElement = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessageElement.classList.remove('show');
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                window.location.href = '/'; // Connexion réussie, redirection vers la page principale
            } else {
                const result = await response.json();
                errorMessageElement.textContent = result.message;
                errorMessageElement.classList.add('show');
            }
        } catch (error) {
            errorMessageElement.textContent = 'Erreur de connexion au serveur.';
            errorMessageElement.classList.add('show');
        }
    });

    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
}

// --- GESTION DE LA PAGE PRINCIPALE (GESTION DES NOTES) ---
if (document.getElementById('noteForm')) {
    let currentSemester = null;
    let allNotesData = [];
    let currentUserPermissions = { classes: [], subjects: [] };
    let subjectsByClassGlobal = {};
    const studentsByClassGlobal = { PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"], PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younis"], PEI3: ["Adam Kaaki", "Ahmed Mehani", "Mohamed Chalak", "Seif Eddine Ayadi", "Wajih Sabadine"], PEI4: ["Abdulrahman Bouaziz", "Mohamed Younes", "Samir Kaaki", "Mohamed Amine", "Youssif Baakak"], DP2: ["Habib Ltief", "Mahdi Kreimi", "Saleh Boumalouga"] };
    const noteLimits = { PEI1: { travauxClasse: 30, devoirs: 20, evaluation: 20, examen: 30 }, PEI2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 }, PEI3: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 }, PEI4: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 }, DP2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 } };

    const classSelect = document.getElementById("class");
    const subjectSelect = document.getElementById("subject");
    const studentSelect = document.getElementById("studentName");
    const sortClassSelect = document.getElementById("sortClass");
    const sortSubjectSelect = document.getElementById("sortSubject");
    const sortStudentSelect = document.getElementById("sortStudent");
    const outputDiv = document.getElementById("output");
    const usernameDisplay = document.getElementById('usernameDisplay');
    const semester1Button = document.getElementById('semester1Button');
    const semester2Button = document.getElementById('semester2Button');
    const formTitle = document.getElementById('formTitle');
    const formErrorMessage = document.getElementById("formErrorMessage");
    const formSuccessMessage = document.getElementById("formSuccessMessage");
    const mainContainer = document.getElementById("mainContainer");
    const travauxClasseInput = document.getElementById("travauxClasse");
    const devoirsInput = document.getElementById("devoirs");
    const evaluationInput = document.getElementById("evaluation");
    const examenInput = document.getElementById("examen");

    document.getElementById("noteForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        hideFormMessages();
        const studentClass = classSelect.value;
        const subject = subjectSelect.value;
        const studentName = studentSelect.value;
        if (!studentClass || !subject || !studentName) return showFormMessage(formErrorMessage, "Veuillez tout sélectionner.");
        const payload = { class: studentClass, subject, studentName, semester: currentSemester, travauxClasse: travauxClasseInput.value === "" ? null : parseFloat(travauxClasseInput.value), devoirs: devoirsInput.value === "" ? null : parseFloat(devoirsInput.value), evaluation: evaluationInput.value === "" ? null : parseFloat(evaluationInput.value), examen: examenInput.value === "" ? null : parseFloat(examenInput.value) };
        try {
            const response = await fetch("/api/save-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (response.ok) {
                flashSuccessMessage(result.message);
                resetFields();
            } else {
                if (response.status === 401) {
                    showFormMessage(formErrorMessage, result.message);
                    setTimeout(() => window.location.href = '/login', 2000);
                } else {
                    showFormMessage(formErrorMessage, result.message);
                }
            }
        } catch (error) {
            showFormMessage(formErrorMessage, "Erreur réseau. Impossible de contacter le serveur.");
        }
    });

    async function initializeApp() {
        try {
            const response = await fetch('/api/get-user');
            if (!response.ok) {
                window.location.href = '/login';
                return;
            }
            const data = await response.json();
            usernameDisplay.textContent = data.username;
            currentUserPermissions = data.permissions;
            subjectsByClassGlobal = data.subjectsByClass;
            populatePermissionBasedDropdowns();
        } catch (error) {
            window.location.href = '/login';
        }
    }

    function hideFormMessages() { formErrorMessage.classList.remove('show'); formSuccessMessage.classList.remove('show'); }
    function showFormMessage(el, msg, isError = true) { el.textContent = msg; el.className = isError ? 'error show' : 'success-message show'; }
    function flashSuccessMessage(msg) { showFormMessage(formSuccessMessage, msg, false); setTimeout(hideFormMessages, 3000); }
    function resetFields() { travauxClasseInput.value = ''; devoirsInput.value = ''; evaluationInput.value = ''; examenInput.value = ''; }
    function addOption(select, value, text) { const o = document.createElement('option'); o.value = value; o.textContent = text; select.appendChild(o); }
    function clearSelectOptions(select, text) { select.innerHTML = `<option value="">${text}</option>`; }
    function populatePermissionBasedDropdowns() {
        clearSelectOptions(classSelect, '-- Sélectionner une classe --');
        clearSelectOptions(subjectSelect, '-- Sélectionner une matière --');
        clearSelectOptions(sortClassSelect, 'Toutes les Classes');
        clearSelectOptions(sortSubjectSelect, 'Toutes les Matières');
        currentUserPermissions.classes.forEach(cls => { addOption(classSelect, cls, cls); addOption(sortClassSelect, cls, cls); });
        currentUserPermissions.subjects.forEach(subj => { addOption(sortSubjectSelect, subj, subj); });
        clearSelectOptions(sortStudentSelect, 'Tous les Élèves');
    }
    document.addEventListener('DOMContentLoaded', initializeApp);
}
