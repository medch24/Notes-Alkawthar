const socket = io();
let currentSemester = null;
let allNotesData = [];
let currentUserPermissions = { classes: [], subjects: [] };
let subjectsByClassGlobal = {};
let studentsByClassGlobal = {};

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
const generateWordButton = document.getElementById("generateWordButton");
const generateExcelButton = document.getElementById("generateExcelButton");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progressBar");
const semesterSelectorContainer = document.getElementById('semesterSelectorContainer');

// --- LISTE DES ÉLÈVES MISE À JOUR ---
studentsByClassGlobal = {
    PEI1: ["Bilal Molina", "Faysal Achar", "Jad Mahayni", "Manaf Kotbi"],
    PEI2: ["Ahmed Bouaziz", "Ali Kotbi", "Eyad Hassan", "Yasser Younis"],
    PEI3: ["Adam Kaaki", "Ahmed Mehani", "Mohamed Chalak", "Seif Eddine Ayadi", "Wajih Sabadine"],
    PEI4: ["Abdulrahman Bouaziz", "Mohamed Younes", "Samir Kaaki", "Mohamed Amine", "Youssif Baakak"],
    DP2: ["Habib Ltief", "Mahdi Kreimi", "Saleh Boumalouga"]
};

// Coefficients des notes (barèmes)
const noteLimits = {
    PEI1: { travauxClasse: 30, devoirs: 20, evaluation: 20, examen: 30 },
    PEI2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    PEI3: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    PEI4: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    DP1: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 },
    DP2: { travauxClasse: 20, devoirs: 20, evaluation: 30, examen: 30 }
};

function clearSelectOptions(selectElement, defaultText) {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
}

function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
}

function showFormMessage(element, message, isError = true) {
     element.textContent = message;
     element.className = isError ? 'error show' : 'success-message show';
     const otherElement = isError ? formSuccessMessage : formErrorMessage;
     otherElement.className = otherElement.className.replace(' show', '');
     otherElement.textContent = '';
}
function hideFormMessages() {
    formErrorMessage.className = 'error';
    formSuccessMessage.className = 'success-message';
    formErrorMessage.textContent = '';
    formSuccessMessage.textContent = '';
}
function flashSuccessMessage(message) {
     showFormMessage(formSuccessMessage, message, false);
     setTimeout(hideFormMessages, 3000);
}

async function checkLoginAndFetchInitialData() {
    try {
        const response = await fetch('/get-user');
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login.html';
            }
            return false;
        }
        const data = await response.json();
        usernameDisplay.textContent = data.username;
        currentUserPermissions = data.permissions;
        subjectsByClassGlobal = data.subjectsByClass;
        populatePermissionBasedDropdowns();
        return true;
    } catch (error) {
        window.location.href = '/login.html';
        return false;
    }
}

function populatePermissionBasedDropdowns() {
    clearSelectOptions(classSelect, '-- Sélectionner une classe --');
    clearSelectOptions(subjectSelect, '-- Sélectionner une matière --');
    clearSelectOptions(sortClassSelect, 'Toutes les Classes');
    clearSelectOptions(sortSubjectSelect, 'Toutes les Matières');

    currentUserPermissions.classes.forEach(cls => {
        addOption(classSelect, cls, cls);
        addOption(sortClassSelect, cls, cls);
    });
    currentUserPermissions.subjects.forEach(subj => {
        addOption(sortSubjectSelect, subj, subj);
    });
    clearSelectOptions(sortStudentSelect, 'Tous les Élèves');
    updateSortStudentOptionsForFilterClass('');
}

