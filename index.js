// index.js — Respawn Social v2

function handleLogin() {
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value.trim();
  var errorEl  = document.getElementById('loginError');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = '// Completá todos los campos.';
    return;
  }

  var users = JSON.parse(localStorage.getItem('users')) || [];
  var user  = users.find(function(u) {
    return u.email === email && u.password === password;
  });

  if (!user) {
    errorEl.textContent = '// Email o contraseña incorrectos.';
    return;
  }

  localStorage.setItem('currentUser', JSON.stringify(user));
  window.location.href = 'feed.html';
}

document.getElementById('loginBtn').addEventListener('click', handleLogin);

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') handleLogin();
});
