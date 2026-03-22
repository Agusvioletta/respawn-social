// signup.js — Respawn Social v2

var selectedAvatar = null;

// --- Seleccion de avatar ---
document.querySelectorAll('.avatar-opt').forEach(function(opt) {
  opt.addEventListener('click', function() {
    document.querySelectorAll('.avatar-opt').forEach(function(o) {
      o.classList.remove('selected');
    });
    this.classList.add('selected');
    selectedAvatar = this.getAttribute('data-avatar');
    var err = document.getElementById('signupError');
    if (err.textContent.includes('avatar')) err.textContent = '';
  });
});

// --- Barra de fortaleza de contrasena ---
var pwdInput = document.getElementById('password');
if (pwdInput) {
  pwdInput.addEventListener('input', function() {
    var val = this.value;
    var fill = document.getElementById('strengthFill');
    if (!fill) return;
    var strength = 0;
    if (val.length >= 6)  strength++;
    if (val.length >= 10) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;
    var pct = (strength / 5) * 100;
    var color = strength <= 1 ? '#FF4F7B' : strength <= 3 ? '#F59E0B' : '#00FFF7';
    fill.style.width = pct + '%';
    fill.style.background = color;
  });
}

// --- Registro ---
function handleRegister() {
  var username        = document.getElementById('username').value.trim();
  var email           = document.getElementById('email').value.trim();
  var password        = document.getElementById('password').value.trim();
  var confirmPassword = document.getElementById('confirmPassword').value.trim();
  var errorEl         = document.getElementById('signupError');

  errorEl.textContent = '';

  if (!username || !email || !password || !confirmPassword) {
    errorEl.textContent = '// Completá todos los campos.';
    return;
  }
  if (!selectedAvatar) {
    errorEl.textContent = '// Elegí un avatar para continuar.';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = '// La contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (password !== confirmPassword) {
    errorEl.textContent = '// Las contraseñas no coinciden.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = '// Email inválido.';
    return;
  }
  if (username.length < 3) {
    errorEl.textContent = '// El usuario debe tener al menos 3 caracteres.';
    return;
  }

  var users = JSON.parse(localStorage.getItem('users')) || [];

  if (users.find(function(u) { return u.email === email; })) {
    errorEl.textContent = '// Este email ya está registrado.';
    return;
  }
  if (users.find(function(u) { return u.username === username; })) {
    errorEl.textContent = '// Ese username ya está en uso.';
    return;
  }

  var newUser = {
    username:  username,
    email:     email,
    password:  password,
    avatar:    selectedAvatar,
    following: [],
    followers: [],
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('currentUser', JSON.stringify(newUser));
  localStorage.setItem('maxLevel', '1');

  window.location.href = 'feed.html';
}

document.getElementById('registerBtn').addEventListener('click', handleRegister);

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') handleRegister();
});