function setActiveSemester(semester) {
    if (currentSemester === semester && mainContainer.style.display !== 'none') return;

    currentSemester = semester;
    semester1Button.classList.toggle('active', semester === 'S1');
    semester2Button.classList.toggle('active', semester === 'S2');
    formTitle.innerHTML = `<i class="fas fa-edit"></i> Saisir les Notes - ${semester}`;
    mainContainer.dataset.printSemester = semester;

    if (mainContainer.style.display === 'none') {
        mainContainer.style.display = 'block';
    }

    sortClassSelect.value = "";
    sortSubjectSelect.value = "";
    sortStudentSelect.value = "";
    updateSortStudentOptionsForFilterClass("");
    classSelect.value = "";
    subjectSelect.value = "";
    studentSelect.value = "";
    resetFields();
    updateLimits();
    fetchAndDisplayData();
}

semester1Button.addEventListener('click', () => setActiveSemester('S1'));
semester2Button.addEventListener('click', () => setActiveSemester('S2'));

classSelect.addEventListener("change", function () {
    const selectedClass = this.value;
    clearSelectOptions(studentSelect, '-- Sélectionner un élève --');
    clearSelectOptions(subjectSelect, '-- Sélectionner une matière --');
    hideFormMessages();
    if (selectedClass && currentUserPermissions.classes.includes(selectedClass) && studentsByClassGlobal[selectedClass]) {
         const sortedStudents = [...studentsByClassGlobal[selectedClass]].sort((a, b) => a.localeCompare(b));
         sortedStudents.forEach(student => addOption(studentSelect, student, student));
        const availableSubjectsInClass = subjectsByClassGlobal[selectedClass] || [];
        const subjectsToShow = currentUserPermissions.subjects
            .filter(allowedSubject => availableSubjectsInClass.includes(allowedSubject))
            .sort();
        if (subjectsToShow.length > 0) {
            subjectsToShow.forEach(subject => addOption(subjectSelect, subject, subject));
        } else {
            addOption(subjectSelect, '', 'Aucune matière autorisée');
            subjectSelect.disabled = true;
        }
         subjectSelect.disabled = (subjectsToShow.length === 0);
    } else {
         subjectSelect.disabled = true;
         studentSelect.disabled = true;
    }
    resetFields();
    updateLimits();
});

function resetFields() {
    travauxClasseInput.value = "";
    devoirsInput.value = "";
    evaluationInput.value = "";
    examenInput.value = "";
}

function updateLimits() {
    const selectedClass = classSelect.value;
    const limits = noteLimits[selectedClass] || { travauxClasse: '-', devoirs: '-', evaluation: '-', examen: '-' };
    const updateInput = (inputElement, limit) => {
         const placeholder = `Max: ${limit}`;
         const maxAttr = (typeof limit === 'number') ? limit : '';
         inputElement.placeholder = placeholder;
         if (maxAttr !== '') {
             inputElement.max = maxAttr;
         } else {
              inputElement.removeAttribute('max');
         }
    };
    updateInput(travauxClasseInput, limits.travauxClasse);
    updateInput(devoirsInput, limits.devoirs);
    updateInput(evaluationInput, limits.evaluation);
    updateInput(examenInput, limits.examen);
}

function simpleValidate(inputElement) {
     if (!inputElement) return;
     const max = parseFloat(inputElement.max);
     const value = parseFloat(inputElement.value);
     if (!isNaN(max) && !isNaN(value) && value > max) {
         inputElement.value = max;
     }
     if (!isNaN(value) && value < 0) {
        inputElement.value = 0;
     }
}

travauxClasseInput.addEventListener("input", (e) => simpleValidate(e.target));
devoirsInput.addEventListener("input", (e) => simpleValidate(e.target));
evaluationInput.addEventListener("input", (e) => simpleValidate(e.target));
examenInput.addEventListener("input", (e) => simpleValidate(e.target));

