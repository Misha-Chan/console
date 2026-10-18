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

// ===== اللغة =====
function toggleLangMenu(){
  document.getElementById('langMenu').classList.toggle('show');
}
document.addEventListener('click', function(e){
  var wrap = document.getElementById('langToggle');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('langMenu')?.classList.remove('show');
  }
});
function setLang(lang){
  if (lang !== 'ar' && lang !== 'en') return;
  localStorage.setItem('hostaka_lang', lang);
  if (window.setHostakaLang) window.setHostakaLang(lang); // يحدّث كل عناصر data-i18n بالصفحة، بما فيها المحقونة ديناميكياً
  document.getElementById('langMenu')?.classList.remove('show');
}

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
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

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
      <div class="cl-user-row">
        ${u.avatar ? `<img src="${esc(u.avatar)}" alt="" class="cl-user-avatar">` : `<img src="/default-avatar.jpg" alt="" class="cl-user-avatar">`}
        <span class="cl-user-meta"><span class="cl-user-name">@${esc(u.username)}</span></span>
        <button class="cl-user-logout" onclick="doLogout()" data-i18n-title="console.logoutBtn" title="Log out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;
    if (window.applyTranslations) window.applyTranslations(); // يترجم العنصر المحقون للتو (data-i18n-title)
  } catch (e) { /* تجاهل — يبقى زر تسجيل الدخول الافتراضي */ }
}

function doLogout(){
  localStorage.removeItem('hostaka_token');
  window.location.reload();
}

initAuthArea();

// ===== الأخبار والتحديثات — تُعرض بشكل طبيعي بالصفحة الرئيسية =====
function fmtNewsDate(s){
  if(!s) return '';
  const d = /[zZ]|[+-]\d\d:?\d\d$/.test(s) ? new Date(s) : new Date(s.replace(' ','T')+'Z');
  const lang = (window.currentLang === 'ar') ? 'ar-SA' : 'en-US';
  return d.toLocaleDateString(lang, { year:'numeric', month:'short', day:'numeric' });
}

async function loadPublicNews(){
  const feed = document.getElementById('newsFeed');
  if(!feed) return;
  try {
    const r = await fetch('/api/news');
    const list = await r.json();
    if(!Array.isArray(list) || !list.length){
      feed.innerHTML = `<div class="cl-news-empty">${window.t ? window.t('console.newsEmptyState','No updates yet — check back soon.') : 'No updates yet — check back soon.'}</div>`;
      return;
    }
    feed.innerHTML = list.map(n => `
      <article class="cl-news-card">
        ${n.image ? `<img src="${esc(n.image)}" alt="" class="cl-news-card-img">` : ''}
        <div class="cl-news-card-body">
          <h3 class="cl-news-card-title">${esc(n.title)}</h3>
          <div class="cl-news-card-meta">${esc(n.author?.display_name || '')} · ${fmtNewsDate(n.created_at)}</div>
          <div class="cl-news-card-text">${esc(n.body)}</div>
        </div>
      </article>`).join('');
  } catch(e) {
    feed.innerHTML = `<div class="cl-news-empty">${window.t ? window.t('console.newsEmptyState','No updates yet — check back soon.') : 'No updates yet — check back soon.'}</div>`;
  }
}
loadPublicNews();
document.addEventListener('hostaka:langchange', loadPublicNews); // يعيد رسم التواريخ/النص الفارغ بلغة صحيحة عند تبديل اللغة
