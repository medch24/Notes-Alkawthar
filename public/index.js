// public/index.js - VERSION COMPLÈTE
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
                window.location.href = '/';
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
    // ... votre code de la page principale est déjà correct ...
    // Il appelle déjà /api/save-notes, etc.
}
