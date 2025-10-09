<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion Enseignant</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
          integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg=="
          crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" href="/styles.css">
    <style>
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .login-container { background-color: #ffffff; padding: 2.5rem 3rem; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); text-align: center; max-width: 420px; width: 90%; border-top: 5px solid #0288d1; }
        .login-container img { max-height: 65px; margin-bottom: 1.5rem; }
        .login-container h2 { color: #01579b; margin-bottom: 2rem; }
        .input-group { margin-bottom: 1.5rem; text-align: left; position: relative; }
        .password-toggle-icon { position: absolute; top: 68%; right: 12px; transform: translateY(-50%); cursor: pointer; color: #aaa; }
        .error-message { color: #d32f2f; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 0.7rem 1rem; margin-top: 1.5rem; display: none; }
        .error-message.show { display: block; }
    </style>
</head>
<body>
    <div class="login-container">
        <img src="https://cdn.glitch.global/f566aaa0-dea8-4ebc-bb3a-23070b8c7e7a/al-kawthar-international-schools-jeddah-saudi-arabia-modified.png?v=1739958835552" alt="Logo École">
        <h2>Connexion Enseignant</h2>
        <form id="loginForm">
            <div class="input-group">
                <label for="username"><i class="fas fa-user"></i> Login</label>
                <input type="text" id="username" name="username" required autocomplete="username">
            </div>
            <div class="input-group">
                <label for="password"><i class="fas fa-lock"></i> Mot de passe</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
                <i class="fas fa-eye password-toggle-icon" id="togglePassword"></i>
            </div>
            <button type="submit">Se Connecter</button>
            <p id="errorMessage" class="error-message"></p>
        </form>
    </div>
    <script src="/index.js"></script>
</body>
</html>
