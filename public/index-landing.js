// ============================================================
//  console.hostaka.fun — الصفحة الرئيسية (تعريفية)
// ============================================================
const HOSTAKA_MAIN = 'https://hostaka.fun';

(function bridgeAuthToken(){
  try {
    const params = new URLSearchParams(window.location.search);
    const bridgedToken = params.get('token');
    if (bridgedToken) {
      localStorage.setItem('hostaka_token', bridgedToken);
      params.delete('token');
      const qs = params.toString();
      const cleanUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  } catch (e) {}
})();

function goToLogin(){ window.location = HOSTAKA_MAIN + '/login?next=' + encodeURIComponent(window.location.href); }

// ===== الثيم =====
let currentTheme = localStorage.getItem('hostaka_theme') || 'light';
function setTheme(theme){
  const html = document.documentElement;
  if (theme === 'dark') html.setAttribute('data-theme', 'dark'); else html.removeAttribute('data-theme');
  currentTheme = theme;
  localStorage.setItem('hostaka_theme', theme);
}
function toggleTheme(){ setTheme(currentTheme === 'light' ? 'dark' : 'light'); }
setTheme(currentTheme);

// ===== تخصيص منطقة الحساب (اسم المستخدم / تسجيل خروج) =====
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// إذا ما فيه توكن محلي، جرّب تسحبه بصمت من وسيط التحقق المركزي
// (oauth.hostaka.fun) قبل ما نكمل
async function pullOAuthSessionIfNeeded(){
  if (localStorage.getItem('hostaka_token')) return;
  try {
    const r = await fetch('https://oauth.hostaka.fun/api/token', { credentials: 'include' });
    if (r.ok) {
      const d = await r.json();
      if (d && d.token) localStorage.setItem('hostaka_token', d.token);
    }
  } catch (e) {}
}

async function initAuthArea(){
  await pullOAuthSessionIfNeeded();
  const token = localStorage.getItem('hostaka_token') || '';
  const area = document.getElementById('clAuthArea');
  if (!token) return; // يبقى زر "تسجيل الدخول" الافتراضي

  try {
    const r = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    const u = await r.json();
    if (!u || u.error) return;

    area.innerHTML = `
      <span class="cl-user-chip">
        ${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : `<span class="cl-user-chip-fallback">${esc(u.username.charAt(0).toUpperCase())}</span>`}
        <span>@${esc(u.username)}</span>
      </span>
      <button class="cl-btn cl-btn-ghost" onclick="doLogout()">تسجيل خروج</button>
    `;

    // خلي زر "لوحتك" واضح لو المستخدم أدمن فعلاً (تحسين بصري بسيط،
    // التحقق الفعلي من الصلاحية يصير على صفحة /user/console نفسها)
    if (u.role === 'admin') {
      document.getElementById('consoleBtn').classList.add('cl-card-btn-primary');
    }
  } catch (e) { /* تجاهل — يبقى زر تسجيل الدخول الافتراضي */ }
}

function doLogout(){
  localStorage.removeItem('hostaka_token');
  window.location.reload();
}

initAuthArea();