document.getElementById("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormMessages();
    if (!currentSemester) {
         showFormMessage(formErrorMessage, "Veuillez sélectionner un semestre.");
         return;
    }
    const studentClass = classSelect.value;
    const subject = subjectSelect.value;
    const studentName = studentSelect.value;
    
    if (!studentClass || !subject || !studentName) {
        showFormMessage(formErrorMessage, "Veuillez sélectionner classe, matière et élève.");
        return;
    }

    simpleValidate(travauxClasseInput);
    simpleValidate(devoirsInput);
    simpleValidate(evaluationInput);
    simpleValidate(examenInput);
    
     const payload = {
        class: studentClass, subject, studentName, semester: currentSemester,
        travauxClasse: travauxClasseInput.value === "" ? null : parseFloat(travauxClasseInput.value),
        devoirs: devoirsInput.value === "" ? null : parseFloat(devoirsInput.value),
        evaluation: evaluationInput.value === "" ? null : parseFloat(evaluationInput.value),
        examen: examenInput.value === "" ? null : parseFloat(examenInput.value)
    };
    
    try {
        const response = await fetch("/save-notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const resultText = await response.text();
        if (response.ok) {
             flashSuccessMessage(resultText);
             resetFields();
             const currentIndex = studentSelect.selectedIndex;
             if (currentIndex > 0 && currentIndex < studentSelect.options.length - 1) {
                 studentSelect.selectedIndex = currentIndex + 1;
                 travauxClasseInput.focus();
             }
        } else {
             showFormMessage(formErrorMessage, `Erreur: ${resultText}`);
        }
    } catch (error) {
        showFormMessage(formErrorMessage, "Erreur réseau.");
    }
});

 function updateSortStudentOptionsForFilterClass(selectedFilterClass) {
    clearSelectOptions(sortStudentSelect, 'Tous les Élèves');
    let studentsToList = new Set();
    if (selectedFilterClass && currentUserPermissions.classes.includes(selectedFilterClass)) {
         if (studentsByClassGlobal[selectedFilterClass]) {
             studentsByClassGlobal[selectedFilterClass].forEach(student => studentsToList.add(student));
         }
    } else {
        currentUserPermissions.classes.forEach(allowedClass => {
             if (studentsByClassGlobal[allowedClass]) {
                 studentsByClassGlobal[allowedClass].forEach(student => studentsToList.add(student));
             }
        });
    }
     const sortedStudents = Array.from(studentsToList).sort((a, b) => a.localeCompare(b));
     sortedStudents.forEach(student => addOption(sortStudentSelect, student, student));
}

sortClassSelect.addEventListener("change", () => {
     updateSortStudentOptionsForFilterClass(sortClassSelect.value);
     applyFiltersAndDisplayTable();
 });
sortSubjectSelect.addEventListener("change", applyFiltersAndDisplayTable);
sortStudentSelect.addEventListener("change", applyFiltersAndDisplayTable);

async function fetchAndDisplayData() {
     if (!currentSemester) return;
     outputDiv.innerHTML = "<p>Chargement...</p>";
     try {
         const response = await fetch(`/all-notes?semester=${currentSemester}`);
         if (!response.ok) {
             if (response.status === 401) window.location.href = '/login.html';
             throw new Error(`Erreur ${response.status}`);
         }
         allNotesData = await response.json();
         if (allNotesData.length === 0) {
              outputDiv.innerHTML = `<p>Aucune note enregistrée pour le ${currentSemester}.</p>`;
              displayTable([]);
              return;
         }
         applyFiltersAndDisplayTable();
     } catch (error) {
         outputDiv.innerHTML = `<p class="error">Impossible de charger les notes.</p>`;
     }
 }

 function applyFiltersAndDisplayTable() {
     const selectedClass = sortClassSelect.value;
     const selectedSubject = sortSubjectSelect.value;
     const selectedStudent = sortStudentSelect.value;
     let filteredData = allNotesData.filter(item => {
         const classMatch = !selectedClass || item.class === selectedClass;
         const subjectMatch = !selectedSubject || item.subject === selectedSubject;
         const studentMatch = !selectedStudent || item.studentName === selectedStudent;
         return classMatch && subjectMatch && studentMatch;
     });
     displayTable(filteredData);
 }

function displayTable(dataToDisplay) {
    outputDiv.innerHTML = "";
    if (dataToDisplay.length === 0) {
         outputDiv.innerHTML = `<p>Aucune note ne correspond aux filtres.</p>`;
         return;
    }
    const table = document.createElement("table");
    const thead = table.createTHead();
    const tbody = table.createTBody();
    const headerRow = thead.insertRow();
    const headers = ["Classe", "Matière", "Élève", "Travaux Cl.", "Devoirs", "Éval.", "Examen", "Total", "Actions"];
    headers.forEach(header => headerRow.appendChild(document.createElement("th")).textContent = header);

     dataToDisplay.sort((a, b) => a.class.localeCompare(b.class) || a.subject.localeCompare(b.subject) || a.studentName.localeCompare(b.studentName));
    
    dataToDisplay.forEach(note => {
        const row = tbody.insertRow();
        row.dataset.noteId = note._id;
        ["class", "subject", "studentName"].forEach(field => row.insertCell().textContent = note[field]);
        
        let totalNote = 0;
        const noteFields = ["travauxClasse", "devoirs", "evaluation", "examen"];
        noteFields.forEach(field => {
            const cell = row.insertCell();
            const input = document.createElement("input");
            input.type = "number"; input.step = "0.01"; input.min = "0";
            input.value = note[field] ?? '';
            const limits = noteLimits[note.class] || {};
             if (typeof limits[field] === 'number') input.max = limits[field];
            input.dataset.field = field;
            input.addEventListener("change", (e) => { simpleValidate(e.target); updateRowTotal(row); });
            cell.appendChild(input);
            totalNote += parseFloat(note[field] || 0);
        });

         const totalCell = row.insertCell();
         totalCell.textContent = totalNote.toFixed(2);
         totalCell.classList.add('total-cell');

        const actionTd = row.insertCell();
        actionTd.classList.add('actions-cell');
        
        const saveBtn = createActionButton("Enr.", "save-button", async (event) => {
             const button = event.target; button.disabled = true;
             const currentRow = button.closest('tr');
             const updatedNotePayload = {};
             currentRow.querySelectorAll('input[type="number"][data-field]').forEach(input => {
                  updatedNotePayload[input.dataset.field] = input.value === "" ? null : parseFloat(input.value);
             });
             try {
                const response = await fetch(`/update-note/${note._id}`, {
                    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedNotePayload),
                });
                if (!response.ok) alert('Erreur sauvegarde');
             } catch (error) { alert("Erreur réseau."); }
             finally { button.disabled = false; }
        });

        const deleteBtn = createActionButton("Sup.", "delete-button", async (event) => {
            if (confirm(`Supprimer cette ligne pour ${note.studentName} ?`)) {
                try {
                    const response = await fetch(`/delete-note/${note._id}`, { method: "DELETE" });
                    if (!response.ok) alert('Erreur suppression');
                } catch (error) { alert('Erreur réseau.'); }
            }
        });
        actionTd.appendChild(saveBtn);
        actionTd.appendChild(deleteBtn);
    });
    outputDiv.appendChild(table);
}

 function createActionButton(text, className, onClick) {
     const btn = document.createElement("button");
     btn.textContent = text;
     btn.className = className;
     btn.addEventListener("click", onClick);
     return btn;
 }

 function updateRowTotal(tableRow) {
    let currentTotal = 0;
    tableRow.querySelectorAll('input[type="number"][data-field]').forEach(input => {
        currentTotal += parseFloat(input.value || 0);
    });
    tableRow.querySelector('.total-cell').textContent = currentTotal.toFixed(2);
 }

// ... le reste du code JS (sockets, génération de fichiers) est identique
// et peut être collé ici à partir de votre code original.

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const loggedIn = await checkLoginAndFetchInitialData();
    if (!loggedIn) {
        console.log("Utilisateur non authentifié.");
    }
});
