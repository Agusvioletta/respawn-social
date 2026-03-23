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
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Obtener perfil
    const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
    if (profile) {
      localStorage.setItem('currentUser', JSON.stringify({
        ...profile, email: data.user.email,
        maxLevel: profile.max_level || 1,
        following: [], followers: []
      }));
    }
    window.location.href = 'feed.html';
  } catch (err) {
    console.error('Login error:', err);
    errorEl.textContent = '// Email o contraseña incorrectos.';
    btn.textContent = 'INICIAR SESIÓN'; btn.disabled = false;
  }
}

// Chequear sesión activa sin usar función externa
(async function checkSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        localStorage.setItem('currentUser', JSON.stringify({
          ...profile, email: session.user.email,
          maxLevel: profile.max_level || 1,
          following: [], followers: []
        }));
      }
      window.location.href = 'feed.html';
    }
  } catch(e) {
    console.log('No hay sesión activa');
  }
})();

document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });