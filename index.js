// index.js — Login — Supabase inline

const SUPABASE_URL  = 'https://ajegcbzvviukuewqhqqb.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Nqo7KTTik0nnWidf04yuGw_hDOP28Eq';

// Esperar a que supabase esté disponible
function getSB() {
  const lib = window.supabase || window.supabaseJs;
  if (!lib) { console.error('Supabase no cargó'); return null; }
  return lib.createClient(SUPABASE_URL, SUPABASE_ANON);
}

async function handleLogin() {
  const sb = getSB(); if (!sb) return;
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
    const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
    if (profile) {
      localStorage.setItem('currentUser', JSON.stringify({
        ...profile, email: data.user.email, maxLevel: profile.max_level || 1, following: [], followers: []
      }));
    }
    window.location.href = 'feed.html';
  } catch (err) {
    console.error('Login error:', err);
    errorEl.textContent = `// ${err.message || 'Email o contraseña incorrectos.'}`;
    btn.textContent = 'INICIAR SESIÓN'; btn.disabled = false;
  }
}

// Chequear sesión activa
window.addEventListener('load', async () => {
  const sb = getSB(); if (!sb) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        localStorage.setItem('currentUser', JSON.stringify({
          ...profile, email: session.user.email, maxLevel: profile.max_level || 1, following: [], followers: []
        }));
      }
      window.location.href = 'feed.html';
    }
  } catch(e) { console.log('Sin sesión activa'); }
});

document.getElementById('loginBtn').addEventListener('click', handleLogin);
document.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
