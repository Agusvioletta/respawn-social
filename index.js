// index.js — Login

async function handleLogin() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorEl  = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');
  errorEl.textContent = '';
  if (!email || !password) { errorEl.textContent = '// Completá todos los campos.'; return; }
  btn.textContent = 'ENTRANDO...'; btn.disabled = true;
  try {
    await sbLogin(email, password);
    const profile = await sbGetCurrentUser();
    if (profile) cacheCurrentUser(profile, email);
    window.location.href = 'feed.html';
  } catch (err) {
    errorEl.textContent = '// Email o contraseña incorrectos.';
    btn.textContent = 'INICIAR SESIÓN'; btn.disabled = false;
  }
}

(async function checkSession() {
  const session = await sbGetSession();
  if (session) {
    const profile = await sbGetCurrentUser();
    if (profile) cacheCurrentUser(profile, '');
    window.location.href = 'feed.html';
  }
})();

document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });