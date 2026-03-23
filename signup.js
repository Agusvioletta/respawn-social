// signup.js — Registro

var selectedAvatar = null;

document.querySelectorAll('.avatar-opt').forEach(opt => {
  opt.addEventListener('click', function() {
    document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
    this.classList.add('selected');
    selectedAvatar = this.getAttribute('data-avatar');
    const err = document.getElementById('signupError');
    if (err && err.textContent.includes('avatar')) err.textContent = '';
  });
});

const pwdInput = document.getElementById('password');
if (pwdInput) {
  pwdInput.addEventListener('input', function() {
    const fill = document.getElementById('strengthFill');
    if (!fill) return;
    const val = this.value;
    let s = 0;
    if (val.length >= 6)          s++;
    if (val.length >= 10)         s++;
    if (/[A-Z]/.test(val))        s++;
    if (/[0-9]/.test(val))        s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    fill.style.width      = (s / 5 * 100) + '%';
    fill.style.background = s <= 1 ? '#FF4F7B' : s <= 3 ? '#F59E0B' : '#00FFF7';
  });
}

async function handleRegister() {
  const username        = document.getElementById('username').value.trim();
  const email           = document.getElementById('email').value.trim();
  const password        = document.getElementById('password').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const errorEl         = document.getElementById('signupError');
  const btn             = document.getElementById('registerBtn');
  errorEl.textContent   = '';
  errorEl.style.color   = 'var(--pink)';

  if (!username || !email || !password || !confirmPassword) { errorEl.textContent = '// Completá todos los campos.'; return; }
  if (!selectedAvatar)         { errorEl.textContent = '// Elegí un avatar.'; return; }
  if (password.length < 6)     { errorEl.textContent = '// Contraseña mínimo 6 caracteres.'; return; }
  if (password !== confirmPassword) { errorEl.textContent = '// Las contraseñas no coinciden.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorEl.textContent = '// Email inválido.'; return; }
  if (username.length < 3)     { errorEl.textContent = '// Username mínimo 3 caracteres.'; return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { errorEl.textContent = '// Solo letras, números y _'; return; }

  btn.textContent = 'CREANDO...'; btn.disabled = true;

  try {
    // Verificar username disponible
    const { data: existing } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existing) {
      errorEl.textContent = '// Ese username ya existe.';
      btn.textContent = 'CREAR CUENTA'; btn.disabled = false;
      return;
    }

    // Crear usuario en auth
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;

    // Crear perfil
    const { error: pe } = await sb.from('profiles')
      .insert({ id: data.user.id, username, avatar: selectedAvatar, bio: '', games: [], max_level: 1 });
    if (pe) throw pe;

    // Login automático
    const { data: loginData, error: loginError } = await sb.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;

    localStorage.setItem('currentUser', JSON.stringify({
      id: data.user.id, username, avatar: selectedAvatar,
      email, bio: '', games: [], max_level: 1,
      maxLevel: 1, following: [], followers: []
    }));

    window.location.href = 'feed.html';

  } catch (err) {
    console.error('Signup error:', err);
    errorEl.style.color = 'var(--pink)';
    errorEl.textContent = `// ${err.message || 'No se pudo crear la cuenta.'}`;
    btn.textContent = 'CREAR CUENTA'; btn.disabled = false;
  }
}

document.getElementById('registerBtn').addEventListener('click', handleRegister);
document.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });